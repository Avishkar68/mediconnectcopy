import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Award,
  Heart,
  Droplet,
  Compass,
  Activity,
  Pill,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  Flame,
  Check,
  ChevronRight,
  Info,
  UserCheck,
  Stethoscope,
  Target,
  RefreshCw,
  PlusCircle,
  Layers,
} from 'lucide-react';

// Fallback interactive demonstration pathway for new patients before a doctor assigns one
const SAMPLE_DEMO_CARE_PLAN = {
  _id: 'demo-sample-plan',
  title: 'Post-Myocardial & Cardiovascular Recovery Pathway',
  diagnosis: 'Acute Coronary Syndrome, Post-PCI Stent Placement',
  category: 'cardiac',
  status: 'active',
  doctor: {
    name: 'Sarah Chen, M.D.',
    profile: {
      specialization: 'Consultant Interventional Cardiologist',
      phone: '+1 (555) 234-8901',
      clinicAddress: 'Heart & Vascular Institute, Suite 400',
    },
  },
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  phases: [
    {
      phaseNumber: 1,
      name: 'Phase 1: Acute Hemodynamic Stabilization (Days 1–7)',
      durationDays: 7,
      description: 'Stabilize resting hemodynamics, prevent puncture site hematoma, and establish baseline daily vital monitoring.',
      goals: [
        'Seated blood pressure consistently below 130/80 mmHg',
        'Zero angina or resting dyspnea',
        'No catheter site exudate or swelling',
      ],
      status: 'in-progress',
    },
    {
      phaseNumber: 2,
      name: 'Phase 2: Graduated Aerobic Reconditioning (Days 8–28)',
      durationDays: 21,
      description: 'Progressive monitored cardiovascular walking, low-sodium dietary integration, and cardiac medication adherence.',
      goals: [
        '30-minute continuous flat-surface walk without angina',
        'Target resting pulse rate between 60–75 bpm',
        'Full adherence to dual antiplatelet regimen',
      ],
      status: 'pending',
    },
    {
      phaseNumber: 3,
      name: 'Phase 3: Long-term Cardiac Wellness & Maintenance (Month 2+)',
      durationDays: 60,
      description: 'Long-term lipid targets maintenance, sustained aerobic exercise, and quarterly clinical follow-ups.',
      goals: [
        'LDL cholesterol maintained < 70 mg/dL',
        'Sustained Mediterranean / low-sodium nutrition',
      ],
      status: 'pending',
    },
  ],
  dailyTasks: [
    {
      taskId: 'demo_t1',
      title: 'Morning Blood Pressure & Resting Pulse Log',
      category: 'vital',
      frequency: 'twice_daily',
      instructions: 'Rest seated for 5 minutes before cuff measurement. Log systolic and diastolic values.',
      targetMetric: { metricName: 'Blood Pressure', targetValue: '< 130/80 mmHg' },
      isActive: true,
    },
    {
      taskId: 'demo_t2',
      title: 'Dual Antiplatelet (Aspirin + Clopidogrel) Morning Dose',
      category: 'medication',
      frequency: 'daily',
      instructions: 'Take with morning breakfast and water. Do not skip or alter dose without consulting cardiology.',
      targetMetric: { metricName: 'Adherence', targetValue: '100% on-time' },
      isActive: true,
    },
    {
      taskId: 'demo_t3',
      title: 'Strict Low-Sodium Intake Check (< 2,000 mg/day)',
      category: 'diet',
      frequency: 'daily',
      instructions: 'Avoid canned soups, processed deli meats, and added table salt. Drink at least 2 liters of water.',
      targetMetric: { metricName: 'Sodium Limit', targetValue: '< 2g daily' },
      isActive: true,
    },
    {
      taskId: 'demo_t4',
      title: 'Monitored 20-Minute Light Cardiovascular Walk',
      category: 'exercise',
      frequency: 'daily',
      instructions: 'Brisk walk on flat terrain. Maintain conversational pace. Stop immediately if lightheaded or chest tightness occurs.',
      targetMetric: { metricName: 'Duration', targetValue: '20 mins @ < 110 bpm' },
      isActive: true,
    },
    {
      taskId: 'demo_t5',
      title: 'Post-Catheterization Radial / Femoral Puncture Inspection',
      category: 'symptom_check',
      frequency: 'daily',
      instructions: 'Inspect wrist/groin puncture site for swelling, expanding bruises, or throbbing tenderness.',
      targetMetric: { metricName: 'Site Status', targetValue: 'Clean & Intact' },
      isActive: true,
    },
  ],
  targetVitals: {
    systolicMax: 130,
    diastolicMax: 80,
    heartRateTarget: '60 - 80 bpm',
    bloodSugarTarget: '< 100 mg/dL (fasting)',
    weightTargetKg: 74,
    specialNotes: 'Report systolic BP > 140 mmHg or pulse > 95 bpm at rest immediately. Keep sublingual nitroglycerin accessible.',
  },
  taskCompletions: [
    {
      date: new Date().toISOString().slice(0, 10),
      taskId: 'demo_t1',
      completedAt: new Date().toISOString(),
      loggedValue: '122/78 mmHg, 68 bpm',
      notes: 'Felt well upon waking',
    },
    {
      date: new Date().toISOString().slice(0, 10),
      taskId: 'demo_t2',
      completedAt: new Date().toISOString(),
      loggedValue: 'Taken with breakfast',
      notes: '',
    },
  ],
  doctorReviews: [
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      doctorName: 'Dr. Sarah Chen',
      note: 'Radial access site healing cleanly. Continue current beta-blocker and antiplatelet dosing. Blood pressure well-controlled.',
    },
  ],
};

const PatientCarePlan = () => {
  const [carePlans, setCarePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingTaskId, setTogglingTaskId] = useState(null);
  const [useDemoFallback, setUseDemoFallback] = useState(false);
  const [demoCompletions, setDemoCompletions] = useState(SAMPLE_DEMO_CARE_PLAN.taskCompletions);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const fetchCarePlans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/patient/care-plans');
      if (response.success && response.data && response.data.length > 0) {
        setCarePlans(response.data);
        setSelectedPlanId(response.data[0]._id);
        setUseDemoFallback(false);
      } else {
        setCarePlans([]);
        setUseDemoFallback(true);
      }
    } catch (err) {
      console.warn('Could not fetch remote care plans, using demo pathway:', err.message);
      setUseDemoFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarePlans();
  }, []);

  const activePlan = useMemo(() => {
    if (useDemoFallback || carePlans.length === 0) {
      return {
        ...SAMPLE_DEMO_CARE_PLAN,
        taskCompletions: demoCompletions,
      };
    }
    return carePlans.find((p) => p._id === selectedPlanId) || carePlans[0];
  }, [carePlans, selectedPlanId, useDemoFallback, demoCompletions]);

  // Handle live toggle of daily tasks
  const handleToggleTask = async (taskId) => {
    if (togglingTaskId) return;

    if (useDemoFallback) {
      // Toggle locally for demo pathway
      setDemoCompletions((prev) => {
        const exists = prev.some((c) => c.date === todayStr && c.taskId === taskId);
        if (exists) {
          return prev.filter((c) => !(c.date === todayStr && c.taskId === taskId));
        } else {
          return [
            ...prev,
            {
              date: todayStr,
              taskId,
              completedAt: new Date().toISOString(),
              loggedValue: 'completed',
              notes: 'Completed by patient',
            },
          ];
        }
      });
      return;
    }

    setTogglingTaskId(taskId);
    try {
      const response = await api.post(
        `/patient/care-plans/${activePlan._id}/tasks/${taskId}/toggle`,
        { date: todayStr }
      );
      if (response.success && response.data?.carePlan) {
        setCarePlans((prev) =>
          prev.map((p) => (p._id === activePlan._id ? response.data.carePlan : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle care plan task:', err);
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Helper icons for categories
  const getCategoryDetails = (cat) => {
    switch (cat) {
      case 'vital':
        return {
          icon: Heart,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          label: 'Vital Signs',
        };
      case 'medication':
        return {
          icon: Pill,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          label: 'Medication',
        };
      case 'exercise':
        return {
          icon: Activity,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          label: 'Physical Rehab',
        };
      case 'diet':
        return {
          icon: Droplet,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          label: 'Diet & Nutrition',
        };
      case 'symptom_check':
        return {
          icon: ShieldAlert,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          label: 'Symptom Triage',
        };
      default:
        return {
          icon: Compass,
          color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
          label: 'Lifestyle Target',
        };
    }
  };

  // Calculate today's adherence stats
  const tasks = activePlan?.dailyTasks || [];
  const completedTodayTasks = useMemo(() => {
    const completions = activePlan?.taskCompletions || [];
    return completions.filter((c) => c.date === todayStr);
  }, [activePlan, todayStr]);

  const completedTaskIds = useMemo(() => {
    return new Set(completedTodayTasks.map((c) => c.taskId));
  }, [completedTodayTasks]);

  const doneCount = tasks.filter((t) => completedTaskIds.has(t.taskId)).length;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400 font-medium">Synchronizing Care Pathway & Clinical Targets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto pb-16">
      
      {/* Header with Title and Mode Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white font-display tracking-tight">
                Smart Care Pathway & Recovery Tracking
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic clinical protocol, stage-by-stage recovery milestones, and daily health checksheets.
              </p>
            </div>
          </div>
        </div>

        {/* Plan Switcher / Mode badge */}
        <div className="flex items-center space-x-3">
          {carePlans.length > 1 && (
            <select
              value={selectedPlanId || ''}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setUseDemoFallback(false);
              }}
              className="glass-input bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2"
            >
              {carePlans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}

          {useDemoFallback && (
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Sample Smart Pathway
              </span>
              <button
                onClick={fetchCarePlans}
                title="Refresh from server"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner if using demo pathway */}
      {useDemoFallback && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
          <Info className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              Welcome to the MediConnect Smart Care Pathway Engine!
            </p>
            <p className="text-slate-400 leading-relaxed">
              When your doctor assigns a personalized recovery or chronic disease care plan, it will appear here dynamically. You are currently previewing an interactive <strong>Post-Myocardial & Cardiovascular Recovery Pathway</strong>. Click the checklist tasks below to test live adherence tracking!
            </p>
          </div>
        </div>
      )}

      {/* Plan Primary Overview Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {activePlan.category || 'Clinical Pathway'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Started: {new Date(activePlan.createdAt || activePlan.startDate).toLocaleDateString()}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white font-display">
              {activePlan.title}
            </h2>

            <p className="text-xs text-slate-300 font-medium">
              <span className="text-slate-500">Diagnosis Focus:</span> {activePlan.diagnosis}
            </p>

            {activePlan.description && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {activePlan.description}
              </p>
            )}

            {/* Prescribing Doctor Information */}
            <div className="flex items-center space-x-2 pt-2 text-xs text-slate-400">
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Prescribing Physician:</span>
              <span className="font-bold text-slate-200">
                {activePlan.doctor?.name || 'Attending Physician'}
              </span>
              {activePlan.doctor?.profile?.specialization && (
                <span className="text-slate-500 text-[11px]">
                  ({activePlan.doctor.profile.specialization})
                </span>
              )}
            </div>
          </div>

          {/* Adherence Score Ring / Progress */}
          <div className="shrink-0 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Today's Task Adherence
            </span>
            <div className="flex items-baseline justify-center space-x-1.5 my-1">
              <span className="text-4xl font-extrabold text-brand-400 font-display">
                {progressPercent}%
              </span>
              <span className="text-xs text-slate-500 font-bold">
                ({doneCount}/{tasks.length})
              </span>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-brand-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              {progressPercent === 100
                ? 'All goals achieved for today! 🎉'
                : `${tasks.length - doneCount} check(s) remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recovery Pathway Milestones / Phases Progression */}
      {activePlan.phases && activePlan.phases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Layers className="w-4 h-4 text-brand-400 mr-2" />
              <span>Pathway Phases & Clinical Milestones</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {activePlan.phases.length} Structured Care Stages
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activePlan.phases.map((phase, idx) => {
              const isCompleted = phase.status === 'completed';
              const isInProgress = phase.status === 'in-progress';

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all text-left relative overflow-hidden ${
                    isInProgress
                      ? 'bg-gradient-to-b from-brand-500/10 to-slate-900/60 border-brand-500/40 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/20'
                      : isCompleted
                      ? 'bg-slate-900/40 border-emerald-500/30'
                      : 'bg-slate-900/20 border-slate-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Phase {phase.phaseNumber} • {phase.durationDays} Days
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        isInProgress
                          ? 'bg-brand-500/10 text-brand-400 border-brand-500/30 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {phase.status}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white mb-2 leading-snug">
                    {phase.name}
                  </h4>

                  {phase.description && (
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      {phase.description}
                    </p>
                  )}

                  {phase.goals && phase.goals.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                        Milestone Goals
                      </span>
                      {phase.goals.map((g, gIdx) => (
                        <div key={gIdx} className="flex items-start space-x-1.5 text-[11px] text-slate-300">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isCompleted ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          />
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Interactive Grid: Today's Checklist vs Target Vitals & Care Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's Action Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" />
              <span>Today's Recovery Checklist ({new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Click task to toggle completed status
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 border border-slate-800 rounded-2xl">
              <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No daily tasks currently prescribed in this pathway.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isDone = completedTaskIds.has(task.taskId);
                const isPendingToggling = togglingTaskId === task.taskId;
                const catDetails = getCategoryDetails(task.category);
                const CatIcon = catDetails.icon;

                return (
                  <div
                    key={task.taskId}
                    onClick={() => handleToggleTask(task.taskId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-start gap-4 select-none group ${
                      isDone
                        ? 'bg-slate-900/25 border-emerald-500/20 opacity-80 hover:opacity-100'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-transform group-hover:scale-105 ${catDetails.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catDetails.color}`}>
                            {catDetails.label}
                          </span>

                          <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                            {task.frequency}
                          </span>

                          {task.targetMetric?.targetValue && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-bold border border-brand-500/20">
                              Target: {task.targetMetric.targetValue}
                            </span>
                          )}
                        </div>

                        <h4 className={`text-xs sm:text-sm font-bold transition-all ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-white'
                        }`}>
                          {task.title}
                        </h4>

                        {task.instructions && (
                          <p className={`text-[11px] leading-relaxed ${
                            isDone ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {task.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Interactive Checkbox Indicator */}
                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-6 h-6 rounded-xl border flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'border-slate-700 bg-slate-950/80 text-transparent hover:border-brand-400'
                        }`}
                      >
                        {isPendingToggling ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Prescribed Target Metrics & Doctor Review Notes */}
        <div className="space-y-6">
          
          {/* Target Health Metrics Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center border-b border-slate-800 pb-2">
              <Target className="w-4 h-4 text-rose-400 mr-2" />
              <span>Target Vitals & Benchmarks</span>
            </h3>

            <div className="space-y-3 text-xs">
              {activePlan.targetVitals?.systolicMax && (
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-slate-400">Target Blood Pressure</span>
                  <span className="font-extrabold text-rose-400 font-mono">
                    &lt; {activePlan.targetVitals.systolicMax} / {activePlan.targetVitals.diastolicMax || 80} mmHg
                  </span>
                </div>
              )}

              {activePlan.targetVitals?.heartRateTarget && (
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-slate-400">Resting Heart Rate</span>
                  <span className="font-extrabold text-sky-400 font-mono">
                    {activePlan.targetVitals.heartRateTarget}
                  </span>
                </div>
              )}

              {activePlan.targetVitals?.bloodSugarTarget && (
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-slate-400">Blood Sugar Range</span>
                  <span className="font-extrabold text-emerald-400 font-mono">
                    {activePlan.targetVitals.bloodSugarTarget}
                  </span>
                </div>
              )}

              {activePlan.targetVitals?.weightTargetKg && (
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <span className="text-slate-400">Target Body Weight</span>
                  <span className="font-extrabold text-amber-400 font-mono">
                    {activePlan.targetVitals.weightTargetKg} kg
                  </span>
                </div>
              )}

              {activePlan.targetVitals?.specialNotes && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <strong className="block text-amber-400 uppercase text-[9px] tracking-wider mb-1">
                    Special Physician Directive:
                  </strong>
                  {activePlan.targetVitals.specialNotes}
                </div>
              )}
            </div>
          </div>

          {/* Doctor Reviews / Adherence Feedback */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center border-b border-slate-800 pb-2">
              <UserCheck className="w-4 h-4 text-emerald-400 mr-2" />
              <span>Doctor Clinical Review Log</span>
            </h3>

            {(!activePlan.doctorReviews || activePlan.doctorReviews.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-2">
                No formal review notes logged by physician yet. Check back following your next consultation.
              </p>
            ) : (
              <div className="space-y-3">
                {activePlan.doctorReviews.map((rev, rIdx) => (
                  <div key={rIdx} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-emerald-400">{rev.doctorName || 'Attending Doctor'}</span>
                      <span className="text-slate-500">
                        {new Date(rev.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      "{rev.note}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/dashboard/appointments"
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>Book Follow-up Appointment</span>
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientCarePlan;
