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
  Bell,
  TrendingUp,
  LayoutDashboard,
  Clock,
  ClipboardList,
  Calendar,
  Menu,
  X,
  Video,
  Sparkles,
  QrCode,
  GitCompare,
  HeartPulse
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

    const sections = [
      {
        title: 'Practice & Patients',
        items: [
          { path: '/dashboard', label: 'Practice Home', icon: LayoutDashboard, exact: true },
          { path: '/dashboard/patients', label: 'My Patients', icon: Users },
          { path: '/dashboard/requests', label: 'Record Requests', icon: UserPlus },
        ]
      },
      {
        title: 'Care & Consultations',
        items: [
          { path: '/dashboard/consultations', label: 'Video Consultations', icon: Video },
          { path: '/dashboard/prescriptions', label: 'Prescriptions', icon: FileText },
          { path: '/dashboard/care-plans', label: 'Care Plans', icon: ClipboardList },
          { path: '/dashboard/follow-ups', label: 'Follow-ups', icon: Clock },
        ]
      },
      {
        title: 'Insights & Alerts',
        items: [
          { path: '/dashboard/trends', label: 'Patient Trends', icon: TrendingUp },
          { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true },
        ]
      }
    ];

    const isLinkActive = (item) => {
      if (item.exact) {
        return location.pathname === item.path;
      }
      return location.pathname.startsWith(item.path) && location.pathname !== '/dashboard';
    };

    return (
      <div className="glass-card rounded-3xl border border-slate-800/80 p-4">
        {/* Mobile Header Toggle */}
        <div className="flex lg:hidden justify-between items-center pb-3 border-b border-slate-800 mb-3 text-left">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Doctor Menu</span>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Items Grouped */}
        <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              {sec.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isLinkActive(item);
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && unreadNotificationsCount > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        active ? 'bg-slate-950 text-emerald-400' : 'bg-red-500 text-white'
                      }`}>
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- ADMIN DASHBOARD VIEW ---
  const AdminView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Users</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">Active</h3>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Status</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">Healthy & Secure</h3>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center space-x-4">
          <div className="bg-brand-500/10 text-brand-400 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Server Response</h5>
            <h3 className="text-lg font-bold text-white mt-0.5">99.9% Uptime</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2">Admin Control Center</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage doctor verification approvals, review security audit logs, and monitor platform health.
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
          <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n._id)}
              className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                n.read
                  ? 'bg-slate-900/40 border-transparent opacity-60'
                  : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/15'
              }`}
            >
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span className="font-bold uppercase text-brand-400">{n.type}</span>
                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // --- PATIENT SIDEBAR COMPONENT ---
  const PatientSidebar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const sections = [
      {
        title: 'Everyday Health',
        items: [
          { path: '/dashboard', label: 'Home Dashboard', icon: LayoutDashboard, exact: true },
          { path: '/dashboard/medications', label: 'My Daily Medicines', icon: Activity },
          { path: '/dashboard/care-plan', label: "Doctor's Care Plan", icon: ClipboardList },
          { path: '/dashboard/health', label: 'My Vitals (BP & Sugar)', icon: Heart },
        ]
      },
      {
        title: 'Reports & Doctors',
        items: [
          { path: '/dashboard/ai-analyzer', label: 'Explain My Lab Report', icon: Sparkles },
          { path: '/dashboard/compare-reports', label: 'Compare 2 Reports', icon: GitCompare },
          { path: '/dashboard/records', label: 'My Medical Files', icon: FileText },
          { path: '/dashboard/appointments', label: 'Doctor Visits & Calls', icon: Calendar },
          { path: '/dashboard/doctors', label: 'My Approved Doctors', icon: UserCheck },
        ]
      },
      {
        title: 'Life Safety & History',
        items: [
          { path: '/dashboard/emergency-assistant', label: 'Emergency First-Aid SOS', icon: HeartPulse, emergency: true },
          { path: '/dashboard/emergency-access', label: 'Emergency QR Health Card', icon: QrCode },
          { path: '/dashboard/timeline', label: 'My Health Timeline', icon: Clock },
          { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true }
        ]
      }
    ];

    const isLinkActive = (item) => {
      if (item.exact) {
        return location.pathname === item.path;
      }
      return location.pathname.startsWith(item.path) && location.pathname !== '/dashboard';
    };

    return (
      <div className="glass-card rounded-3xl border border-slate-800/80 p-4">
        {/* Mobile Header Toggle */}
        <div className="flex lg:hidden justify-between items-center pb-3 border-b border-slate-800 mb-3 text-left">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">All Health Features</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-1"
          >
            <span className="text-[11px] font-semibold">{mobileOpen ? 'Close' : 'Menu'}</span>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Grouped Sidebar Items */}
        <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden lg:block'}`}>
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              {sec.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isLinkActive(item);
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? item.emergency
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 font-bold'
                          : 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20 font-bold'
                        : item.emergency
                        ? 'text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${item.emergency && !active ? 'text-rose-400' : ''}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.emergency && !active && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold bg-rose-600 text-white tracking-wider">
                        SOS
                      </span>
                    )}
                    {item.badge && unreadNotificationsCount > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        active ? 'bg-slate-950 text-brand-400' : 'bg-red-500 text-white'
                      }`}>
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getSectionTitle = () => {
    const path = location.pathname;

    if (user?.role === 'doctor') {
      if (path.endsWith('/patients')) return 'My Patients';
      if (path.endsWith('/requests')) return 'Patient Record Requests';
      if (path.endsWith('/consultations')) return 'Video Consultations & Appointments';
      if (path.endsWith('/prescriptions')) return 'Write & Manage Prescriptions';
      if (path.endsWith('/care-plans')) return 'Patient Care Plans';
      if (path.endsWith('/follow-ups')) return 'Scheduled Follow-up Visits';
      if (path.endsWith('/trends')) return 'Patient Health Trends';
      if (path.endsWith('/notifications')) return 'Doctor Notifications';
      return 'Doctor Practice Workspace';
    }

    if (path.endsWith('/ai-analyzer')) return 'Explain My Lab Report (In Plain Words)';
    if (path.endsWith('/compare-reports')) return 'Compare 2 Reports (See If Health Improved)';
    if (path.endsWith('/emergency-assistant')) return 'Emergency First-Aid Guide';
    if (path.endsWith('/emergency-access')) return 'Emergency Medical QR Health Card';
    if (path.endsWith('/health')) return 'My Vitals & Blood Pressure';

    if (path.endsWith('/records')) return 'My Medical Files & Lab Papers';
    if (path.endsWith('/timeline')) return 'My Health Timeline & History';
    if (path.endsWith('/medications')) return 'My Daily Medicines';
    if (path.endsWith('/care-plan')) return "Doctor's Care Plan & Daily Tasks";
    if (path.endsWith('/appointments')) return 'Doctor Visits & Video Calls';
    if (path.endsWith('/doctors')) return 'My Connected Doctors';
    if (path.endsWith('/notifications')) return 'My Notifications';
    return 'Welcome to Your Health Hub';
  };

  // --- ADMIN MAIN VIEW WRAPPER ---
  if (user?.role === 'admin') {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <Outlet />
      </div>
    );
  }

  // DOCTOR OR PATIENT VIEW (Layout with Sticky Sidebar & Nested Route Outlet)
  const isDoctor = user?.role === 'doctor';
  const brandColorText = isDoctor ? 'text-emerald-400' : 'text-brand-400';
  const brandBgTag = isDoctor ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' : 'text-sky-300 bg-sky-500/15 border-sky-500/30';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 pb-24 lg:pb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Navigation Column */}
        <div className="lg:w-64 shrink-0">
          {isDoctor ? <DoctorSidebar /> : <PatientSidebar />}
        </div>

        {/* Workspace Main Window */}
        <div className="flex-1 min-w-0">
          
          {/* Friendly welcome header */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-slate-800/80 mb-6 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start flex-wrap gap-2 relative z-10">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
                  {getSectionTitle()}
                </h1>
                <p className="text-slate-300 text-xs mt-1">
                  MediConnect {isDoctor ? 'Doctor Hub' : 'Patient Hub'} • Signed in as <span className={`${brandColorText} font-bold`}>{user?.name}</span>
                </p>
              </div>
              <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border uppercase shrink-0 ${brandBgTag}`}>
                {isDoctor ? 'Doctor Portal' : 'Patient Portal'}
              </span>
            </div>
          </div>

          {/* Render Active Subpage */}
          <Outlet />

        </div>
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR (Screens < lg) */}
      {!isDoctor && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 bg-[#0a1120]/95 backdrop-blur-lg px-2 py-2">
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                location.pathname === '/dashboard' ? 'text-brand-400 font-bold bg-brand-500/15' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Home</span>
            </Link>

            <Link
              to="/dashboard/medications"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                location.pathname.startsWith('/dashboard/medications') ? 'text-brand-400 font-bold bg-brand-500/15' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Meds</span>
            </Link>

            <Link
              to="/dashboard/ai-analyzer"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                location.pathname.startsWith('/dashboard/ai-analyzer') ? 'text-brand-400 font-bold bg-brand-500/15' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Reports</span>
            </Link>

            <Link
              to="/dashboard/appointments"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                location.pathname.startsWith('/dashboard/appointments') ? 'text-brand-400 font-bold bg-brand-500/15' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">Visits</span>
            </Link>

            <Link
              to="/dashboard/emergency-assistant"
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                location.pathname.startsWith('/dashboard/emergency-assistant') ? 'text-rose-400 font-bold bg-rose-500/20' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <HeartPulse className="w-4 h-4 mb-0.5 animate-pulse" />
              <span className="text-[10px] leading-tight font-bold">SOS</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
