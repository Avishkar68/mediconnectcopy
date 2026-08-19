import React, { useState, useEffect } from 'react';
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
  Lock,
  CheckCircle,
  Send,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react';

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
          </div>
        </div>

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
                      <span className="text-[10px] text-slate-500">Decryption Clearance: Decrypted</span>
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

      </div>
    );
  }

  if (selectedPatientId && loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400">Decrypting patient clinical workspace...</span>
      </div>
    );
  }

  // --- 2. LIST PATIENT SEARCH DIRECTORY VIEW ---
  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Patient Registry Directory</h2>
        <p className="text-xs text-slate-400">Search system users to verify record sharing credentials and request access clearance tokens.</p>
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
                  <th className="p-4">Patient ID / UID</th>
                  <th className="p-4 text-center">Demographics</th>
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
                        {isApproved && (
                          <button
                            onClick={() => handleSelectPatient(pat._id)}
                            className="bg-emerald-500 hover:bg-emerald-450 text-dark-950 text-[10px] font-extrabold px-3 py-1.5 rounded-lg flex items-center space-x-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Patient</span>
                          </button>
                        )}

                        {isPending && (
                          <button
                            disabled
                            className="bg-slate-900 text-slate-500 border border-slate-850 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-not-allowed ml-auto"
                          >
                            Request Pending
                          </button>
                        )}

                        {hasNone && (
                          <button
                            onClick={() => handleRequestAccess(pat._id)}
                            disabled={actionLoading}
                            className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 hover:text-emerald-450 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 ml-auto transition-all"
                          >
                            <Send className="w-3 h-3" />
                            <span>Request Access</span>
                          </button>
                        )}

                        {(isRevoked || isRejected) && (
                          <button
                            onClick={() => handleRequestAccess(pat._id)}
                            disabled={actionLoading}
                            className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 hover:text-emerald-450 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 ml-auto transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Request Access Again</span>
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorPatients;
