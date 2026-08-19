import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Activity,
  Heart,
  FileText,
  Calendar,
  UserCheck,
  Bell,
  Clock,
  ClipboardList,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const PatientOverview = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    profile: null,
    bloodGroup: '',
    allergies: [],
    records: [],
    timeline: [],
    medications: [],
    appointments: [],
    consents: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [
          healthRes,
          recordsRes,
          timelineRes,
          medsRes,
          appointmentsRes,
          doctorsRes,
          notificationsRes
        ] = await Promise.all([
          api.get('/patient/health').catch(() => ({ success: false })),
          api.get('/patient/records').catch(() => ({ success: false })),
          api.get('/patient/timeline').catch(() => ({ success: false })),
          api.get('/patient/medications').catch(() => ({ success: false })),
          api.get('/patient/appointments').catch(() => ({ success: false })),
          api.get('/patient/doctors').catch(() => ({ success: false })),
          api.get('/notifications').catch(() => ({ success: false }))
        ]);

        setData({
          profile: healthRes.success ? healthRes.data.profile : null,
          bloodGroup: healthRes.success ? healthRes.data.bloodGroup : '',
          allergies: healthRes.success ? healthRes.data.allergies : [],
          records: recordsRes.success ? recordsRes.data : [],
          timeline: timelineRes.success ? timelineRes.data : [],
          medications: medsRes.success ? medsRes.data : [],
          appointments: appointmentsRes.success ? appointmentsRes.data : [],
          consents: doctorsRes.success ? doctorsRes.data.consents : [],
          notifications: notificationsRes.success ? notificationsRes.data : []
        });
      } catch (err) {
        console.error('Error fetching overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-900 border border-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Calculate stats
  const activeConditions = data.profile?.conditions?.filter(c => c.status === 'active') || [];
  const activeMeds = data.medications.filter(m => m.status === 'active') || [];
  const latestVitals = data.profile?.vitals?.[0] || null;
  const nextAppointment = data.appointments.find(a => new Date(a.dateTime) > new Date() && a.status === 'scheduled');
  const activeDoctorAccess = data.consents.filter(c => c.status === 'granted') || [];

  return (
    <div className="space-y-6">
      
      {/* Vitals Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Heart Rate / Vitals Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-sky-500/10 text-sky-400 p-3 rounded-xl">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latest Vitals</h5>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {latestVitals 
                ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg (BP)`
                : 'No vital logs yet'}
            </h3>
            {latestVitals && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pulse: {latestVitals.heartRate} bpm | Temp: {latestVitals.temperature}°C
              </p>
            )}
          </div>
        </div>

        {/* Active Medications Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Medications</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {activeMeds.length} Prescribed
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {activeMeds.length > 0 ? `Next due: ${activeMeds[0].name}` : 'No active prescriptions'}
            </p>
          </div>
        </div>

        {/* Doctor access sharing */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Authorized Clinicians</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {activeDoctorAccess.length} Doctor{activeDoctorAccess.length === 1 ? '' : 's'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              With active data decryption rights
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Health Conditions */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Active Health Conditions</h3>
              <Link to="/dashboard/health" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>View health summary</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {activeConditions.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active medical conditions logged.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeConditions.map((cond, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{cond.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Diagnosed: {new Date(cond.diagnosedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                      {cond.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Medications Check list */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Current Prescriptions</h3>
              <Link to="/dashboard/medications" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>Refills & Logs</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {activeMeds.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active medications registered.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMeds.slice(0, 3).map((med, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/30 border border-slate-850">
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{med.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dosage: {med.dosage} | Frequency: {med.frequency}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 italic">
                      Instructions: {med.instructions || 'take as directed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Timeline Activities */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Recent Timeline Log</h3>
              <Link to="/dashboard/timeline" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>View full timeline</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {data.timeline.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Timeline history is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-3 relative border-l border-slate-800 pl-4 ml-2">
                {data.timeline.slice(0, 3).map((event, idx) => (
                  <div key={idx} className="relative py-1">
                    {/* Circle Node */}
                    <div className="absolute -left-[21px] top-2.5 w-2.5 h-2.5 bg-brand-500 rounded-full border border-dark-950 shadow shadow-brand-500/50" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{event.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{event.description}</p>
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          
          {/* Next Consultation / Appointment */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5 mb-3">
              <Calendar className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Next Appointment</h3>
            </div>

            {nextAppointment ? (
              <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-left">
                <h4 className="text-xs font-bold text-slate-200">
                  Dr. {nextAppointment.doctor?.name || 'Practitioner'}
                </h4>
                <p className="text-[10px] text-brand-400 mt-0.5">
                  {nextAppointment.doctor?.profile?.specialization || 'General Physician'}
                </p>
                <div className="flex items-center text-[10px] text-slate-400 mt-2 space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(nextAppointment.dateTime).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Purpose: {nextAppointment.purpose}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-900/30 rounded-xl border border-slate-850">
                <p className="text-xs text-slate-500">No scheduled consultations.</p>
                <Link to="/dashboard/appointments" className="inline-block mt-2 text-[10px] font-bold text-brand-400 hover:underline">
                  Book Appointment
                </Link>
              </div>
            )}
          </div>

          {/* Health Checklist / Tasks */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5 mb-3">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Daily Health Tasks</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900/20 border border-slate-850 text-left">
                <input type="checkbox" className="rounded text-brand-500 bg-slate-950 border-slate-700" defaultChecked />
                <span className="text-[11px] text-slate-400 line-through">Take morning pills (active medication)</span>
              </div>
              <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900/20 border border-slate-850 text-left">
                <input type="checkbox" className="rounded text-brand-500 bg-slate-950 border-slate-700" />
                <span className="text-[11px] text-slate-300">Measure and record Blood Pressure</span>
              </div>
              <div className="flex items-center space-x-2.5 p-2 rounded-lg bg-slate-900/20 border border-slate-850 text-left">
                <input type="checkbox" className="rounded text-brand-500 bg-slate-950 border-slate-700" />
                <span className="text-[11px] text-slate-300">Drink 8 glasses of water</span>
              </div>
              <Link to="/dashboard/care-plan" className="block text-center text-[10px] font-bold text-slate-400 hover:text-brand-400 mt-2">
                Manage Care Plan tasks
              </Link>
            </div>
          </div>

          {/* Document Access summary */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5 mb-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Access Clearance</h3>
            </div>

            <div className="space-y-2.5 text-left">
              <p className="text-[10px] text-slate-400">
                You have active consent channels sharing health profiles with:
              </p>
              {activeDoctorAccess.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No doctors currently authorized.</p>
              ) : (
                <div className="space-y-2">
                  {activeDoctorAccess.slice(0, 2).map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-slate-900/40 rounded-lg">
                      <span className="font-semibold text-slate-200">Dr. {c.doctor?.name}</span>
                      <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Consent Active</span>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/dashboard/doctors" className="block text-center text-[10px] font-bold text-brand-400 hover:underline">
                Configure consent rules
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientOverview;
