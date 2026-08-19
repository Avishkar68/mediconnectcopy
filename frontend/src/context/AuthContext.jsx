import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
        }
      } catch (err) {
        // Suppress session check error on initial load (not logged in yet)
        console.log('No active session found.');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Register a new user
  const register = async (name, email, password, role) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Verify registration OTP
  const verifyOtp = async (email, otpCode) => {
    setError(null);
    try {
      const response = await api.post('/auth/verify-otp', { email, otpCode });
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Log in
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.success && response.data) {
        setUser(response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Log out
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const response = await api.put('/users/profile', profileData);
      if (response.success && response.data) {
        // Update user state with the returned new profile values
        setUser(response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    verifyOtp,
    login,
    logout,
    updateProfile,
    // Helper to manually set user state if needed
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
