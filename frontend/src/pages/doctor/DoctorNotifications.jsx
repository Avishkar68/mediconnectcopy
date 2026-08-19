import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const DoctorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Could not retrieve recent notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => api.put(`/notifications/${n._id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to read all notifications:', err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 font-display">Loading notifications inbox...</div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Practitioner Inbox</h2>
          <p className="text-xs text-slate-400">Manage alerts, connection permissions, and system notifications.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline animate-pulse"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <Bell className="w-12 h-12 text-slate-750 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No notifications yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Clinical connection alerts and patient requests notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div
              key={notif._id}
              onClick={() => !notif.read && handleMarkAsRead(notif._id)}
              className={`p-4 rounded-2xl border text-left flex justify-between items-start gap-4 transition-all ${
                notif.read
                  ? 'bg-slate-900/20 border-slate-850 opacity-60'
                  : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  notif.read ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className={`text-[8px] font-bold tracking-wider uppercase px-2 py-0.2 rounded border ${
                      notif.type === 'success'
                        ? 'text-emerald-450 border-emerald-500/20 bg-emerald-500/5'
                        : notif.type === 'warning'
                        ? 'text-yellow-450 border-yellow-500/20 bg-yellow-500/5'
                        : 'text-brand-450 border-brand-500/20 bg-brand-500/5'
                    }`}>
                      {notif.type}
                    </span>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-[10px] text-slate-500 space-x-1 shrink-0 font-medium pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default DoctorNotifications;
