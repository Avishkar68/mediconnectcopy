import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import api from '../services/api';

const VerifyOtp = () => {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Extract email query param on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  // Fetch active OTP in dev mode
  useEffect(() => {
    if (!email) return;

    const fetchDevOtp = async () => {
      try {
        const response = await api.get(`/auth/dev-otp?email=${encodeURIComponent(email)}`);
        if (response.success && response.data && response.data.otpCode) {
          setDevOtp(response.data.otpCode);
        }
      } catch (err) {
        console.log('Could not fetch dev OTP:', err.message);
      }
    };

    fetchDevOtp();
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otpCode);
      setSuccess('Account verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login?verified=true');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
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
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">
            Security Verification
          </h2>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Verify your email identity to activate your account.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl border border-slate-800">
          {success ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
              <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-white">Verified!</h3>
              <p className="text-xs text-slate-400 max-w-xs">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="example@mediconnect.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!new URLSearchParams(location.search).get('email')}
              />

              <Input
                label="6-Digit OTP Code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // only numbers
              />

              {/* Dev Tip Banner */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-left">
                <div className="flex space-x-2">
                  <Mail className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-300">Local Testing Hint:</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Since we are running locally, the OTP has been printed directly to your
                      **Node.js server terminal logs**. Copy it from there!
                    </p>
                    {devOtp && (
                      <div className="mt-2 p-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-xs font-bold text-brand-400 text-center select-all">
                        Active OTP: {devOtp}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full mt-6">
                Verify Account
              </Button>
            </form>
          )}

          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              Did something go wrong?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold underline">
                Restart Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
