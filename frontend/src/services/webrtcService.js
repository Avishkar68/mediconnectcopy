import { io } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.roomId = null;
    this.user = null;
    this.callbacks = {};
    this.candidateQueue = [];
    this.isNegotiating = false;
  }

  /**
   * Connect socket to backend signaling server
   */
  initSocket() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl =
      import.meta.env.VITE_BACKEND_URL ||
      `${window.location.protocol}//${window.location.hostname}:5001`;

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
    });

    this.setupSocketListeners();
    return this.socket;
  }

  /**
   * Register event callbacks from the UI
   */
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  emitCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  /**
   * Setup incoming signaling events
   */
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('room-joined', async ({ roomId, participants }) => {
      this.emitCallback('room-joined', { roomId, participants });

      // If another participant already exists in the room, initiate WebRTC Offer
      if (participants && participants.length > 0) {
        const targetPeer = participants[0];
        await this.createOffer(targetPeer.socketId);
      }
    });

    this.socket.on('user-joined', (participant) => {
      this.emitCallback('user-joined', participant);
    });

    this.socket.on('webrtc-offer', async ({ callerSocketId, offer, callerName, callerRole }) => {
      this.emitCallback('peer-status', { status: 'Receiving incoming connection...' });
      await this.handleOffer(callerSocketId, offer, callerName, callerRole);
    });

    this.socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      await this.handleAnswer(senderSocketId, answer);
    });

    this.socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      await this.handleIceCandidate(candidate);
    });

    this.socket.on('user-media-toggled', (data) => {
      this.emitCallback('peer-media-toggled', data);
    });

    this.socket.on('new-chat-message', (message) => {
      this.emitCallback('new-chat-message', message);
    });

    this.socket.on('incoming-prescription', (prescription) => {
      this.emitCallback('incoming-prescription', prescription);
    });

    this.socket.on('prescription-status-update', (data) => {
      this.emitCallback('prescription-status-update', data);
    });

    this.socket.on('key-points-synced', (data) => {
      this.emitCallback('key-points-synced', data);
    });

    this.socket.on('user-left', (data) => {
      this.emitCallback('user-left', data);
      this.closePeerConnection();
    });
  }

  /**
   * Initialize Local Audio/Video Media Stream
   */
  async getLocalMediaStream(preferAudioOnly = false) {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: preferAudioOnly
          ? false
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.warn('Camera/Mic permission warning or device unavailable:', err);

      // Graceful fallback: generate a synthetic video/audio canvas stream so WebRTC never fails
      this.localStream = this.createSyntheticStream();
      return this.localStream;
    }
  }

  /**
   * Synthetic canvas stream fallback for environments without physical webcams
   */
  createSyntheticStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const drawFrame = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(this.user?.name || 'MediConnect User', canvas.width / 2, canvas.height / 2 + 70);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('(Camera Standby Mode)', canvas.width / 2, canvas.height / 2 + 100);
    };

    drawFrame();
    const interval = setInterval(drawFrame, 1000);

    const stream = canvas.captureStream(15);
    const origGetTracks = stream.getTracks.bind(stream);
    stream.stop = () => {
      clearInterval(interval);
      origGetTracks().forEach((t) => t.stop());
    };

    return stream;
  }

  /**
   * Create RTCPeerConnection and attach event handlers
   */
  createPeerConnection(targetSocketId) {
    if (this.peerConnection) {
      return this.peerConnection;
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Attach local stream tracks to PeerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate Generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && targetSocketId) {
        this.socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Stream Handling
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emitCallback('remote-stream', this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.emitCallback('connection-state', state);
      console.log(`[WebRTC] Connection state: ${state}`);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this.emitCallback('ice-state', state);
    };

    return this.peerConnection;
  }

  /**
   * Create SDP Offer and dispatch to peer
   */
  async createOffer(targetSocketId) {
    try {
      const pc = this.createPeerConnection(targetSocketId);
      this.isNegotiating = true;

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        targetSocketId,
        offer,
        callerName: this.user?.name || 'User',
        callerRole: this.user?.role || 'patient',
      });

      this.emitCallback('peer-status', { status: 'Connecting to peer...' });
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    } finally {
      this.isNegotiating = false;
    }
  }

  /**
   * Handle incoming SDP Offer and respond with SDP Answer
   */
  async handleOffer(callerSocketId, offer, callerName, callerRole) {
    try {
      const pc = this.createPeerConnection(callerSocketId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush any queued ICE candidates received before remote description
      await this.processQueuedCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        targetSocketId: callerSocketId,
        answer,
      });

      this.emitCallback('peer-connected', {
        peerName: callerName,
        peerRole: callerRole,
      });
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  }

  /**
   * Handle incoming SDP Answer
   */
  async handleAnswer(senderSocketId, answer) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processQueuedCandidates();
      this.emitCallback('peer-connected', {});
    } catch (err) {
      console.error('Error handling WebRTC answer:', err);
    }
  }

  /**
   * Handle incoming ICE Candidate
   */
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        this.candidateQueue.push(candidate);
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }

  async processQueuedCandidates() {
    if (!this.peerConnection) return;
    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Queued candidate error:', e);
      }
    }
  }

  /**
   * Join Room
   */
  async joinRoom(roomId, user) {
    this.roomId = roomId;
    this.user = user;

    this.initSocket();

    // Get local stream before joining
    await this.getLocalMediaStream();

    this.socket.emit('join-room', {
      roomId,
      userId: user._id || user.id,
      userName: user.name,
      userRole: user.role,
    });
  }

  /**
   * Toggle Audio Mute
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    if (this.socket && this.roomId) {
      this.socket.emit('toggle-media', {
        roomId: this.roomId,
        type: 'audio',
        enabled,
      });
    }
    return enabled;
  }

  /**
   * Toggle Video On/Off
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    if (this.socket && this.roomId) {
      this.socket.emit('toggle-media', {
        roomId: this.roomId,
        type: 'video',
        enabled,
      });
    }
    return enabled;
  }

  /**
   * Screen Sharing Toggle
   */
  async toggleScreenShare(isSharing) {
    try {
      if (isSharing) {
        // Stop screen share and revert back to camera
        if (this.screenStream) {
          this.screenStream.getTracks().forEach((t) => t.stop());
          this.screenStream = null;
        }

        const cameraStream = await this.getLocalMediaStream();
        const videoTrack = cameraStream.getVideoTracks()[0];

        if (this.peerConnection && videoTrack) {
          const sender = this.peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        return false;
      } else {
        // Start screen sharing
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = this.screenStream.getVideoTracks()[0];

        if (this.peerConnection && screenTrack) {
          const sender = this.peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Handle user clicking native browser "Stop sharing" button
        screenTrack.onended = async () => {
          await this.toggleScreenShare(true);
          this.emitCallback('screen-share-ended');
        };

        return true;
      }
    } catch (err) {
      console.warn('Screen sharing cancelled or unavailable:', err);
      return false;
    }
  }

  /**
   * Send in-call chat message
   */
  sendChatMessage(message) {
    if (this.socket && this.roomId && message.trim()) {
      this.socket.emit('send-chat', {
        roomId: this.roomId,
        message,
        senderName: this.user?.name || 'User',
        senderRole: this.user?.role || 'patient',
      });
    }
  }

  /**
   * Dispatch real-time prescription from doctor to patient
   */
  sendPrescription(prescription) {
    if (this.socket && this.roomId) {
      this.socket.emit('send-prescription', {
        roomId: this.roomId,
        prescription: {
          ...prescription,
          doctorName: this.user?.name || 'Doctor',
          doctorId: this.user?._id || this.user?.id,
        },
      });
    }
  }

  /**
   * Patient responds to in-call prescription (accept/decline)
   */
  respondToPrescription(prescriptionId, medicineName, status) {
    if (this.socket && this.roomId) {
      this.socket.emit('prescription-response', {
        roomId: this.roomId,
        prescriptionId,
        medicineName,
        status,
        patientName: this.user?.name || 'Patient',
      });
    }
  }

  /**
   * Sync clinical key points
   */
  syncKeyPoints(points) {
    if (this.socket && this.roomId) {
      this.socket.emit('sync-key-points', {
        roomId: this.roomId,
        points,
      });
    }
  }

  /**
   * Leave room and clean up tracks and connections
   */
  leaveRoom() {
    if (this.socket && this.roomId) {
      this.socket.emit('leave-room', { roomId: this.roomId });
    }

    this.closePeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.roomId = null;
    this.candidateQueue = [];
  }

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}

// Singleton instance
const webrtcService = new WebRTCService();
export default webrtcService;
