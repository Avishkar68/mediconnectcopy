import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { UserCheck, Shield, Phone, Mail, Award, MapPin, Activity, Stethoscope } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  // Format dates for default input values
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  };

  // State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: '',
    profile: {
      phone: user?.profile?.phone || '',
      bio: user?.profile?.bio || '',
      gender: user?.profile?.gender || '',
      dateOfBirth: formatDateForInput(user?.profile?.dateOfBirth),
      // Doctor fields
      specialization: user?.profile?.specialization || '',
      experienceYears: user?.profile?.experienceYears || 0,
      clinicAddress: user?.profile?.clinicAddress || '',
      // Patient fields
      bloodGroup: user?.profile?.bloodGroup || '',
      allergies: user?.profile?.allergies?.join(', ') || '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTopLevelChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      // Process allergies from comma-separated string back to array
      const processedProfile = { ...formData.profile };
      if (user.role === 'patient') {
        processedProfile.allergies = formData.profile.allergies
          ? formData.profile.allergies.split(',').map(item => item.trim()).filter(Boolean)
          : [];
      }

      const payload = {
        name: formData.name,
        profile: processedProfile,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await updateProfile(payload);
      setSuccessMsg('Your profile has been updated successfully!');
      // Reset password field
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Page Title */}
      <div className="mb-6 flex items-center space-x-3">
        <div className="bg-brand-500/10 text-brand-400 p-2.5 rounded-xl border border-brand-500/20">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Profile Settings</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage your personal data, medical identifiers, and account credentials.
          </p>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 text-center border border-slate-800">
            <div className="w-20 h-20 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-full mx-auto flex items-center justify-center shadow-lg mb-4">
              <span className="text-white font-display font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className="font-bold text-white text-lg">{user?.name}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center space-x-1.5">
              <Mail className="w-3 h-3 text-brand-400" />
              <span>{user?.email}</span>
            </p>
            <div className="mt-4 inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Editable Form Panel */}
        <div className="md:col-span-2">
          <div className="glass-card rounded-2xl p-8 border border-slate-800">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* Core Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2">
                  Account Details
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Display Name"
                    name="name"
                    value={formData.name}
                    onChange={handleTopLevelChange}
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.profile.phone}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.profile.gender}
                      onChange={handleProfileChange}
                      className="glass-input px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700/50 text-slate-100 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.profile.dateOfBirth}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Short Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.profile.bio}
                    onChange={handleProfileChange}
                    placeholder="Tell us about yourself..."
                    className="glass-input px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700/50 text-slate-100 focus:border-brand-500 focus:outline-none h-20 resize-none"
                  />
                </div>
              </div>

              {/* Doctor Role Fields */}
              {user?.role === 'doctor' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Medical Practitioner Credentials</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Specialization"
                      name="specialization"
                      value={formData.profile.specialization}
                      onChange={handleProfileChange}
                      placeholder="Cardiologist, Neurologist, etc."
                    />
                    <Input
                      label="Years of Experience"
                      name="experienceYears"
                      type="number"
                      value={formData.profile.experienceYears}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <Input
                    label="Clinic/Hospital Address"
                    name="clinicAddress"
                    value={formData.profile.clinicAddress}
                    onChange={handleProfileChange}
                    placeholder="123 Health Ave, Suite 400"
                  />
                </div>
              )}

              {/* Patient Role Fields */}
              {user?.role === 'patient' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Patient Health Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Blood Group"
                      name="bloodGroup"
                      value={formData.profile.bloodGroup}
                      onChange={handleProfileChange}
                      placeholder="O+, A-, B+, etc."
                    />
                    <Input
                      label="Known Allergies (comma-separated)"
                      name="allergies"
                      value={formData.profile.allergies}
                      onChange={handleProfileChange}
                      placeholder="Peanuts, Penicillin, etc."
                    />
                  </div>
                </div>
              )}

              {/* Credentials Update */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 border-b border-slate-800 pb-2">
                  Security Settings
                </h4>
                <Input
                  label="Update Password (leave blank to keep current)"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleTopLevelChange}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" loading={loading} className="w-full sm:w-auto">
                  Save Settings
                </Button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
