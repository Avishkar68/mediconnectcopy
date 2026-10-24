import i18n from "../../i18n/index.js";
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Search,
  RefreshCw,
  Printer,
  ShieldCheck,
  Stethoscope,
  Info
} from 'lucide-react';

const COMPARISON_PRESETS = [
  {
    id: 'anemia-cbc',
    title: 'Sample 1: Iron & Blood Count (Anemia)',
    subtitle: 'See if Hemoglobin & Energy improved after taking iron vitamins',
    tag: 'Blood Count',
    report1: {
      title: 'Earlier Test: Jan 15, 2026',
      date: 'Jan 15, 2026',
      text: `PATIENT BASELINE CBC TEST REPORT:
Date: Jan 15, 2026

COMPLETE BLOOD COUNT (CBC):
Hemoglobin: 10.2 g/dL (Ref: 13.5 - 17.5 g/dL) [LOW]
White Blood Cells (WBC): 12,800 /µL (Ref: 4,500 - 11,000 /µL) [HIGH]
Red Blood Cells (RBC): 3.8 million/µL (Ref: 4.5 - 5.9 million/µL) [LOW]
Hematocrit: 31.5% (Ref: 41.0 - 50.0%) [LOW]
Platelet Count: 240,000 /µL (Ref: 150,000 - 450,000 /µL) [NORMAL]
ESR (Erythrocyte Sedimentation Rate): 38 mm/hr (Ref: 0 - 15 mm/hr) [HIGH]
Serum Ferritin: 14 ng/mL (Ref: 20 - 250 ng/mL) [LOW]`
    },
    report2: {
      title: 'Latest Test: Apr 18, 2026',
      date: 'Apr 18, 2026',
      text: `PATIENT FOLLOW-UP EVALUATION CBC:
Date: Apr 18, 2026

COMPLETE BLOOD COUNT (CBC):
Hemoglobin: 13.8 g/dL (Ref: 13.5 - 17.5 g/dL) [NORMAL]
White Blood Cells (WBC): 6,900 /µL (Ref: 4,500 - 11,000 /µL) [NORMAL]
Red Blood Cells (RBC): 4.7 million/µL (Ref: 4.5 - 5.9 million/µL) [NORMAL]
Hematocrit: 42.0% (Ref: 41.0 - 50.0%) [NORMAL]
Platelet Count: 255,000 /µL (Ref: 150,000 - 450,000 /µL) [NORMAL]
ESR (Erythrocyte Sedimentation Rate): 12 mm/hr (Ref: 0 - 15 mm/hr) [NORMAL]
Serum Ferritin: 68 ng/mL (Ref: 20 - 250 ng/mL) [NORMAL]`
    }
  },
  {
    id: 'diabetes-lipids',
    title: 'Sample 2: Blood Sugar & Cholesterol',
    subtitle: 'See if Sugar and Bad Fats dropped down to healthy normal levels',
    tag: 'Sugar & Fats',
    report1: {
      title: 'Earlier Test: Nov 10, 2025',
      date: 'Nov 10, 2025',
      text: `PATIENT COMPREHENSIVE METABOLIC REPORT:
Date: Nov 10, 2025

DIABETES PROFILE:
Fasting Blood Glucose: 185 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]
HbA1c: 8.6% (Ref: 4.0 - 5.6%) [HIGH]

LIPID PROFILE:
Total Cholesterol: 248 mg/dL (Ref: < 200 mg/dL) [HIGH]
LDL Cholesterol: 165 mg/dL (Ref: < 100 mg/dL) [HIGH]
HDL Cholesterol: 36 mg/dL (Ref: > 40 mg/dL) [LOW]
Triglycerides: 220 mg/dL (Ref: < 150 mg/dL) [HIGH]

VITAL SIGNS:
Systolic Blood Pressure: 155 mmHg (Ref: < 120 mmHg) [HIGH]
Diastolic Blood Pressure: 94 mmHg (Ref: < 80 mmHg) [HIGH]`
    },
    report2: {
      title: 'Latest Test: May 12, 2026',
      date: 'May 12, 2026',
      text: `PATIENT FOLLOW-UP METABOLIC REPORT:
Date: May 12, 2026

DIABETES PROFILE:
Fasting Blood Glucose: 98 mg/dL (Ref: 70 - 99 mg/dL) [NORMAL]
HbA1c: 6.1% (Ref: 4.0 - 5.6%) [ATTENTION]

LIPID PROFILE:
Total Cholesterol: 182 mg/dL (Ref: < 200 mg/dL) [NORMAL]
LDL Cholesterol: 96 mg/dL (Ref: < 100 mg/dL) [NORMAL]
HDL Cholesterol: 48 mg/dL (Ref: > 40 mg/dL) [NORMAL]
Triglycerides: 135 mg/dL (Ref: < 150 mg/dL) [NORMAL]

VITAL SIGNS:
Systolic Blood Pressure: 122 mmHg (Ref: < 120 mmHg) [NORMAL]
Diastolic Blood Pressure: 78 mmHg (Ref: < 80 mmHg) [NORMAL]`
    }
  },
  {
    id: 'kidney-liver',
    title: 'Sample 3: Kidney & Liver Health',
    subtitle: 'See if Kidney waste and Liver readings recovered back to normal',
    tag: 'Kidneys & Liver',
    report1: {
      title: 'Earlier Test: Dec 02, 2025',
      date: 'Dec 02, 2025',
      text: `PATIENT RENAL & HEPATIC SCREEN:
Date: Dec 02, 2025

KIDNEY FUNCTION TEST (KFT):
Creatinine: 2.4 mg/dL (Ref: 0.7 - 1.3 mg/dL) [HIGH]
Blood Urea Nitrogen (BUN): 36 mg/dL (Ref: 7 - 20 mg/dL) [HIGH]
eGFR: 32 mL/min/1.73m2 (Ref: > 60 mL/min/1.73m2) [LOW]

LIVER FUNCTION TEST (LFT):
ALT (SGPT): 78 U/L (Ref: 7 - 56 U/L) [HIGH]
AST (SGOT): 68 U/L (Ref: 10 - 40 U/L) [HIGH]
Total Bilirubin: 1.4 mg/dL (Ref: 0.1 - 1.2 mg/dL) [HIGH]`
    },
    report2: {
      title: 'Latest Test: Jun 10, 2026',
      date: 'Jun 10, 2026',
      text: `PATIENT FOLLOW-UP ORGAN RE-TEST:
Date: Jun 10, 2026

KIDNEY FUNCTION TEST (KFT):
Creatinine: 1.2 mg/dL (Ref: 0.7 - 1.3 mg/dL) [NORMAL]
Blood Urea Nitrogen (BUN): 18 mg/dL (Ref: 7 - 20 mg/dL) [NORMAL]
eGFR: 68 mL/min/1.73m2 (Ref: > 60 mL/min/1.73m2) [NORMAL]

LIVER FUNCTION TEST (LFT):
ALT (SGPT): 34 U/L (Ref: 7 - 56 U/L) [NORMAL]
AST (SGOT): 28 U/L (Ref: 10 - 40 U/L) [NORMAL]
Total Bilirubin: 0.8 mg/dL (Ref: 0.1 - 1.2 mg/dL) [NORMAL]`
    }
  }
];

const PatientCompareReports = () => {
  const [patientRecords, setPatientRecords] = useState([]);

  // Form input states
  const [report1Title, setReport1Title] = useState(COMPARISON_PRESETS[0].report1.title);
  const [report1Date, setReport1Date] = useState(COMPARISON_PRESETS[0].report1.date);
  const [report1Text, setReport1Text] = useState(COMPARISON_PRESETS[0].report1.text);
  const [report1RecordId, setReport1RecordId] = useState('');

  const [report2Title, setReport2Title] = useState(COMPARISON_PRESETS[0].report2.title);
  const [report2Date, setReport2Date] = useState(COMPARISON_PRESETS[0].report2.date);
  const [report2Text, setReport2Text] = useState(COMPARISON_PRESETS[0].report2.text);
  const [report2RecordId, setReport2RecordId] = useState('');

  const [selectedPresetId, setSelectedPresetId] = useState('anemia-cbc');

  // Comparison execution states
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [error, setError] = useState('');

  // Filter & Search inside results
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'improved', 'worsened', 'stable'
  const [searchQuery, setSearchQuery] = useState('');

  const executeComparison = useCallback(async (overrideR1, overrideR2) => {
    const r1 = overrideR1 || {
      title: report1Title,
      date: report1Date,
      text: report1Text,
      recordId: report1RecordId || undefined
    };
    const r2 = overrideR2 || {
      title: report2Title,
      date: report2Date,
      text: report2Text,
      recordId: report2RecordId || undefined
    };

    if (!r1.text?.trim() || !r2.text?.trim()) {
      setError('Please provide diagnostic text or select medical records for both Baseline and Follow-up reports.');
      return;
    }

    setComparing(true);
    setError('');

    try {
      const response = await api.post('/patient/compare-reports', {
        report1: r1,
        report2: r2
      });

      if (response.success && response.data) {
        setComparisonResult(response.data);
      } else {
        setError(response.message || 'Comparison failed to process report biomarkers.');
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to compare reports. Please ensure reports contain measurable medical parameters.');
    } finally {
      setComparing(false);
    }
  }, [report1Title, report1Date, report1Text, report1RecordId, report2Title, report2Date, report2Text, report2RecordId]);

  // Load user's saved records on mount
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await api.get('/patient/records');
        if (res.success && res.data) {
          setPatientRecords(res.data);
        }
      } catch (err) {
        console.error('Failed to load records for comparison selector:', err);
      }
    };
    fetchRecords();
  }, []);

  // Trigger comparison with the default sample on initial load so the patient immediately sees results
  useEffect(() => {
    executeComparison(
      {
        title: COMPARISON_PRESETS[0].report1.title,
        date: COMPARISON_PRESETS[0].report1.date,
        text: COMPARISON_PRESETS[0].report1.text
      },
      {
        title: COMPARISON_PRESETS[0].report2.title,
        date: COMPARISON_PRESETS[0].report2.date,
        text: COMPARISON_PRESETS[0].report2.text
      }
    );
  }, [executeComparison]);

  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setReport1RecordId('');
    setReport2RecordId('');

    setReport1Title(preset.report1.title);
    setReport1Date(preset.report1.date);
    setReport1Text(preset.report1.text);

    setReport2Title(preset.report2.title);
    setReport2Date(preset.report2.date);
    setReport2Text(preset.report2.text);

    executeComparison(
      { title: preset.report1.title, date: preset.report1.date, text: preset.report1.text },
      { title: preset.report2.title, date: preset.report2.date, text: preset.report2.text }
    );
  };

  const handleSelectRecord1 = (e) => {
    const recId = e.target.value;
    setReport1RecordId(recId);
    setSelectedPresetId('');
    if (!recId) return;

    const rec = patientRecords.find(r => r._id === recId);
    if (rec) {
      setReport1Title(rec.title);
      setReport1Date(rec.recordDate ? new Date(rec.recordDate).toLocaleDateString() : 'Baseline Date');
      setReport1Text(`RECORD: ${rec.title}\nCATEGORY: ${rec.category}\nNOTES:\n${rec.notes || ''}`);
    }
  };

  const handleSelectRecord2 = (e) => {
    const recId = e.target.value;
    setReport2RecordId(recId);
    setSelectedPresetId('');
    if (!recId) return;

    const rec = patientRecords.find(r => r._id === recId);
    if (rec) {
      setReport2Title(rec.title);
      setReport2Date(rec.recordDate ? new Date(rec.recordDate).toLocaleDateString() : 'Follow-up Date');
      setReport2Text(`RECORD: ${rec.title}\nCATEGORY: ${rec.category}\nNOTES:\n${rec.notes || ''}`);
    }
  };

  // Trajectory visual styling helpers
  const getTrajectoryBadge = (trajectory) => {
    switch (trajectory) {
      case 'improved':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          label: 'Improved',
          icon: TrendingUp
        };
      case 'worsened':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          label: 'Needs Attention',
          icon: TrendingDown
        };
      case 'stable_normal':
        return {
          bg: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Maintained Normal',
          icon: CheckCircle2
        };
      default:
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          dot: 'bg-sky-400',
          label: 'Stable',
          icon: Activity
        };
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'low':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'critical':
        return 'bg-rose-600 text-white animate-pulse font-extrabold';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  // Filter matched parameters
  const filteredParameters = (comparisonResult?.matchedParameters || []).filter(item => {
    const matchesFilter =
      filterTab === 'all' ||
      (filterTab === 'improved' && item.trajectory === 'improved') ||
      (filterTab === 'worsened' && item.trajectory === 'worsened') ||
      (filterTab === 'stable' && (item.trajectory === 'stable_normal' || item.trajectory === 'stable'));

    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.clinicalInsight?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-left">
      
      {/* Top Header & Context Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-3">
              <GitCompare className="w-3.5 h-3.5" />
              <span>{i18n.t("Track Your Health Over Time")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              {i18n.t("Compare 2 Reports (See If Health Improved)")}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              {i18n.t("Compare an earlier test report with your latest test report side-by-side. See which numbers got better, which stayed stable, and what to discuss with your doctor.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/ai-analyzer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 text-xs font-semibold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>{i18n.t("Single Report Explainer")}</span>
            </Link>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 text-xs font-semibold transition-all"
              title={i18n.t("Print clinical comparison summary")}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{i18n.t("Print Summary")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Comparison Selectors */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {i18n.t("Try A Realistic Example")}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">{i18n.t("1-click sample comparisons")}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COMPARISON_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase tracking-wider">
                    {preset.tag}
                  </span>
                  {isSelected && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-brand-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{i18n.t("Selected")}</span>
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{preset.title}</h4>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {preset.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Report Selector / Editor Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Report 1: Baseline */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <h3 className="text-sm font-bold text-white">{i18n.t("Report 1: Earlier Test Report")}</h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">{i18n.t("Starting Point")}</span>
            </div>

            {patientRecords.length > 0 && (
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {i18n.t("Select from Saved Medical Records")}
                </label>
                <select
                  value={report1RecordId}
                  onChange={handleSelectRecord1}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">{i18n.t("-- Choose from archive or use custom text below --")}</option>
                  {patientRecords.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title} ({new Date(r.recordDate).toLocaleDateString()}) - {r.category}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">{i18n.t("Report Title")}</label>
                <input
                  type="text"
                  value={report1Title}
                  onChange={(e) => setReport1Title(e.target.value)}
                  placeholder={i18n.t("e.g., CBC Baseline Test")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">{i18n.t("Date")}</label>
                <input
                  type="text"
                  value={report1Date}
                  onChange={(e) => setReport1Date(e.target.value)}
                  placeholder={i18n.t("e.g., Jan 15, 2026")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                {i18n.t("Diagnostic Parameters & Laboratory Findings")}
              </label>
              <textarea
                rows={9}
                value={report1Text}
                onChange={(e) => {
                  setReport1Text(e.target.value);
                  setSelectedPresetId('');
                }}
                placeholder={i18n.t("Paste earlier diagnostic report text or test parameters...")}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Report 2: Follow-up */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h3 className="text-sm font-bold text-white">{i18n.t("Report 2: Latest / Recent Test Report")}</h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">{i18n.t("Latest Numbers")}</span>
            </div>

            {patientRecords.length > 0 && (
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {i18n.t("Select from Saved Medical Records")}
                </label>
                <select
                  value={report2RecordId}
                  onChange={handleSelectRecord2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">{i18n.t("-- Choose from archive or use custom text below --")}</option>
                  {patientRecords.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title} ({new Date(r.recordDate).toLocaleDateString()}) - {r.category}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">{i18n.t("Report Title")}</label>
                <input
                  type="text"
                  value={report2Title}
                  onChange={(e) => setReport2Title(e.target.value)}
                  placeholder={i18n.t("e.g., Follow-up Review")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">{i18n.t("Date")}</label>
                <input
                  type="text"
                  value={report2Date}
                  onChange={(e) => setReport2Date(e.target.value)}
                  placeholder={i18n.t("e.g., Apr 18, 2026")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                {i18n.t("Diagnostic Parameters & Laboratory Findings")}
              </label>
              <textarea
                rows={9}
                value={report2Text}
                onChange={(e) => {
                  setReport2Text(e.target.value);
                  setSelectedPresetId('');
                }}
                placeholder={i18n.t("Paste recent diagnostic report text or test parameters...")}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-brand-400 shrink-0" />
          <span>{i18n.t("The comparison engine pairs identical biomarkers across both tests to compute numeric delta, % variance, and clinical status transition.")}</span>
        </div>

        <button
          onClick={() => executeComparison()}
          disabled={comparing}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-brand-500/10 shrink-0"
        >
          {comparing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{i18n.t("Analyzing Trajectories...")}</span>
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4" />
              <span>{i18n.t("Run Biomarker Comparison")}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results Section */}
      {comparisonResult && (
        <div className="space-y-6 pt-4">
          
          {/* Executive Trajectory Summary Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                      comparisonResult.overallBadge === 'positive_progress'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : comparisonResult.overallBadge === 'needs_attention'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>{comparisonResult.overallStatusText}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {comparisonResult.matchedCount} {i18n.t("Tracked Biomarkers")}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {i18n.t("Trajectory:")} {comparisonResult.report1Meta.title} ➔ {comparisonResult.report2Meta.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                  {comparisonResult.summary}
                </p>
              </div>

              {/* Quick Metrics Stat Pills */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="flex items-center justify-center space-x-1 text-emerald-400 font-bold text-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span>{comparisonResult.stats.improvedCount}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                    {i18n.t("Getting Better")}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="flex items-center justify-center space-x-1 text-rose-400 font-bold text-lg">
                    <TrendingDown className="w-4 h-4" />
                    <span>{comparisonResult.stats.worsenedCount}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">
                    {i18n.t("Needs Watching")}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
                  <div className="flex items-center justify-center space-x-1 text-sky-400 font-bold text-lg">
                    <Activity className="w-4 h-4" />
                    <span>{comparisonResult.stats.stableCount}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-sky-300 tracking-wider">
                    {i18n.t("Stayed Same")}
                  </span>
                </div>
              </div>
            </div>

            {/* Actionable Recommendations */}
            {comparisonResult.actionableAdvice?.length > 0 && (
              <div className="pt-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-brand-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {i18n.t("What You Should Do Next")}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comparisonResult.actionableAdvice.map((advice, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                      <span>{advice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtering & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'all'
                    ? 'bg-brand-500 text-dark-950 shadow-md shadow-brand-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {i18n.t("All Metrics (")}{comparisonResult.matchedParameters.length})
              </button>

              <button
                onClick={() => setFilterTab('improved')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'improved'
                    ? 'bg-emerald-500 text-dark-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {i18n.t("Improved (")}{comparisonResult.stats.improvedCount})
              </button>

              <button
                onClick={() => setFilterTab('worsened')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'worsened'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {i18n.t("Attention (")}{comparisonResult.stats.worsenedCount})
              </button>

              <button
                onClick={() => setFilterTab('stable')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'stable'
                    ? 'bg-sky-500 text-dark-950 shadow-md shadow-sky-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {i18n.t("Stable (")}{comparisonResult.stats.stableCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.t("Search biomarker or section...")}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

          </div>

          {/* Detailed Matched Biomarkers Cards */}
          {filteredParameters.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center text-slate-400 text-xs">
              {i18n.t("No biomarkers match the selected filter or query.")}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParameters.map((param, idx) => {
                const trajectoryConfig = getTrajectoryBadge(param.trajectory);
                const TrajectoryIcon = trajectoryConfig.icon;

                return (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all text-left"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Metric Title & Category */}
                      <div className="lg:w-1/3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                            {param.section}
                          </span>
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${trajectoryConfig.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${trajectoryConfig.dot}`} />
                            <TrajectoryIcon className="w-3 h-3" />
                            <span>{trajectoryConfig.label}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{param.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {param.simpleDefinition}
                        </p>
                      </div>

                      {/* Side-by-Side Values */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:w-7/12 items-center">
                        
                        {/* Baseline Box */}
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold uppercase">{i18n.t("Baseline (Report 1)")}</span>
                            <span>{param.report1.date}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white font-mono">{param.report1.val}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusBadge(param.report1.status)}`}>
                              {param.report1.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {i18n.t("Ref:")} {param.report1.range || 'Standard'}
                          </div>
                        </div>

                        {/* Follow-up Box */}
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold uppercase">{i18n.t("Follow-up (Report 2)")}</span>
                            <span>{param.report2.date}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white font-mono">{param.report2.val}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusBadge(param.report2.status)}`}>
                              {param.report2.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {i18n.t("Ref:")} {param.report2.range || 'Standard'}
                          </div>
                        </div>

                        {/* Delta & Trajectory Insight */}
                        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                            {i18n.t("Calculated Delta")}
                          </span>
                          <div className="flex items-center space-x-2">
                            {param.delta !== null ? (
                              <span
                                className={`text-xs font-mono font-extrabold ${
                                  param.trajectory === 'improved'
                                    ? 'text-emerald-400'
                                    : param.trajectory === 'worsened'
                                    ? 'text-rose-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                {param.delta > 0 ? `+${param.delta}` : param.delta}{' '}
                                {param.percentChange !== null && `(${param.percentChange > 0 ? `+${param.percentChange}` : param.percentChange}%)`}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">{i18n.t("Tracked")}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {param.clinicalInsight}
                          </p>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clinical Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-[11px] leading-relaxed flex items-start space-x-3">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-300">{i18n.t("Clinical Reference Disclaimer:")} </strong>
              {comparisonResult.disclaimer}
            </p>
          </div>

        </div>
      )}

    </div>
  );
};

export default PatientCompareReports;
