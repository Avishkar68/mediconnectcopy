/**
 * MediConnect WebRTC Signaling Server via Socket.io
 * Facilitates peer-to-peer audio/video calling, ICE candidate exchanges,
 * in-call messaging, and media state synchronization.
 */

export default function setupWebRTCSignaling(io) {
  // Store room participants: roomId -> Map(socketId -> participantData)
  const rooms = new Map();

  io.on('connection', (socket) => {
    let currentRoomId = null;

    /**
     * Join consultation room
     */
    socket.on('join-room', ({ roomId, userId, userName, userRole }) => {
      currentRoomId = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomParticipants = rooms.get(roomId);

      // Existing participants in the room prior to this socket joining
      const existingList = [];
      roomParticipants.forEach((data, sId) => {
        existingList.push({
          socketId: sId,
          userId: data.userId,
          userName: data.userName,
          userRole: data.userRole,
          audioEnabled: data.audioEnabled,
          videoEnabled: data.videoEnabled,
        });
      });

      // Save new participant
      roomParticipants.set(socket.id, {
        userId,
        userName,
        userRole,
        audioEnabled: true,
        videoEnabled: true,
      });

      // Notify the joining peer of existing participants
      socket.emit('room-joined', {
        roomId,
        participants: existingList,
      });

      // Notify other peers in the room that a new participant joined
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        userId,
        userName,
        userRole,
        audioEnabled: true,
        videoEnabled: true,
      });

      console.log(`[WebRTC] User ${userName} (${userRole}) joined room: ${roomId} (socket: ${socket.id})`);
    });

    /**
     * WebRTC SDP Offer relay
     */
    socket.on('webrtc-offer', ({ targetSocketId, offer, callerName, callerRole }) => {
      io.to(targetSocketId).emit('webrtc-offer', {
        callerSocketId: socket.id,
        offer,
        callerName,
        callerRole,
      });
    });

    /**
     * WebRTC SDP Answer relay
     */
    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    /**
     * ICE Candidate relay
     */
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      if (candidate) {
        io.to(targetSocketId).emit('ice-candidate', {
          senderSocketId: socket.id,
          candidate,
        });
      }
    });

    /**
     * Audio/Video Mute or Screen share state toggle relay
     */
    socket.on('toggle-media', ({ roomId, type, enabled }) => {
      if (roomId && rooms.has(roomId)) {
        const participant = rooms.get(roomId).get(socket.id);
        if (participant) {
          if (type === 'audio') participant.audioEnabled = enabled;
          if (type === 'video') participant.videoEnabled = enabled;
        }

        socket.to(roomId).emit('user-media-toggled', {
          socketId: socket.id,
          type,
          enabled,
        });
      }
    });

    /**
     * In-Call Clinical Chat Message
     */
    socket.on('send-chat', ({ roomId, message, senderName, senderRole }) => {
      if (!roomId || !message) return;

      const chatPayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: socket.id,
        senderName: senderName || 'Participant',
        senderRole: senderRole || 'patient',
        message,
        timestamp: new Date().toISOString(),
      };

      io.in(roomId).emit('new-chat-message', chatPayload);
    });

    /**
     * In-Call Real-Time Prescription Transmission (Doctor -> Patient)
     */
    socket.on('send-prescription', ({ roomId, prescription }) => {
      if (!roomId || !prescription) return;

      const rxPayload = {
        ...prescription,
        id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        doctorSocketId: socket.id,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to other peers in the room (the patient)
      socket.to(roomId).emit('incoming-prescription', rxPayload);
      console.log(`[WebRTC] In-call prescription dispatched in room ${roomId}: ${prescription.name}`);
    });

    /**
     * Prescription Acceptance / Decline Feedback (Patient -> Doctor)
     */
    socket.on('prescription-response', ({ roomId, prescriptionId, medicineName, status, patientName }) => {
      if (!roomId) return;

      io.in(roomId).emit('prescription-status-update', {
        prescriptionId,
        medicineName,
        status, // 'accepted' or 'declined'
        patientName: patientName || 'Patient',
        timestamp: new Date().toISOString(),
      });
      console.log(`[WebRTC] Prescription ${prescriptionId} (${medicineName}) ${status} by ${patientName}`);
    });

    /**
     * Real-time Key Points Synchronization
     */
    socket.on('sync-key-points', ({ roomId, points }) => {
      if (!roomId) return;
      socket.to(roomId).emit('key-points-synced', { points });
    });

    /**
     * Clean departure from room
     */
    const handleLeave = () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomParticipants = rooms.get(currentRoomId);
        const participant = roomParticipants.get(socket.id);

        roomParticipants.delete(socket.id);

        socket.to(currentRoomId).emit('user-left', {
          socketId: socket.id,
          userName: participant?.userName || 'Participant',
        });

        console.log(`[WebRTC] User ${participant?.userName || socket.id} left room: ${currentRoomId}`);

        if (roomParticipants.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
      currentRoomId = null;
    };

    socket.on('leave-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
