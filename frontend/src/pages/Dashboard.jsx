import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Loader from '../components/Loader';
import {
  Heart,
  Activity,
  FileText,
  UserCheck,
  UserPlus,
  Users,
  ShieldCheck,
  Stethoscope,
  PlusCircle,
  Bell,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Clock,
  ClipboardList,
  Calendar,
  Menu,
  X,
  Video
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/notifications');
        if (response.success && response.data) {
          // Limit to recent 5 notifications
          setNotifications(response.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard notifications:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to read notification:', err.message);
    }
  };

  if (loading) {
    return <Loader fullPage={true} />;
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // --- DOCTOR SIDEBAR COMPONENT ---
  const DoctorSidebar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/dashboard/patients', label: 'My Patients', icon: Users },
      { path: '/dashboard/requests', label: 'Patient Requests', icon: UserPlus },
      { path: '/dashboard/consultations', label: 'Consultations', icon: Video },
      { path: '/dashboard/prescriptions', label: 'Prescriptions', icon: FileText },
      { path: '/dashboard/care-plans', label: 'Care Plans', icon: ClipboardList },
      { path: '/dashboard/follow-ups', label: 'Follow-ups', icon: Clock },
      { path: '/dashboard/trends', label: 'Reports & Trends', icon: TrendingUp },
      { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true }
    ];

    const isLinkActive = (item) => {
      if (item.exact) {
        return location.pathname === item.path;
      }
      return location.pathname.startsWith(item.path) && location.pathname !== '/dashboard';
    };

    return (
      <div className="glass-card rounded-3xl border border-slate-800 p-4">
        
        {/* Mobile Header Toggle */}
        <div className="flex lg:hidden justify-between items-center pb-3 border-b border-slate-800 mb-3 text-left">
          <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">Doctor Menu</span>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-850"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Items */}
        <div className={`space-y-1 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-emerald-500 text-dark-950 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && unreadNotificationsCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    active ? 'bg-dark-950 text-emerald-450' : 'bg-red-500 text-white'
                  }`}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

      </div>
    );
  };

  // --- ADMIN DASHBOARD VIEW ---
  const AdminView = () => (
    <div className="space-y-6">
      
      {/* System info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Users</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">Mock: 154</h3>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Checks</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">Secure</h3>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-brand-500/10 text-brand-400 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">API Status</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">99.98%</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-3">Admin Console Panel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              As an Administrator, you will be able to verify doctor registry details, monitor platform traffic logs, and override consent access rules under emergency clauses in future milestones.
            </p>
          </div>
        </div>
        <div className="md:col-span-1">
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );

  // Common Notifications List Widget
  const NotificationsPanel = () => (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
      <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2">
        <Bell className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-bold text-white">Recent Notifications</h3>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No recent notifications</p>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n._id)}
              className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                n.read
                  ? 'bg-slate-900/40 border-transparent opacity-60'
                  : 'bg-brand-500/5 border-brand-500/15 hover:bg-brand-500/10'
              }`}
            >
              <div className="flex justify-between items-center text-[8px] text-slate-500">
                <span className="font-bold uppercase text-brand-400">{n.type}</span>
                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const getRoleHeaderTag = (role) => {
    switch (role) {
      case 'doctor':
        return 'text-emerald-400';
      case 'admin':
        return 'text-purple-400';
      default:
        return 'text-sky-400';
    }
  };

  // --- PATIENT SIDEBAR COMPONENT ---
  const PatientSidebar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
      { path: '/dashboard/health', label: 'My Health', icon: Heart },
      { path: '/dashboard/records', label: 'Medical Records', icon: FileText },
      { path: '/dashboard/timeline', label: 'Medical Timeline', icon: Clock },
      { path: '/dashboard/medications', label: 'Medications', icon: Activity },
      { path: '/dashboard/care-plan', label: 'Care Plan', icon: ClipboardList },
      { path: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
      { path: '/dashboard/doctors', label: 'Doctor Access', icon: UserCheck },
      { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true }
    ];

    const isLinkActive = (item) => {
      if (item.exact) {
        return location.pathname === item.path;
      }
      return location.pathname.startsWith(item.path) && location.pathname !== '/dashboard';
    };

    return (
      <div className="glass-card rounded-3xl border border-slate-800 p-4">
        
        {/* Mobile Header Toggle */}
        <div className="flex lg:hidden justify-between items-center pb-3 border-b border-slate-800 mb-3 text-left">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dashboard Menu</span>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-850"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Items */}
        <div className={`space-y-1 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-brand-500 text-dark-950 shadow-md shadow-brand-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && unreadNotificationsCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    active ? 'bg-dark-950 text-brand-400' : 'bg-red-500 text-white'
                  }`}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

      </div>
    );
  };

  const getSectionTitle = () => {
    const path = location.pathname;

    if (user?.role === 'doctor') {
      if (path.endsWith('/patients')) return 'Patient Registry Directory';
      if (path.endsWith('/requests')) return 'Clinical Consent Requests';
      if (path.endsWith('/consultations')) return 'Clinical Consultations Hub';
      if (path.endsWith('/prescriptions')) return 'Medical Prescriptions Logger';
      if (path.endsWith('/care-plans')) return 'Patient Care Plans Manager';
      if (path.endsWith('/follow-ups')) return 'Patient Follow-up Consultations';
      if (path.endsWith('/trends')) return 'Clinical Practice Analytics';
      if (path.endsWith('/notifications')) return 'Practitioner Notifications';
      return 'Doctor Portal Workspace';
    }

    if (path.endsWith('/health')) return 'My Health Summary';
    if (path.endsWith('/records')) return 'Medical Records Archive';
    if (path.endsWith('/timeline')) return 'Chronological Health Timeline';
    if (path.endsWith('/medications')) return 'Active Medications & Prescriptions';
    if (path.endsWith('/care-plan')) return 'Prescribed Care Plan';
    if (path.endsWith('/appointments')) return 'Consultation Appointments';
    if (path.endsWith('/doctors')) return 'Clinician Access Consents';
    if (path.endsWith('/notifications')) return 'Workspace Notifications';
    return 'Patient Workspace Overview';
  };

  // --- PATIENT MAIN VIEW WRAPPER ---
  // --- ADMIN MAIN VIEW WRAPPER ---
  if (user?.role === 'admin') {
    return (
      <div className="max-w-7xl mx-auto py-8 px-6 text-left">
        
        {/* Welcome Banner */}
        <div className="glass-card rounded-3xl p-8 border border-slate-800/80 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex flex-wrap items-center">
            <span>Welcome Back, </span>
            <span className="text-brand-400 ml-1.5">{user?.name}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 flex items-center space-x-2">
            <span>MediConnect Secure Portal Status:</span>
            <span className={`font-bold uppercase tracking-wider ${getRoleHeaderTag(user?.role)}`}>
              {user?.role} Active Workspace
            </span>
          </p>
        </div>

        <AdminView />

      </div>
    );
  }

  // DOCTOR OR PATIENT VIEW (Layout with Sticky Sidebar & Nested Route Outlet)
  const isDoctor = user?.role === 'doctor';
  const brandColorText = isDoctor ? 'text-emerald-450' : 'text-brand-400';
  const brandBgTag = isDoctor ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-sky-400 bg-sky-500/10 border-sky-500/20';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Navigation Column */}
        <div className="lg:w-64 shrink-0">
          {isDoctor ? <DoctorSidebar /> : <PatientSidebar />}
        </div>

        {/* Workspace Main Window */}
        <div className="flex-1 min-w-0">
          
          {/* Welcome header inside workspace */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800/80 mb-6 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
                  {getSectionTitle()}
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  MediConnect {isDoctor ? 'Doctor' : 'Patient'} Hub | Logged in as <span className={`${brandColorText} font-semibold`}>{user?.name}</span>
                </p>
              </div>
              <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase shrink-0 ${brandBgTag}`}>
                {user?.role} Portal
              </span>
            </div>
          </div>

          {/* Render Active Nested Route Subpage */}
          <Outlet />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
