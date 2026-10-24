import i18n from "../i18n/index.js";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import webrtcService from '../services/webrtcService';
import api from '../services/api';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  FileText,
  Copy,
  Check,
  Clock,
  Shield,
  Stethoscope,
  User,
  Users,
  Send,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pill,
  Plus,
  Trash2,
  Share2,
  ClipboardList,
} from 'lucide-react';

const QUICK_MEDS = [
  {
    name: 'Paracetamol 650mg',
    dosage: '1 Tablet (650mg)',
    frequency: 'Twice daily after meals',
    duration: '3 Days',
    instructions: 'Take for fever or body ache. Drink plenty of water.',
  },
  {
    name: 'Amoxicillin 500mg',
    dosage: '1 Capsule (500mg)',
    frequency: 'Thrice daily after food',
    duration: '5 Days',
    instructions: 'Complete the entire course. Do not skip doses.',
  },
  {
    name: 'Cetirizine 10mg',
    dosage: '1 Tablet (10mg)',
    frequency: 'Once daily at bedtime',
    duration: '5 Days',
    instructions: 'May cause mild drowsiness. Avoid driving at night.',
  },
  {
    name: 'Pantoprazole 40mg',
    dosage: '1 Tablet (40mg)',
    frequency: 'Once daily empty stomach',
    duration: '7 Days',
    instructions: 'Take 30 minutes before breakfast with warm water.',
  },
  {
    name: 'Azithromycin 500mg',
    dosage: '1 Tablet (500mg)',
    frequency: 'Once daily after lunch',
    duration: '3 Days',
    instructions: 'Take at the same time each day after meals.',
  },
  {
    name: 'Oral Rehydration Salts (ORS)',
    dosage: '1 Sachet in 1L water',
    frequency: 'As needed throughout day',
    duration: '3 Days',
    instructions: 'Sip continuously to prevent dehydration and electrolyte loss.',
  },
];

const QUICK_KEY_POINTS = [
  'Patient reports mild fever & sore throat for 3 days',
  'Chest clear, normal vesicular breath sounds, SpO2 > 98%',
  'Advised adequate hydration (2.5 - 3L fluid/day)',
  'Advised steam inhalation twice daily',
  'Avoid cold beverages, fried foods, and dust exposure',
  'SOS Red-flag: Report immediately if breathlessness or high persistent fever occurs',
  'Schedule follow-up review after 4 days if symptoms do not resolve',
];

const VideoConsultation = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  // Media states
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'waiting', 'disconnected'

  // Peer states
  const [remotePeer, setRemotePeer] = useState(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [peerMediaState, setPeerMediaState] = useState({ audio: true, video: true });

  // Drawers: null, 'workspace', 'chat'
  // For doctors, start side-by-side workspace by default to write down notes & prescribe
  const [activeDrawer, setActiveDrawer] = useState(isDoctor ? 'workspace' : null);
  const [workspaceTab, setWorkspaceTab] = useState('points'); // 'points', 'rx', 'notes'
  const [copiedLink, setCopiedLink] = useState(false);

  // In-Call Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Doctor Consultation Notes (MongoDB saved)
  const [diagnosis, setDiagnosis] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [consultationSaved, setConsultationSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Call duration timer
  const [callDuration, setCallDuration] = useState(0);

  // Doctor Real-time Key Points State
  const [keyPoints, setKeyPoints] = useState([
    'Patient presented for virtual medical evaluation',
    'Vital signs and general symptoms reviewed',
  ]);
  const [newKeyPointText, setNewKeyPointText] = useState('');
  const [keyPointsSyncedNotice, setKeyPointsSyncedNotice] = useState(false);

  // Patient received key points
  const [sharedKeyPoints, setSharedKeyPoints] = useState([]);

  // Doctor In-Call Prescription Form State
  const [prescriptionForm, setPrescriptionForm] = useState({
    name: '',
    dosage: '1 Tablet (650mg)',
    frequency: 'Twice daily after meals',
    duration: '5 Days',
    instructions: 'Take after meals with warm water',
  });
  const [sentPrescriptions, setSentPrescriptions] = useState([]);
  const [rxNotice, setRxNotice] = useState('');

  // Patient In-Call Incoming Prescription Modal State
  const [incomingPrescription, setIncomingPrescription] = useState(null);
  const [acceptingRx, setAcceptingRx] = useState(false);
  const [rxAcceptedSuccess, setRxAcceptedSuccess] = useState(false);
  const [acceptedMedicationsList, setAcceptedMedicationsList] = useState([]);

  // Video Element Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Initialize WebRTC and Local Stream
  useEffect(() => {
    let timerInterval = null;

    const setupWebRTC = async () => {
      try {
        setConnectionStatus('waiting');

        // Setup Callbacks
        webrtcService.on('room-joined', ({ participants }) => {
          if (participants && participants.length > 0) {
            setRemotePeer(participants[0]);
            setConnectionStatus('connecting');
          } else {
            setConnectionStatus('waiting');
          }
        });

        webrtcService.on('user-joined', (participant) => {
          setRemotePeer(participant);
          setConnectionStatus('connecting');
        });

        webrtcService.on('peer-connected', (info) => {
          if (info.peerName) {
            setRemotePeer((prev) => ({
              ...prev,
              userName: info.peerName,
              userRole: info.peerRole,
            }));
          }
          setConnectionStatus('connected');
        });

        webrtcService.on('remote-stream', (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            setHasRemoteStream(true);
            setConnectionStatus('connected');
          }
        });

        webrtcService.on('connection-state', (state) => {
          if (state === 'connected') {
            setConnectionStatus('connected');
          } else if (state === 'disconnected' || state === 'failed') {
            setConnectionStatus('disconnected');
            setHasRemoteStream(false);
          }
        });

        webrtcService.on('peer-media-toggled', ({ type, enabled }) => {
          setPeerMediaState((prev) => ({
            ...prev,
            [type]: enabled,
          }));
        });

        webrtcService.on('new-chat-message', (message) => {
          setChatMessages((prev) => [...prev, message]);
        });

        // Real-Time In-Call Prescription Received (Patient screen)
        webrtcService.on('incoming-prescription', (rx) => {
          console.log('[WebRTC] In-call prescription received:', rx);
          setIncomingPrescription(rx);
        });

        // Real-Time Prescription Status Update (Doctor screen feedback)
        webrtcService.on('prescription-status-update', ({ prescriptionId, medicineName, status, patientName }) => {
          console.log(`[WebRTC] Prescription status update: ${medicineName} -> ${status} by ${patientName}`);
          setSentPrescriptions((prev) =>
            prev.map((item) =>
              item.id === prescriptionId ? { ...item, status, patientName } : item
            )
          );
        });

        // Real-Time Key Points Synced
        webrtcService.on('key-points-synced', ({ points }) => {
          setSharedKeyPoints(points || []);
        });

        webrtcService.on('user-left', ({ userName }) => {
          setRemotePeer(null);
          setHasRemoteStream(false);
          setConnectionStatus('waiting');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        webrtcService.on('screen-share-ended', () => {
          setIsScreenSharing(false);
        });

        // Start call and get local stream
        await webrtcService.joinRoom(roomId, user);

        if (localVideoRef.current && webrtcService.localStream) {
          localVideoRef.current.srcObject = webrtcService.localStream;
        }

        // Start timer
        timerInterval = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('WebRTC initialization failed:', err);
        setConnectionStatus('disconnected');
      }
    };

    if (roomId && user) {
      setupWebRTC();
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      webrtcService.leaveRoom();
    };
  }, [roomId, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Control handlers
  const handleToggleAudio = () => {
    const nextState = !audioEnabled;
    webrtcService.toggleAudio(nextState);
    setAudioEnabled(nextState);
  };

  const handleToggleVideo = () => {
    const nextState = !videoEnabled;
    webrtcService.toggleVideo(nextState);
    setVideoEnabled(nextState);
  };

  const handleToggleScreenShare = async () => {
    const sharing = await webrtcService.toggleScreenShare(isScreenSharing);
    setIsScreenSharing(sharing);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    webrtcService.sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleCopyInviteLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleEndCall = () => {
    webrtcService.leaveRoom();
    if (isDoctor) {
      navigate('/dashboard/consultations');
    } else {
      navigate('/dashboard/appointments');
    }
  };

  // --- DOCTOR KEY POINTS HANDLERS ---
  const handleAddKeyPoint = (e) => {
    e?.preventDefault();
    if (!newKeyPointText.trim()) return;
    const updated = [...keyPoints, newKeyPointText.trim()];
    setKeyPoints(updated);
    setNewKeyPointText('');
    webrtcService.syncKeyPoints(updated);
  };

  const handleRemoveKeyPoint = (index) => {
    const updated = keyPoints.filter((_, i) => i !== index);
    setKeyPoints(updated);
    webrtcService.syncKeyPoints(updated);
  };

  const handleAddQuickKeyPoint = (text) => {
    if (keyPoints.includes(text)) return;
    const updated = [...keyPoints, text];
    setKeyPoints(updated);
    webrtcService.syncKeyPoints(updated);
  };

  const handleSyncKeyPointsManual = () => {
    webrtcService.syncKeyPoints(keyPoints);
    setKeyPointsSyncedNotice(true);
    setTimeout(() => setKeyPointsSyncedNotice(false), 3000);
  };

  // --- DOCTOR IN-CALL REAL-TIME PRESCRIPTION DISPATCH ---
  const handleSelectQuickMed = (med) => {
    setPrescriptionForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions,
    });
  };

  const handleSendPrescriptionToPatient = (e) => {
    e.preventDefault();
    if (!prescriptionForm.name.trim()) return;

    const rxId = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rxPayload = {
      id: rxId,
      name: prescriptionForm.name.trim(),
      dosage: prescriptionForm.dosage.trim() || '1 Tablet',
      frequency: prescriptionForm.frequency.trim() || 'Twice daily',
      duration: prescriptionForm.duration.trim() || '5 Days',
      instructions: prescriptionForm.instructions.trim() || 'Take as advised with water.',
      doctorName: user?.name || 'Attending Doctor',
      doctorId: user?._id || user?.id,
      status: 'pending', // 'pending' | 'accepted' | 'declined'
      timestamp: new Date().toISOString(),
    };

    // Emit live to patient room via socket
    webrtcService.sendPrescription(rxPayload);

    // Track locally in doctor's sent list
    setSentPrescriptions((prev) => [rxPayload, ...prev]);
    setRxNotice(`Prescription for ${rxPayload.name} dispatched to patient!`);
    setTimeout(() => setRxNotice(''), 4000);

    // Clear form
    setPrescriptionForm({
      name: '',
      dosage: '1 Tablet',
      frequency: 'Twice daily after meals',
      duration: '5 Days',
      instructions: 'Take after meals with warm water',
    });
  };

  // --- PATIENT IN-CALL PRESCRIPTION ACCEPT / DECLINE ---
  const handlePatientAcceptPrescription = async () => {
    if (!incomingPrescription) return;

    setAcceptingRx(true);
    try {
      // Calculate end date from duration string
      let durationDays = 5;
      const match = incomingPrescription.duration?.match(/\d+/);
      if (match) {
        durationDays = parseInt(match[0], 10);
      }
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const payload = {
        name: incomingPrescription.name,
        dosage: incomingPrescription.dosage,
        frequency: incomingPrescription.frequency,
        instructions: incomingPrescription.instructions,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        doctor: incomingPrescription.doctorId || (remotePeer?.userRole === 'doctor' ? remotePeer?.userId : undefined),
        doctorName: incomingPrescription.doctorName || remotePeer?.userName || 'Attending Physician',
      };

      // 1. Persist directly to patient database
      const response = await api.post('/patient/medications', payload);

      if (response.success) {
        // 2. Respond live to doctor via WebRTC / socket signaling
        webrtcService.respondToPrescription(
          incomingPrescription.id,
          incomingPrescription.name,
          'accepted'
        );

        setAcceptedMedicationsList((prev) => [
          ...prev,
          { ...incomingPrescription, savedAt: new Date().toISOString() },
        ]);

        setRxAcceptedSuccess(true);
        setTimeout(() => {
          setIncomingPrescription(null);
          setRxAcceptedSuccess(false);
        }, 3500);
      }
    } catch (err) {
      console.error('Error accepting prescription:', err);
      alert(err.message || 'Failed to save medication to your patient record.');
    } finally {
      setAcceptingRx(false);
    }
  };

  const handlePatientDeclinePrescription = () => {
    if (!incomingPrescription) return;
    webrtcService.respondToPrescription(
      incomingPrescription.id,
      incomingPrescription.name,
      'declined'
    );
    setIncomingPrescription(null);
  };

  // Doctor logs consultation record to MongoDB
  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    setSaveError('');

    if (!diagnosis.trim()) {
      setSaveError('Diagnosis summary is required.');
      return;
    }

    setSavingConsultation(true);
    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(roomId);

      const payload = {
        patientId: remotePeer?.userId || undefined,
        appointmentId: isObjectId ? roomId : undefined,
        diagnosis,
        notes: `${consultationNotes}\n\nClinical Key Points:\n${keyPoints.map((p) => `• ${p}`).join('\n')}`,
      };

      const response = await api.post('/doctor/consultations', payload);
      if (response.success) {
        setConsultationSaved(true);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save consultation notes.');
    } finally {
      setSavingConsultation(false);
    }
  };

  // Format Timer
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    const hrs = Math.floor(mins / 60);
    const paddedSecs = String(secs).padStart(2, '0');
    const paddedMins = String(mins % 60).padStart(2, '0');

    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${paddedMins}:${paddedSecs}`;
    }
    return `${paddedMins}:${paddedSecs}`;
  }, [callDuration]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-slate-100 select-none overflow-hidden font-sans">
      
      {/* 1. TOP STATUS & NAVIGATION BAR */}
      <div className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-20">
        
        {/* Left: Branding & Patient / Room info */}
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-display tracking-tight">
                {i18n.t("Telehealth Video Consultation")}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {i18n.t("P2P Encrypted")}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center space-x-2">
              <span>{i18n.t("Room:")} <strong className="text-slate-300 font-mono">{roomId}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formattedDuration}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Live Connection Indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs shadow-inner">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-[11px] font-bold text-slate-300">
            {connectionStatus === 'connected' && 'Connected with Peer'}
            {connectionStatus === 'connecting' && 'Negotiating Connection...'}
            {connectionStatus === 'waiting' && 'Waiting for peer to join...'}
            {connectionStatus === 'disconnected' && 'Peer Disconnected'}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Doctor Quick Workspace Toggle */}
          {isDoctor && (
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'workspace' ? null : 'workspace')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeDrawer === 'workspace'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">{i18n.t("Side-by-Side Workspace")}</span>
              {sentPrescriptions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-dark-950 text-[10px] font-extrabold">
                  {sentPrescriptions.length} {i18n.t("Rx")}
                </span>
              )}
            </button>
          )}

          {/* Patient Doctor Notes Badge */}
          {!isDoctor && sharedKeyPoints.length > 0 && (
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'workspace' ? null : 'workspace')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeDrawer === 'workspace'
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <FileText className="w-4 h-4 text-brand-400" />
              <span className="hidden md:inline">{i18n.t("Doctor's Notes (")}{sharedKeyPoints.length})</span>
            </button>
          )}

          <button
            onClick={handleCopyInviteLink}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden md:inline">{copiedLink ? 'Copied Link' : 'Copy Room Link'}</span>
          </button>
        </div>

      </div>

      {/* 2. MAIN VIDEO DISPLAY VIEWPORT & SIDE-BY-SIDE PANELS */}
      <div className="flex-1 relative bg-slate-950 flex overflow-hidden">
        
        {/* Left: Video Area (Automatically resizes side-by-side with workspace) */}
        <div className="flex-1 relative flex items-center justify-center p-3 md:p-5 overflow-hidden transition-all duration-300">
          
          {/* Remote Video Stream (Main Stage) */}
          <div className="w-full h-full relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 flex items-center justify-center shadow-2xl">
            
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                hasRemoteStream && peerMediaState.video ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            />

            {/* Remote Peer Placeholder when video is off or waiting */}
            {(!hasRemoteStream || !peerMediaState.video) && (
              <div className="text-center p-6 space-y-4 max-w-md">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-800 border-2 border-slate-700 mx-auto flex items-center justify-center text-3xl font-extrabold text-brand-400 shadow-xl relative">
                  {remotePeer?.userName
                    ? remotePeer.userName.slice(0, 2).toUpperCase()
                    : <User className="w-12 h-12 text-slate-500" />}
                  
                  {connectionStatus === 'connected' && (
                    <span className="absolute bottom-1 right-1 p-2 rounded-full bg-emerald-500 text-dark-950">
                      <Shield className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg md:text-xl font-bold text-white font-display">
                    {remotePeer?.userName || 'Awaiting Other Participant...'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {connectionStatus === 'waiting'
                      ? 'Share the room link or wait for the other party to enter this consultation room.'
                      : connectionStatus === 'connected' && !peerMediaState.video
                      ? 'Participant has muted camera'
                      : 'Connecting WebRTC audio and video stream...'}
                  </p>
                </div>

                {connectionStatus === 'waiting' && (
                  <button
                    onClick={handleCopyInviteLink}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-md"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{i18n.t("Copy Room URL to Invite")}</span>
                  </button>
                )}
              </div>
            )}

            {/* Remote Peer Overlay Tag */}
            {remotePeer && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs shadow-lg">
                <span className="font-bold text-white">{remotePeer.userName}</span>
                <span className="text-[10px] uppercase font-bold text-brand-400 px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">
                  {remotePeer.userRole}
                </span>
                {!peerMediaState.audio && (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            )}

            {/* Floating Local Stream PiP */}
            <div className="absolute bottom-4 right-4 w-36 h-28 sm:w-52 sm:h-36 rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 shadow-2xl z-20 group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity ${
                  videoEnabled ? 'opacity-100' : 'opacity-0 absolute'
                }`}
              />

              {!videoEnabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-brand-400 text-xs">
                    {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-medium">{i18n.t("Camera Off")}</span>
                </div>
              )}

              {/* Local Stream Label */}
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-sm text-[9px] font-bold text-slate-300 border border-slate-800 flex items-center space-x-1">
                <span>{i18n.t("You (")}{user?.role})</span>
                {!audioEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
              </div>
            </div>

            {/* ======================================================== */}
            {/* PATIENT IN-CALL SCREEN: REAL-TIME INCOMING PRESCRIPTION MODAL */}
            {/* ======================================================== */}
            {incomingPrescription && (
              <div className="absolute inset-x-4 top-4 md:inset-x-auto md:right-8 md:top-8 md:w-[440px] z-30 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
                <div className="bg-slate-900/98 backdrop-blur-2xl border-2 border-emerald-500/50 rounded-3xl p-5 shadow-2xl shadow-emerald-500/20 ring-1 ring-emerald-500/30 text-left">
                  
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Pill className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            {i18n.t("Incoming E-Prescription")}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {i18n.t("Live Call")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {i18n.t("Prescribed by")} <strong className="text-slate-200">{i18n.t("Dr.")} {incomingPrescription.doctorName || 'Attending Physician'}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handlePatientDeclinePrescription}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title={i18n.t("Dismiss")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prescription Body Details */}
                  <div className="py-4 space-y-3">
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-emerald-300 font-display">
                          {incomingPrescription.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold">
                          {incomingPrescription.duration || '5 Days'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Dosage")}</span>
                          <span className="text-slate-200 font-semibold">{incomingPrescription.dosage}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Frequency")}</span>
                          <span className="text-slate-200 font-semibold">{incomingPrescription.frequency}</span>
                        </div>
                      </div>

                      {incomingPrescription.instructions && (
                        <div className="text-[11px] pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Doctor Instructions")}</span>
                          <p className="text-slate-300 italic">"{incomingPrescription.instructions}"</p>
                        </div>
                      )}
                    </div>

                    {/* Success Notice if already accepted */}
                    {rxAcceptedSuccess ? (
                      <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                        <span>{i18n.t("Prescription Accepted! Successfully stored into your Medical Records & Health Timeline.")}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        {i18n.t("Clicking accept will securely link this medication to your patient health profile and log an immutable entry in your medical history.")}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!rxAcceptedSuccess && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={handlePatientAcceptPrescription}
                        disabled={acceptingRx}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/25"
                      >
                        {acceptingRx ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-dark-950" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{i18n.t("Accept & Add to My Records")}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handlePatientDeclinePrescription}
                        disabled={acceptingRx}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                      >
                        {i18n.t("Decline")}
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. SIDE-BY-SIDE PANELS (Doctor Workspace / Chat) */}
        {/* ======================================================== */}
        {activeDrawer && (
          <div className="w-full sm:w-96 md:w-[420px] lg:w-[460px] border-l border-slate-800 bg-slate-900/98 backdrop-blur-xl flex flex-col h-full z-30 text-left shadow-2xl transition-all duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {activeDrawer === 'workspace' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {isDoctor ? 'Clinical Workspace & Copilot' : "Doctor's Consultation Notes"}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {isDoctor ? 'Side-by-side notes, instant Rx & record keeper' : 'Live synced clinical takeaways & prescriptions'}
                      </p>
                    </div>
                  </>
                )}
                {activeDrawer === 'chat' && (
                  <>
                    <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {i18n.t("In-Call Chat")}
                      </h3>
                      <p className="text-[10px] text-slate-400">{i18n.t("Encrypted instant messages during call")}</p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={i18n.t("Close drawer")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ==================================================== */}
            {/* WORKSPACE DRAWER CONTENT */}
            {/* ==================================================== */}
            {activeDrawer === 'workspace' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* DOCTOR VIEW: Workspace Sub-Tabs */}
                {isDoctor ? (
                  <>
                    {/* Sub-tab Navigation */}
                    <div className="px-4 pt-3 pb-2 border-b border-slate-800/80 flex items-center gap-1.5 bg-slate-950/40">
                      <button
                        onClick={() => setWorkspaceTab('points')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                          workspaceTab === 'points'
                            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                            : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{i18n.t("Key Points (")}{keyPoints.length})</span>
                      </button>
                      <button
                        onClick={() => setWorkspaceTab('rx')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                          workspaceTab === 'rx'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
                        }`}
                      >
                        <Pill className="w-3.5 h-3.5" />
                        <span>{i18n.t("Prescribe (")}{sentPrescriptions.length})</span>
                      </button>
                      <button
                        onClick={() => setWorkspaceTab('notes')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                          workspaceTab === 'notes'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                            : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>{i18n.t("Diagnosis")}</span>
                      </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      
                      {/* TAB 1: CLINICAL KEY POINTS NOTE-TAKING */}
                      {workspaceTab === 'points' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center space-x-1">
                                <span>{i18n.t("Consultation Key Points")}</span>
                                <span className="text-[10px] text-slate-400 font-normal">{i18n.t("(Shared with patient)")}</span>
                              </h4>
                              <p className="text-[10px] text-slate-400">
                                {i18n.t("Write down bullet observations side-by-side during the video call.")}
                              </p>
                            </div>
                            <button
                              onClick={handleSyncKeyPointsManual}
                              className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-[10px] font-bold flex items-center space-x-1 transition-all"
                              title={i18n.t("Sync to patient screen")}
                            >
                              <Share2 className="w-3 h-3" />
                              <span>{keyPointsSyncedNotice ? 'Synced!' : 'Sync'}</span>
                            </button>
                          </div>

                          {/* Quick Chips */}
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {i18n.t("Quick Clinical Templates")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_KEY_POINTS.map((chip, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAddQuickKeyPoint(chip)}
                                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left truncate max-w-full"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Add New Key Point Form */}
                          <form onSubmit={handleAddKeyPoint} className="flex gap-2">
                            <input
                              type="text"
                              value={newKeyPointText}
                              onChange={(e) => setNewKeyPointText(e.target.value)}
                              placeholder={i18n.t("Write a clinical point (e.g. Advised rest, gargle 3x)...")}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                            />
                            <button
                              type="submit"
                              className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs flex items-center space-x-1 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="hidden sm:inline">{i18n.t("Add")}</span>
                            </button>
                          </form>

                          {/* Key Points List */}
                          <div className="space-y-2">
                            {keyPoints.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                                {i18n.t("No key points noted yet. Type points above or select quick templates.")}
                              </p>
                            ) : (
                              keyPoints.map((point, index) => (
                                <div
                                  key={index}
                                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2 text-xs group hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-start space-x-2">
                                    <span className="w-4 h-4 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {index + 1}
                                    </span>
                                    <span className="text-slate-200 leading-relaxed">{point}</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveKeyPoint(index)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition-all shrink-0"
                                    title={i18n.t("Delete point")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {keyPointsSyncedNotice && (
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{i18n.t("Key points successfully synchronized with the patient's video screen!")}</span>
                            </div>
                          )}

                        </div>
                      )}

                      {/* TAB 2: IN-CALL REAL-TIME PRESCRIPTION DISPATCH */}
                      {workspaceTab === 'rx' && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <Pill className="w-4 h-4 text-emerald-400" />
                              <span>{i18n.t("Instant In-Call E-Prescription")}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {i18n.t("Prescriptions appear live on patient's screen for 1-click acceptance into their medical records.")}
                            </p>
                          </div>

                          {/* Quick Medicine Shortcuts */}
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {i18n.t("Common Medications (Tap to fill)")}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_MEDS.map((med, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectQuickMed(med)}
                                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 text-slate-300 border border-slate-700 transition-all"
                                >
                                  {med.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Prescription Creation Form */}
                          <form onSubmit={handleSendPrescriptionToPatient} className="space-y-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                            {rxNotice && (
                              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{rxNotice}</span>
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {i18n.t("Medication Name & Strength *")}
                              </label>
                              <input
                                type="text"
                                required
                                value={prescriptionForm.name}
                                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, name: e.target.value })}
                                placeholder={i18n.t("e.g. Amoxicillin 500mg, Paracetamol 650mg")}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {i18n.t("Dosage")}
                                </label>
                                <input
                                  type="text"
                                  value={prescriptionForm.dosage}
                                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                                  placeholder={i18n.t("1 Tablet, 5ml")}
                                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {i18n.t("Duration")}
                                </label>
                                <input
                                  type="text"
                                  value={prescriptionForm.duration}
                                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                                  placeholder={i18n.t("3 Days, 5 Days")}
                                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {i18n.t("Frequency")}
                              </label>
                              <select
                                value={prescriptionForm.frequency}
                                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              >
                                <option value="Once daily (Morning)">{i18n.t("Once daily (Morning)")}</option>
                                <option value="Twice daily after meals">{i18n.t("Twice daily after meals")}</option>
                                <option value="Thrice daily after food">{i18n.t("Thrice daily after food")}</option>
                                <option value="Once daily at bedtime">{i18n.t("Once daily at bedtime")}</option>
                                <option value="As needed for pain/fever (SOS)">{i18n.t("As needed for pain/fever (SOS)")}</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {i18n.t("Clinical Instructions")}
                              </label>
                              <input
                                type="text"
                                value={prescriptionForm.instructions}
                                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                                placeholder={i18n.t("Take after meals with warm water...")}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20"
                            >
                              <Send className="w-4 h-4" />
                              <span>{i18n.t("Send Prescription to Patient Screen")}</span>
                            </button>
                          </form>

                          {/* Prescriptions Sent History & Real-Time Status Tracker */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {i18n.t("In-Call Prescriptions Status (")}{sentPrescriptions.length})
                            </span>

                            {sentPrescriptions.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-2xl">
                                {i18n.t("No prescriptions dispatched yet during this call.")}
                              </p>
                            ) : (
                              sentPrescriptions.map((rx) => (
                                <div
                                  key={rx.id}
                                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white flex items-center space-x-1">
                                      <Pill className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>{rx.name}</span>
                                    </span>
                                    
                                    {/* Status Badge */}
                                    {rx.status === 'accepted' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-extrabold flex items-center space-x-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>{i18n.t("Accepted & Saved")}</span>
                                      </span>
                                    ) : rx.status === 'declined' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-extrabold flex items-center space-x-1">
                                        <X className="w-3 h-3" />
                                        <span>{i18n.t("Declined")}</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold flex items-center space-x-1 animate-pulse">
                                        <Clock className="w-3 h-3" />
                                        <span>{i18n.t("Awaiting Patient...")}</span>
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-400">
                                    {rx.dosage} • {rx.frequency} • {rx.duration}
                                  </p>

                                  {rx.status === 'accepted' && (
                                    <p className="text-[10px] text-emerald-400/90 font-medium flex items-center space-x-1">
                                      <Check className="w-3 h-3" />
                                      <span>{i18n.t("Patient accepted and medication stored in patient health records!")}</span>
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                        </div>
                      )}

                      {/* TAB 3: DIAGNOSIS & CLINICAL RECORDS SAVER */}
                      {workspaceTab === 'notes' && (
                        <form onSubmit={handleSaveConsultation} className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <ClipboardList className="w-4 h-4 text-blue-400" />
                              <span>{i18n.t("Clinical Consultation Summary")}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {i18n.t("Permanently archive consultation notes and diagnosis to MediConnect.")}
                            </p>
                          </div>

                          {saveError && (
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                              {saveError}
                            </div>
                          )}
                          {consultationSaved && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>{i18n.t("Consultation record saved to patient medical profile!")}</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {i18n.t("Primary Clinical Diagnosis *")}
                            </label>
                            <input
                              type="text"
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              placeholder={i18n.t("e.g. Acute Viral Bronchitis, Type 2 Diabetes Follow-up")}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {i18n.t("Clinical Findings & Directives")}
                            </label>
                            <textarea
                              rows={5}
                              value={consultationNotes}
                              onChange={(e) => setConsultationNotes(e.target.value)}
                              placeholder={i18n.t("Record patient complaints, observed symptoms, advice...")}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={savingConsultation}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20"
                          >
                            {savingConsultation ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{i18n.t("Save Consultation to Medical Record")}</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}

                    </div>
                  </>
                ) : (
                  /* ============================================== */
                  /* PATIENT VIEW: Shared Key Points & Accepted Rx  */
                  /* ============================================== */
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-brand-400" />
                        <span>{i18n.t("Doctor's Key Consultation Points")}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {i18n.t("Live takeaways and advice recorded by Dr.")} {remotePeer?.userName || 'Physician'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {sharedKeyPoints.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                          {i18n.t("Doctor hasn't synced key points yet. They will appear here in real-time as the doctor writes them.")}
                        </p>
                      ) : (
                        sharedKeyPoints.map((point, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-2 text-xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-slate-200 leading-relaxed font-medium">{point}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Prescriptions Accepted in Call */}
                    <div className="pt-2 space-y-2">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Pill className="w-4 h-4 text-emerald-400" />
                        <span>{i18n.t("Prescriptions Saved in this Call (")}{acceptedMedicationsList.length})</span>
                      </h4>

                      {acceptedMedicationsList.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-2xl">
                          {i18n.t("No prescriptions accepted yet. When the doctor prescribes a medicine, it appears on your screen to review and accept.")}
                        </p>
                      ) : (
                        acceptedMedicationsList.map((rx, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-300">{rx.name}</span>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                {i18n.t("Active in Records")}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">
                              {rx.dosage} • {rx.frequency} ({rx.duration})
                            </p>
                            {rx.instructions && (
                              <p className="text-[10px] text-slate-400 italic">"{rx.instructions}"</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* ==================================================== */}
            {/* CHAT DRAWER CONTENT */}
            {/* ==================================================== */}
            {activeDrawer === 'chat' && (
              <div className="flex flex-col h-full justify-between p-4">
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">
                      {i18n.t("No messages yet. Send messages, lab values, or instructions during the call.")}
                    </p>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderName === user?.name;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9px] text-slate-500 font-bold mb-0.5">
                            {msg.senderName} ({msg.senderRole})
                          </span>
                          <div
                            className={`p-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                              isMe
                                ? 'bg-brand-500 text-dark-950 font-medium'
                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-slate-600 mt-0.5">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={i18n.t("Type message...")}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </div>

      {/* 4. BOTTOM CLINICAL CONTROLS TOOLBAR */}
      <div className="h-20 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md px-4 flex items-center justify-center gap-3 md:gap-4 z-20">
        
        {/* Mic Toggle */}
        <button
          onClick={handleToggleAudio}
          title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center ${
            audioEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 ring-1 ring-rose-500/30'
          }`}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={handleToggleVideo}
          title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center ${
            videoEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 ring-1 ring-rose-500/30'
          }`}
        >
          {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={handleToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center ${
            isScreenSharing
              ? 'bg-brand-500 text-dark-950 font-bold border border-brand-400 ring-2 ring-brand-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* In-Call Chat Toggle */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
          title={i18n.t("In-call Chat")}
          className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center relative ${
            activeDrawer === 'chat'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {chatMessages.length > 0 && activeDrawer !== 'chat' && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-400 rounded-full" />
          )}
        </button>

        {/* Doctor Workspace Toggle (Key Points & Real-time Rx) */}
        {isDoctor ? (
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'workspace' ? null : 'workspace')}
            title={i18n.t("Doctor Workspace (Key Points & Prescribe)")}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center relative ${
              activeDrawer === 'workspace'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 ring-2 ring-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            {sentPrescriptions.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-dark-950 text-[9px] font-extrabold shadow-sm">
                {sentPrescriptions.length}
              </span>
            )}
          </button>
        ) : (
          /* Patient Notes & Rx Drawer Toggle */
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'workspace' ? null : 'workspace')}
            title={i18n.t("Doctor's Notes & Prescriptions")}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center relative ${
              activeDrawer === 'workspace'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            {sharedKeyPoints.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-dark-950 text-[9px] font-extrabold shadow-sm">
                {sharedKeyPoints.length}
              </span>
            )}
          </button>
        )}

        {/* End Call / Leave Room */}
        <button
          onClick={handleEndCall}
          title={i18n.t("End Consultation")}
          className="px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center space-x-2"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline text-xs">{i18n.t("End Call")}</span>
        </button>

      </div>

    </div>
  );
};

export default VideoConsultation;
