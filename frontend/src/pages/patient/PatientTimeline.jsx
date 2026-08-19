import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Activity,
  Heart,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';

const PatientTimeline = () => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await api.get('/patient/timeline');
        if (response.success && response.data) {
          setTimeline(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
        setError('Could not retrieve health timeline records.');
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'vital':
        return <Heart className="w-4 h-4 text-red-400" />;
      case 'medical_record':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-brand-400" />;
      case 'medication':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-purple-400" />;
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'vital':
        return 'bg-red-500/10 border-red-500/20';
      case 'medical_record':
        return 'bg-sky-500/10 border-sky-500/20';
      case 'appointment':
        return 'bg-brand-500/10 border-brand-500/20';
      case 'medication':
        return 'bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'bg-purple-500/10 border-purple-500/20';
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading timeline tracker...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Medical Timeline</h2>
        <p className="text-xs text-slate-400">A secure chronological registry of your clinical journey activities.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <Clock className="w-12 h-12 text-slate-650 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">Your timeline is empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Once you log vitals, book consultations, or upload diagnostic records, your chronological ledger will build automatically.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto text-left relative border-l border-slate-800 pl-6 ml-4 py-2 space-y-8">
          {timeline.map((event, idx) => (
            <div key={event._id} className="relative group">
              
              {/* Event Circle Node Icon */}
              <div className={`absolute -left-[37px] top-1.5 p-1.5 rounded-full border bg-dark-950 shadow-lg ${getCategoryColor(event.category)}`}>
                {getCategoryIcon(event.category)}
              </div>

              {/* Event Card */}
              <div className="glass-card rounded-2xl p-5 border border-slate-800/80 group-hover:border-slate-700/80 transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold tracking-wider text-slate-550 uppercase">
                    {event.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center text-[10px] text-slate-500 space-x-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(event.eventDate).toLocaleString()}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white">
                  {event.title}
                </h3>
                
                {event.description && (
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PatientTimeline;
