import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Shield,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Send,
  FileText,
  Server,
  Database,
  Radio,
  Lock,
  UserCheck,
  UserX,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  Sliders,
  Calendar,
  Eye,
  Megaphone,
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'doctors', 'audit', 'broadcast'
  const [loading, setLoading] = useState(true);

  // Overview Data
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  // Users Management Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Doctor Verification Queue Data
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [verifyingDoctorId, setVerifyingDoctorId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCategory, setAuditCategory] = useState('all');

  // Broadcast Announcement State
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    targetRole: 'all',
    type: 'warning',
  });
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState('');

  // Status message
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.success) {
        setStats(res.data.metrics);
        setSystemHealth(res.data.systemHealth);
        if (res.data.recentAuditLogs) {
          setAuditLogs(res.data.recentAuditLogs);
        }
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setActionError(err.message || 'Could not retrieve platform metrics.');
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (userSearch) params.append('search', userSearch);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/admin/doctors/verification-queue');
      if (res.success) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Failed to load doctor verification queue:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const query = auditCategory !== 'all' ? `?category=${auditCategory}` : '';
      const res = await api.get(`/admin/audit-logs${query}`);
      if (res.success) {
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsers(), fetchDoctors()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'doctors') {
      fetchDoctors();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, roleFilter, statusFilter, auditCategory]);

  const handleUpdateUserStatus = async (userId, newStatus) => {
    setUpdatingUserId(userId);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, accountStatus: newStatus } : u))
        );
        setActionSuccess(`User status changed to ${newStatus.toUpperCase()}`);
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to update user status.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    setUpdatingUserId(userId);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
        );
        setActionSuccess(`User role reassigned to ${newRole.toUpperCase()}`);
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to update role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleVerifyDoctor = async (doctorId, status, reason = '') => {
    setVerifyingDoctorId(doctorId);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await api.patch(`/admin/doctors/${doctorId}/verify`, {
        status,
        rejectionReason: reason,
      });

      if (res.success) {
        setDoctors((prev) =>
          prev.map((doc) =>
            doc._id === doctorId
              ? {
                  ...doc,
                  isVerified: status === 'verified',
                  doctorVerification: {
                    ...doc.doctorVerification,
                    status,
                    rejectionReason: reason,
                  },
                }
              : doc
          )
        );
        setShowRejectModal(false);
        setSelectedDoctor(null);
        setRejectionReason('');
        setActionSuccess(
          status === 'verified'
            ? 'Doctor clinical credentials approved & verified!'
            : 'Doctor verification request rejected.'
        );
        setTimeout(() => setActionSuccess(''), 3000);
        fetchStats();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to process doctor verification.');
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;

    setBroadcasting(true);
    setActionError('');
    try {
      const res = await api.post('/admin/broadcast', broadcastForm);
      if (res.success) {
        setBroadcastNotice(`Broadcast successfully delivered to ${res.data.recipientsCount} users!`);
        setBroadcastForm({
          title: '',
          message: '',
          targetRole: 'all',
          type: 'warning',
        });
        setTimeout(() => setBroadcastNotice(''), 4000);
        fetchAuditLogs();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to send broadcast announcement.');
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading MediConnect Super Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-4 py-6">
      
      {/* 1. SUPER ADMIN BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-brand-500 text-dark-950 shadow-lg shadow-indigo-500/20">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-white font-display tracking-tight">
                  Super Administrator Suite
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Root Governance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage all registered users, verify medical practitioner licenses, audit system activity, and monitor platform health.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchStats();
                fetchUsers();
                fetchDoctors();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
            activeTab === 'overview'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Platform Overview & Health</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
            activeTab === 'users'
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-brand-400" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border relative ${
            activeTab === 'doctors'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-emerald-400" />
          <span>Doctor Verification Queue</span>
          {stats?.pendingDoctors > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-dark-950 text-[10px] font-extrabold animate-pulse">
              {stats.pendingDoctors} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
            activeTab === 'audit'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Audit & Compliance Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
            activeTab === 'broadcast'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>System Broadcast</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PLATFORM OVERVIEW & LIVE SYSTEM HEALTH */}
      {/* ======================================================== */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Patients</span>
                <Users className="w-4 h-4 text-brand-400" />
              </div>
              <h3 className="text-2xl font-black text-white font-display">{stats.totalPatients}</h3>
              <p className="text-[11px] text-slate-500">Registered on MediConnect</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">Practicing Doctors</span>
                <Stethoscope className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-emerald-300 font-display">
                {stats.verifiedDoctors} <span className="text-xs text-slate-400 font-normal">/ {stats.totalDoctors}</span>
              </h3>
              <p className="text-[11px] text-emerald-400/80 font-semibold">
                {stats.pendingDoctors > 0 ? `${stats.pendingDoctors} pending verification` : 'All doctors verified'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">Appointments</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black text-white font-display">{stats.totalAppointments}</h3>
              <p className="text-[11px] text-slate-500">
                {stats.appointmentBreakdown.scheduled} scheduled • {stats.appointmentBreakdown.completed} completed
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">Active Care Pathways</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-indigo-300 font-display">
                {stats.activeCarePlans}
              </h3>
              <p className="text-[11px] text-slate-500">{stats.totalRecords} medical records archived</p>
            </div>

          </div>

          {/* System Telemetry & Server Diagnostics */}
          {systemHealth && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Platform System Health & Infrastructure Diagnostics</span>
                </h3>
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>All Systems Operational</span>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center space-x-1">
                    <Database className="w-3 h-3 text-emerald-400 mr-1" /> Database Status
                  </span>
                  <span className="font-extrabold text-white">{systemHealth.database}</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center space-x-1">
                    <Radio className="w-3 h-3 text-brand-400 mr-1" /> WebRTC Signaling
                  </span>
                  <span className="font-extrabold text-white">{systemHealth.webrtcSignaling}</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-blue-400 mr-1" /> Server Uptime
                  </span>
                  <span className="font-extrabold text-white">
                    {Math.floor(systemHealth.serverUptime / 3600)}h {Math.floor((systemHealth.serverUptime % 3600) / 60)}m
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-indigo-400 mr-1" /> Process Memory
                  </span>
                  <span className="font-extrabold text-white">{systemHealth.memoryUsageMB} MB RSS</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Audit Snapshot */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Recent Governance Audit Trail</span>
              </h3>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center"
              >
                <span>View Full Audit Log</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log) => (
                <div
                  key={log._id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {log.category}
                    </span>
                    <span className="font-bold text-white">{log.action}</span>
                    <span className="text-slate-400 hidden sm:inline">• {log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USER DIRECTORY & ACCOUNT GOVERNANCE */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name or email address..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="banned">Banned Only</option>
              </select>

              <button
                onClick={fetchUsers}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Account Standing</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Registered</th>
                    <th className="p-4 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No users found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isBanned = u.accountStatus === 'banned';
                      const isSuspended = u.accountStatus === 'suspended';

                      return (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* User Info */}
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                                {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{u.name}</span>
                                <span className="text-[11px] text-slate-400">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role Switcher */}
                          <td className="p-4">
                            <select
                              value={u.role}
                              disabled={updatingUserId === u._id}
                              onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-brand-500"
                            >
                              <option value="patient">Patient</option>
                              <option value="doctor">Doctor</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">
                            {isBanned ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold flex items-center space-x-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                <span>Banned</span>
                              </span>
                            ) : isSuspended ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold flex items-center space-x-1 w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Suspended</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center space-x-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>

                          {/* Verification */}
                          <td className="p-4">
                            {u.isVerified ? (
                              <span className="text-emerald-400 font-bold flex items-center text-[11px]">
                                <Check className="w-3.5 h-3.5 mr-1" /> Verified
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Unverified</span>
                            )}
                          </td>

                          {/* Registered date */}
                          <td className="p-4 text-slate-400 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.accountStatus !== 'active' ? (
                                <button
                                  onClick={() => handleUpdateUserStatus(u._id, 'active')}
                                  disabled={updatingUserId === u._id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all"
                                >
                                  Activate
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleUpdateUserStatus(u._id, 'suspended')}
                                    disabled={updatingUserId === u._id}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all"
                                  >
                                    Suspend
                                  </button>
                                  <button
                                    onClick={() => handleUpdateUserStatus(u._id, 'banned')}
                                    disabled={updatingUserId === u._id}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all"
                                  >
                                    Ban
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DOCTOR CLINICAL CREDENTIAL VERIFICATION QUEUE */}
      {/* ======================================================== */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Practitioner License Verification Queue</h3>
              <p className="text-xs text-slate-400">
                Verify practitioner credentials against medical board registry before granting verified badge.
              </p>
            </div>
            <button
              onClick={fetchDoctors}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Refresh Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.length === 0 ? (
              <p className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                No doctors currently in the registry.
              </p>
            ) : (
              doctors.map((doc) => {
                const verificationStatus = doc.doctorVerification?.status || (doc.isVerified ? 'verified' : 'pending');
                const isVerified = verificationStatus === 'verified';
                const isPending = verificationStatus === 'pending';

                return (
                  <div
                    key={doc._id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 relative hover:border-slate-700 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Dr. {doc.name}</h4>
                          <span className="text-[11px] text-slate-400">{doc.email}</span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {isVerified ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-extrabold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold flex items-center space-x-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-extrabold flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>

                    {/* Credential Details */}
                    <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">License Number</span>
                        <span className="font-mono text-slate-200 font-bold">
                          {doc.doctorVerification?.licenseNumber || 'MED-PendingSubmission'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Specialization</span>
                        <span className="text-slate-200 font-semibold">
                          {doc.profile?.specialization || 'General Medicine'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Hospital/Clinic</span>
                        <span className="text-slate-200 truncate max-w-[160px]">
                          {doc.profile?.clinicAddress || doc.doctorVerification?.hospitalAffiliation || 'Private Practice'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex items-center gap-2">
                      {!isVerified && (
                        <button
                          onClick={() => handleVerifyDoctor(doc._id, 'verified')}
                          disabled={verifyingDoctorId === doc._id}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-bold text-xs flex items-center justify-center space-x-1 transition-all shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Verify</span>
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setShowRejectModal(true);
                          }}
                          disabled={verifyingDoctorId === doc._id}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      )}

                      {isVerified && (
                        <button
                          onClick={() => handleVerifyDoctor(doc._id, 'rejected', 'Administrative re-evaluation')}
                          disabled={verifyingDoctorId === doc._id}
                          className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-bold transition-colors"
                        >
                          Revoke Verification
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Rejection Reason Modal */}
          {showRejectModal && selectedDoctor && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-white">Reject Doctor Verification</h4>
                  <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Provide clinical feedback to Dr. <strong>{selectedDoctor.name}</strong> regarding why their verification cannot be approved at this time.
                </p>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. License registration could not be verified in state medical council database..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyDoctor(selectedDoctor._id, 'rejected', rejectionReason)}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: COMPLIANCE & SYSTEM AUDIT LOGS */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">System Compliance & Governance Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Immutable activity log tracking logins, access grants, clinical events, and administrative changes.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={auditCategory}
                onChange={(e) => setAuditCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Categories</option>
                <option value="user_management">User Management</option>
                <option value="verification">Verification</option>
                <option value="clinical">Clinical</option>
                <option value="system">System</option>
                <option value="security">Security</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Refresh Logs
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-center py-10 text-slate-500 text-xs">No audit logs recorded for this category.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {log.category}
                        </span>
                        <span className="font-bold text-white">{log.action}</span>
                        <span className="text-slate-500 text-[10px]">by {log.userName} ({log.userRole})</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{log.details}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SYSTEM BROADCAST & ANNOUNCEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white font-display">System Broadcast Dispatcher</h3>
            <p className="text-xs text-slate-400">
              Transmit emergency notices, clinical advisories, or maintenance warnings across user dashboards.
            </p>
          </div>

          {broadcastNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{broadcastNotice}</span>
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Target Audience *
              </label>
              <select
                value={broadcastForm.targetRole}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, targetRole: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="all">Broadcast to Everyone (Patients & Doctors)</option>
                <option value="patient">Patients Only</option>
                <option value="doctor">Doctors Only</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Notice Priority *
              </label>
              <select
                value={broadcastForm.type}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="warning">Critical Advisory / Warning</option>
                <option value="info">General Information</option>
                <option value="reminder">Scheduled System Maintenance</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Announcement Headline *
              </label>
              <input
                type="text"
                required
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                placeholder="e.g. Critical Medical Advisory: Seasonal Influenza Surge"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Full Message Body *
              </label>
              <textarea
                rows={4}
                required
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                placeholder="Write official directive to be delivered to user notification feeds..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={broadcasting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-dark-950 font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              {broadcasting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-dark-950" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Broadcast Announcement</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
