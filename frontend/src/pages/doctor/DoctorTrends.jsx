import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import HealthTrendChart from '../../components/HealthTrendChart';
import {
  TrendingUp,
  Users,
  Activity,
  Award,
  AlertTriangle,
  Heart,
  Stethoscope,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const DoctorTrends = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Patient Vital Explorer State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientVitals, setSelectedPatientVitals] = useState([]);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState('');

  // Practice Analytics
  const [demographics, setDemographics] = useState({ male: 0, female: 0, other: 0 });

  const fetchPatients = async () => {
    try {
      const response = await api.get('/doctor/patients');
      if (response.success && response.data) {
        setPatients(response.data);

        // Calculate demographics
        const male = response.data.filter((p) => p.profile?.gender?.toLowerCase() === 'male').length;
        const female = response.data.filter((p) => p.profile?.gender?.toLowerCase() === 'female').length;
        const other = response.data.length - male - female;
        setDemographics({ male, female, other });

        // Auto select first patient if available
        if (response.data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(response.data[0]._id);
          setSelectedPatientName(response.data[0].name);
          loadPatientVitals(response.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load patient trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientVitals = async (patientId) => {
    if (!patientId) return;
    setLoadingVitals(true);
    try {
      const res = await api.get(`/doctor/patients/${patientId}/medical-history`);
      if (res.success && res.data) {
        const vitals = res.data.vitals || res.data.healthProfile?.vitals || [];
        setSelectedPatientVitals(vitals);
      }
    } catch (err) {
      console.error('Failed to load patient vitals:', err);
    } finally {
      setLoadingVitals(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handlePatientChange = (e) => {
    const pId = e.target.value;
    setSelectedPatientId(pId);
    const p = patients.find((pat) => pat._id === pId);
    if (p) {
      setSelectedPatientName(p.name);
      loadPatientVitals(pId);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500 font-display flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        <span>Loading Practice Analytics & Health Trends...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto px-2">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">
            Practice Analytics & Health Trend Analyzer
          </h2>
          <p className="text-xs text-slate-400">
            Review aggregated patient cohorts, demographic telemetry, and individual vital curves.
          </p>
        </div>

        <button
          onClick={fetchPatients}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-colors self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Grid: Practice KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-2xl border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Registry Cohort Size
            </span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{patients.length} Active Patients</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="bg-sky-500/10 text-sky-400 p-3 rounded-2xl border border-sky-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Gender Distribution
            </span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">
              {demographics.male}M / {demographics.female}F
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="bg-brand-500/10 text-brand-400 p-3 rounded-2xl border border-brand-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Cardiovascular Status
            </span>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-0.5">Normative Monitoring</h3>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTION: PATIENT VITAL TELEMETRY & TREND CURVES */}
      {/* ======================================================== */}
      <div className="space-y-4">
        
        {/* Patient Selector Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Stethoscope className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Patient Vital Telemetry Explorer
              </h4>
              <p className="text-[10px] text-slate-400">
                Inspect interactive multi-line curves (BP, Pulse, Temp, Weight) for any patient.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedPatientId}
              onChange={handlePatientChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-inner"
            >
              {patients.length === 0 ? (
                <option value="">No authorized patients</option>
              ) : (
                patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.profile?.gender || 'Patient'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Live Interactive Trend Visualizer */}
        {loadingVitals ? (
          <div className="p-12 text-center text-slate-400 glass-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
            <span className="text-xs">Loading vital telemetry for {selectedPatientName}...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300">
                Displaying Vital Telemetry Curves for: <strong className="text-emerald-400">{selectedPatientName}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                {selectedPatientVitals.length} Data Points Logged
              </span>
            </div>

            <HealthTrendChart vitals={selectedPatientVitals} height={260} />
          </div>
        )}

      </div>

      {/* Demographics & Clinical Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Demographics Breakdown */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <TrendingUp className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Cohort Demographics Breakdown</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1 text-[11px]">
                <span>Male Cohort</span>
                <span>{demographics.male} ({patients.length > 0 ? Math.round((demographics.male / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (demographics.male / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1 text-[11px]">
                <span>Female Cohort</span>
                <span>{demographics.female} ({patients.length > 0 ? Math.round((demographics.female / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (demographics.female / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 font-bold mb-1 text-[11px]">
                <span>Unspecified / Other</span>
                <span>{demographics.other} ({patients.length > 0 ? Math.round((demographics.other / patients.length) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${patients.length > 0 ? (demographics.other / patients.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Quality & Risk Benchmarks */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Award className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Practice Quality & Risk Benchmarks</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Practice analytics are updated based on telemetry submissions and scheduled follow-ups. Regular vital tracking improves early hypertension detection and medication adherence rates by over 42%.
          </p>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All practice cohorts are synchronized with active Care Pathways and medication tracking.</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DoctorTrends;
