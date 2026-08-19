import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  UserPlus,
  Clock,
  AlertCircle,
  Mail,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

const DoctorRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const response = await api.get('/doctor/requests');
      if (response.success && response.data) {
        setRequests(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Could not retrieve outgoing consent requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-yellow-500/10 text-yellow-450 border-yellow-500/20">
            <Clock className="w-3 h-3 text-yellow-500" />
            <span>Pending</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-emerald-500/10 text-emerald-450 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-red-500/10 text-red-450 border-red-500/20">
            <XCircle className="w-3 h-3 text-red-400" />
            <span>Rejected</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-slate-500/10 text-slate-450 border-slate-500/20">
            <XCircle className="w-3 h-3 text-slate-500" />
            <span>Revoked</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-slate-800 text-slate-500 border-slate-850">
            <Clock className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase bg-slate-900 text-slate-400 border-slate-800">
            <HelpCircle className="w-3 h-3" />
            <span>Unknown</span>
          </span>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading consent queue...</div>;
  }

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display">Sent Consent Requests</h2>
        <p className="text-xs text-slate-400">Monitor access requests sent to patients for records sharing authorization.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center flex items-center justify-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No outgoing requests found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Search patient files in the directory to request data decryption consent tokens.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div
              key={req._id}
              className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-750 transition-all text-left"
            >
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl mt-0.5">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{req.patient?.name || 'Patient'}</h4>
                  <div className="flex items-center text-[10px] text-slate-400 mt-1 space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{req.patient?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-[9px] text-slate-500 mt-2 space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Requested: {new Date(req.requestedAt || req.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status display */}
              <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
                {getStatusBadge(req.status)}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default DoctorRequests;
