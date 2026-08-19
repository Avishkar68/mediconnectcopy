import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Bell,
  User,
  LogOut,
  Menu,
  X,
  MessageSquare,
  LayoutDashboard,
  HeartPulse,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    }
  };

  // Poll for notifications every 20 seconds
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Click outside listener for notification dropdown close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state
      setNotifications(prev =>
        prev.map(notif => (notif._id === id ? { ...notif, read: true } : notif))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Helpers to color role tags
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'doctor':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-panel sticky top-0 z-40 w-full border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Branding Logo */}
        <Link to="/" className="flex items-center space-x-2 text-white group">
          <div className="bg-brand-500 p-2 rounded-xl text-dark-950 group-hover:scale-105 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-300 bg-clip-text text-transparent">
            MediConnect
          </span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated ? (
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'text-brand-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/community"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/community') ? 'text-brand-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Community</span>
            </Link>

            <Link
              to="/profile"
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${
                isActive('/profile') ? 'text-brand-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>

            {/* Role Badge */}
            <span
              className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${getRoleBadgeClass(
                user?.role
              )}`}
            >
              {user?.role}
            </span>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notification Box */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-card rounded-2xl shadow-2xl border border-slate-700/60 p-4 max-h-96 overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                    <h4 className="text-sm font-bold text-slate-200">Notifications</h4>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {unreadCount} Unread
                    </span>
                  </div>

                  <div className="space-y-2 mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">
                        No notifications found
                      </p>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif._id}
                          onClick={() => handleMarkAsRead(notif._id)}
                          className={`p-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                            notif.read
                              ? 'bg-slate-900/40 border-transparent hover:bg-slate-900/60'
                              : 'bg-brand-500/5 border-brand-500/20 hover:bg-brand-500/10'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className={`text-[9px] font-bold uppercase ${
                                notif.type === 'success'
                                  ? 'text-emerald-400'
                                  : notif.type === 'warning'
                                  ? 'text-yellow-400'
                                  : 'text-brand-400'
                              }`}
                            >
                              {notif.type}
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 p-2 text-slate-400 hover:text-red-400 transition-colors font-medium text-sm rounded-lg hover:bg-red-500/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white text-sm font-semibold transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-brand-500 hover:bg-brand-400 text-dark-950 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-500/20"
            >
              Register
            </Link>
          </div>
        )}

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 md:hidden transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          {isAuthenticated ? (
            <>
              <div className="px-2 py-1.5 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-200">{user?.name}</span>
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${getRoleBadgeClass(
                    user?.role
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm font-medium transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/community"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Community Forum</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 text-sm font-medium transition-all"
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 p-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Session</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 p-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-slate-300 hover:text-white p-2.5 rounded-lg hover:bg-slate-800/40 text-sm font-semibold transition-all"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center bg-brand-500 hover:bg-brand-400 text-dark-950 p-2.5 rounded-lg text-sm font-bold transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
