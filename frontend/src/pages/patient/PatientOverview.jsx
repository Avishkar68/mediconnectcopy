import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Activity,
  Heart,
  Calendar,
  UserCheck,
  Clock,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Sparkles,
  Video,
  CheckCircle2,
  HeartPulse,
  FileText,
  Check
} from 'lucide-react';

const PatientOverview = () => {
  const [data, setData] = useState({
    profile: null,
    bloodGroup: '',
    allergies: [],
    records: [],
    timeline: [],
    medications: [],
    appointments: [],
    consents: [],
    notifications: [],
    emergency: null,
  });
  const [loading, setLoading] = useState(true);

  // Daily task completed checkboxes state (local UI toggle)
  const [completedTasks, setCompletedTasks] = useState({
    meds: true,
    water: false,
    vitals: false
  });

  const toggleTask = (key) => {
    setCompletedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
          notificationsRes,
          emergencyRes
        ] = await Promise.all([
          api.get('/patient/health').catch(() => ({ success: false })),
          api.get('/patient/records').catch(() => ({ success: false })),
          api.get('/patient/timeline').catch(() => ({ success: false })),
          api.get('/patient/medications').catch(() => ({ success: false })),
          api.get('/patient/appointments').catch(() => ({ success: false })),
          api.get('/patient/doctors').catch(() => ({ success: false })),
          api.get('/notifications').catch(() => ({ success: false })),
          api.get('/patient/emergency').catch(() => ({ success: false }))
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
          notifications: notificationsRes.success ? notificationsRes.data : [],
          emergency: emergencyRes.success ? emergencyRes.data : null
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Calculate friendly stats
  const activeConditions = data.profile?.conditions?.filter(c => c.status === 'active') || [];
  const activeMeds = data.medications.filter(m => m.status === 'active') || [];
  const latestVitals = data.profile?.vitals?.[0] || null;
  const nextAppointment = data.appointments.find(a => new Date(a.dateTime) > new Date() && a.status === 'scheduled');
  const activeDoctorAccess = data.consents.filter(c => c.status === 'granted') || [];

  // Plain language vital health badge
  const getVitalStatus = () => {
    if (!latestVitals) return null;
    const sys = latestVitals.bloodPressureSystolic;
    const dia = latestVitals.bloodPressureDiastolic;
    if (!sys || !dia) return null;

    if (sys <= 125 && dia <= 82) {
      return { label: 'Healthy & Normal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    } else if (sys <= 139 || dia <= 89) {
      return { label: 'Slightly Elevated', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    } else {
      return { label: 'High - Please Consult Doctor', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    }
  };

  const vitalStatus = getVitalStatus();

  return (
    <div className="space-y-6 text-left">

      {/* 4 LARGE, FRIENDLY 1-CLICK ACTION CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            What would you like to do today?
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">1-click shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Explain My Lab Report */}
          <Link
            to="/dashboard/ai-analyzer"
            className="glass-card glass-card-hover rounded-2xl p-5 border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-900/60 to-slate-900/40 flex flex-col justify-between group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                Explain A Test Report
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Upload your blood test or lab paper to understand every line in simple words.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-sky-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Read report simply</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 2: Doctor Video Call & Appointments */}
          <Link
            to="/dashboard/appointments"
            className="glass-card glass-card-hover rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-900/40 flex flex-col justify-between group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Doctor Visits & Video Calls
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Talk to your doctor online from home or book your next in-person visit.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-emerald-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>See visits & calls</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 3: Today's Medicines */}
          <Link
            to="/dashboard/medications"
            className="glass-card glass-card-hover rounded-2xl p-5 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900/60 to-slate-900/40 flex flex-col justify-between group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                My Daily Medicines
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Check which pills to take today, dosage instructions, and refill dates.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-purple-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>Check today's pills</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 4: Emergency Medical QR Card */}
          <Link
            to="/dashboard/emergency-access"
            className="glass-card glass-card-hover rounded-2xl p-5 border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-slate-900/60 to-slate-900/40 flex flex-col justify-between group transition-all"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                Emergency Medical Card
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Your Blood Group, allergies, and contacts ready for doctors in emergencies.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-rose-400 mt-4 group-hover:translate-x-1 transition-transform">
              <span>View QR health card</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

        </div>
      </div>

      {/* HEALTH STATUS STRIP (BP, Meds, Doctors) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Latest Vitals */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="bg-sky-500/15 text-sky-400 p-3 rounded-2xl shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Blood Pressure & Pulse</span>
              {vitalStatus && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${vitalStatus.color}`}>
                  {vitalStatus.label}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {latestVitals
                ? `${latestVitals.bloodPressureSystolic} / ${latestVitals.bloodPressureDiastolic} mmHg`
                : 'No BP recorded yet'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {latestVitals
                ? `Pulse: ${latestVitals.heartRate || 72} beats/min • Temp: ${latestVitals.temperature || 36.6}°C`
                : 'Log your BP anytime under My Vitals'}
            </p>
          </div>
        </div>

        {/* Medicines Today */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/15 text-emerald-400 p-3 rounded-2xl shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Medicines Prescribed</span>
            <h3 className="text-base font-bold text-white mt-1">
              {activeMeds.length} Active {activeMeds.length === 1 ? 'Medicine' : 'Medicines'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {activeMeds.length > 0 ? `Next: ${activeMeds[0].name} (${activeMeds[0].dosage})` : 'No active medicines'}
            </p>
          </div>
        </div>

        {/* Doctor Sharing */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="bg-purple-500/15 text-purple-400 p-3 rounded-2xl shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Approved Doctors</span>
            <h3 className="text-base font-bold text-white mt-1">
              {activeDoctorAccess.length} {activeDoctorAccess.length === 1 ? 'Doctor' : 'Doctors'} Connected
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Can view your records with your permission
            </p>
          </div>
        </div>

      </div>

      {/* MAIN TWO-COLUMN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Daily Health Habits Checklist */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Daily Health Habits</h3>
              </div>
              <Link to="/dashboard/care-plan" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>View doctor's full care plan</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            <div className="space-y-2.5">
              <div
                onClick={() => toggleTask('meds')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    completedTasks.meds ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' : 'border-slate-600 bg-slate-950'
                  }`}>
                    {completedTasks.meds && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${completedTasks.meds ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      Take morning medicines with water
                    </h4>
                    <p className="text-[11px] text-slate-400">Prescribed by your doctor</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">Morning</span>
              </div>

              <div
                onClick={() => toggleTask('vitals')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    completedTasks.vitals ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' : 'border-slate-600 bg-slate-950'
                  }`}>
                    {completedTasks.vitals && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${completedTasks.vitals ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      Check and log your Blood Pressure
                    </h4>
                    <p className="text-[11px] text-slate-400">Keep resting for 5 mins before taking reading</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">Daily</span>
              </div>

              <div
                onClick={() => toggleTask('water')}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    completedTasks.water ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold' : 'border-slate-600 bg-slate-950'
                  }`}>
                    {completedTasks.water && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-semibold ${completedTasks.water ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      Stay hydrated (Drink at least 8 glasses of water)
                    </h4>
                    <p className="text-[11px] text-slate-400">Supports healthy blood pressure and kidneys</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">All day</span>
              </div>
            </div>
          </div>

          {/* Active Medicines List */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <span>My Active Medicines</span>
              </h3>
              <Link to="/dashboard/medications" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>See all medicines</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {activeMeds.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No active medicines registered right now.</p>
                <Link to="/dashboard/medications" className="inline-block mt-2 text-xs font-bold text-brand-400 hover:underline">
                  + Add a medicine
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMeds.slice(0, 3).map((med, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{med.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          Take <span className="text-slate-200 font-semibold">{med.dosage}</span> • {med.frequency}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg self-start sm:self-center">
                      {med.instructions || 'Take as advised by your doctor'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health Story Timeline */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Recent Health Timeline</span>
              </h3>
              <Link to="/dashboard/timeline" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                <span>View full timeline</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {data.timeline.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No medical events logged in timeline yet.</p>
              </div>
            ) : (
              <div className="space-y-3 relative border-l border-slate-800 pl-4 ml-2">
                {data.timeline.slice(0, 3).map((event, idx) => (
                  <div key={idx} className="relative py-1">
                    <div className="absolute -left-[21px] top-2.5 w-2.5 h-2.5 bg-brand-500 rounded-full border border-slate-950" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{event.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{event.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-2">
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
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Next Doctor Visit</h3>
            </div>

            {nextAppointment ? (
              <div className="p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-left space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Dr. {nextAppointment.doctor?.name || 'Doctor'}
                    </h4>
                    <p className="text-[11px] text-brand-400">
                      {nextAppointment.doctor?.profile?.specialization || 'General Physician'}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Confirmed
                  </span>
                </div>

                <div className="flex items-center text-xs text-slate-300 space-x-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span>{new Date(nextAppointment.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Reason: {nextAppointment.purpose || 'Health checkup'}
                </p>

                <Link
                  to="/dashboard/appointments"
                  className="w-full mt-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Video Call / View Details</span>
                </Link>
              </div>
            ) : (
              <div className="text-center py-5 bg-slate-900/30 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">No visits scheduled right now.</p>
                <Link
                  to="/dashboard/appointments"
                  className="inline-flex items-center space-x-1 mt-3 px-3.5 py-1.5 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:text-white text-xs font-bold transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Doctor Visit</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick First-Aid Guide Banner */}
          <div className="glass-card rounded-2xl p-5 border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center space-x-2 mb-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">First-Aid Emergency Guide</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Need instant help for chest pain, high fever, bleeding, or burns? Get immediate step-by-step guidance.
            </p>
            <Link
              to="/dashboard/emergency-assistant"
              className="mt-3 w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-rose-600/20"
            >
              <span>Open First-Aid SOS Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Approved Doctors Summary */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5 mb-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Doctor Permissions</h3>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-[11px] text-slate-400">
                Doctors who have permission to see your medical papers:
              </p>
              {activeDoctorAccess.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No doctors currently connected.</p>
              ) : (
                <div className="space-y-1.5">
                  {activeDoctorAccess.slice(0, 3).map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-200">Dr. {c.doctor?.name}</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                        Connected
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/dashboard/doctors" className="block text-center text-xs font-bold text-brand-400 hover:underline pt-2">
                Manage doctor permissions
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientOverview;
