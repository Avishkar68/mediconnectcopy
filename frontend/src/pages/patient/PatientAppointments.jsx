import i18n from "../../i18n/index.js";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Video
} from 'lucide-react';

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Booking Form State
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doctorId: '',
    dateTime: '',
    purpose: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [appRes, docRes] = await Promise.all([
        api.get('/patient/appointments'),
        api.get('/patient/doctors')
      ]);

      if (appRes.success) setAppointments(appRes.data);
      if (docRes.success) setDoctors(docRes.data.allDoctors);
    } catch (err) {
      console.error('Failed to load appointments/doctors:', err);
      setError('Could not retrieve appointments information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { doctorId, dateTime, purpose, notes } = form;
    if (!doctorId || !dateTime || !purpose) {
      setError('Doctor, date/time, and purpose are required.');
      return;
    }

    try {
      const response = await api.post('/patient/appointments', {
        doctorId,
        dateTime: new Date(dateTime).toISOString(),
        purpose,
        notes
      });

      if (response.success) {
        setSuccess('Appointment scheduled successfully!');
        // Refresh appointment listing
        const updatedAppRes = await api.get('/patient/appointments');
        if (updatedAppRes.success) setAppointments(updatedAppRes.data);

        setShowForm(false);
        setForm({ doctorId: '', dateTime: '', purpose: '', notes: '' });
      }
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const upcomingAppts = appointments.filter(a => new Date(a.dateTime) > new Date() && a.status !== 'cancelled');
  const pastAppts = appointments.filter(a => new Date(a.dateTime) <= new Date() || a.status === 'cancelled');

  if (loading) {
    return <div className="text-center py-12 text-slate-400">{i18n.t("Loading your visits...")}</div>;
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">{i18n.t("Doctor Visits & Video Calls")}</h2>
          <p className="text-xs text-slate-300">{i18n.t("Book a visit, talk to your doctor over video call from home, or review past visits.")}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Cancel booking' : '+ Book Doctor Visit'}</span>
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking Form Overlay/Panel */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 max-w-xl mx-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="text-sm font-bold text-white mb-4">{i18n.t("Book A Visit With Your Doctor")}</h3>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Choose Doctor")}</label>
              <select
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">{i18n.t("Choose a doctor...")}</option>
                {doctors.map(doc => (
                  <option key={doc._id} value={doc._id}>
                    {i18n.t("Dr.")} {doc.name} ({doc.profile?.specialization || 'General Physician'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Date & Time")}</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Reason for Visit")}</label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder={i18n.t("e.g. Regular health checkup, review blood test, fever")}
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("How are you feeling? (Symptoms or questions)")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-20 resize-none"
                placeholder={i18n.t("Tell the doctor anything you are experiencing...")}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20"
            >
              {i18n.t("Confirm & Book Visit")}
            </button>
          </form>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Consultations */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Video className="w-4 h-4 text-brand-400 mr-1.5" />
            <span>{i18n.t("Upcoming Doctor Visits (")}{upcomingAppts.length})</span>
          </h3>

          {upcomingAppts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400">{i18n.t("No upcoming visits booked right now.")}</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs font-bold text-brand-400 hover:underline"
              >
                {i18n.t("+ Book an appointment with a doctor")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppts.map(appt => (
                <div
                  key={appt._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-750 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-brand-500/10 text-brand-400 p-2.5 rounded-xl mt-0.5">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {i18n.t("Dr.")} {appt.doctor?.name || 'Medical Practitioner'}
                        </h4>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(appt.status)}`}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-400 mt-0.5">
                        {appt.doctor?.profile?.specialization || 'General Physician'}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        {i18n.t("Purpose:")} {appt.purpose}
                      </p>
                      {appt.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-1">
                          {i18n.t("Notes:")} {appt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-850 pt-2.5 sm:pt-0 shrink-0 flex flex-col sm:items-end">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">{i18n.t("Appointment Schedule")}</span>
                    <div className="flex items-center text-[10px] text-slate-350 font-bold mt-1.5 space-x-1 sm:justify-end">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(appt.dateTime).toLocaleString()}</span>
                    </div>

                    <Link
                      to={`/consultation/${appt._id}`}
                      className="mt-2.5 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{i18n.t("Join Video Call")}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consultation History */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-450 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 text-slate-500 mr-1.5" />
            <span>{i18n.t("Consultation History")}</span>
          </h3>

          {pastAppts.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{i18n.t("No past appointments recorded.")}</p>
          ) : (
            <div className="space-y-3">
              {pastAppts.slice(0, 4).map(appt => (
                <div key={appt._id} className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-300">{i18n.t("Dr.")} {appt.doctor?.name || 'Doctor'}</span>
                    <span className="text-[8px] text-slate-500">{new Date(appt.dateTime).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 italic">{i18n.t("Reason:")} {appt.purpose}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default PatientAppointments;
