import i18n from "../i18n/index.js";
import React, { useState, useEffect } from 'react';
import api from '../../src/services/api';
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Stethoscope,
  Pill,
  Activity,
  FileText,
  AlertOctagon,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';

const QUICK_SYMPTOMS = [
  'Persistent fever & chills',
  'Productive cough & chest tightness',
  'Shortness of breath on exertion',
  'Severe sore throat & odynophagia',
  'Epigastric pain & postprandial nausea',
  'Watery diarrhea & abdominal cramps',
  'Chronic fatigue & polyuria',
  'Severe throbbing unilateral headache',
];

const DoctorAiCopilotModal = ({ isOpen, onClose, patient, initialMode = 'summary' }) => {
  const [activeTab, setActiveTab] = useState(initialMode); // 'summary', 'ddx', 'interactions'
  
  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Differential Diagnosis State
  const [symptomsInput, setSymptomsInput] = useState('');
  const [ddxData, setDdxData] = useState(null);
  const [loadingDdx, setLoadingDdx] = useState(false);
  const [ddxError, setDdxError] = useState('');

  // Drug Interaction State
  const [medInput, setMedInput] = useState('');
  const [interactionData, setInteractionData] = useState(null);
  const [loadingInteraction, setLoadingInteraction] = useState(false);
  const [interactionError, setInteractionError] = useState('');

  // Auto-fetch summary when opened
  useEffect(() => {
    if (isOpen && patient?._id) {
      fetchClinicalSummary(patient._id);
    }
  }, [isOpen, patient]);

  const fetchClinicalSummary = async (patientId) => {
    setLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await api.post('/doctor/copilot/summary', { patientId });
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      setSummaryError(err.message || 'Failed to generate AI clinical brief.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateDdx = async (e) => {
    e?.preventDefault();
    if (!symptomsInput.trim()) return;

    setLoadingDdx(true);
    setDdxError('');
    try {
      const res = await api.post('/doctor/copilot/differential-diagnosis', {
        symptoms: symptomsInput,
        patientAge: patient?.profile?.dateOfBirth ? 'Calculated' : undefined,
        patientGender: patient?.profile?.gender || undefined,
      });
      if (res.success) {
        setDdxData(res.data);
      }
    } catch (err) {
      setDdxError(err.message || 'Failed to generate differential diagnosis.');
    } finally {
      setLoadingDdx(false);
    }
  };

  const handleCheckInteraction = async (e) => {
    e?.preventDefault();
    if (!medInput.trim()) return;

    setLoadingInteraction(true);
    setInteractionError('');
    try {
      const res = await api.post('/doctor/copilot/interaction-check', {
        patientId: patient?._id,
        medicationName: medInput.trim(),
      });
      if (res.success) {
        setInteractionData(res.data);
      }
    } catch (err) {
      setInteractionError(err.message || 'Failed to check drug interaction.');
    } finally {
      setLoadingInteraction(false);
    }
  };

  if (!isOpen) return null;

  const patientName = patient?.name || summaryData?.patientName || 'Selected Patient';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold text-white font-display uppercase tracking-wide">
                  {i18n.t("MediConnect AI Doctor Copilot")}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {i18n.t("Clinical Decision Support")}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {i18n.t("Evaluating patient:")} <strong className="text-slate-200">{patientName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800 bg-slate-950/50 flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              activeTab === 'summary'
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{i18n.t("AI Clinical Brief")}</span>
          </button>

          <button
            onClick={() => setActiveTab('interactions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              activeTab === 'interactions'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>{i18n.t("Drug & Allergy Safety Check")}</span>
          </button>

          <button
            onClick={() => setActiveTab('ddx')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              activeTab === 'ddx'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{i18n.t("Differential Diagnosis")}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: AI CLINICAL BRIEF */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {loadingSummary ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-brand-400 animate-spin" />
                  <p className="text-xs text-slate-400">{i18n.t("Synthesizing patient vitals, telemetry, allergies & medication history...")}</p>
                </div>
              ) : summaryError ? (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {summaryError}
                </div>
              ) : summaryData ? (
                <div className="space-y-4">
                  
                  {/* Risk Tier & Telemetry Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Evaluated Risk Tier")}</span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                            summaryData.riskLevel === 'High'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : summaryData.riskLevel === 'Moderate'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {summaryData.riskLevel} {i18n.t("Risk")}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Vital Sign Telemetry")}</span>
                      <span className="text-xs font-bold text-white block truncate">{summaryData.vitalEvaluation}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Documented Allergens")}</span>
                      <span className="text-xs font-bold text-slate-200">
                        {summaryData.allergies?.length > 0 ? summaryData.allergies.join(', ') : 'None documented'}
                      </span>
                    </div>

                  </div>

                  {/* Executive Narrative */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{i18n.t("AI Synthesized Clinical Narrative")}</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {summaryData.executiveSummary}
                    </p>
                  </div>

                  {/* Targeted Clinical Recommendations */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      {i18n.t("Targeted Clinical Directives & Recommendations")}
                    </span>
                    <div className="space-y-1.5">
                      {summaryData.recommendations?.map((rec, i) => (
                        <div key={i} className="flex items-start space-x-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
                          <span className="text-slate-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Prescriptions Snapshot */}
                  {summaryData.activeMedications?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        {i18n.t("Active Prescribed Regimens (")}{summaryData.activeMedications.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {summaryData.activeMedications.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold flex items-center space-x-1"
                          >
                            <Pill className="w-3 h-3 text-emerald-400" />
                            <span>{m.name} ({m.dosage})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: DRUG & ALLERGY SAFETY CHECK */}
          {activeTab === 'interactions' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                {i18n.t("Screen planned medications against patient's active prescriptions and known hypersensitivities before prescribing.")}
              </div>

              <form onSubmit={handleCheckInteraction} className="flex gap-2">
                <input
                  type="text"
                  value={medInput}
                  onChange={(e) => setMedInput(e.target.value)}
                  placeholder={i18n.t("Enter medication to screen (e.g. Amoxicillin, Ibuprofen, Warfarin)...")}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loadingInteraction}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs flex items-center space-x-1 transition-all shadow-md shadow-emerald-500/20"
                >
                  {loadingInteraction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{i18n.t("Screen Drug")}</span>}
                </button>
              </form>

              {/* Interaction Evaluation Results */}
              {interactionData && (
                <div className="space-y-3 animate-in fade-in">
                  
                  {/* Status Banner */}
                  {interactionData.safeToPrescribe ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span>{i18n.t("Safe to Prescribe: No critical allergy conflicts or severe drug-drug interactions detected.")}</span>
                        <p className="text-[11px] font-normal text-emerald-400/90 mt-0.5">
                          {i18n.t("Screened against active patient profile and allergens.")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center space-x-2">
                      <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <span>{i18n.t("High-Risk Conflict Detected:")} {interactionData.alertsCount} {i18n.t("contraindication alert(s).")}</span>
                        <p className="text-[11px] font-normal text-rose-400/90 mt-0.5">
                          {i18n.t("Review clinical warnings below before issuing prescription.")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Alerts List */}
                  {interactionData.alerts?.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                          : alert.severity === 'severe'
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>{alert.title}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-slate-900 border border-slate-700">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">{alert.description}</p>
                      {alert.recommendation && (
                        <div className="pt-1 text-[11px] font-semibold text-brand-300 border-t border-slate-800/80">
                          {i18n.t("Clinical Guidance:")} {alert.recommendation}
                        </div>
                      )}
                    </div>
                  ))}

                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIFFERENTIAL DIAGNOSIS */}
          {activeTab === 'ddx' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block">
                  {i18n.t("Select common symptom clusters or enter specific physical examination findings:")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSymptomsInput((prev) => (prev ? `${prev}, ${chip}` : chip))}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/40 text-slate-300 border border-slate-700 transition-all text-left"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleGenerateDdx} className="flex gap-2">
                <input
                  type="text"
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  placeholder={i18n.t("e.g. Fever 102F, severe cough, pleuritic chest pain for 4 days...")}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={loadingDdx}
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-dark-950 font-bold text-xs flex items-center space-x-1 transition-all shadow-md shadow-indigo-500/20"
                >
                  {loadingDdx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{i18n.t("Analyze DDx")}</span>}
                </button>
              </form>

              {/* DDx Output */}
              {ddxData && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Potential Conditions */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      {i18n.t("Differential Diagnoses (Ranked by syndromic likelihood)")}
                    </span>
                    <div className="space-y-2">
                      {ddxData.differentials?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-sm">{item.condition}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                item.probability === 'High'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : item.probability === 'Moderate'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {item.probability} {i18n.t("Probability (")}{item.icdCode})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Diagnostics */}
                  {ddxData.recommendedTests?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">
                        {i18n.t("Recommended Confirmatory Lab / Imaging Diagnostics")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {ddxData.recommendedTests.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-indigo-300 font-semibold"
                          >
                            🔬 {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Red Flags */}
                  {ddxData.redFlags?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5 text-xs">
                      <span className="font-bold text-rose-400 flex items-center space-x-1.5">
                        <AlertOctagon className="w-4 h-4" />
                        <span>{i18n.t("Critical Red-Flag Warning Signs (Emergency Referrals)")}</span>
                      </span>
                      <ul className="list-disc list-inside text-rose-300/90 text-[11px] space-y-0.5">
                        {ddxData.redFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default DoctorAiCopilotModal;
