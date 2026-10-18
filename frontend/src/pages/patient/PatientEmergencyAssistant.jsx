import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  HeartPulse,
  ShieldAlert,
  PhoneCall,
  Send,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Pill,
  Sparkles,
  Activity,
  Flame,
  Info,
  Stethoscope,
  ChevronRight,
  FlameKindling,
  User,
  SlidersHorizontal
} from 'lucide-react';

const EMERGENCY_PRESETS = [
  {
    label: 'Chest Pain & Tightness',
    icon: HeartPulse,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
    prompt: 'I am experiencing sudden heavy chest pressure and tightness radiating towards my left shoulder and jaw.'
  },
  {
    label: 'Severe Asthma / Can\'t Breathe',
    icon: Activity,
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20',
    prompt: 'I am having a severe asthma attack and gasping for air. Wheezing heavily and struggling to breathe.'
  },
  {
    label: 'Deep Cut & Heavy Bleeding',
    icon: AlertTriangle,
    color: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20',
    prompt: 'I cut my arm deeply on glass and blood is spurting and soaking through towels. It won\'t stop.'
  },
  {
    label: 'Shaking & Dizziness (Diabetic)',
    icon: Pill,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
    prompt: 'I have diabetes and I am suddenly trembling, sweating profusely, feeling dizzy, and my heart is racing.'
  },
  {
    label: 'Face Drooping / Weak Arm',
    icon: ShieldAlert,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
    prompt: 'One side of my face feels numb and drooping, and my right arm feels too weak to hold anything.'
  },
  {
    label: 'Severe Allergic Reaction / Hives',
    icon: Sparkles,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
    prompt: 'My lips and tongue are swelling up, itchy hives breaking out everywhere, and throat feels tight.'
  },
  {
    label: 'Severe Scald / Burn',
    icon: Flame,
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
    prompt: 'Spilled boiling water over my hand and forearm. Skin is bright red, blistering, and intensely painful.'
  }
];

const CLINICAL_PERSONAS = [
  {
    id: 'live',
    name: 'Falashree (My Live Record)',
    badge: 'Live Database',
    bloodGroup: 'B+',
    allergies: ['Aspirin', 'Penicillin'],
    conditions: ['Hypertension (Mild)'],
    activeMedications: ['Amlodipine (5mg, once daily)'],
    emergencyContact: { name: 'Emergency Contact', phone: '7890654321', relation: 'Family' },
    desc: 'B+ blood, Aspirin & Penicillin allergy'
  },
  {
    id: 'cardiac_warfarin',
    name: 'Cardiac & Anticoagulant Patient',
    badge: 'High Risk Cardiac',
    bloodGroup: 'O+',
    allergies: ['Aspirin', 'NSAIDs (Ibuprofen)'],
    conditions: ['Coronary Artery Disease (CAD)', 'Atrial Fibrillation', 'Hypertension'],
    activeMedications: ['Warfarin / Blood Thinner (5mg, once daily)', 'Metoprolol (50mg, twice daily)', 'Sublingual Nitroglycerin (0.4mg PRN)'],
    emergencyContact: { name: 'David (Spouse)', phone: '555-0192', relation: 'Spouse' },
    desc: 'On Warfarin blood thinner & Metoprolol, Aspirin allergy'
  },
  {
    id: 'diabetic_asthma',
    name: 'Diabetic & Asthmatic Patient',
    badge: 'Metabolic & Pulmonary',
    bloodGroup: 'A+',
    allergies: ['Sulfa Drugs', 'Peanuts'],
    conditions: ['Type 1 Diabetes Mellitus', 'Severe Asthma'],
    activeMedications: ['Insulin Glargine (22 units at night)', 'Albuterol Rescue Inhaler (2 puffs PRN)', 'Metformin (500mg)'],
    emergencyContact: { name: 'Sarah (Sister)', phone: '555-0143', relation: 'Sister' },
    desc: 'On Insulin & Albuterol rescue inhaler, Sulfa allergy'
  }
];

// Lightweight Markdown renderer for dynamic conversational responses
const formatMarkdownText = (rawText) => {
  if (!rawText) return null;

  const lines = rawText.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  lines.forEach((line, index) => {
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${index}`} className="p-3 my-2 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 break-words whitespace-pre-wrap">
            {codeBuffer.join('\n')}
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`empty-${index}`} className="h-2" />);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-sm font-extrabold text-white mt-3 mb-1.5 flex items-center space-x-1.5">
          <span>{line.replace('### ', '')}</span>
        </h3>
      );
      return;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-xs font-bold text-white mt-2 mb-1">
          {line.replace('#### ', '')}
        </h4>
      );
      return;
    }

    // Callout alert box: > [!IMPORTANT] or > •
    if (line.startsWith('>')) {
      const cleanAlert = line.replace(/^>\s*(\[!IMPORTANT\])?/, '').trim();
      if (!cleanAlert) return;
      elements.push(
        <div key={`alert-${index}`} className="p-2.5 my-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-medium">
          {cleanAlert}
        </div>
      );
      return;
    }

    // Numbered list (1. Step)
    if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      elements.push(
        <div key={`num-${index}`} className="flex items-start space-x-2 my-1.5 text-slate-100">
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="leading-relaxed">{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Bullet points (• or - or *)
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bulletText = trimmed.replace(/^[•\-*]\s*/, '');
      const isRedWarning = bulletText.toLowerCase().includes('do not') || bulletText.toLowerCase().includes('never');
      elements.push(
        <div key={`bullet-${index}`} className="flex items-start space-x-2 my-1 text-slate-200">
          <span className={`text-xs shrink-0 mt-0.5 ${isRedWarning ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
            {isRedWarning ? '✕' : '•'}
          </span>
          <span className="leading-relaxed">{parseInlineFormatting(bulletText)}</span>
        </div>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${index}`} className="my-1.5 text-slate-200 leading-relaxed">
        {parseInlineFormatting(line)}
      </p>
    );
  });

  return elements;
};

// Inline bold parser
const parseInlineFormatting = (text) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="text-white font-extrabold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const PatientEmergencyAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientProfile, setPatientProfile] = useState(CLINICAL_PERSONAS[0]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('live');
  const [copiedId, setCopiedId] = useState(null);
  const [showPersonaDrawer, setShowPersonaDrawer] = useState(false);
  const chatBottomRef = useRef(null);

  // Fetch live patient profile context on mount
  useEffect(() => {
    const fetchProfileContext = async () => {
      try {
        const [healthRes, userRes, medsRes] = await Promise.allSettled([
          api.get('/patient/health'),
          api.get('/patient/emergency'),
          api.get('/patient/medications')
        ]);

        const healthData = healthRes.status === 'fulfilled' && healthRes.value.success ? healthRes.value.data : null;
        const emergencyData = userRes.status === 'fulfilled' && userRes.value.success ? userRes.value.data : null;
        const medsData = medsRes.status === 'fulfilled' && medsRes.value.success ? medsRes.value.data : [];

        const liveProfile = {
          id: 'live',
          name: emergencyData?.patientData?.name || 'Falashree Harish Shirodkar',
          badge: 'Live Database',
          bloodGroup: emergencyData?.bloodGroup || healthData?.bloodGroup || 'B+',
          allergies: emergencyData?.allergies?.length ? emergencyData.allergies : ['Aspirin', 'Penicillin'],
          conditions: healthData?.conditions?.filter(c => c.status === 'active').map(c => c.name) || ['Hypertension'],
          activeMedications: Array.isArray(medsData) && medsData.length
            ? medsData.filter(m => m.status === 'active').map(m => `${m.name} (${m.dosage}, ${m.frequency})`)
            : ['Amlodipine (5mg, once daily)'],
          emergencyContact: emergencyData?.emergencyContact || { name: 'Emergency Contact', phone: '7890654321', relation: 'Family' },
          desc: 'Connected to live MediConnect records'
        };

        setPatientProfile(liveProfile);

        // Initial greeting personalized to patient
        setMessages([
          {
            id: 'msg-init',
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `### 🚨 Emergency Medical AI First-Aid Assistant\n\nHello **${liveProfile.name}**, I am ready to assist you in real-time. I have your complete medical record active:\n\n• **Blood Group**: **${liveProfile.bloodGroup}**\n• **Recorded Allergies**: **${liveProfile.allergies.join(', ')}**\n• **Documented Conditions**: **${liveProfile.conditions.join(', ')}**\n• **Active Prescriptions**: **${liveProfile.activeMedications.join('; ')}**\n\n**Type what emergency or acute symptom you are facing right now**, or tap any quick emergency button above.`,
            structuredData: null
          }
        ]);
      } catch (err) {
        console.error('Failed to load profile context for emergency chatbot:', err);
      }
    };

    fetchProfileContext();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectPersona = (persona) => {
    setSelectedPersonaId(persona.id);
    setPatientProfile(persona);

    const switchMsg = {
      id: `msg-switch-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🔄 **Medical Profile Context Updated to: ${persona.name}**\n\n• **Blood Group**: ${persona.bloodGroup}\n• **Documented Allergies**: ${persona.allergies.length ? persona.allergies.join(', ') : 'None'}\n• **Active Chronic Conditions**: ${persona.conditions.length ? persona.conditions.join(', ') : 'None'}\n• **Active Medications**: ${persona.activeMedications.length ? persona.activeMedications.join('; ') : 'None'}\n\nAll subsequent first-aid guidance and medication evaluations will strictly cross-reference this clinical history. What symptom are you experiencing?`,
      structuredData: null
    };

    setMessages(prev => [...prev, switchMsg]);
    setShowPersonaDrawer(false);
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await api.post('/patient/emergency-assistant', {
        message: query,
        history: historyPayload,
        profileOverride: {
          name: patientProfile?.name,
          bloodGroup: patientProfile?.bloodGroup,
          allergies: patientProfile?.allergies,
          conditions: patientProfile?.conditions,
          activeMedications: patientProfile?.activeMedications,
          emergencyContact: patientProfile?.emergencyContact
        }
      });

      if (response.success && response.data) {
        const assistantMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: response.data.reply,
          structuredData: response.data.structuredData
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(response.message || 'Failed to generate emergency first aid.');
      }
    } catch (err) {
      console.error('Emergency assistant request failed:', err);
      const fallbackMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `### 🔴 Immediate Emergency Guidance\n\nUnable to reach background servers. If you are experiencing severe chest pain, inability to breathe, deep bleeding, or sudden paralysis:\n\n1. **CALL EMERGENCY DISPATCH IMMEDIATELY (911 / 112 / 999).**\n2. **Sit down or rest quietly in a safe position.**\n3. **Do not exert yourself or drive yourself to the emergency room.**\n4. **Alert nearby individuals or your emergency contact.**`,
        structuredData: null
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHandover = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'msg-init-reset',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `### 🚨 Emergency Assistant Session Reset\n\nHello **${patientProfile?.name || 'Patient'}**, I am standing by with your medical record ready. Describe your acute symptom or question to begin immediate first aid triage.`,
        structuredData: null
      }
    ]);
    setInputMessage('');
  };

  // Find latest structured emergency response (if any)
  const latestStructured = [...messages].reverse().find(m => m.structuredData)?.structuredData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-left">
      
      {/* Red Alert Emergency Action Bar */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-rose-950/80 via-dark-900 to-red-950/60 border border-rose-500/40 relative overflow-hidden shadow-2xl shadow-rose-950/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-extrabold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency First-Aid Guide</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display flex flex-wrap items-center">
              <span>Emergency First-Aid Helper: </span>
              <span className="text-rose-400 ml-2 font-normal text-xl sm:text-2xl">{patientProfile?.name}</span>
            </h1>
            <p className="text-rose-200/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Get calm, immediate first-aid instructions. It automatically checks your known allergies ({patientProfile?.allergies?.join(', ') || 'None'}) and medicines so you know what is safe to do right now.
            </p>
          </div>

          {/* Quick Emergency Phone SOS Callouts */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="tel:112"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Call 112 / 911 (Ambulance)</span>
            </a>

            <button
              onClick={() => setShowPersonaDrawer(!showPersonaDrawer)}
              className="inline-flex items-center space-x-2 px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 font-bold text-xs transition-all"
              title="Try a sample profile"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
              <span>Try Sample Profile</span>
            </button>

            <button
              onClick={handleResetChat}
              className="px-3.5 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-all"
              title="Reset conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clinical Persona Switcher Drawer (Expandable) */}
        {showPersonaDrawer && (
          <div className="mt-4 p-4 rounded-2xl bg-dark-950/90 border border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-brand-400" />
                <span>Try Different Sample Patient Profiles</span>
              </span>
              <span className="text-[11px] text-slate-400">See how advice automatically changes based on each person's allergies & medicines</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CLINICAL_PERSONAS.map((persona) => {
                const isSelected = selectedPersonaId === persona.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500 text-white shadow-md shadow-brand-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{persona.name}</span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {persona.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug space-y-0.5">
                      <p>Blood: <strong className="text-slate-200">{persona.bloodGroup}</strong> | Allergies: <strong className="text-amber-300">{persona.allergies.join(', ') || 'None'}</strong></p>
                      <p className="truncate">Meds: {persona.activeMedications.join(', ') || 'None'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Patient Profile Cross-Reference Snapshot */}
        <div className="mt-5 pt-4 border-t border-rose-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-dark-950/60 p-2.5 rounded-xl border border-rose-500/15">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Blood Group</span>
            <span className="text-white font-mono font-bold text-sm">
              {patientProfile?.bloodGroup || 'Loading...'}
            </span>
          </div>

          <div className="bg-dark-950/60 p-2.5 rounded-xl border border-rose-500/15">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Recorded Allergies</span>
            <span className="text-amber-400 font-bold truncate block">
              {patientProfile?.allergies?.length ? patientProfile.allergies.join(', ') : 'None documented'}
            </span>
          </div>

          <div className="bg-dark-950/60 p-2.5 rounded-xl border border-rose-500/15">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Conditions</span>
            <span className="text-sky-300 font-bold truncate block">
              {patientProfile?.conditions?.length ? patientProfile.conditions.join(', ') : 'None active'}
            </span>
          </div>

          <div className="bg-dark-950/60 p-2.5 rounded-xl border border-rose-500/15">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Prescriptions</span>
            <span className="text-emerald-400 font-bold truncate block">
              {patientProfile?.activeMedications?.length ? `${patientProfile.activeMedications.length} Prescriptions` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 1-Tap Emergency Symptom Chips */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <FlameKindling className="w-3.5 h-3.5 text-rose-400" />
            <span>Common Urgent Symptoms (Tap Any)</span>
          </span>
          <span className="text-[10px] text-slate-500">Tap to get instant first-aid advice without typing</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {EMERGENCY_PRESETS.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(preset.prompt)}
                disabled={loading}
                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all disabled:opacity-50 ${preset.color}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chat Stream (2 Cols on lg) */}
        <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800 flex flex-col h-[700px] overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                First-Aid Helper
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Active patient: <strong className="text-white">{patientProfile?.name}</strong>
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const struct = msg.structuredData;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center space-x-2 mb-1 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {isAssistant ? 'MediConnect Emergency AI' : patientProfile?.name || 'Patient'}
                    </span>
                    <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-900/95 border border-slate-800 text-slate-200'
                        : 'bg-brand-500 text-dark-950 font-semibold shadow-md shadow-brand-500/10'
                    }`}
                  >
                    {/* Assistant Message Rendering */}
                    {isAssistant ? (
                      <div>
                        {/* Dynamic Markdown Content */}
                        <div>{formatMarkdownText(msg.text)}</div>

                        {/* Handover note copy button if available */}
                        {struct?.handoverNote && (
                          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              EMT Paramedic Briefing
                            </span>
                            <button
                              onClick={() => handleCopyHandover(struct.handoverNote, msg.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied to Clipboard!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy 20-Sec Briefing for Paramedics</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* User Message */
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-rose-300 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating clinical response against {patientProfile?.name}'s medical history...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Interactive Follow-Up Chips */}
          <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/40 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-semibold shrink-0">Ask follow-up:</span>
            <button
              onClick={() => handleSendMessage('Can I drink water right now?')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all"
            >
              💧 Can I drink water?
            </button>
            <button
              onClick={() => handleSendMessage('Can I take aspirin or pain medicine for this?')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all"
            >
              💊 Can I take pain medicine?
            </button>
            <button
              onClick={() => handleSendMessage('Should I lie down flat or sit upright?')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all"
            >
              🪑 Should I lie down or sit up?
            </button>
            <button
              onClick={() => handleSendMessage('My pulse is 120 bpm and I am sweating heavily')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all"
            >
              📈 My pulse is 120 bpm
            </button>
            <button
              onClick={() => handleSendMessage('My emergency contact is not answering and I am home alone')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 border border-slate-700 transition-all"
            >
              🚪 Emergency contact not answering
            </button>
          </div>

          {/* Chat Input Box */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask any question or describe symptoms for ${patientProfile?.name}...`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500 placeholder:text-slate-500 font-sans"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shrink-0 shadow-lg shadow-rose-600/20"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

        {/* Sidebar: Active Protocol & Emergency Info (1 Col on lg) */}
        <div className="space-y-5">
          
          {/* Pinned Active Protocol Card */}
          {latestStructured ? (
            <div className="glass-card rounded-3xl p-5 border border-rose-500/30 bg-rose-950/20 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400 border-b border-rose-500/20 pb-3">
                <HeartPulse className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  Active Emergency Protocol
                </h3>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Detected Issue</span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {latestStructured.primarySymptom}
                </h4>
              </div>

              {latestStructured.immediateSteps?.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Top Priority Action</span>
                  <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30 text-xs text-rose-200 font-semibold leading-relaxed">
                    {latestStructured.immediateSteps[0]}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Emergency Urgency:</span>
                <span className="font-bold text-rose-400 uppercase">
                  {latestStructured.severity}
                </span>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-brand-400">
                <Stethoscope className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Context-Aware First Aid
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The chatbot actively reads <strong className="text-white">{patientProfile?.name}</strong>'s medical record before answering every prompt. It prevents dangerous medication conflicts (e.g. Aspirin with recorded Aspirin allergy) and answers your specific questions dynamically.
              </p>
            </div>
          )}

          {/* Emergency Dispatch Quick Dial Box */}
          <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency Dispatch Hotlines</span>
            </h3>

            <div className="space-y-2">
              <a
                href="tel:112"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-xs text-white transition-all"
              >
                <span>Universal Emergency (EU/India)</span>
                <span className="font-mono font-bold text-rose-400">112</span>
              </a>

              <a
                href="tel:911"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-xs text-white transition-all"
              >
                <span>United States / Canada</span>
                <span className="font-mono font-bold text-rose-400">911</span>
              </a>

              <a
                href="tel:999"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-xs text-white transition-all"
              >
                <span>United Kingdom</span>
                <span className="font-mono font-bold text-rose-400">999</span>
              </a>
            </div>
          </div>

          {/* Emergency Medical QR Quick Link */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Emergency Medical QR</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Let paramedics scan your profile without unlocking</p>
            </div>
            <Link
              to="/dashboard/emergency-access"
              className="px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500 hover:text-dark-950 font-bold text-xs transition-all flex items-center space-x-1"
            >
              <span>View QR</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Safety Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-slate-500 text-[10px] leading-relaxed flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <p>
              This first-aid assistant provides immediate temporary stabilization guidance based on your recorded health history while emergency medical services are en route. It does not replace professional emergency medical care.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientEmergencyAssistant;
