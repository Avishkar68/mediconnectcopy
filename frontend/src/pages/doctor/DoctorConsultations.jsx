import i18n from "../../i18n/index.js";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Video,
  PlusCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  FileText
} from 'lucide-react';

const DoctorConsultations = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    appointmentId: '',
    diagnosis: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [appRes, patRes] = await Promise.all([
        api.get('/doctor/appointments'),
        api.get('/doctor/patients')
      ]);

      if (appRes.success) setAppointments(appRes.data);
      if (patRes.success) setPatients(patRes.data);
    } catch (err) {
      console.error('Failed to load doctor consultations:', err);
      setError('Could not retrieve consultations queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartConsultation = (appt) => {
    setForm({
      patientId: appt.patient?._id || '',
      appointmentId: appt._id,
      diagnosis: '',
      notes: ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { patientId, appointmentId, diagnosis, notes } = form;
    if (!patientId || !diagnosis) {
      setError('Patient and diagnosis summary are required.');
      return;
    }

    try {
      const response = await api.post('/doctor/consultations', {
        patientId,
        appointmentId: appointmentId || undefined,
        diagnosis,
        notes
      });

      if (response.success) {
        setSuccess('Consultation logged successfully!');
        // Refresh listing
        const appRes = await api.get('/doctor/appointments');
        if (appRes.success) setAppointments(appRes.data);

        setShowForm(false);
        setForm({ patientId: '', appointmentId: '', diagnosis: '', notes: '' });
      }
    } catch (err) {
      setError(err.message || 'Failed to record consultation.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">{i18n.t("Loading consultations registry...")}</div>;
  }

  const scheduledConsults = appointments.filter(a => a.status === 'scheduled');
  const completedConsults = appointments.filter(a => a.status === 'completed');

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">{i18n.t("Doctor Consultations & Visits")}</h2>
          <p className="text-xs text-slate-400">{i18n.t("Record patient check-up notes, write diagnoses, and start live video calls.")}</p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <Link
            to={`/consultation/telehealth-${Date.now().toString(36)}`}
            className="bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/20"
          >
            <Video className="w-4 h-4" />
            <span>{i18n.t("Start Video Call Room")}</span>
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all border border-slate-700"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{showForm ? 'Cancel recording' : '+ Add Visit Notes'}</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Record Consultation Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 max-w-xl mx-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="text-sm font-bold text-white mb-4">{i18n.t("Record Patient Consultation")}</h3>

          <form onSubmit={handleConsultationSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Patient")}</label>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                required
                disabled={!!form.appointmentId} // Lock patient selection if coming from scheduled card
              >
                <option value="">{i18n.t("Select authorized patient...")}</option>
                {patients.map(pat => (
                  <option key={pat._id} value={pat._id}>
                    {pat.name} ({pat.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Diagnosis Summary")}</label>
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder={i18n.t("e.g. Mild Hypertension, Common cold")}
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Consultation Notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-24 resize-none"
                placeholder={i18n.t("Type details regarding treatment recommendation, diagnostic referrals, or findings...")}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              {i18n.t("Save Consultation Notes")}
            </button>
          </form>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Consultations Queue */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Video className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>{i18n.t("Consultation Schedule Queue (")}{scheduledConsults.length})</span>
          </h3>

          {scheduledConsults.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/10 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">{i18n.t("No scheduled patient visits pending.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledConsults.map(appt => (
                <div
                  key={appt._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-750 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div className="flex items-start space-x-3 text-left">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl mt-0.5">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{i18n.t("Patient:")} {appt.patient?.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{i18n.t("Purpose:")} {appt.purpose}</p>
                      <div className="flex items-center text-[10px] text-slate-500 mt-2.5 space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{i18n.t("Scheduled:")} {new Date(appt.dateTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
                    <Link
                      to={`/consultation/${appt._id}`}
                      className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20 flex-1 sm:flex-none justify-center"
                    >
                      <Video className="w-4 h-4" />
                      <span>{i18n.t("Start Video Call")}</span>
                    </Link>

                    <button
                      onClick={() => handleStartConsultation(appt)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1 transition-all border border-slate-700"
                      title={i18n.t("Log notes manually")}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">{i18n.t("Notes")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-450 uppercase tracking-wider flex items-center">
            <FileText className="w-4 h-4 text-slate-500 mr-1.5" />
            <span>{i18n.t("Completed Checkups")}</span>
          </h3>

          {completedConsults.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{i18n.t("No past completed sessions recorded.")}</p>
          ) : (
            <div className="space-y-3">
              {completedConsults.slice(0, 5).map(appt => (
                <div key={appt._id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl text-left">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-350">{appt.patient?.name}</span>
                    <span className="text-[8px] text-slate-500">{new Date(appt.dateTime).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{i18n.t("Visit Reason:")} {appt.purpose}</p>
                  {appt.notes && (
                    <p className="text-[10px] text-slate-400 mt-2 bg-slate-950/20 p-2 border border-slate-850 rounded font-mono">
                      {i18n.t("Notes:")} {appt.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorConsultations;
