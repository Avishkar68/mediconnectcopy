import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ClipboardList,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Users,
  Award
} from 'lucide-react';

const DoctorCarePlans = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local log list
  const [assignedTasks, setAssignedTasks] = useState([]);

  // Form states
  const [form, setForm] = useState({
    patientId: '',
    title: '',
    description: ''
  });

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('/doctor/patients');
        if (response.success && response.data) {
          setPatients(response.data);
        }
      } catch (err) {
        console.error('Failed to load patients:', err);
        setError('Could not retrieve active patients list.');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { patientId, title, description } = form;
    if (!patientId || !title) {
      setError('Patient and target title are required.');
      return;
    }

    try {
      const response = await api.post('/doctor/care-plans', {
        patientId,
        title,
        description
      });

      if (response.success) {
        setSuccess('Care plan target registered successfully!');
        
        const patientName = patients.find(p => p._id === patientId)?.name || 'Patient';

        setAssignedTasks(prev => [
          {
            patientName,
            title,
            description,
            createdAt: new Date()
          },
          ...prev
        ]);

        setForm({ patientId: '', title: '', description: '' });
      }
    } catch (err) {
      setError(err.message || 'Failed to assign care target.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading care planning suite...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Care Planner</h2>
        <p className="text-xs text-slate-400">Prescribe recovery checksheets, daily vitals logging targets, or diet guidelines.</p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Prescribe Task Form */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center">
            <PlusCircle className="w-4 h-4 text-emerald-400 mr-2" />
            <span>Prescribe Recovery Guideline</span>
          </h3>

          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Select Patient</label>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">Select patient...</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Guideline/Target Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Daily Weight Check, Hydration Goal"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Instructions / Details</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-24 resize-none"
                placeholder="Type instructions e.g. Measure weight at 8:00 AM daily, limit salt intake..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Issue Care Guideline
            </button>
          </form>
        </div>

        {/* Assigned Targets Logs (Right Panel) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <ClipboardList className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Assigned Care Targets</span>
          </h3>

          {assignedTasks.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">No care plan guidelines assigned in this session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTasks.map((task, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/35 border border-slate-850 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">Patient: {task.patientName}</h4>
                      <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">Target: {task.title}</p>
                    </div>
                    <span className="text-[8px] text-slate-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-850 leading-relaxed italic">
                      Instructions: {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorCarePlans;
