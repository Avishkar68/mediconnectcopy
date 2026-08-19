import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Calendar,
  Award,
  Heart,
  Droplet,
  Compass
} from 'lucide-react';

const PatientCarePlan = () => {
  // Mock active care plans
  const [tasks, setTasks] = useState([
    { id: 1, title: 'BP Vital Logs', desc: 'Record Blood Pressure values', category: 'vital', done: false },
    { id: 2, title: 'Daily Dose', desc: 'Take active morning pills', category: 'medication', done: true },
    { id: 3, title: 'Hydration Target', desc: 'Drink 8 glasses of water', category: 'lifestyle', done: false },
    { id: 4, title: 'Cardio Walk', desc: '30-minute light cardiovascular walk', category: 'exercise', done: false },
    { id: 5, title: 'Low Salt Diet Check', desc: 'Restrict sodium intake below 2g today', category: 'diet', done: true }
  ]);

  const toggleTask = (id) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const getTaskIcon = (cat) => {
    switch (cat) {
      case 'vital':
        return <Heart className="w-4 h-4 text-red-400" />;
      case 'medication':
        return <ClipboardList className="w-4 h-4 text-emerald-400" />;
      case 'lifestyle':
        return <Droplet className="w-4 h-4 text-sky-400" />;
      case 'exercise':
        return <Compass className="w-4 h-4 text-yellow-400" />;
      default:
        return <Award className="w-4 h-4 text-purple-400" />;
    }
  };

  const doneCount = tasks.filter(t => t.done).length;
  const progressPercent = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Care Plan & Goals</h2>
        <p className="text-xs text-slate-400">Review recommendations, diet restrictions, and workouts prescribed by your clinicians.</p>
      </div>

      {/* Progress Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Progress Checklist</h3>
            <p className="text-xs text-slate-400 mt-1">Complete tasks to hit your daily recovery targets.</p>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-extrabold text-brand-400 font-display">{progressPercent}%</span>
            <span className="text-xs text-slate-500">done</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-850 h-2 rounded-full mt-5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tasks List */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <ClipboardList className="w-4 h-4 text-brand-400 mr-1.5" />
            <span>Today's Log Checksheets</span>
          </h3>

          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center select-none ${
                  task.done
                    ? 'bg-slate-900/30 border-slate-850 opacity-60'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 text-left">
                  <div className="p-2 rounded-lg bg-slate-950/50">
                    {getTaskIcon(task.category)}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold text-slate-200 ${task.done ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </h4>
                    <p className={`text-[10px] text-slate-550 mt-0.5 ${task.done ? 'line-through' : ''}`}>
                      {task.desc}
                    </p>
                  </div>
                </div>

                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                  task.done 
                    ? 'bg-brand-500 border-brand-500 text-dark-950'
                    : 'border-slate-700 bg-slate-950'
                }`}>
                  {task.done && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines / Tips */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">
              Diet Restrictions
            </h3>
            <ul className="space-y-2 text-[11px] text-slate-400 list-disc list-inside">
              <li>Sodium intake under 2000mg/day</li>
              <li>Avoid processed meats & high fats</li>
              <li>Drink at least 2.5 Liters of water</li>
              <li>Include dietary potassium (bananas, spinach)</li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">
              Exercise Recommendation
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dr. John recommends keeping activity levels moderate. Plan for 30 minutes of cardiovascular walking or cycling 4 to 5 times per week. Monitor heart rate below 135 bpm.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default PatientCarePlan;
