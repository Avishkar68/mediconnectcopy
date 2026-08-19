import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Activity,
  PlusCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';

const PatientMedications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: '',
    endDate: '',
    instructions: ''
  });

  const fetchMedications = async () => {
    try {
      const response = await api.get('/patient/medications');
      if (response.success && response.data) {
        setMedications(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      setError('Could not retrieve prescription data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleMedSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim()) {
      setError('Medication name, dosage, and frequency are required.');
      return;
    }

    try {
      const response = await api.post('/patient/medications', {
        name: form.name,
        dosage: form.dosage,
        frequency: form.frequency,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        instructions: form.instructions
      });

      if (response.success) {
        setSuccess('Medication registered successfully!');
        setMedications(prev => [response.data, ...prev]);
        setShowAddForm(false);
        setForm({
          name: '',
          dosage: '',
          frequency: '',
          startDate: '',
          endDate: '',
          instructions: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to register medication.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'completed':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const activeMeds = medications.filter(m => m.status === 'active');
  const pastMeds = medications.filter(m => m.status !== 'active');

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading prescription logs...</div>;
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Medication Registry</h2>
          <p className="text-xs text-slate-400">Keep track of your current prescription schedules and dosing instructions.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showAddForm ? 'Close form' : 'Register Medication'}</span>
        </button>
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

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 max-w-xl mx-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="text-sm font-bold text-white mb-4">Register Prescribed Medication</h3>

          <form onSubmit={handleMedSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Medication Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Lipitor, Metformin"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dosage</label>
                <input
                  type="text"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                  placeholder="e.g. 10mg, 1 tablet"
                  required
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Frequency</label>
                <input
                  type="text"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Once daily, Twice a day"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">End Date (optional)</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Intake Instructions</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-20 resize-none"
                placeholder="e.g. Take with food, avoid alcohol..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Add to Active Medications
            </button>
          </form>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Medications */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Activity className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Active Prescriptions ({activeMeds.length})</span>
          </h3>

          {activeMeds.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/10 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">No active medications registered. Add one using the form above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMeds.map(med => (
                <div
                  key={med._id}
                  className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{med.name}</h4>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadgeClass(med.status)}`}>
                        {med.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Dosage: {med.dosage} | Frequency: {med.frequency}</p>
                    
                    {med.instructions && (
                      <p className="text-[11px] text-slate-500 mt-2 italic">
                        Note: {med.instructions}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-850 pt-2 sm:pt-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Course Duration</span>
                    <div className="flex items-center text-[10px] text-slate-450 mt-1 space-x-1 sm:justify-end">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(med.startDate).toLocaleDateString()} - {med.endDate ? new Date(med.endDate).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medication Intake/Usage Tips (Right Panel) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-3">
              Intake Reminders
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start space-x-2.5 p-2 bg-slate-900/30 rounded-lg border border-slate-850">
                <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-350">Morning Routine</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Take thyroid pills 30 mins before breakfast.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2.5 p-2 bg-slate-900/30 rounded-lg border border-slate-850">
                <Clock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-350">Dinner Routine</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Metformin should be taken with dinner.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Past Medications History */}
          {pastMeds.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">
                Completed Course History
              </h3>
              <div className="space-y-2.5">
                {pastMeds.map(med => (
                  <div key={med._id} className="text-left text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300">{med.name}</span>
                      <span className="text-[9px] text-slate-550 border border-slate-800 px-1.5 py-0.2 rounded-full uppercase">
                        {med.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dose: {med.dosage} | Ended: {med.endDate ? new Date(med.endDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default PatientMedications;
