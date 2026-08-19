import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  UserCheck,
  UserPlus,
  ShieldCheck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Mail,
  MapPin
} from 'lucide-react';

const PatientDoctors = () => {
  const [consents, setConsents] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected doctor to grant consent to
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const fetchDoctorAccessData = async () => {
    try {
      const response = await api.get('/patient/doctors');
      if (response.success && response.data) {
        setConsents(response.data.consents);
        setAllDoctors(response.data.allDoctors);
      }
    } catch (err) {
      console.error('Failed to load doctor access list:', err);
      setError('Could not retrieve access consents list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAccessData();
  }, []);

  const handleGrantConsent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDoctorId) {
      setError('Please select a doctor to authorize.');
      return;
    }

    try {
      const response = await api.post('/patient/doctors', {
        doctorId: selectedDoctorId,
        permissions: ['view_records', 'view_vitals'] // default permissions
      });

      if (response.success) {
        setSuccess('Decryption clearance key successfully provisioned to doctor.');
        setSelectedDoctorId('');
        fetchDoctorAccessData(); // refresh list
      }
    } catch (err) {
      setError(err.message || 'Failed to authorize doctor.');
    }
  };

  const handleRevokeConsent = async (consentId) => {
    setError('');
    setSuccess('');

    try {
      const response = await api.delete(`/patient/doctors/${consentId}`);
      if (response.success) {
        setSuccess('Doctor clearance token revoked.');
        fetchDoctorAccessData();
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke permissions.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading consent directories...</div>;
  }

  // Filter out doctors that already have granted consents
  const activeConsentDoctorIds = consents
    .filter(c => c.status === 'granted')
    .map(c => c.doctor?._id);

  const availableDoctors = allDoctors.filter(d => !activeConsentDoctorIds.includes(d._id));

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Doctor Access & Consents</h2>
        <p className="text-xs text-slate-400">Control who has access to read or update your encrypted medical profiles.</p>
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
        
        {/* Active Authorized Doctors */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
            <span>Authorized Medical Practitioners</span>
          </h3>

          {consents.filter(c => c.status === 'granted').length === 0 ? (
            <div className="p-10 text-center bg-slate-900/10 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-500">No practitioners currently authorized to view your logs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {consents
                .filter(c => c.status === 'granted')
                .map(consent => (
                  <div
                    key={consent._id}
                    className="glass-card rounded-2xl p-5 border border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl mt-0.5">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Dr. {consent.doctor?.name}</h4>
                        <p className="text-[10px] text-brand-400 mt-0.5 font-bold">
                          {consent.doctor?.profile?.specialization || 'Clinical Practitioner'}
                        </p>
                        
                        <div className="flex flex-col space-y-1 mt-3">
                          <div className="flex items-center text-[10px] text-slate-400 space-x-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{consent.doctor?.email}</span>
                          </div>
                          {consent.doctor?.profile?.clinicAddress && (
                            <div className="flex items-center text-[10px] text-slate-400 space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span>{consent.doctor?.profile?.clinicAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-850 pt-3 sm:pt-0 justify-between">
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold">
                        Access Cleared
                      </span>
                      <button
                        onClick={() => handleRevokeConsent(consent._id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center space-x-1 text-xs font-bold"
                        title="Revoke records access"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Revoke Access</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Grant New Consent (Right Panel) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-4 flex items-center">
              <UserPlus className="w-4 h-4 text-brand-400 mr-1.5" />
              <span>Authorize Clinician</span>
            </h3>

            <form onSubmit={handleGrantConsent} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Select Registered Practitioner</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Choose a doctor...</option>
                  {availableDoctors.map(doc => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.profile?.specialization || 'Clinical Specialist'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-850 text-left">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Granted Permissions</span>
                <div className="space-y-1.5 mt-2">
                  <label className="flex items-center space-x-2 text-[10px] text-slate-400">
                    <input type="checkbox" className="rounded text-brand-500 bg-slate-950 border-slate-700" defaultChecked disabled />
                    <span>View medical reports & records</span>
                  </label>
                  <label className="flex items-center space-x-2 text-[10px] text-slate-400">
                    <input type="checkbox" className="rounded text-brand-500 bg-slate-950 border-slate-700" defaultChecked disabled />
                    <span>View vital logs and conditions</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold py-2.5 rounded-xl transition-all"
              >
                Grant Access Key
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};

export default PatientDoctors;
