import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import {
  Users,
  Search,
  Heart,
  FileText,
  Clock,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  User,
  AlertCircle,
  FileDown,
  CheckCircle,
  Send,
  Eye,
  RefreshCw,
  Filter,
  QrCode,
  ExternalLink,
  X,
  Download,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import DoctorAiCopilotModal from '../../components/DoctorAiCopilotModal';

const DoctorPatients = () => {
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'approved', 'pending', 'revoked', 'rejected', 'none'
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [activeChartTab, setActiveChartTab] = useState('vitals'); // 'vitals', 'records', 'timeline'

  // AI Copilot Modal state
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Emergency Modal states
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyPatient, setEmergencyPatient] = useState(null);
  const [emergencyData, setEmergencyData] = useState(null);
  const [loadingEmergency, setLoadingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState('');

  const handleViewEmergencyProfile = async (patientId, patientName) => {
    const targetId = patientId || selectedPatientId;
    if (!targetId) {
      console.error('No patient ID provided for emergency profile');
      return;
    }

    setEmergencyPatient({ id: targetId, name: patientName || patientData?.patient?.name || "Patient" });
    setEmergencyModalOpen(true);
    setLoadingEmergency(true);
    setEmergencyError('');
    setEmergencyData(null);

    try {
      const response = await api.get(`/doctor/patients/${targetId}/emergency-profile`);
      if (response && response.success && response.data) {
        setEmergencyData(response.data);
      } else {
        setEmergencyError(response?.message || 'Unable to retrieve emergency records.');
      }
    } catch (err) {
      console.error('Failed to load emergency profile:', err);
      setEmergencyError(
        err.response?.data?.message || err.message || 'Emergency profile unavailable or access denied.'
      );
    } finally {
      setLoadingEmergency(false);
    }
  };

  const [qrCopied, setQrCopied] = useState(false);

  const handleDownloadDoctorQR = () => {
    const canvas = document.getElementById("doctor-emergency-qr-canvas");
    if (!canvas) return;

    try {
      const exportCanvas = document.createElement("canvas");
      const ctx = exportCanvas.getContext("2d");
      exportCanvas.width = 380;
      exportCanvas.height = 470;

      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, 380, 470);

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ef4444";
      ctx.strokeRect(10, 10, 360, 450);

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MEDICONNECT EMERGENCY QR", 190, 45);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText("Patient: " + (emergencyPatient?.name || "Patient Profile"), 190, 68);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(70, 95, 240, 240);
      ctx.drawImage(canvas, 80, 105, 220, 220);

      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText("Scan with clinical or emergency device for vital records", 190, 375);
      ctx.fillText("Authorized Practitioner Clearance", 190, 395);

      const pngUrl = exportCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const patientName = (emergencyPatient?.name || "patient").toLowerCase().replace(/[^a-z0-9]/g, "-");
      downloadLink.download = `emergency-qr-${patientName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `emergency-qr-${emergencyPatient?.name || 'patient'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleCopyDoctorQR = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    } catch {
      alert("Could not copy emergency link to clipboard.");
    }
  };

  const renderEmergencyModal = () => {
    if (!emergencyModalOpen) return null;

    const modalContent = (
      <div 
        className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) setEmergencyModalOpen(false);
        }}
      >
        <div className="glass-card rounded-3xl border border-red-500/30 bg-[#0b1220] max-w-xl w-full p-6 text-left relative max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl shadow-red-950/40">
          {/* Modal Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                  Emergency Medical Clearance
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  {emergencyPatient?.name || "Patient"} - Emergency Profile
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmergencyModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading state */}
          {loadingEmergency && (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-400" />
              <span>Decrypting emergency medical profile...</span>
            </div>
          )}

          {/* Error State */}
          {!loadingEmergency && emergencyError && (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Emergency Access Denied / Unavailable</h4>
              <p className="text-xs text-slate-400">{emergencyError}</p>
            </div>
          )}

          {/* Profile Data Display */}
          {!loadingEmergency && emergencyData && (
            <div className="space-y-4 text-xs">
              {/* QR Code & Scan Card */}
              {emergencyData.token && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-slate-900/60 to-slate-900/60 border border-red-500/30 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-slate-700 shrink-0">
                    <QRCodeCanvas
                      id="doctor-emergency-qr-canvas"
                      value={`${window.location.origin}/emergency/${emergencyData.token}`}
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-left space-y-2 w-full">
                    <div>
                      <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Emergency QR Code Active</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                        Scan with mobile device or clinical tablet
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate bg-slate-950/70 px-2 py-1 rounded border border-slate-800 mt-1">
                        {`${window.location.origin}/emergency/${emergencyData.token}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadDoctorQR}
                        className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-black font-extrabold text-[11px] flex items-center space-x-1.5 transition cursor-pointer shadow-sm shadow-red-500/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyDoctorQR(`${window.location.origin}/emergency/${emergencyData.token}`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{qrCopied ? "Copied!" : "Copy Link"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.open(`/emergency/${emergencyData.token}`, '_blank')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Open Full View</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Blood Group */}
              {emergencyData.settings?.bloodGroup && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-300">Blood Group</span>
                  <span className="text-lg font-bold text-red-400 bg-red-500/20 px-3 py-0.5 rounded-lg border border-red-500/30">
                    {emergencyData.patientData?.bloodGroup || "Not Specified"}
                  </span>
                </div>
              )}

              {/* Allergies */}
              {emergencyData.settings?.allergies && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-300">Allergies & Sensitivities</div>
                  {emergencyData.patientData?.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {emergencyData.patientData.allergies.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded text-[11px] font-semibold">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">No allergies recorded.</p>
                  )}
                </div>
              )}

              {/* Current Medications */}
              {emergencyData.settings?.medications && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-300">Active Medications</div>
                  {emergencyData.patientData?.medications?.length > 0 ? (
                    <div className="space-y-1">
                      {emergencyData.patientData.medications.map((m, i) => (
                        <div key={i} className="p-2 bg-slate-950/60 rounded text-[11px] text-slate-200">
                          {m}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">No active medications.</p>
                  )}
                </div>
              )}

              {/* Existing Conditions */}
              {emergencyData.settings?.conditions && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="font-bold text-slate-300">Diagnosed Medical Conditions</div>
                  {emergencyData.patientData?.conditions?.length > 0 ? (
                    <div className="space-y-1">
                      {emergencyData.patientData.conditions.map((c, i) => (
                        <div key={i} className="p-2 bg-slate-950/60 rounded text-[11px] text-slate-200">
                          {c}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">No medical conditions recorded.</p>
                  )}
                </div>
              )}

              {/* Emergency Contact */}
              {emergencyData.settings?.emergencyContact && emergencyData.patientData?.emergencyContact && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-300">Emergency Contact</div>
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-white">{emergencyData.patientData.emergencyContact.name || "Emergency Contact"}</div>
                      <div className="text-[11px] text-slate-400">Relation: {emergencyData.patientData.emergencyContact.relation || "N/A"}</div>
                      <div className="text-emerald-400 font-mono font-bold mt-0.5">{emergencyData.patientData.emergencyContact.phone || "No phone listed"}</div>
                    </div>
                    {emergencyData.patientData.emergencyContact.phone && (
                      <a
                        href={`tel:${emergencyData.patientData.emergencyContact.phone}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-dark-950 font-bold text-xs flex items-center space-x-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Critical Notes */}
              {emergencyData.settings?.criticalNotes && emergencyData.patientData?.criticalNotes && (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-slate-300">Critical Medical Notes</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {emergencyData.patientData.criticalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  const fetchDirectory = async () => {
    try {
      const response = await api.get('/doctor/directory');
      if (response.success && response.data) {
        setDirectory(response.data);
      }
    } catch (err) {
      console.error('Failed to load patient directory:', err);
      setError('Could not retrieve patients directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const handleSelectPatient = async (patientId) => {
    setSelectedPatientId(patientId);
    setLoadingHistory(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.get(`/doctor/patients/${patientId}/medical-history`);
      if (response.success && response.data) {
        setPatientData(response.data);
      }
    } catch (err) {
      console.error('Failed to load patient history:', err);
      setError('Failed to decrypt patient medical history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRequestAccess = async (patientId) => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const response = await api.post('/doctor/requests', { patientId });
      if (response.success) {
        setSuccess('Access request submitted successfully! Patient has been notified.');
        // Refresh directory to show updated pending status
        const rep = await api.get('/doctor/directory');
        if (rep.success) setDirectory(rep.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit access request.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPatients = directory.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p._id.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && p.accessStatus === filterStatus;
  });

  if (loading) {
    return <div className="text-center py-12 text-slate-500 font-display">Loading patients directory...</div>;
  }

  // --- 1. DETAILED CLINICAL HISTORY CHART VIEW (AUTHORIZED ONLY) ---
  if (selectedPatientId && patientData) {
    const { patient, profile, records, timeline } = patientData;
    const latestVitals = profile?.vitals?.[0] || null;

    return (
      <div className="space-y-6 text-left">
        
        {/* Back navigation */}
        <button
          onClick={() => { setSelectedPatientId(null); setPatientData(null); }}
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Directory</span>
        </button>

        {/* Patient Profile Header */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start space-x-4">
              <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{patient.name}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{patient.email}</span>
                  </span>
                  {patient.profile?.phone && (
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{patient.profile.phone}</span>
                    </span>
                  )}
                  {patient.profile?.gender && (
                    <span className="capitalize text-slate-400">Gender: {patient.profile.gender}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {latestVitals && (
                <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-2xl flex space-x-6 text-xs text-left">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-550 block">Blood Pressure</span>
                    <span className="font-bold text-white mt-0.5">{latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic} mmHg</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-550 block">Pulse Rate</span>
                    <span className="font-bold text-white mt-0.5">{latestVitals.heartRate} bpm</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                id="doctor-emergency-qr-btn"
                onClick={() => handleViewEmergencyProfile(selectedPatientId || patient?._id, patient?.name)}
                className="px-3.5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer shadow-sm shadow-red-500/5 hover:border-red-500/60 active:scale-95"
                title="View Emergency Medical QR Information"
              >
                {loadingEmergency ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                ) : (
                  <QrCode className="w-4 h-4 text-red-400" />
                )}
                <span>Emergency QR Info</span>
              </button>
              <button
                type="button"
                id="doctor-ai-copilot-btn"
                onClick={() => setCopilotOpen(true)}
                className="px-3.5 py-3 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 rounded-2xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer shadow-sm hover:border-brand-500/60 active:scale-95"
                title="Launch AI Clinical Copilot"
              >
                <Sparkles className="w-4 h-4 text-brand-400 animate-pulse" />
                <span>AI Clinical Copilot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inline Emergency QR Code Banner (Accessible directly in patient file) */}
        {emergencyData && emergencyData.token && emergencyData.patientId === (selectedPatientId || patient?._id) && (
          <div className="glass-card rounded-3xl p-5 border border-red-500/30 bg-gradient-to-r from-red-500/10 via-slate-900/80 to-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-5 text-left relative overflow-hidden shadow-lg shadow-red-950/20">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-700 shadow-xl shrink-0">
                <QRCodeCanvas
                  value={`${window.location.origin}/emergency/${emergencyData.token}`}
                  size={100}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                    Emergency Medical QR Clearance
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-400 text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white font-display mt-0.5">
                  {patient?.name} - Rapid Clinical Scan
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {`${window.location.origin}/emergency/${emergencyData.token}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>View Full Emergency Profile</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopyDoctorQR(`${window.location.origin}/emergency/${emergencyData.token}`)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{qrCopied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab selection */}
        <div className="flex space-x-2 border-b border-slate-800 pb-px">
          {['vitals', 'records', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveChartTab(tab)}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide ${
                activeChartTab === tab
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              {tab === 'vitals' && 'Vitals History'}
              {tab === 'records' && `Medical Files (${records.length})`}
              {tab === 'timeline' && `Activity Timeline (${timeline.length})`}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeChartTab === 'vitals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Vitals records */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 text-left">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center">
                <Heart className="w-4 h-4 text-red-400 mr-1.5" />
                <span>Historical Vitals Log</span>
              </h3>

              {!profile.vitals || profile.vitals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No vitals logs shared by patient.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider font-bold">
                        <th className="pb-3">Logged Date</th>
                        <th className="pb-3">Blood Pressure</th>
                        <th className="pb-3">Pulse Rate</th>
                        <th className="pb-3">Temperature</th>
                        <th className="pb-3">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {profile.vitals.map((v, idx) => (
                        <tr key={idx} className="text-slate-350 hover:bg-slate-900/10">
                          <td className="py-3 text-slate-450">{new Date(v.loggedAt).toLocaleString()}</td>
                          <td className="py-3 font-semibold text-slate-200">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg</td>
                          <td className="py-3">{v.heartRate} bpm</td>
                          <td className="py-3">{v.temperature ? `${v.temperature}°C` : '--'}</td>
                          <td className="py-3">{v.weight ? `${v.weight}kg` : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Diagnoses */}
            <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-800 h-fit">
              <h3 className="text-sm font-bold text-white mb-4">Active Conditions</h3>
              
              {!profile.conditions || profile.conditions.length === 0 ? (
                <p className="text-xs text-slate-550 italic">No diagnostic files cataloged.</p>
              ) : (
                <div className="space-y-2">
                  {profile.conditions.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/30 border border-slate-850 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-slate-300">{c.name}</h4>
                        <span className="text-[9px] text-slate-500">Diagnosed: {new Date(c.diagnosedAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/15 uppercase">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {activeChartTab === 'records' && (
          <div>
            {records.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white">No documents uploaded</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">This patient has no uploaded medical reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {records.map(record => (
                  <div key={record._id} className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase bg-emerald-500/10 text-emerald-450 border-emerald-500/20">
                          {record.category.replace('_', ' ')}
                        </span>
                        <div className="flex items-center text-[10px] text-slate-500 space-x-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-3 flex items-center">
                        <FileText className="w-4 h-4 text-emerald-400 mr-1.5 shrink-0" />
                        <span>{record.title}</span>
                      </h3>

                      {record.notes && (
                        <p className="text-xs text-slate-400 mt-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 italic">
                          {record.notes}
                        </p>
                      )}

                      {record.fileUrl && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-850 max-h-40 bg-slate-900 flex items-center justify-center">
                          <img src={record.fileUrl} alt={record.title} className="w-full h-full object-cover hover:scale-102 transition-transform" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-850">
                      <span className="text-[10px] text-slate-500">Access: Authorized</span>
                      <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all">
                        <FileDown className="w-4 h-4" />
                        <span>Download Record</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeChartTab === 'timeline' && (
          <div>
            {timeline.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Timeline history is currently empty.</p>
            ) : (
              <div className="max-w-xl mx-auto relative border-l border-slate-800 pl-6 ml-4 py-2 space-y-6">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-dark-950 shadow shadow-emerald-500/50" />
                    <div className="glass-card rounded-xl p-4 border border-slate-800">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mb-1.5">
                        <span className="font-bold uppercase tracking-wider text-emerald-400">{event.category}</span>
                        <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200">{event.title}</h4>
                      {event.description && <p className="text-[11px] text-slate-400 mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emergency Medical QR Profile Modal */}
        {renderEmergencyModal()}

        {/* 🤖 AI DOCTOR COPILOT MODAL */}
        <DoctorAiCopilotModal
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          patient={patient}
        />
      </div>
    );
  }

  if (selectedPatientId && loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400">Loading patient health records...</span>
      </div>
    );
  }

  // --- 2. LIST PATIENT SEARCH DIRECTORY VIEW ---
  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Patient Directory</h2>
        <p className="text-xs text-slate-400">Search patients, view authorized health charts, or request connection access.</p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-450" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and search panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        
        {/* Search Input bar */}
        <div className="md:col-span-2 glass-card rounded-xl p-3 border border-slate-800 flex items-center space-x-3">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient Name, Email, or Patient ID..."
            className="bg-transparent border-0 text-xs text-white focus:outline-none w-full"
          />
        </div>

        {/* Status filters */}
        <div className="md:col-span-1 glass-card rounded-xl p-3 border border-slate-800 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent border-0 text-xs text-slate-350 focus:outline-none w-full capitalize"
          >
            <option value="all">All Access Statuses</option>
            <option value="none">No Access Request</option>
            <option value="pending">Request Pending</option>
            <option value="approved">Access Approved</option>
            <option value="rejected">Access Rejected</option>
            <option value="revoked">Access Revoked</option>
          </select>
        </div>

      </div>

      {/* Patients list table */}
      {filteredPatients.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 text-slate-750 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No patients found</h3>
          <p className="text-xs text-slate-500 mt-1">Try refining your search keyword or access status filter.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Patient Profile</th>
                  <th className="p-4">Patient ID</th>
                  <th className="p-4 text-center">Gender & Age</th>
                  <th className="p-4">Access Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPatients.map(pat => {
                  const hasNone = pat.accessStatus === 'none';
                  const isPending = pat.accessStatus === 'pending';
                  const isApproved = pat.accessStatus === 'approved';
                  const isRevoked = pat.accessStatus === 'revoked';
                  const isRejected = pat.accessStatus === 'rejected';

                  return (
                    <tr key={pat._id} className="hover:bg-slate-900/10 text-slate-300">
                      
                      {/* Name & Contact */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-slate-900 text-slate-400 p-2 rounded-lg border border-slate-850">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-200">{pat.name}</h4>
                            <p className="text-[10px] text-slate-500">{pat.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Patient ID */}
                      <td className="p-4 font-mono text-[10px] text-slate-450">
                        {pat._id}
                      </td>

                      {/* Age & Gender */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="capitalize">{pat.gender || 'unspecified'}</span>
                          <span className="text-[10px] text-slate-500 font-bold mt-0.5">{pat.age ? `${pat.age} yrs` : 'age N/A'}</span>
                        </div>
                      </td>

                      {/* Status Tag */}
                      <td className="p-4">
                        {hasNone && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-450 uppercase">
                            No Request
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 bg-yellow-500/5 text-yellow-450 uppercase">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 uppercase">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Access Approved</span>
                          </span>
                        )}
                        {isRevoked && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-slate-500 uppercase">
                            Access Revoked
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 uppercase">
                            Request Rejected
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleViewEmergencyProfile(pat._id, pat.name)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0"
                            title="View Emergency Medical QR Information"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Emergency QR</span>
                          </button>

                          {isApproved && (
                            <button
                              onClick={() => handleSelectPatient(pat._id)}
                              className="bg-emerald-500 hover:bg-emerald-450 text-dark-950 text-[10px] font-extrabold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Patient</span>
                            </button>
                          )}

                          {isPending && (
                            <button
                              disabled
                              className="bg-slate-900 text-slate-500 border border-slate-850 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-not-allowed shrink-0"
                            >
                              Request Pending
                            </button>
                          )}

                          {hasNone && (
                            <button
                              onClick={() => handleRequestAccess(pat._id)}
                              disabled={actionLoading}
                              className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 hover:text-emerald-450 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 transition-all"
                            >
                              <Send className="w-3 h-3" />
                              <span>Request Access</span>
                            </button>
                          )}

                          {(isRevoked || isRejected) && (
                            <button
                              onClick={() => handleRequestAccess(pat._id)}
                              disabled={actionLoading}
                              className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 hover:text-emerald-450 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shrink-0 transition-all"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Request Access Again</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMERGENCY PROFILE MODAL FOR DOCTORS */}
      {renderEmergencyModal()}

      {/* 🤖 AI DOCTOR COPILOT MODAL */}
      <DoctorAiCopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        patient={patientData?.patient || null}
      />

    </div>
  );
};

export default DoctorPatients;
