import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  ClipboardList,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Layers,
  Heart,
  Droplet,
  Activity,
  Pill,
  Sparkles,
  Calendar,
  Clock,
  User,
  Target,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldAlert,
  Edit,
  X,
  Compass,
  FileText,
  UserCheck,
} from 'lucide-react';

const SMART_PATHWAY_TEMPLATES = [
  {
    id: 'cardiac-pci',
    name: 'Cardiovascular Rehab & Post-PCI Stent Protocol',
    category: 'cardiac',
    diagnosis: 'Acute Coronary Syndrome, Post-PCI Stent Placement',
    description: 'Post-catheterization hemodynamic stabilization, dual antiplatelet compliance, graded aerobic walking, and sodium restriction.',
    targetVitals: {
      systolicMax: 130,
      diastolicMax: 80,
      heartRateTarget: '60 - 75 bpm',
      bloodSugarTarget: '< 100 mg/dL',
      weightTargetKg: 75,
      specialNotes: 'Report systolic BP > 140 mmHg or resting pulse > 90 bpm immediately. Keep nitroglycerin accessible.',
    },
    phases: [
      {
        phaseNumber: 1,
        name: 'Phase 1: Acute Hemodynamic Stabilization (Days 1–7)',
        durationDays: 7,
        description: 'Resting vital monitoring, catheter site inspection, zero heavy lifting.',
        goals: ['BP < 130/80 mmHg', 'No puncture site hematoma', 'Zero resting chest tightness'],
        status: 'in-progress',
      },
      {
        phaseNumber: 2,
        name: 'Phase 2: Graduated Aerobic Reconditioning (Days 8–28)',
        durationDays: 21,
        description: 'Daily 20-30 min flat cardiovascular walking, sodium intake < 2g/day.',
        goals: ['Walk 30 mins continuously', 'Resting pulse 60-75 bpm', '100% medication adherence'],
        status: 'pending',
      },
      {
        phaseNumber: 3,
        name: 'Phase 3: Long-term Cardiac Wellness & Maintenance (Month 2+)',
        durationDays: 60,
        description: 'Sustained Mediterranean nutrition, maintenance statin + antiplatelet therapy.',
        goals: ['LDL maintained < 70 mg/dL', 'Sustained physical activity without angina'],
        status: 'pending',
      },
    ],
    dailyTasks: [
      {
        taskId: 'task_bp',
        title: 'Morning Seated BP & Pulse Log',
        category: 'vital',
        frequency: 'daily',
        instructions: 'Rest seated 5 minutes prior to measurement. Log systolic, diastolic, and pulse.',
        targetMetric: { metricName: 'Blood Pressure', targetValue: '< 130/80 mmHg' },
      },
      {
        taskId: 'task_antiplatelet',
        title: 'Prescribed Dual Antiplatelet (DAPT) Morning Dose',
        category: 'medication',
        frequency: 'daily',
        instructions: 'Take with breakfast and water. Crucial to prevent stent thrombosis.',
        targetMetric: { metricName: 'Dose Compliance', targetValue: '100%' },
      },
      {
        taskId: 'task_sodium',
        title: 'Sodium Restriction Check (< 2,000 mg daily)',
        category: 'diet',
        frequency: 'daily',
        instructions: 'Strictly avoid salted snacks, deli meats, and instant seasonings.',
        targetMetric: { metricName: 'Sodium Limit', targetValue: '< 2g/day' },
      },
      {
        taskId: 'task_walk',
        title: 'Monitored 20-Minute Cardiovascular Walk',
        category: 'exercise',
        frequency: 'daily',
        instructions: 'Comfortable flat-terrain walk. Stop if chest discomfort or shortness of breath occurs.',
        targetMetric: { metricName: 'Duration', targetValue: '20 mins' },
      },
      {
        taskId: 'task_site',
        title: 'Puncture Access Site Inspection',
        category: 'symptom_check',
        frequency: 'daily',
        instructions: 'Inspect wrist/femoral site for swelling, redness, or tenderness.',
        targetMetric: { metricName: 'Site Condition', targetValue: 'Clean & Intact' },
      },
    ],
  },
  {
    id: 'diabetes-glycemic',
    name: 'Type 2 Diabetes Glycemic Optimization Pathway',
    category: 'diabetes',
    diagnosis: 'Type 2 Diabetes Mellitus with Suboptimal Glycemic Control',
    description: 'Structured fasting & postprandial glucose tracking, carbohydrate control, daily diabetic foot inspection, and oral hypoglycemic compliance.',
    targetVitals: {
      systolicMax: 130,
      diastolicMax: 80,
      heartRateTarget: '65 - 85 bpm',
      bloodSugarTarget: 'Fasting: 80-130 mg/dL, Post-meal: < 180 mg/dL',
      weightTargetKg: 78,
      specialNotes: 'Report any blood glucose < 70 mg/dL immediately as acute hypoglycemia. Treat with 15g fast-acting sugar.',
    },
    phases: [
      {
        phaseNumber: 1,
        name: 'Phase 1: Glycemic Stabilization & Baseline Mapping (Days 1–14)',
        durationDays: 14,
        description: 'Map fasting and 2-hour postprandial blood sugars, calibrate oral medications.',
        goals: ['Fasting sugars < 130 mg/dL', 'No symptomatic hypoglycemia episodes', 'Consistent meal logs'],
        status: 'in-progress',
      },
      {
        phaseNumber: 2,
        name: 'Phase 2: Lifestyle & Carbohydrate Titration (Days 15–45)',
        durationDays: 30,
        description: 'Integrate low-glycemic dietary targets and 30-minute post-meal physical walking.',
        goals: ['Post-prandial spikes < 180 mg/dL', 'Daily diabetic foot inspection compliant'],
        status: 'pending',
      },
      {
        phaseNumber: 3,
        name: 'Phase 3: Long-term Glycemic Control & HbA1c Target (Month 2+)',
        durationDays: 60,
        description: 'Target 3-month HbA1c below 7.0%, maintain renal and cardiovascular protective regimen.',
        goals: ['Estimated HbA1c < 7.0%', 'Microalbuminuria screening scheduled'],
        status: 'pending',
      },
    ],
    dailyTasks: [
      {
        taskId: 'task_fasting_sugar',
        title: 'Fasting Blood Glucose Check (Morning)',
        category: 'vital',
        frequency: 'daily',
        instructions: 'Check before morning breakfast. Target 80 to 130 mg/dL.',
        targetMetric: { metricName: 'Fasting Glucose', targetValue: '80 - 130 mg/dL' },
      },
      {
        taskId: 'task_metformin',
        title: 'Prescribed Oral Antidiabetic Medication Dose',
        category: 'medication',
        frequency: 'twice_daily',
        instructions: 'Take with major meals as prescribed.',
        targetMetric: { metricName: 'Adherence', targetValue: 'Twice daily' },
      },
      {
        taskId: 'task_foot_check',
        title: 'Diabetic Foot Inspection',
        category: 'symptom_check',
        frequency: 'daily',
        instructions: 'Inspect soles, heels, and between toes for blisters, redness, or cracked skin.',
        targetMetric: { metricName: 'Skin Intact', targetValue: 'Zero Ulcers' },
      },
      {
        taskId: 'task_carb_count',
        title: 'Low Glycemic Index & Portion Controlled Meal Plan',
        category: 'diet',
        frequency: 'daily',
        instructions: 'Restrict refined sugar, sweetened beverages, and simple white starches.',
        targetMetric: { metricName: 'Carbs per meal', targetValue: '< 45g' },
      },
      {
        taskId: 'task_walk_diabetes',
        title: 'Post-Meal 20-Minute Brisk Walk',
        category: 'exercise',
        frequency: 'daily',
        instructions: 'Improves muscular insulin sensitivity and blunts postprandial glucose spike.',
        targetMetric: { metricName: 'Daily Steps', targetValue: '> 6,000 steps' },
      },
    ],
  },
  {
    id: 'hypertension-dash',
    name: 'Hypertension Step-Down & DASH Protocol',
    category: 'hypertension',
    diagnosis: 'Stage 2 Essential Hypertension',
    description: 'Bilateral home blood pressure surveillance, DASH dietary sodium reduction, stress management, and medication titration.',
    targetVitals: {
      systolicMax: 125,
      diastolicMax: 80,
      heartRateTarget: '60 - 80 bpm',
      bloodSugarTarget: 'Normal',
      weightTargetKg: 72,
      specialNotes: 'Report systolic BP >= 160 mmHg or diastolic >= 100 mmHg if sustained across two consecutive readings.',
    },
    phases: [
      {
        phaseNumber: 1,
        name: 'Phase 1: Blood Pressure Step-Down (Days 1–10)',
        durationDays: 10,
        description: 'Morning and evening seated BP monitoring to confirm drug efficacy.',
        goals: ['Home systolic < 135 mmHg', 'Zero orthostatic dizziness upon standing'],
        status: 'in-progress',
      },
      {
        phaseNumber: 2,
        name: 'Phase 2: DASH Protocol Integration (Days 11–30)',
        durationDays: 20,
        description: 'Dietary Approaches to Stop Hypertension (DASH) rich in potassium, calcium, magnesium.',
        goals: ['Sodium < 1,500 mg/day', '30 min aerobic exercise 4x/week'],
        status: 'pending',
      },
      {
        phaseNumber: 3,
        name: 'Phase 3: Target Normotension Maintenance (Month 2+)',
        durationDays: 60,
        description: 'Sustain ambulatory BP below 125/80 mmHg and monitor renal electrolytes.',
        goals: ['Serum creatinine and K+ in normal range', 'Stable blood pressure'],
        status: 'pending',
      },
    ],
    dailyTasks: [
      {
        taskId: 'task_bp_am_pm',
        title: 'Morning & Evening Blood Pressure Recording',
        category: 'vital',
        frequency: 'twice_daily',
        instructions: 'Take 2 readings 1 minute apart; log the average.',
        targetMetric: { metricName: 'Blood Pressure', targetValue: '< 125/80 mmHg' },
      },
      {
        taskId: 'task_antihypertensive',
        title: 'Prescribed Antihypertensive Dose',
        category: 'medication',
        frequency: 'daily',
        instructions: 'Take once daily at the same time every morning.',
        targetMetric: { metricName: 'Adherence', targetValue: 'Daily 100%' },
      },
      {
        taskId: 'task_dash_diet',
        title: 'DASH Meal Plan Compliance (High Potassium, Low Sodium)',
        category: 'diet',
        frequency: 'daily',
        instructions: 'Include leafy greens, berries, legumes, unsalted nuts. Restrict sodium below 1.5g.',
        targetMetric: { metricName: 'Sodium', targetValue: '< 1.5g' },
      },
      {
        taskId: 'task_breathwork',
        title: '15-Minute Deep Diaphragmatic Breathwork',
        category: 'lifestyle',
        frequency: 'daily',
        instructions: 'Slow paced breathing (6 breaths per minute) to lower sympathetic vascular tone.',
        targetMetric: { metricName: 'Breathing Session', targetValue: '15 mins' },
      },
    ],
  },
  {
    id: 'post-op-mobility',
    name: 'Post-Operative Wound Healing & Early Mobilization',
    category: 'post-op',
    diagnosis: 'Post-Surgical Recovery & Tissue Healing',
    description: 'Incision site surveillance for surgical site infections, pain management titration, deep breathing spirometry, and safe assisted mobilization.',
    targetVitals: {
      systolicMax: 135,
      diastolicMax: 85,
      heartRateTarget: '65 - 90 bpm',
      bloodSugarTarget: '< 140 mg/dL',
      weightTargetKg: null,
      specialNotes: 'Report oral temperature > 38.0°C (100.4°F), purulent wound discharge, or sudden calf swelling immediately.',
    },
    phases: [
      {
        phaseNumber: 1,
        name: 'Phase 1: Acute Wound Healing & Infection Watch (Days 1–7)',
        durationDays: 7,
        description: 'Keep incision clean and dry, inspect daily, manage pain without oversedation.',
        goals: ['Normal body temperature < 37.5°C', 'Incision clean without purulent exudate', 'Pain controlled < 3/10'],
        status: 'in-progress',
      },
      {
        phaseNumber: 2,
        name: 'Phase 2: Suture Evaluation & Mobility Progression (Days 8–21)',
        durationDays: 14,
        description: 'Gradual increase in unassisted walking, gentle range-of-motion, scar maturation.',
        goals: ['Independent ambulation', 'Transition to non-opioid pain relief'],
        status: 'pending',
      },
      {
        phaseNumber: 3,
        name: 'Phase 3: Full Functional Reconditioning (Days 22–45)',
        durationDays: 24,
        description: 'Return to normal activities of daily living and work tasks.',
        goals: ['Full functional independence', 'Concluded clinical clearance'],
        status: 'pending',
      },
    ],
    dailyTasks: [
      {
        taskId: 'task_temp',
        title: 'Oral Temperature & Fever Surveillance',
        category: 'vital',
        frequency: 'twice_daily',
        instructions: 'Check temperature twice daily to detect early surgical infection.',
        targetMetric: { metricName: 'Body Temp', targetValue: '< 37.5°C' },
      },
      {
        taskId: 'task_wound_check',
        title: 'Surgical Incision Site Inspection',
        category: 'symptom_check',
        frequency: 'daily',
        instructions: 'Check dressing and incision for erythema, warmth, or purulent drainage.',
        targetMetric: { metricName: 'Wound State', targetValue: 'Clean & Intact' },
      },
      {
        taskId: 'task_spirometry',
        title: 'Incentive Spirometry Deep Breathing',
        category: 'lifestyle',
        frequency: 'daily',
        instructions: 'Perform 10 deep breaths per hour while awake to prevent atelectasis/pneumonia.',
        targetMetric: { metricName: 'Cycles', targetValue: '10 breaths/hr' },
      },
      {
        taskId: 'task_assisted_walk',
        title: 'Gentle Assisted Ambulation & Leg Pumping',
        category: 'exercise',
        frequency: 'daily',
        instructions: 'Walk 10-15 minutes indoors with assistance. Perform ankle pumps while seated to prevent DVT.',
        targetMetric: { metricName: 'Ambulation', targetValue: '15 mins' },
      },
    ],
  },
];

const DoctorCarePlans = () => {
  const [patients, setPatients] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form State
  const [form, setForm] = useState({
    patientId: '',
    title: '',
    diagnosis: '',
    description: '',
    category: 'general',
    targetEndDate: '',
    phases: [],
    dailyTasks: [],
    targetVitals: {
      systolicMax: 130,
      diastolicMax: 80,
      heartRateTarget: '60 - 80 bpm',
      bloodSugarTarget: '',
      weightTargetKg: '',
      specialNotes: '',
    },
  });

  // Manage Plan / Review Modal State
  const [selectedPlanForReview, setSelectedPlanForReview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patRes, plansRes] = await Promise.all([
        api.get('/doctor/patients'),
        api.get('/doctor/care-plans'),
      ]);

      if (patRes.success && patRes.data) {
        setPatients(patRes.data);
      }
      if (plansRes.success && plansRes.data) {
        setCarePlans(plansRes.data);
      }
    } catch (err) {
      console.error('Failed to load doctor care plans data:', err);
      setError('Could not retrieve active patients and care plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1-Click Template Selector
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template.id);
    setForm((prev) => ({
      ...prev,
      title: template.name,
      diagnosis: template.diagnosis,
      description: template.description,
      category: template.category,
      phases: JSON.parse(JSON.stringify(template.phases)),
      dailyTasks: JSON.parse(JSON.stringify(template.dailyTasks)),
      targetVitals: { ...template.targetVitals },
    }));
  };

  // Submit New Care Plan
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.patientId) {
      setError('Please select an authorized patient.');
      return;
    }
    if (!form.title.trim() || !form.diagnosis.trim()) {
      setError('Care plan title and diagnosis are required.');
      return;
    }

    try {
      const response = await api.post('/doctor/care-plans', {
        patientId: form.patientId,
        title: form.title,
        diagnosis: form.diagnosis,
        description: form.description,
        category: form.category,
        targetEndDate: form.targetEndDate || undefined,
        phases: form.phases,
        dailyTasks: form.dailyTasks,
        targetVitals: form.targetVitals,
      });

      if (response.success && response.data) {
        setSuccess(`Care Pathway "${form.title}" successfully prescribed!`);
        setCarePlans((prev) => [response.data, ...prev]);
        setIsModalOpen(false);

        // Reset form
        setForm({
          patientId: '',
          title: '',
          diagnosis: '',
          description: '',
          category: 'general',
          targetEndDate: '',
          phases: [],
          dailyTasks: [],
          targetVitals: {
            systolicMax: 130,
            diastolicMax: 80,
            heartRateTarget: '',
            bloodSugarTarget: '',
            weightTargetKg: '',
            specialNotes: '',
          },
        });
        setSelectedTemplate(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to create care pathway.');
    }
  };

  // Submit Doctor Review or Status Update
  const handleUpdateCarePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanForReview) return;

    setIsUpdatingStatus(true);
    try {
      const response = await api.put(`/doctor/care-plans/${selectedPlanForReview._id}`, {
        reviewNote: reviewNote.trim() || undefined,
        status: selectedPlanForReview.status,
        phaseUpdates: selectedPlanForReview.phases,
      });

      if (response.success && response.data) {
        setSuccess('Care plan updated with your clinical review.');
        setCarePlans((prev) =>
          prev.map((p) => (p._id === selectedPlanForReview._id ? response.data : p))
        );
        setSelectedPlanForReview(null);
        setReviewNote('');
      }
    } catch (err) {
      setError(err.message || 'Failed to update care plan.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Toggle Phase Status within review modal
  const handlePhaseStatusChange = (phaseIndex, newStatus) => {
    if (!selectedPlanForReview) return;
    const updatedPhases = [...selectedPlanForReview.phases];
    updatedPhases[phaseIndex] = {
      ...updatedPhases[phaseIndex],
      status: newStatus,
    };
    setSelectedPlanForReview((prev) => ({
      ...prev,
      phases: updatedPhases,
    }));
  };

  // Filtered Care Plans
  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return carePlans;
    const q = searchQuery.toLowerCase();
    return carePlans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.diagnosis.toLowerCase().includes(q) ||
        p.patient?.name?.toLowerCase().includes(q)
    );
  }, [carePlans, searchQuery]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400 font-medium">Loading Treatment Plan Management Suite...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white font-display tracking-tight">
                Treatment Plan Management Studio
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Prescribe structured clinical pathways, define milestone phases, and track daily patient adherence.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setError('');
            setSuccess('');
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-lg shadow-brand-500/20 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Prescribe Care Pathway</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Care Pathways</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {carePlans.filter((p) => p.status === 'active').length} Active
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients Enrolled</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {new Set(carePlans.map((p) => p.patient?._id || p.patient)).size} Patients
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Templates</span>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {SMART_PATHWAY_TEMPLATES.length} Available
            </h3>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by plan, diagnosis, or patient..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredPlans.length} of {carePlans.length} care pathway(s)
        </span>
      </div>

      {/* Care Plans List */}
      {filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Care Pathways Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No care pathways match your search query.'
              : 'Prescribe your first structured recovery pathway for an authorized patient using our 1-click clinical templates.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all mt-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Prescribe First Care Pathway</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPlans.map((plan) => {
            const phases = plan.phases || [];
            const activePhase = phases.find((ph) => ph.status === 'in-progress') || phases[0];
            const tasks = plan.dailyTasks || [];

            return (
              <div
                key={plan._id}
                className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-all text-left flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {plan.category || 'General'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        plan.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : plan.status === 'completed'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white font-display">
                      {plan.title}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      <span className="text-slate-500 font-normal">Diagnosis:</span> {plan.diagnosis}
                    </p>
                  </div>

                  {/* Patient Info */}
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-850 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold text-slate-200">{plan.patient?.name || 'Authorized Patient'}</span>
                        <p className="text-[10px] text-slate-500">{plan.patient?.email || ''}</p>
                      </div>
                    </div>
                    {plan.patient?.profile?.phone && (
                      <span className="text-[10px] text-slate-400">{plan.patient.profile.phone}</span>
                    )}
                  </div>

                  {/* Active Phase Badge */}
                  {activePhase && (
                    <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">
                          Current Stage
                        </span>
                        <span className="text-brand-400 font-bold uppercase">
                          Phase {activePhase.phaseNumber} • {activePhase.durationDays} Days
                        </span>
                      </div>
                      <p className="text-slate-200 font-semibold text-xs truncate">
                        {activePhase.name}
                      </p>
                    </div>
                  )}

                  {/* Daily Tasks Pill list */}
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Prescribed Daily Tasks ({tasks.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tasks.slice(0, 3).map((t, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                          {t.title}
                        </span>
                      ))}
                      {tasks.length > 3 && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-400">
                          +{tasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Updated: {new Date(plan.updatedAt || plan.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedPlanForReview(plan);
                      setReviewNote('');
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-brand-200 text-xs font-bold transition-all border border-slate-700"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Manage & Review</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- CREATE CARE PATHWAY MODAL ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl my-8 p-6 md:p-8 space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                Clinical Workflow Studio
              </span>
              <h2 className="text-xl font-bold text-white font-display">
                Prescribe New Smart Care Pathway
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select a patient, pick a pre-configured clinical protocol or build custom recovery phases.
              </p>
            </div>

            {/* 1-Click Smart Templates Ribbon */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                <span>1-Click Smart Clinical Protocols (Auto-Populate)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SMART_PATHWAY_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-3 rounded-xl border text-left transition-all text-xs flex items-center space-x-2.5 ${
                      selectedTemplate === tmpl.id
                        ? 'bg-brand-500/15 border-brand-500/50 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {tmpl.category === 'cardiac' && <Heart className="w-4 h-4 text-rose-400" />}
                      {tmpl.category === 'diabetes' && <Droplet className="w-4 h-4 text-emerald-400" />}
                      {tmpl.category === 'hypertension' && <Activity className="w-4 h-4 text-amber-400" />}
                      {tmpl.category === 'post-op' && <ShieldAlert className="w-4 h-4 text-purple-400" />}
                    </span>
                    <div className="truncate">
                      <p className="font-bold truncate">{tmpl.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{tmpl.diagnosis}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-5 pt-2 border-t border-slate-800">
              
              {/* Patient Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Patient *
                </label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select from authorized patients...</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Diagnosis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Care Pathway Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Post-PCI Recovery Pathway"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Diagnosis / Clinical Indication *
                  </label>
                  <input
                    type="text"
                    value={form.diagnosis}
                    onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                    placeholder="e.g. Acute Coronary Syndrome, Type 2 Diabetes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Clinical Objective & Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline clinical goals, precautions, and dietary guidance..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Target Vitals Grid */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Target className="w-3.5 h-3.5 text-rose-400 mr-1.5" />
                  <span>Target Clinical Metrics & Vitals</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Systolic BP</label>
                    <input
                      type="number"
                      value={form.targetVitals.systolicMax || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          targetVitals: { ...form.targetVitals, systolicMax: parseInt(e.target.value) || null },
                        })
                      }
                      placeholder="130"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Max Diastolic BP</label>
                    <input
                      type="number"
                      value={form.targetVitals.diastolicMax || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          targetVitals: { ...form.targetVitals, diastolicMax: parseInt(e.target.value) || null },
                        })
                      }
                      placeholder="80"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Heart Rate Target</label>
                    <input
                      type="text"
                      value={form.targetVitals.heartRateTarget || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          targetVitals: { ...form.targetVitals, heartRateTarget: e.target.value },
                        })
                      }
                      placeholder="60 - 80 bpm"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Blood Sugar Target</label>
                    <input
                      type="text"
                      value={form.targetVitals.bloodSugarTarget || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          targetVitals: { ...form.targetVitals, bloodSugarTarget: e.target.value },
                        })
                      }
                      placeholder="< 130 mg/dL"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 uppercase block mb-1">Special Clinical Precaution</label>
                  <input
                    type="text"
                    value={form.targetVitals.specialNotes || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        targetVitals: { ...form.targetVitals, specialNotes: e.target.value },
                      })
                    }
                    placeholder="e.g. Stop exercise if chest pain occurs. Report fever > 38.0°C."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Phases preview summary */}
              {form.phases && form.phases.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Configured Pathway Phases ({form.phases.length})
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {form.phases.map((ph, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                        <span className="font-semibold text-slate-200">
                          Phase {ph.phaseNumber}: {ph.name}
                        </span>
                        <span className="text-[10px] text-brand-400 font-bold">
                          {ph.durationDays} Days
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily tasks preview */}
              {form.dailyTasks && form.dailyTasks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prescribed Daily Tasks ({form.dailyTasks.length})
                  </span>
                  <div className="space-y-1 text-xs">
                    {form.dailyTasks.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/70 border border-slate-850 flex justify-between items-center text-[11px]">
                        <span className="text-slate-300">{t.title}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500">{t.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  Prescribe Care Pathway
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ---------------- MANAGE & REVIEW MODAL ---------------- */}
      {selectedPlanForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl my-8 p-6 md:p-8 space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedPlanForReview(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                Clinical Adherence & Review
              </span>
              <h2 className="text-xl font-bold text-white font-display">
                Manage: {selectedPlanForReview.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Patient: <span className="text-slate-200 font-bold">{selectedPlanForReview.patient?.name}</span> • Diagnosis: {selectedPlanForReview.diagnosis}
              </p>
            </div>

            <form onSubmit={handleUpdateCarePlan} className="space-y-6">
              
              {/* Overall Plan Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Care Pathway Status
                </label>
                <div className="flex space-x-2">
                  {['active', 'paused', 'completed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setSelectedPlanForReview({
                          ...selectedPlanForReview,
                          status: st,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                        selectedPlanForReview.status === st
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestone Phase Status Control */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Advance / Update Milestone Phases
                </label>
                <div className="space-y-2 text-xs">
                  {selectedPlanForReview.phases.map((ph, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex justify-between items-center gap-3"
                    >
                      <div>
                        <span className="font-bold text-slate-200 block">
                          Phase {ph.phaseNumber}: {ph.name}
                        </span>
                        <span className="text-[10px] text-slate-500">{ph.durationDays} Days</span>
                      </div>

                      <select
                        value={ph.status}
                        onChange={(e) => handlePhaseStatusChange(idx, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2.5 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Clinical Review Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Add Clinical Physician Review Note (Notifies Patient)
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Evaluated daily BP logs. Resting hemodynamics well-controlled. Cleared to start Phase 2 walking protocol."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForReview(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  {isUpdatingStatus ? 'Saving Updates...' : 'Save Clinical Review'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorCarePlans;
