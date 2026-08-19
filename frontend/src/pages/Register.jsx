import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { HeartPulse, ArrowRight } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation errors
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.role);
      // Redirect to OTP verification with email query param
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setServerError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950 relative overflow-hidden">
      {/* Background abstract glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500 p-3 rounded-2xl text-dark-950 shadow-lg shadow-brand-500/20 mb-3">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">
            Join MediConnect
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Create an account to manage your health network.
          </p>
        </div>

        {/* Card Panel */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl border border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                {serverError}
              </div>
            )}

            <Input
              label="Full Name"
              name="name"
              placeholder="Dr. John Doe / Jane Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="example@mediconnect.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              label="Password (min 6 chars)"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <div className="flex flex-col space-y-1.5 w-full">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                User Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="glass-input px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700/50 text-slate-100 transition-all focus:border-brand-500 focus:outline-none"
              >
                <option value="patient" className="bg-slate-950">Patient</option>
                <option value="doctor" className="bg-slate-950">Doctor</option>
                <option value="admin" className="bg-slate-950">System Admin</option>
              </select>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-6">
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
