import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  RefreshCw,
  Heart,
  Activity,
  ShieldAlert,
  Lightbulb,
  ChevronRight,
  Layers,
  ClipboardList,
  Check
} from 'lucide-react';

const PRESET_SAMPLES = [
  {
    title: 'Comprehensive Multi-Section Report (10 Panels)',
    desc: 'CBC, Cardiac, Inflammatory, KFT, LFT, Diabetes, Lipids, ABG, Urinalysis, Vitals & Doctor Impression',
    text: `COMPLETE DIAGNOSTIC LABORATORY & VITAL REPORT

PATIENT CLINICAL HISTORY:
Patient presents with fatigue, mild dyspnea on exertion, and persistent leg edema.

COMPLETE BLOOD COUNT (CBC):
Hemoglobin: 10.2 g/dL (Ref: 13.5 - 17.5 g/dL) [LOW]
White Blood Cells (WBC): 12,800 /µL (Ref: 4,500 - 11,000 /µL) [HIGH]
Red Blood Cells (RBC): 3.8 million/µL (Ref: 4.5 - 5.9 million/µL) [LOW]
Platelet Count: 240,000 /µL (Ref: 150,000 - 450,000 /µL) [NORMAL]
Hematocrit: 31.5% (Ref: 41.0 - 50.0%) [LOW]

CARDIAC MARKERS:
Troponin-I: 0.85 ng/mL (Ref: < 0.04 ng/mL) [CRITICAL]
CK-MB: 18.4 ng/mL (Ref: 0.5 - 5.0 ng/mL) [HIGH]

INFLAMMATORY MARKERS:
C-Reactive Protein (CRP): 42.5 mg/L (Ref: < 5.0 mg/L) [HIGH]
ESR (Erythrocyte Sedimentation Rate): 38 mm/hr (Ref: 0 - 15 mm/hr) [HIGH]

KIDNEY FUNCTION TEST (KFT):
Creatinine: 3.8 mg/dL (Ref: 0.7 - 1.3 mg/dL) [HIGH]
Blood Urea Nitrogen (BUN): 48 mg/dL (Ref: 7 - 20 mg/dL) [HIGH]
eGFR: 18 mL/min/1.73m2 (Ref: > 60 mL/min/1.73m2) [LOW]

LIVER FUNCTION TEST (LFT):
ALT (SGPT): 82 U/L (Ref: 7 - 56 U/L) [HIGH]
AST (SGOT): 74 U/L (Ref: 10 - 40 U/L) [HIGH]
Total Bilirubin: 1.1 mg/dL (Ref: 0.1 - 1.2 mg/dL) [NORMAL]
Alkaline Phosphatase (ALP): 115 U/L (Ref: 44 - 147 U/L) [NORMAL]

DIABETES PROFILE:
HbA1c: 8.4% (Ref: 4.0 - 5.6%) [HIGH]
Fasting Blood Glucose: 185 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]

LIPID PROFILE:
Total Cholesterol: 245 mg/dL (Ref: < 200 mg/dL) [HIGH]
LDL Cholesterol: 162 mg/dL (Ref: < 100 mg/dL) [HIGH]
HDL Cholesterol: 38 mg/dL (Ref: > 40 mg/dL) [LOW]
Triglycerides: 210 mg/dL (Ref: < 150 mg/dL) [HIGH]

ARTERIAL BLOOD GAS (ABG):
pH: 7.28 (Ref: 7.35 - 7.45) [LOW]
pCO2: 48 mmHg (Ref: 35 - 45 mmHg) [HIGH]
pO2: 78 mmHg (Ref: 85 - 100 mmHg) [LOW]
HCO3: 19 mmol/L (Ref: 22 - 26 mmol/L) [LOW]

URINALYSIS:
Urine Protein: 2+ (Ref: Negative) [ATTENTION]
Urine Glucose: Trace (Ref: Negative) [ATTENTION]

VITAL SIGNS:
Systolic Blood Pressure: 162 mmHg (Ref: < 120 mmHg) [HIGH]
Diastolic Blood Pressure: 98 mmHg (Ref: < 80 mmHg) [HIGH]
Heart Rate: 104 bpm (Ref: 60 - 100 bpm) [HIGH]
Oxygen Saturation (SpO2): 92% (Ref: 95 - 100%) [LOW]

PHYSICIAN IMPRESSION:
Multi-organ diagnostic profile demonstrates significant cardiac biomarker elevation, acute renal impairment, decompensated glycemic control, and systemic inflammatory response. Urgent clinical assessment and management is recommended.
`
  },
  {
    title: 'Diabetes & Lipid Panel',
    desc: 'High sugar & elevated cholesterol sample',
    text: 'Patient Diagnostic Report:\nHbA1c: 7.2%\nFasting Blood Glucose: 142 mg/dL\nTotal Cholesterol: 235 mg/dL\nLDL Cholesterol: 158 mg/dL\nHDL Cholesterol: 42 mg/dL\nTriglycerides: 185 mg/dL'
  },
  {
    title: 'Complete Blood Count (CBC)',
    desc: 'Low Hemoglobin & elevated WBC count',
    text: 'Laboratory Analysis:\nHemoglobin: 10.4 g/dL\nWhite Blood Cells (WBC): 12,800 /µL\nRed Blood Cells (RBC): 3.9 million/µL\nPlatelet Count: 240,000 /µL\nClinical Note: Patient reports general fatigue and mild throat discomfort.'
  }
];

const PatientAiAnalyzer = () => {
  const [searchParams] = useSearchParams();
  const initialRecordId = searchParams.get('recordId') || '';

  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(initialRecordId);
  const [reportText, setReportText] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingRecords, setFetchingRecords] = useState(true);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await api.get('/patient/records');
        if (res.success && res.data) {
          setRecords(res.data);
          if (initialRecordId) {
            const found = res.data.find(r => r._id === initialRecordId);
            if (found) {
              setReportTitle(found.title);
              setReportText(`Title: ${found.title}\nCategory: ${found.category}\nNotes: ${found.notes}`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load patient records:', err);
      } finally {
        setFetchingRecords(false);
      }
    };
    fetchRecords();
  }, [initialRecordId]);

  const handleRecordSelect = (e) => {
    const recId = e.target.value;
    setSelectedRecordId(recId);
    if (!recId) return;

    const record = records.find(r => r._id === recId);
    if (record) {
      setReportTitle(record.title);
      setReportText(`Document Title: ${record.title}\nCategory: ${record.category}\nNotes/Observations: ${record.notes || 'None provided'}`);
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedRecordId('');
    setReportTitle(preset.title);
    setReportText(preset.text);
    setAnalysisResult(null);
    setError('');
  };

  const normalizeAnalysisData = (rawData) => {
    if (!rawData || typeof rawData !== 'object') return null;

    let highlights = [];
    if (Array.isArray(rawData.statusHighlights)) {
      highlights = rawData.statusHighlights.map((h, idx) => {
        if (typeof h === 'string') {
          return { type: 'normal', label: `Finding ${idx + 1}`, message: h };
        }
        return {
          type: h.type || 'normal',
          label: h.label || (h.type === 'normal' ? 'Healthy Finding' : 'Needs Attention'),
          message: h.message || h.text || ''
        };
      });
    } else if (rawData.statusHighlights && typeof rawData.statusHighlights === 'object') {
      const healthy = Array.isArray(rawData.statusHighlights.healthyFindings) ? rawData.statusHighlights.healthyFindings : [];
      const attention = Array.isArray(rawData.statusHighlights.attentionFindings) ? rawData.statusHighlights.attentionFindings : [];
      const critical = Array.isArray(rawData.statusHighlights.criticalFindings) ? rawData.statusHighlights.criticalFindings : [];

      critical.forEach((item) => {
        highlights.push({
          type: 'critical',
          label: 'CRITICAL CLINICAL FINDING',
          message: typeof item === 'string' ? item : (item.message || item.text || '')
        });
      });

      attention.forEach((item) => {
        highlights.push({
          type: 'attention',
          label: 'Needs Attention',
          message: typeof item === 'string' ? item : (item.message || item.text || '')
        });
      });

      healthy.forEach((item) => {
        highlights.push({
          type: 'normal',
          label: 'Healthy Finding',
          message: typeof item === 'string' ? item : (item.message || item.text || '')
        });
      });
    }

    const rawMetrics = Array.isArray(rawData.metricsBreakdown)
      ? rawData.metricsBreakdown
      : Array.isArray(rawData.metrics)
      ? rawData.metrics
      : [];

    const normalizedMetrics = rawMetrics.map((m) => {
      if (typeof m === 'string') {
        return {
          name: m,
          val: 'N/A',
          range: 'N/A',
          value: 'N/A',
          referenceRange: 'N/A',
          status: 'normal',
          simpleDefinition: '',
          simpleMeaning: m,
          fieldTip: ''
        };
      }

      const val = m.val !== undefined && m.val !== null
        ? String(m.val)
        : m.value !== undefined && m.value !== null
        ? (m.unit && !String(m.value).includes(m.unit) ? (m.unit.startsWith('%') ? `${m.value}${m.unit}` : `${m.value} ${m.unit}`) : String(m.value))
        : 'N/A';

      const range = m.range !== undefined && m.range !== null
        ? String(m.range)
        : m.referenceRange !== undefined && m.referenceRange !== null
        ? String(m.referenceRange)
        : 'N/A';

      return {
        ...m,
        section: m.section || 'General',
        name: m.name || 'Parameter',
        val,
        range,
        value: m.value !== undefined ? m.value : val,
        referenceRange: m.referenceRange !== undefined ? m.referenceRange : range,
        status: m.status || 'normal',
        simpleDefinition: m.simpleDefinition || '',
        simpleMeaning: m.simpleMeaning || '',
        fieldTip: m.fieldTip || ''
      };
    });

    return {
      ...rawData,
      simplifiedSummary: rawData.simplifiedSummary || 'Medical report analysis complete.',
      overallStatus: rawData.overallStatus || 'normal',
      statusHighlights: highlights,
      metricsBreakdown: normalizedMetrics,
      metrics: normalizedMetrics,
      sections: Array.isArray(rawData.sections) ? rawData.sections : [],
      clinicalContext: rawData.clinicalContext || {},
      actionableAdvice: Array.isArray(rawData.actionableAdvice) ? rawData.actionableAdvice : [],
      disclaimer: rawData.disclaimer || 'This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions.',
      analysisCoverage: rawData.analysisCoverage || {
        extractedMetrics: normalizedMetrics.length,
        explainedMetrics: normalizedMetrics.length,
        complete: true
      }
    };
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!reportText.trim() && !selectedRecordId) {
      setError('Please paste medical report text or select an existing record.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      const res = await api.post('/patient/analyze-report', {
        reportText: reportText.trim(),
        recordId: selectedRecordId || undefined,
        reportTitle: reportTitle || 'Medical Diagnostic Report'
      });

      if (res.success && res.data) {
        setAnalysisResult(normalizeAnalysisData(res.data));
      } else {
        throw new Error(res.message || 'Could not parse medical report.');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError(err.message || 'Failed to analyze report with AI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'normal':
        return (
          <span className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Body Status: Healthy / Safe</span>
          </span>
        );
      case 'attention':
        return (
          <span className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Body Status: Attention Recommended</span>
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Body Status: Urgent Doctor Review Advised</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comprehensive Multi-Section Report Processor</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              AI Medical Report Analyzer
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Processes complete multi-page diagnostic panels (CBC, Cardiac, KFT, LFT, Diabetes, Lipids, ABG, Vitals & Clinical Notes) to explain every parameter in clear language.
            </p>
          </div>

          {analysisResult && (
            <button
              onClick={() => { setAnalysisResult(null); setReportText(''); setSelectedRecordId(''); setReportTitle(''); }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analyze Another Report</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-semibold flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Input Form Section */}
      {!analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <span>Provide Medical Report Details</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Option A: Choose from Your Saved Medical Records
              </label>
              <select
                value={selectedRecordId}
                onChange={handleRecordSelect}
                disabled={fetchingRecords}
                className="w-full glass-input bg-slate-900 px-3.5 py-2.5 text-xs rounded-xl text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Select an uploaded record --</option>
                {records.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.title} ({r.category?.replace('_', ' ').toUpperCase()}) - {new Date(r.recordDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex items-center my-2">
              <div className="flex-grow border-t border-slate-850"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-600 uppercase">OR</span>
              <div className="flex-grow border-t border-slate-850"></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Option B: Paste Multi-Section Report Text / Lab Findings
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Report Title (e.g. Comprehensive Multi-Organ Diagnostic Panel)"
                className="w-full glass-input bg-slate-900 px-3.5 py-2 text-xs rounded-xl text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 mb-2"
              />
              <textarea
                value={reportText}
                onChange={(e) => {
                  setReportText(e.target.value);
                  if (selectedRecordId) setSelectedRecordId('');
                }}
                rows={9}
                placeholder="Paste multi-page lab text, blood panels, physician impression, or vital signs here..."
                className="w-full glass-input bg-slate-900 px-3.5 py-3 text-xs rounded-xl text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 resize-none font-mono"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || (!reportText.trim() && !selectedRecordId)}
              className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg ${
                loading || (!reportText.trim() && !selectedRecordId)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-brand-500 hover:bg-brand-400 text-dark-950 shadow-brand-500/20 hover:scale-[1.01]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Analyzing All Report Sections...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Complete Report in Plain English</span>
                </>
              )}
            </button>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Try Sample Reports</span>
            </h3>
            <p className="text-xs text-slate-400">
              Click any sample below to test multi-section report parsing:
            </p>

            <div className="space-y-3">
              {PRESET_SAMPLES.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-brand-500/40 hover:bg-slate-900 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-brand-400 transition-colors">
                      {preset.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Analysis Coverage Stats Badge */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Full Report Analysis Coverage Verified</h4>
                <p className="text-[11px] text-slate-400">
                  {analysisResult.analysisCoverage?.explainedMetrics || analysisResult.metricsBreakdown?.length || 0} of {analysisResult.analysisCoverage?.extractedMetrics || analysisResult.metricsBreakdown?.length || 0} extracted parameters fully explained
                </p>
              </div>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>{analysisResult.sections?.length || 1} Section Panels Processed</span>
            </div>
          </div>

          {/* Status Header Banner */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4 bg-gradient-to-br from-slate-900 via-dark-950 to-slate-900">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    {reportTitle || 'Comprehensive Medical Diagnostic AI Breakdown'}
                  </h3>
                  <p className="text-xs text-slate-400">Multi-panel plain-language health interpretation</p>
                </div>
              </div>
              {getStatusBadge(analysisResult.overallStatus)}
            </div>

            <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/25 space-y-2">
              <div className="flex items-center space-x-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
                <Heart className="w-4 h-4" />
                <span>Overall Body Status (Plain English Summary)</span>
              </div>
              <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                "{analysisResult.simplifiedSummary}"
              </p>
            </div>
          </div>

          {/* Physician Impression & Narrative Clinical Context */}
          {analysisResult.clinicalContext && (analysisResult.clinicalContext.physicianImpression || analysisResult.clinicalContext.clinicalNotes?.length > 0) && (
            <div className="glass-card rounded-3xl p-6 border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ClipboardList className="w-4 h-4" />
                <span>Clinical Notes & Physician Impression</span>
              </div>
              {analysisResult.clinicalContext.physicianImpression && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 block">Attending Physician Impression:</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    "{analysisResult.clinicalContext.physicianImpression}"
                  </p>
                </div>
              )}
              {analysisResult.clinicalContext.clinicalNotes?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 block">Patient Clinical Notes:</span>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {analysisResult.clinicalContext.clinicalNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Healthy Findings */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Normal & Safe Findings</span>
              </div>
              
              <div className="space-y-2.5">
                {analysisResult.statusHighlights.filter(h => h.type === 'normal').length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No normal parameters isolated.</p>
                ) : (
                  analysisResult.statusHighlights.filter(h => h.type === 'normal').map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                      <span className="text-xs font-bold text-emerald-300 block">{h.label}</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{h.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Needs Attention & Critical Findings */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Needs Attention / Urgent Review</span>
              </div>

              <div className="space-y-2.5">
                {analysisResult.statusHighlights.filter(h => h.type !== 'normal').length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All checked lab values appear within safe normal ranges!</span>
                  </div>
                ) : (
                  analysisResult.statusHighlights.filter(h => h.type !== 'normal').map((h, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl space-y-1 ${
                        h.type === 'critical'
                          ? 'bg-rose-500/15 border border-rose-500/30'
                          : 'bg-amber-500/10 border border-amber-500/20'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${h.type === 'critical' ? 'text-rose-400' : 'text-amber-300'}`}>
                        {h.label}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{h.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Detailed Lab Metrics Breakdown - Field by Field */}
          {analysisResult.metricsBreakdown && analysisResult.metricsBreakdown.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center space-x-2 font-display">
                  <Activity className="w-5 h-5 text-sky-400" />
                  <span>Field-by-Field Medical Breakdown ({analysisResult.metricsBreakdown.length} Parameters)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Every test parameter from your report is explained below with what it checks, what your result means, and actionable tips.
                </p>
              </div>

              <div className="space-y-4">
                {analysisResult.metricsBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition-all"
                  >
                    {/* Top Row: Section, Name, Status, Value & Range */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-850">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg">
                          {item.section || 'General'}
                        </span>
                        <span className="text-sm font-bold text-white font-display">{item.name}</span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          item.status === 'normal'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.status === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-400">Result: </span>
                          <strong className="text-brand-400 font-mono font-bold">{item.val}</strong>
                        </div>
                        <span className="text-slate-700">|</span>
                        <div>
                          <span className="text-slate-500">Normal Range: </span>
                          <span className="text-slate-300 font-mono">{item.range}</span>
                        </div>
                      </div>
                    </div>

                    {item.simpleDefinition && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 space-y-1">
                        <div className="flex items-center space-x-1.5 text-sky-400 text-[11px] font-bold uppercase tracking-wider">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>What is this test parameter?</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.simpleDefinition}
                        </p>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 space-y-1">
                      <div className="flex items-center space-x-1.5 text-brand-400 text-[11px] font-bold uppercase tracking-wider">
                        <Heart className="w-3.5 h-3.5 shrink-0" />
                        <span>What your result means for your body</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {item.simpleMeaning}
                      </p>
                    </div>

                    {item.fieldTip && (
                      <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/15 space-y-1">
                        <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                          <span>Recommended action / tip for this field</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.fieldTip}
                        </p>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Steps */}
          {analysisResult.actionableAdvice && analysisResult.actionableAdvice.length > 0 && (
            <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-brand-400" />
                <span>Recommended Next Steps & Tips</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisResult.actionableAdvice.map((tip, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start space-x-3">
                    <div className="p-1 rounded-lg bg-brand-500/10 text-brand-400 shrink-0 mt-0.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-300 font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 text-slate-400 text-xs flex items-start space-x-3">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              {analysisResult.disclaimer || 'This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions.'}
            </p>
          </div>

        </div>
      )}

    </div>
  );
};

export default PatientAiAnalyzer;
