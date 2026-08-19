import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  FileText,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Users,
  Activity
} from 'lucide-react';

const DoctorPrescriptions = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Local list of prescriptions issued recently in this session for testing
  const [issuedPrescriptions, setIssuedPrescriptions] = useState([]);

  // Form states
  const [form, setForm] = useState({
    patientId: '',
    name: '',
    dosage: '',
    frequency: '',
    startDate: '',
    endDate: '',
    instructions: ''
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

  const handlePrescribeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { patientId, name, dosage, frequency, startDate, endDate, instructions } = form;
    if (!patientId || !name || !dosage || !frequency) {
      setError('Patient, medication name, dosage, and frequency are required.');
      return;
    }

    try {
      const response = await api.post('/doctor/prescriptions', {
        patientId,
        name,
        dosage,
        frequency,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        instructions
      });

      if (response.success) {
        setSuccess(`Medication prescribed successfully to patient!`);
        
        // Find patient name for local log list
        const patientName = patients.find(p => p._id === patientId)?.name || 'Patient';
        
        setIssuedPrescriptions(prev => [
          {
            _id: response.data._id,
            patientName,
            name,
            dosage,
            frequency,
            instructions,
            createdAt: new Date()
          },
          ...prev
        ]);

        setForm({
          patientId: '',
          name: '',
          dosage: '',
          frequency: '',
          startDate: '',
          endDate: '',
          instructions: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to prescribe medication.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading prescription console...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Prescription Console</h2>
        <p className="text-xs text-slate-400">Issue medications and dosing schedules directly to authorized patients.</p>
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
        
        {/* Write Prescription Form */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center">
            <PlusCircle className="w-4 h-4 text-emerald-400 mr-2" />
            <span>Write New Prescription Slip</span>
          </h3>

          <form onSubmit={handlePrescribeSubmit} className="space-y-4">
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
              <label className="text-[10px] font-bold text-slate-400 uppercase">Medication / Drug Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Lisinopril, Amoxicillin"
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
                  placeholder="e.g. 500mg, 1 tablet"
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
                  placeholder="e.g. Twice daily, Once a day"
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
              <label className="text-[10px] font-bold text-slate-400 uppercase">Instructions</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-20 resize-none"
                placeholder="e.g. Take after breakfast, avoid high sugar meals..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold py-2.5 rounded-xl transition-all"
            >
              Sign & Issue Prescription
            </button>
          </form>
        </div>

        {/* Recently Prescribed Logs (Right Column) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <Activity className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Prescription Slip Logs</span>
          </h3>

          {issuedPrescriptions.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">No prescriptions issued in this session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issuedPrescriptions.map(pres => (
                <div key={pres._id} className="p-4 rounded-xl bg-slate-900/35 border border-slate-850 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">Patient: {pres.patientName}</h4>
                      <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">Drug: {pres.name}</p>
                    </div>
                    <span className="text-[8px] text-slate-500">
                      {new Date(pres.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-850">
                    <p>Dose: {pres.dosage} | Frequency: {pres.frequency}</p>
                    {pres.instructions && <p className="mt-1 italic text-slate-500">Note: {pres.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorPrescriptions;
