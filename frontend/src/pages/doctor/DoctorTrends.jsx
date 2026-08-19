import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  TrendingUp,
  Users,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';

const DoctorTrends = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('/doctor/patients');
        if (response.success) {
          setPatients(response.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500 font-display">Loading analytics dashboards...</div>;
  }

  // Calculate demographics
  const maleCount = patients.filter(p => p.profile?.gender?.toLowerCase() === 'male').length;
  const femaleCount = patients.filter(p => p.profile?.gender?.toLowerCase() === 'female').length;
  const otherCount = patients.length - maleCount - femaleCount;

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Practice Analytics & Reports</h2>
        <p className="text-xs text-slate-400">Review aggregated charts, case counts, and practitioner trends.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Case files */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl animate-pulse">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Registry Case files</span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{patients.length} Active</h3>
          </div>
        </div>

        {/* Male Cases */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Male Case count</span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{maleCount} Cases</h3>
          </div>
        </div>

        {/* Female Cases */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Female Case count</span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{femaleCount} Cases</h3>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Demographics Summary */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <TrendingUp className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Case Demographics Distributions</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1">
                <span>Male Patients</span>
                <span>{maleCount} ({patients.length > 0 ? Math.round((maleCount / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (maleCount / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1">
                <span>Female Patients</span>
                <span>{femaleCount} ({patients.length > 0 ? Math.round((femaleCount / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (femaleCount / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1">
                <span>Other/Unspecified</span>
                <span>{otherCount} ({patients.length > 0 ? Math.round((otherCount / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (otherCount / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Specialization overview */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Award className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Practice Summary Insights</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Practice insights are compiled based on recent diagnostics records cataloged. The average active condition counts for your authorized patient directory is currently <span className="font-semibold text-emerald-400">low</span>, indicating highly compliant care checksheets logging.
          </p>
        </div>

      </div>

    </div>
  );
};

export default DoctorTrends;
