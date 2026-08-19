import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { HeartPulse, LogIn, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [justVerified, setJustVerified] = useState(false);

  // Check if routed with "?verified=true"
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setJustVerified(true);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setJustVerified(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      
      // Navigate to dashboard
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin, { replace: true });
    } catch (err) {
      // Capture 403 unverified case to offer OTP link
      if (err.status === 403) {
        setServerError('Your account is not verified yet.');
      } else {
        setServerError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500 p-3 rounded-2xl text-dark-950 shadow-lg mb-3">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">
            Welcome to MediConnect
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Access your secure patient-doctor workspace.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl border border-slate-800">
          
          {justVerified && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center mb-4 flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Email verified! Please sign in.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex flex-col space-y-1">
                <span>{serverError}</span>
                {serverError.includes('not verified') && (
                  <Link
                    to={`/verify-otp?email=${encodeURIComponent(formData.email)}`}
                    className="underline text-brand-300 hover:text-brand-200 mt-1 block"
                  >
                    Click here to enter OTP verification code
                  </Link>
                )}
              </div>
            )}

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
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <Button type="submit" loading={loading} className="w-full mt-6">
              <span>Log In</span>
              <LogIn className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              New to MediConnect?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
