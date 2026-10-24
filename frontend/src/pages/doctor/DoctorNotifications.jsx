import i18n from "../../i18n/index.js";
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ClipboardList,
  Trash2,
  CheckCheck,
  ExternalLink,
  User,
  ShieldAlert,
} from 'lucide-react';

const DoctorNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to read all notifications:', err.message);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err.message);
    }
  };

  const getCategoryDetails = (cat, type) => {
    switch (cat) {
      case 'reminder':
        return {
          icon: Clock,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          label: 'Schedule Alert',
        };
      case 'care_plan':
        return {
          icon: ClipboardList,
          color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
          label: 'Care Pathway',
        };
      case 'appointment':
        return {
          icon: Calendar,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          label: 'Consultation',
        };
      case 'emergency':
        return {
          icon: ShieldAlert,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          label: 'Emergency Alert',
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-400 bg-slate-800 border-slate-700',
          label: 'Practice Alert',
        };
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    if (activeCategory === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.category === activeCategory);
  }, [notifications, activeCategory]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return <div className="text-center py-20 text-slate-500">{i18n.t("Loading doctor notifications center...")}</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center space-x-2">
            <span>{i18n.t("Clinical Practice Notifications")}</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {unreadCount} {i18n.t("New")}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {i18n.t("Patient consent authorizations, scheduled consultation reminders, and emergency access alerts.")}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-bold transition-all border border-slate-700"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{i18n.t("Mark all as read")}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'reminder', label: 'Consultation Reminders' },
          { key: 'care_plan', label: 'Care Pathways' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeCategory === tab.key
                ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/15 border border-dashed border-slate-800 rounded-3xl space-y-2">
          <Bell className="w-10 h-10 text-slate-650 mx-auto" />
          <h3 className="text-sm font-bold text-white">{i18n.t("No notifications in this category")}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {i18n.t("Clinical reminders and consent authorizations will appear here.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const catDetails = getCategoryDetails(notif.category, notif.type);
            const CatIcon = catDetails.icon;

            return (
              <div
                key={notif._id}
                onClick={() => !notif.read && handleMarkAsRead(notif._id)}
                className={`p-4 rounded-2xl border text-left flex justify-between items-start gap-4 transition-all ${
                  notif.read
                    ? 'bg-slate-900/25 border-slate-850 opacity-70 hover:opacity-100'
                    : 'bg-slate-900/65 border-brand-500/25 shadow-sm hover:border-brand-500/40 cursor-pointer'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${catDetails.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${catDetails.color}`}>
                        {catDetails.label}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-ping" />
                      )}
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-relaxed pt-0.5">
                      {notif.message}
                    </p>

                    {notif.actionUrl && (
                      <div className="pt-1.5">
                        <Link
                          to={notif.actionUrl}
                          className="inline-flex items-center space-x-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 hover:underline"
                        >
                          <span>{i18n.t("Review patient file")}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 pt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(notif.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <button
                    onClick={(e) => handleDeleteNotification(notif._id, e)}
                    title={i18n.t("Delete notification")}
                    className="p-1 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default DoctorNotifications;
