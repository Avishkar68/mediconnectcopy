import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import Loader from "../components/Loader";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Phone,
  ArrowLeft,
  Heart,
  Activity,
  LogIn,
  CheckCircle,
} from "lucide-react";

export default function EmergencyProfile() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // 401, 403, 404, or 500
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchEmergencyProfile = async () => {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage("");

      try {
        const response = await api.get(`/patient/emergency-view/${token}`);
        if (response.success && response.data) {
          setProfile(response.data);
        } else {
          setErrorStatus(500);
          setErrorMessage(response.message || "Failed to retrieve emergency profile.");
        }
      } catch (err) {
        console.error("Emergency profile access error:", err);
        // err could contain status code or response data
        const status = err.response?.status || (err.message?.includes("401") || err.message?.includes("token session") ? 401 : err.message?.includes("403") || err.message?.includes("denied") || err.message?.includes("disabled") || err.message?.includes("expired") ? 403 : 404);
        setErrorStatus(status);
        setErrorMessage(err.response?.data?.message || err.message || "Unable to access emergency profile.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchEmergencyProfile();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] text-white flex flex-col items-center justify-center p-6">
        <Loader fullPage={false} />
        <p className="text-slate-400 text-xs mt-3 font-mono animate-pulse">
          Verifying clinician authorization and decrypting emergency records...
        </p>
      </div>
    );
  }

  // --- ACCESS DENIED / UNAUTHENTICATED / ERROR STATES ---
  if (errorStatus || !profile) {
    const isUnauthenticated = errorStatus === 401 || errorMessage.toLowerCase().includes("no token session") || errorMessage.toLowerCase().includes("not authorized");
    const isForbidden = errorStatus === 403 || errorMessage.toLowerCase().includes("access denied") || errorMessage.toLowerCase().includes("disabled") || errorMessage.toLowerCase().includes("expired");

    return (
      <div className="min-h-screen bg-[#050914] text-white flex items-center justify-center p-6 text-left">
        <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl bg-red-500/10 border border-red-500/20 text-red-400">
            {isUnauthenticated ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>

          <div>
            <h1 className="text-xl font-bold text-white font-display">
              {isUnauthenticated
                ? "Doctor Authentication Required"
                : isForbidden
                ? "Emergency Access Restricted"
                : "Emergency Profile Unavailable"}
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {errorMessage ||
                (isUnauthenticated
                  ? "In compliance with healthcare security protocols, emergency medical profiles require verified doctor authentication to access."
                  : "This Emergency QR code may have expired, been revoked, or emergency sharing was disabled by the patient.")}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isUnauthenticated ? (
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs transition flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In with Doctor Credentials</span>
              </Link>
            ) : null}

            <Link
              to="/dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-3">
            MediConnect Emergency Medical Security &bull; HIPAA Compliant
          </div>
        </div>
      </div>
    );
  }

  const { settings, patientData, viewer } = profile;

  return (
    <div className="min-h-screen bg-[#050914] text-white px-4 py-8 text-left">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* TOP STATUS BAR */}
        <div className="flex justify-between items-center text-xs">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-white transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Verified Clinician Access ({viewer?.name || "Authorized Doctor"})</span>
          </span>
        </div>

        {/* HEADER CARD */}
        <div className="glass-card rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/15 via-[#0b1220] to-[#0b1220] p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl shrink-0 shadow-lg shadow-red-500/10">
              🚨
            </div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-red-400 tracking-wider">
                Emergency Medical Record
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-0.5">
                {patientData.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Authorized patient emergency profile &bull; Timestamped access
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              This information has been explicitly authorized by the patient for emergency medical reference.
            </span>
          </div>
        </div>

        {/* BLOOD GROUP (HIGH PRIORITY) */}
        {settings.bloodGroup && (
          <div className="glass-card rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-[#0b1220] p-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                  Critical Transfusion Factor
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Blood Group</h3>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-red-400 bg-red-500/20 px-4 py-1.5 rounded-2xl border border-red-500/30 font-display">
                {patientData.bloodGroup || "Not Specified"}
              </div>
            </div>
          </div>
        )}

        {/* ALLERGIES */}
        {settings.allergies && (
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Known Allergies & Sensitivities
              </h3>
            </div>

            {patientData.allergies && patientData.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {patientData.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>&bull;</span>
                    <span>{allergy}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">No allergies recorded in patient profile.</p>
            )}
          </div>
        )}

        {/* CURRENT MEDICATIONS */}
        {settings.medications && (
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <span className="text-xl">💊</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Current Active Medications
              </h3>
            </div>

            {patientData.medications && patientData.medications.length > 0 ? (
              <div className="space-y-2 pt-1">
                {patientData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-850 text-xs text-slate-200 font-medium flex items-center space-x-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span>{med}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">No active medications registered.</p>
            )}
          </div>
        )}

        {/* MEDICAL CONDITIONS */}
        {settings.conditions && (
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <span className="text-xl">🏥</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Diagnosed Medical Conditions
              </h3>
            </div>

            {patientData.conditions && patientData.conditions.length > 0 ? (
              <div className="space-y-2 pt-1">
                {patientData.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-850 text-xs text-slate-200 font-medium flex items-center space-x-2"
                  >
                    <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{condition}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">No chronic or diagnosed conditions listed.</p>
            )}
          </div>
        )}

        {/* EMERGENCY CONTACT */}
        {settings.emergencyContact && patientData.emergencyContact && (
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <span className="text-xl">📞</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Primary Emergency Contact
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {patientData.emergencyContact.name || "Designated Emergency Contact"}
                </h4>
                {patientData.emergencyContact.relation && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Relationship: <span className="text-slate-300 font-medium">{patientData.emergencyContact.relation}</span>
                  </p>
                )}
                {patientData.emergencyContact.phone && (
                  <p className="text-xs font-mono text-emerald-400 mt-1 font-bold">
                    {patientData.emergencyContact.phone}
                  </p>
                )}
              </div>

              {patientData.emergencyContact.phone && (
                <a
                  href={`tel:${patientData.emergencyContact.phone}`}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs transition flex items-center space-x-2 shrink-0 shadow-md shadow-emerald-500/10"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Emergency Contact</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* CRITICAL MEDICAL NOTES */}
        {settings.criticalNotes && patientData.criticalNotes && (
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <span className="text-xl">📋</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Critical Medical Notes & Directives
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {patientData.criticalNotes}
            </div>
          </div>
        )}

        {/* AUDIT & SECURITY FOOTER */}
        <div className="glass-card rounded-2xl border border-slate-800 p-4 text-center space-y-1">
          <p className="text-[11px] font-semibold text-slate-400">
            MediConnect Emergency Access Log &bull; Session Audited &bull; Recorded on Timeline
          </p>
          <p className="text-[10px] text-slate-600">
            Emergency records access is logged and timestamped for patient transparency and medical audit trails.
          </p>
        </div>
      </div>
    </div>
  );
}