import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText
} from 'lucide-react';

const DoctorFollowups = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await api.get('/doctor/appointments');
        if (response.success && response.data) {
          setAppointments(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch doctor appointments:', err);
        setError('Could not retrieve consultations queue.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading follow-ups register...</div>;
  }

  // Follow-ups are scheduled appointments that have not occurred yet, or recently occurred
  const upcomingFollowups = appointments.filter(
    a => new Date(a.dateTime) > new Date() && a.status === 'scheduled'
  );
  
  const completedFollowups = appointments.filter(
    a => a.status === 'completed'
  );

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Patient Follow-ups</h2>
        <p className="text-xs text-slate-400">Monitor upcoming patient check-ins and review recently concluded visits.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Checkins */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Upcoming Check-ins ({upcomingFollowups.length})</span>
          </h3>

          {upcomingFollowups.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/10 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">No upcoming check-ins scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingFollowups.map(appt => (
                <div
                  key={appt._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 flex justify-between items-center gap-4 text-left"
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl mt-0.5">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">Patient: {appt.patient?.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Contact: {appt.patient?.profile?.phone || 'none'}</p>
                      <p className="text-xs text-slate-500 mt-2 font-bold flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        <span>{new Date(appt.dateTime).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Concluded Followups */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-450 uppercase tracking-wider flex items-center">
            <CheckCircle2 className="w-4 h-4 text-slate-500 mr-1.5" />
            <span>Concluded Log</span>
          </h3>

          {completedFollowups.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No recently completed consultations.</p>
          ) : (
            <div className="space-y-3">
              {completedFollowups.slice(0, 4).map(appt => (
                <div key={appt._id} className="p-3 bg-slate-900/35 border border-slate-850 rounded-xl">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-300">{appt.patient?.name}</span>
                    <span className="text-[8px] text-slate-500">{new Date(appt.dateTime).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Concluded purpose: {appt.purpose}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorFollowups;
