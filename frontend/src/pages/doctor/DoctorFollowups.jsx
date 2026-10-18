import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Calendar,
  X,
  RefreshCw,
  Phone,
  Mail,
  Search,
  Check,
  Tag,
  Stethoscope,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';

const QUICK_PURPOSE_TAGS = [
  '2-Week Post-Procedure Clinical Review',
  'Medication Titration & Blood Pressure Review',
  'Glycemic Control & HbA1c Lab Follow-up',
  'Surgical Wound & Suture Inspection',
  'Post-Discharge Recovery Evaluation',
  'Routine Chronic Disease Surveillance',
];

const DoctorFollowups = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Schedule Follow-up Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    dateTime: '',
    purpose: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [appRes, patRes] = await Promise.all([
        api.get('/doctor/appointments'),
        api.get('/doctor/patients'),
      ]);

      if (appRes.success && appRes.data) {
        setAppointments(appRes.data);
      }
      if (patRes.success && patRes.data) {
        setPatients(patRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor appointments:', err);
      setError('Could not retrieve consultations queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.patientId) {
      setError('Please select an authorized patient.');
      return;
    }
    if (!form.dateTime) {
      setError('Please choose a valid follow-up date and time.');
      return;
    }
    if (!form.purpose.trim()) {
      setError('Please specify the clinical purpose of this follow-up.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/doctor/appointments/schedule-followup', {
        patientId: form.patientId,
        dateTime: form.dateTime,
        purpose: form.purpose,
        notes: form.notes,
      });

      if (response.success && response.data) {
        setSuccess('Follow-up consultation successfully scheduled and patient notified!');
        setAppointments((prev) => [response.data, ...prev]);
        setIsModalOpen(false);
        setForm({ patientId: '', dateTime: '', purpose: '', notes: '' });
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule follow-up appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for human-readable countdowns
  const getTimeRemainingText = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    if (diff <= 0) return 'Due Now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) return `In ${days} days`;
    if (days === 1) return 'Tomorrow';
    if (hours > 0) return `In ${hours} hours`;
    return 'Within the hour';
  };

  // Categorize appointments
  const upcomingFollowups = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'scheduled')
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  }, [appointments]);

  const completedFollowups = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'completed')
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  }, [appointments]);

  const filteredUpcoming = useMemo(() => {
    if (!searchQuery.trim()) return upcomingFollowups;
    const q = searchQuery.toLowerCase();
    return upcomingFollowups.filter(
      (a) =>
        a.patient?.name?.toLowerCase().includes(q) ||
        a.purpose?.toLowerCase().includes(q)
    );
  }, [upcomingFollowups, searchQuery]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400 font-medium">Loading Patient Follow-ups Register...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white font-display tracking-tight">
                Patient Follow-up & Reminder Center
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Schedule clinical reviews, monitor upcoming check-ins, and track consultation outcomes.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setError('');
            setSuccess('');
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-lg shadow-brand-500/20 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Check-ins</span>
            <h3 className="text-xl font-bold text-white mt-0.5">{upcomingFollowups.length} Scheduled</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concluded Reviews</span>
            <h3 className="text-xl font-bold text-white mt-0.5">{completedFollowups.length} Concluded</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized Patients</span>
            <h3 className="text-xl font-bold text-white mt-0.5">{patients.length} Active</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Scheduled Queue vs Concluded Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upcoming Check-in Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Calendar className="w-4 h-4 text-emerald-400 mr-2" />
              <span>Upcoming Patient Reviews ({filteredUpcoming.length})</span>
            </h3>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or purpose..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {filteredUpcoming.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/20 border border-slate-800 rounded-2xl space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No upcoming follow-up appointments found.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 underline mt-1"
              >
                Schedule a consultation now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUpcoming.map((appt) => {
                const countdown = getTimeRemainingText(appt.dateTime);
                const isUrgentSoon = countdown.includes('Tomorrow') || countdown.includes('hour') || countdown.includes('Now');

                return (
                  <div
                    key={appt._id}
                    className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                        <User className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {appt.patient?.name || 'Authorized Patient'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                              isUrgentSoon
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                            }`}
                          >
                            {countdown}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 font-medium">
                          {appt.purpose}
                        </p>

                        {appt.notes && (
                          <p className="text-[11px] text-slate-400 leading-relaxed italic">
                            Prep Notes: "{appt.notes}"
                          </p>
                        )}

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            {new Date(appt.dateTime).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {appt.patient?.profile?.phone && (
                            <span className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-slate-400" />
                              {appt.patient.profile.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                        Confirmed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Concluded Follow-up Log */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
            <CheckCircle2 className="w-4 h-4 text-slate-500 mr-2" />
            <span>Recently Concluded Reviews</span>
          </h3>

          {completedFollowups.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/20 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500 italic">No concluded follow-ups logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedFollowups.slice(0, 6).map((appt) => (
                <div
                  key={appt._id}
                  className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850 space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-200">{appt.patient?.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(appt.dateTime).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Purpose:</span> {appt.purpose}
                  </p>
                  {appt.notes && (
                    <p className="text-[10px] text-slate-500 italic border-t border-slate-800/60 pt-1">
                      Outcome: "{appt.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ---------------- SCHEDULE FOLLOW-UP MODAL ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl my-8 p-6 md:p-8 space-y-5 text-left relative">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                Clinical Scheduling
              </span>
              <h2 className="text-xl font-bold text-white font-display">
                Schedule Follow-up Consultation
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Directly book a follow-up review for an authorized patient and dispatch an instant notification.
              </p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
              
              {/* Patient */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Patient *
                </label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select from authorized patients...</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Follow-up Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Quick Purpose Chips */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Tag className="w-3 h-3 text-brand-400 mr-1" />
                  <span>Clinical Purpose Quick Tags</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PURPOSE_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, purpose: tag })}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Purpose input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Consultation Purpose / Reason *
                </label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g. 2-Week Post-PCI Clinical Review"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Clinical Notes / Prep Instructions */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Patient Instructions & Prep Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Fast 8 hours prior for repeat fasting blood sugar. Bring home blood pressure log."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  {submitting ? 'Scheduling...' : 'Schedule & Notify Patient'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorFollowups;
