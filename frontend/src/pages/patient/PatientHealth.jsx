import i18n from "../../i18n/index.js";
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Activity,
  Heart,
  Thermometer,
  Scale,
  PlusCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import HealthTrendChart from '../../components/HealthTrendChart';

const PatientHealth = () => {
  const [profile, setProfile] = useState(null);
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [vitalForm, setVitalForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: ''
  });
  const [conditionForm, setConditionForm] = useState({ name: '' });
  const [profileForm, setProfileForm] = useState({
    bloodGroup: '',
    allergies: ''
  });

  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals', 'conditions', 'demographics'

  const fetchHealthProfile = async () => {
    try {
      const response = await api.get('/patient/health');
      if (response.success && response.data) {
        setProfile(response.data.profile);
        setBloodGroup(response.data.bloodGroup);
        setAllergies(response.data.allergies);
        setProfileForm({
          bloodGroup: response.data.bloodGroup,
          allergies: response.data.allergies.join(', ')
        });
      }
    } catch (err) {
      console.error('Failed to load health profile:', err);
      setError('Could not retrieve health logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthProfile();
  }, []);

  const handleVitalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, weight } = vitalForm;
    if (!bloodPressureSystolic || !bloodPressureDiastolic || !heartRate) {
      setError('Systolic, Diastolic BP, and Heart Rate are required.');
      return;
    }

    try {
      const response = await api.post('/patient/health', {
        type: 'vital',
        vitalData: {
          bloodPressureSystolic: parseInt(bloodPressureSystolic),
          bloodPressureDiastolic: parseInt(bloodPressureDiastolic),
          heartRate: parseInt(heartRate),
          temperature: parseFloat(temperature) || undefined,
          weight: parseFloat(weight) || undefined
        }
      });

      if (response.success) {
        setSuccess('Vital readings logged successfully!');
        setProfile(response.data.profile);
        setVitalForm({
          bloodPressureSystolic: '',
          bloodPressureDiastolic: '',
          heartRate: '',
          temperature: '',
          weight: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit vital logs.');
    }
  };

  const handleConditionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!conditionForm.name.trim()) {
      setError('Condition name is required.');
      return;
    }

    try {
      const response = await api.post('/patient/health', {
        type: 'condition',
        conditionData: { name: conditionForm.name }
      });

      if (response.success) {
        setSuccess('New condition added to active registry!');
        setProfile(response.data.profile);
        setConditionForm({ name: '' });
      }
    } catch (err) {
      setError(err.message || 'Failed to add condition.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const listAllergies = profileForm.allergies
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const response = await api.post('/patient/health', {
        type: 'profile',
        bloodGroup: profileForm.bloodGroup,
        allergies: listAllergies
      });

      if (response.success) {
        setSuccess('Basic medical properties saved.');
        setBloodGroup(profileForm.bloodGroup);
        setAllergies(listAllergies);
      }
    } catch (err) {
      setError(err.message || 'Failed to update properties.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">{i18n.t("Loading health records...")}</div>;
  }

  const latestVitals = profile?.vitals?.[0] || null;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h2 className="text-xl font-bold text-white font-display">{i18n.t("My Vitals & Body Health")}</h2>
          <p className="text-xs text-slate-300">{i18n.t("Log your blood pressure, pulse, and check your health trends over time.")}</p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('vitals')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'vitals'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {i18n.t("❤️ Blood Pressure & Pulse")}
        </button>
        <button
          onClick={() => setActiveTab('conditions')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'conditions'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {i18n.t("🩺 Health Conditions")}
        </button>
        <button
          onClick={() => setActiveTab('demographics')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'demographics'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {i18n.t("🩸 Blood Group & Allergies")}
        </button>
      </div>

      {/* VITALS VIEW */}
      {activeTab === 'vitals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Vital Form */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-800 h-fit">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center">
              <PlusCircle className="w-4 h-4 text-brand-400 mr-2" />
              <span>{i18n.t("Log Your Vitals")}</span>
            </h3>
            <p className="text-[11px] text-slate-300 mb-4 leading-relaxed">
              {i18n.t("Healthy BP is around 120/80 mmHg. Resting pulse is normally 60 to 100 beats per minute.")}
            </p>

            <form onSubmit={handleVitalSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Upper BP (Systolic)")}</label>
                  <input
                    type="number"
                    value={vitalForm.bloodPressureSystolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, bloodPressureSystolic: e.target.value })}
                    className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                    placeholder="120"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Lower BP (Diastolic)")}</label>
                  <input
                    type="number"
                    value={vitalForm.bloodPressureDiastolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, bloodPressureDiastolic: e.target.value })}
                    className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                    placeholder="80"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Heart Beats Per Min (Pulse)")}</label>
                <input
                  type="number"
                  value={vitalForm.heartRate}
                  onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                  placeholder="72"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Temp (°C)")}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.temperature}
                    onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                    className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                    placeholder="36.6"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Weight (kg)")}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.weight}
                    onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })}
                    className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                    placeholder="70"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold py-2 rounded-xl mt-2 transition-all"
              >
                {i18n.t("Log Readings")}
              </button>
            </form>
          </div>

          {/* Right: History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Metrics display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
                <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Pulse Rate")}</span>
                <p className="text-sm font-bold text-white mt-0.5">{latestVitals?.heartRate || '--'} {i18n.t("bpm")}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
                <Activity className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Blood Pressure")}</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {latestVitals ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}` : '--'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
                <Thermometer className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Body Temp")}</span>
                <p className="text-sm font-bold text-white mt-0.5">{latestVitals?.temperature || '--'} {i18n.t("°C")}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
                <Scale className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Weight")}</span>
                <p className="text-sm font-bold text-white mt-0.5">{latestVitals?.weight || '--'} {i18n.t("kg")}</p>
              </div>
            </div>

            {/* Interactive Health Trend Curves */}
            <HealthTrendChart vitals={profile?.vitals || []} />

            {/* Historical list */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center">
                <FileSpreadsheet className="w-4 h-4 text-slate-400 mr-2" />
                <span>{i18n.t("Vital Signs History Log")}</span>
              </h3>

              {!profile?.vitals || profile.vitals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">{i18n.t("No historical vital signs recorded.")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="pb-3">{i18n.t("Date logged")}</th>
                        <th className="pb-3">{i18n.t("Blood Pressure")}</th>
                        <th className="pb-3">{i18n.t("Pulse Rate")}</th>
                        <th className="pb-3">{i18n.t("Temp")}</th>
                        <th className="pb-3">{i18n.t("Weight")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {profile.vitals.map((v, idx) => (
                        <tr key={idx} className="text-slate-350 hover:bg-slate-900/10">
                          <td className="py-3 flex items-center space-x-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(v.loggedAt).toLocaleString()}</span>
                          </td>
                          <td className="py-3 font-semibold text-slate-200">
                            {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} {i18n.t("mmHg")}
                          </td>
                          <td className="py-3">{v.heartRate} {i18n.t("bpm")}</td>
                          <td className="py-3">{v.temperature ? `${v.temperature}°C` : '--'}</td>
                          <td className="py-3">{v.weight ? `${v.weight}kg` : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONDITIONS TAB */}
      {activeTab === 'conditions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Add condition form */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-800 h-fit">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center">
              <PlusCircle className="w-4 h-4 text-brand-400 mr-2" />
              <span>{i18n.t("Log Active Condition")}</span>
            </h3>

            <form onSubmit={handleConditionSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Condition Name")}</label>
                <input
                  type="text"
                  value={conditionForm.name}
                  onChange={(e) => setConditionForm({ name: e.target.value })}
                  className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
                  placeholder={i18n.t("e.g. Hypertension, Type 2 Diabetes")}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold py-2 rounded-xl mt-2 transition-all"
              >
                {i18n.t("Add Condition")}
              </button>
            </form>
          </div>

          {/* Condition list */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">{i18n.t("Active Clinical Conditions")}</h3>

            {!profile?.conditions || profile.conditions.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/10 border border-slate-800 rounded-xl">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">{i18n.t("No conditions recorded in patient file.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.conditions.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-slate-900/30 border border-slate-850">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {i18n.t("Recorded on:")} {new Date(c.diagnosedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEMOGRAPHICS TAB */}
      {activeTab === 'demographics' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 max-w-xl mx-auto text-left">
          <h3 className="text-sm font-bold text-white mb-4">{i18n.t("Allergies & Demographics")}</h3>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Blood Group")}</label>
              <select
                value={profileForm.bloodGroup}
                onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500"
              >
                <option value="">{i18n.t("Select blood group")}</option>
                <option value="A+">{i18n.t("A+")}</option>
                <option value="A-">{i18n.t("A-")}</option>
                <option value="B+">{i18n.t("B+")}</option>
                <option value="B-">{i18n.t("B-")}</option>
                <option value="AB+">{i18n.t("AB+")}</option>
                <option value="AB-">{i18n.t("AB-")}</option>
                <option value="O+">{i18n.t("O+")}</option>
                <option value="O-">{i18n.t("O-")}</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{i18n.t("Allergies (comma-separated)")}</label>
              <textarea
                value={profileForm.allergies}
                onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                className="glass-input bg-slate-900 px-3 py-2 text-xs rounded-lg text-slate-200 border border-slate-800 focus:outline-none focus:border-brand-500 h-24 resize-none"
                placeholder={i18n.t("e.g. Penicillin, Peanuts, Pollen")}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 text-xs font-bold py-2 rounded-xl transition-all"
            >
              {i18n.t("Save Details")}
            </button>
          </form>

          {/* Current details display */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-850">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500">{i18n.t("Registered Blood Type:")}</span>
              <p className="text-sm font-bold text-white mt-0.5">{bloodGroup || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500">{i18n.t("Registered Allergies:")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allergies.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">{i18n.t("None logged")}</p>
                ) : (
                  allergies.map((allergy, idx) => (
                    <span key={idx} className="bg-red-500/10 text-red-400 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-red-500/20">
                      {allergy}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientHealth;
