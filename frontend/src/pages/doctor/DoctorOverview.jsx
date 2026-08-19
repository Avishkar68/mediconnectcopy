import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  Video,
  UserPlus,
  Clock,
  AlertCircle,
  Play,
  ClipboardList,
  FileSpreadsheet,
  TrendingUp,
  Stethoscope,
  Activity,
  ArrowRight,
  Bell,
  CheckCircle
} from 'lucide-react';

const DoctorOverview = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    patients: [],
    requests: [],
    appointments: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [patientsRes, requestsRes, appointmentsRes, notificationsRes] = await Promise.all([
          api.get('/doctor/patients').catch(() => ({ success: false })),
          api.get('/doctor/requests').catch(() => ({ success: false })),
          api.get('/doctor/appointments').catch(() => ({ success: false })),
          api.get('/notifications').catch(() => ({ success: false }))
        ]);

        setData({
          patients: patientsRes.success ? patientsRes.data : [],
          requests: requestsRes.success ? requestsRes.data : [],
          appointments: appointmentsRes.success ? appointmentsRes.data : [],
          notifications: notificationsRes.success ? notificationsRes.data : []
        });
      } catch (err) {
        console.error('Failed to load doctor overview data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Filter schedule for today
  const todayStr = new Date().toDateString();
  const todaysConsults = data.appointments.filter(
    a => new Date(a.dateTime).toDateString() === todayStr && a.status === 'scheduled'
  );
  
  // Pending actions
  const pendingRequests = data.requests.filter(r => r.status === 'pending');
  const overdueFollowups = data.appointments.filter(
    a => new Date(a.dateTime) < new Date() && a.status === 'scheduled'
  );

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. Today's Overview Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Patients</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">{data.patients.length}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Today's Schedule</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">{todaysConsults.length}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl">
            <UserPlus className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Consent Requests</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">{pendingRequests.length}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-yellow-500/10 text-yellow-400 p-3 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Tasks</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">{overdueFollowups.length}</h3>
          </div>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Schedule */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Video className="w-4 h-4 text-emerald-400 mr-2" />
                <span>Today's Consultation Schedule</span>
              </h3>
              <Link to="/dashboard/consultations" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center">
                <span>View Full Registry</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {todaysConsults.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/20 border border-dashed border-slate-805 rounded-xl">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-450">No consultations scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysConsults.map((appt, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Patient: {appt.patient?.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Purpose: {appt.purpose}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => navigate('/dashboard/consultations')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-[10px] font-extrabold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patient Attention Alert Logs */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-400 mr-2" />
              <span>Attention Needed</span>
            </h3>

            {overdueFollowups.length === 0 && pendingRequests.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/20 border border-dashed border-slate-805 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                <p className="text-xs text-slate-450">No urgent practitioner alerts or pending items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-start space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Consent Access Request</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Patient <span className="font-semibold text-purple-400">{req.patient?.name}</span> is requesting connection access.
                        </p>
                      </div>
                    </div>
                    <Link to="/dashboard/requests" className="text-[10px] font-bold text-purple-400 hover:underline">
                      Manage Request
                    </Link>
                  </div>
                ))}

                {overdueFollowups.map((appt, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                    <div className="flex items-start space-x-2.5">
                      <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Overdue Consultation Checkup</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Follow-up session with {appt.patient?.name} is overdue since {new Date(appt.dateTime).toLocaleDateString()}.
                        </p>
                      </div>
                    </div>
                    <Link to="/dashboard/consultations" className="text-[10px] font-bold text-yellow-400 hover:underline">
                      Consult Now
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-800 pb-2.5 mb-4">
              Quick Operations
            </h3>

            <div className="flex flex-col space-y-2">
              <button
                onClick={() => navigate('/dashboard/patients')}
                className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all flex justify-between items-center"
              >
                <span>Find Patient File</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/dashboard/requests')}
                className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all flex justify-between items-center"
              >
                <span>Review Access Consents</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/dashboard/consultations')}
                className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 hover:shadow-md transition-all flex justify-between items-center"
              >
                <span>Start Patient Consultation</span>
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard/prescriptions')}
                className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all flex justify-between items-center"
              >
                <span>Write Prescription Slip</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/dashboard/care-plans')}
                className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all flex justify-between items-center"
              >
                <span>Prescribe Recovery Care Target</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Practitioner Stats Summary */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-800 pb-2.5 mb-3">
              Practice Analytics
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Completed Consults</span>
                <span className="font-semibold text-white">
                  {data.appointments.filter(a => a.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Authorized Registry</span>
                <span className="font-semibold text-white">{data.patients.length} Patients</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DoctorOverview;
