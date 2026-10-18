import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../../services/api";
import Loader from "../../components/Loader";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Phone,
  AlertCircle,
  QrCode,
  Lock,
  Save,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  bloodGroup: true,
  allergies: true,
  medications: true,
  conditions: true,
  emergencyContact: true,
  criticalNotes: false,
};

const FIELD_CONFIG = [
  {
    key: "bloodGroup",
    title: "Blood Group",
    description: "Shows your blood group so doctors know what blood to give you right away.",
    icon: "🩸",
  },
  {
    key: "allergies",
    title: "Allergies",
    description: "Lists foods or medicines you are allergic to so doctors know what to avoid.",
    icon: "⚠️",
  },
  {
    key: "medications",
    title: "Current Medicines",
    description: "Shows daily medicines you take so doctors don't give conflicting treatments.",
    icon: "💊",
  },
  {
    key: "conditions",
    title: "Health Conditions",
    description: "Shows chronic conditions like Asthma, Diabetes, or Heart conditions.",
    icon: "🏥",
  },
  {
    key: "emergencyContact",
    title: "Emergency Contact",
    description: "Gives the name and phone number of your family member to call immediately.",
    icon: "📞",
  },
  {
    key: "criticalNotes",
    title: "Special Note for Doctors",
    description: "Any special note (e.g. 'I have a pacemaker', 'Please contact my daughter').",
    icon: "📋",
  },
];

export default function EmergencyAccess() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    phone: "",
    relation: "",
  });
  const [criticalNotes, setCriticalNotes] = useState("");

  const [patientData, setPatientData] = useState({
    name: "",
    bloodGroup: "",
    allergies: [],
    medications: [],
    conditions: [],
    emergencyContact: { name: "", phone: "", relation: "" },
    criticalNotes: "",
  });

  // Fetch real emergency settings and patient health data from backend API
  const fetchEmergencyData = async () => {
    try {
      setError("");
      const response = await api.get("/patient/emergency");
      if (response.success && response.data) {
        const d = response.data;
        setEnabled(Boolean(d.enabled));
        setToken(d.token || "");
        setTokenExpiresAt(d.tokenExpiresAt || null);
        setSettings({ ...DEFAULT_SETTINGS, ...(d.settings || {}) });
        setEmergencyContact(d.emergencyContact || { name: "", phone: "", relation: "" });
        setCriticalNotes(d.criticalNotes || "");
        if (d.patientData) {
          setPatientData(d.patientData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch emergency settings:", err);
      setError("Could not load your emergency access settings from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const emergencyUrl = useMemo(() => {
    if (!token) return "";
    return `${window.location.origin}/emergency/${token}`;
  }, [token]);

  const updateSetting = (key) => {
    setSaved(false);
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMasterToggle = () => {
    setSaved(false);
    setEnabled((prev) => !prev);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await api.post("/patient/emergency", {
        enabled,
        settings,
        emergencyContact,
        criticalNotes,
      });

      if (response.success && response.data) {
        setEnabled(response.data.enabled);
        setToken(response.data.token || "");
        setTokenExpiresAt(response.data.tokenExpiresAt || null);
        setSettings(response.data.settings || settings);
        setEmergencyContact(response.data.emergencyContact || emergencyContact);
        setCriticalNotes(response.data.criticalNotes ?? criticalNotes);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save emergency settings:", err);
      setError(err.message || "Failed to save emergency access configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!window.confirm("Regenerating your Emergency QR will permanently invalidate and revoke your previous QR code. Proceed?")) {
      return;
    }

    setRegenerating(true);
    setError("");

    try {
      const response = await api.post("/patient/emergency/regenerate");
      if (response.success && response.data) {
        setToken(response.data.token);
        setTokenExpiresAt(response.data.tokenExpiresAt);
        setEnabled(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to regenerate QR token:", err);
      setError(err.message || "Failed to regenerate emergency QR token.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPNG = () => {
    const canvas = document.getElementById("emergency-qr-canvas");
    if (!canvas) {
      alert("QR canvas not found. Please try again.");
      return;
    }

    try {
      // Create a higher-resolution framed card for download
      const exportCanvas = document.createElement("canvas");
      const ctx = exportCanvas.getContext("2d");
      exportCanvas.width = 400;
      exportCanvas.height = 500;

      // Card Background
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, 400, 500);

      // Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ef4444";
      ctx.strokeRect(10, 10, 380, 480);

      // Header Text
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MEDICONNECT EMERGENCY QR", 200, 45);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText("Scan during medical emergency for vital records", 200, 68);

      // Patient Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(patientData.name || "Patient Profile", 200, 95);

      // QR Code in White Box
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(70, 120, 260, 260);
      ctx.drawImage(canvas, 80, 130, 240, 240);

      // Footer notice
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText("Encrypted & Verifiable Access by Authorized Clinicians", 200, 420);
      ctx.fillText("Patient-Controlled Emergency Health Clearance", 200, 440);

      const pngUrl = exportCanvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const sanitizedName = (patientData.name || "patient").toLowerCase().replace(/[^a-z0-9]/g, "-");
      downloadLink.download = `mediconnect-emergency-qr-${sanitizedName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Error exporting QR code PNG:", err);
      // Fallback directly to canvas data url
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "mediconnect-emergency-qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleCopyLink = async () => {
    if (!emergencyUrl) return;
    try {
      await navigator.clipboard.writeText(emergencyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy emergency link to clipboard.");
    }
  };

  const handlePreviewProfile = () => {
    if (!emergencyUrl) return;
    window.open(emergencyUrl, "_blank", "noopener,noreferrer");
  };

  const enabledCount = useMemo(() => {
    return FIELD_CONFIG.filter((field) => settings[field.key]).length;
  }, [settings]);

  // Check for missing data fields
  const missingWarnings = useMemo(() => {
    const list = [];
    if (!patientData.bloodGroup && settings.bloodGroup) {
      list.push("Blood Group is not recorded in your profile. You can update it in My Health.");
    }
    if ((!emergencyContact.phone || emergencyContact.phone.trim() === "") && settings.emergencyContact) {
      list.push("Emergency Contact Phone is missing. First responders won't have a number to call.");
    }
    if ((!patientData.allergies || patientData.allergies.length === 0) && settings.allergies) {
      list.push("No allergies currently recorded in your medical profile.");
    }
    if ((!patientData.medications || patientData.medications.length === 0) && settings.medications) {
      list.push("No active medications found in your prescriptions ledger.");
    }
    if ((!patientData.conditions || patientData.conditions.length === 0) && settings.conditions) {
      list.push("No active medical conditions recorded in your health summary.");
    }
    return list;
  }, [patientData, settings, emergencyContact]);

  if (loading) {
    return <Loader fullPage={false} />;
  }

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BANNER */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-red-500/30 bg-gradient-to-br from-red-500/10 via-[#0b1220] to-[#0b1220] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl shrink-0 shadow-lg shadow-red-500/10">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                  Life Safety Card
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                  Private & Protected
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-0.5">
                Emergency Health QR Card
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Paramedics and emergency doctors can scan this card to quickly see your blood type, allergies, and emergency contact if you ever need urgent help.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/dashboard/emergency-assistant"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-600/20"
            >
              <HeartPulse className="w-4 h-4 animate-pulse" />
              <span>First-Aid Helper</span>
            </Link>

            <div className="flex items-center space-x-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Emergency Card Sharing</div>
                <div className={`text-xs font-bold ${enabled ? "text-emerald-400" : "text-slate-500"}`}>
                  {enabled ? "Active & Ready To Scan" : "Sharing Turned Off"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleMasterToggle}
                role="switch"
                aria-checked={enabled}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enabled ? "bg-emerald-500 shadow-md shadow-emerald-500/30" : "bg-slate-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security & HIPAA Notice */}
        <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs text-slate-300 flex items-center space-x-3">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-white">Safe & Protected:</strong> Your emergency card only displays the specific items you turn on below. You stay in full control at all times.
          </span>
        </div>
      </div>

      {/* ERROR & SUCCESS ALERTS */}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Emergency sharing preferences saved and synchronized with server.</span>
        </div>
      )}

      {/* MISSING INFORMATION WARNINGS */}
      {missingWarnings.length > 0 && enabled && (
        <div className="glass-card rounded-2xl p-4 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center space-x-2 text-yellow-400 mb-2 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Missing Profile Information Notice</span>
          </div>
          <ul className="space-y-1 text-xs text-yellow-300/90 list-disc list-inside">
            {missingWarnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 2-COLUMN LAYOUT: SETTINGS & QR PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: PERMISSIONS & CONTACT INPUTS */}
        <div className="lg:col-span-2 space-y-6">
          {/* FIELD CONTROLS CARD */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  What doctors can see in an emergency
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose which information is visible when someone scans your emergency card.
                </p>
              </div>
              <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
                {enabledCount} of {FIELD_CONFIG.length} Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {FIELD_CONFIG.map((field) => {
                const isSelected = settings[field.key];
                return (
                  <div
                    key={field.key}
                    onClick={() => enabled && updateSetting(field.key)}
                    className={`rounded-xl border p-4 transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                      !enabled
                        ? "border-slate-800/40 bg-slate-900/20 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700 opacity-70"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-xl shrink-0 mt-0.5">{field.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{field.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          {field.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSetting(field.key);
                      }}
                      role="switch"
                      aria-checked={isSelected && enabled}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed ${
                        isSelected && enabled
                          ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                          : "bg-slate-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isSelected && enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EMERGENCY CONTACT & CRITICAL NOTES EDITOR */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Primary Emergency Contact Details</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                These details will be displayed to emergency personnel when Emergency Contact sharing is turned on.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Contact Full Name
                </label>
                <input
                  type="text"
                  value={emergencyContact.name}
                  onChange={(e) => {
                    setSaved(false);
                    setEmergencyContact((prev) => ({ ...prev, name: e.target.value }));
                  }}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => {
                    setSaved(false);
                    setEmergencyContact((prev) => ({ ...prev, phone: e.target.value }));
                  }}
                  placeholder="e.g. +1 555-0192"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={emergencyContact.relation}
                  onChange={(e) => {
                    setSaved(false);
                    setEmergencyContact((prev) => ({ ...prev, relation: e.target.value }));
                  }}
                  placeholder="e.g. Spouse / Parent / Sibling"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                <span>Critical Medical Notes (Optional)</span>
                <span className="text-slate-500 font-normal">e.g. Pacemaker implanted, organ transplant recipient</span>
              </label>
              <textarea
                rows={3}
                value={criticalNotes}
                onChange={(e) => {
                  setSaved(false);
                  setCriticalNotes(e.target.value);
                }}
                placeholder="Enter any critical instructions, implants, organ donor status, or resuscitation preferences..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl p-3 text-xs text-white focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/10 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : saved ? "✓ Preferences Saved" : "Save Emergency Configuration"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN: SECURE QR PREVIEW & DOWNLOAD */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col items-center text-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Live QR Preview
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Physical or digital scan preview
            </p>

            {!enabled ? (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center my-4 bg-slate-900/40 w-full max-w-[260px]">
                <ShieldAlert className="w-10 h-10 text-slate-600 mb-2" />
                <h4 className="text-xs font-bold text-slate-300">Sharing Inactive</h4>
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  Enable Emergency Access switch at the top to generate and activate your QR code.
                </p>
                <button
                  onClick={handleMasterToggle}
                  className="mt-4 text-xs font-bold text-emerald-400 hover:underline"
                >
                  Enable Sharing Now
                </button>
              </div>
            ) : token ? (
              <div className="flex flex-col items-center w-full">
                {/* White frame wrapper for high contrast scanning */}
                <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-slate-800 relative group">
                  <QRCodeCanvas
                    id="emergency-qr-canvas"
                    value={emergencyUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="mt-3 flex items-center space-x-1.5 text-emerald-400 text-[10px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Secure QR Active & Verifiable</span>
                </div>

                {tokenExpiresAt && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Valid until: {new Date(tokenExpiresAt).toLocaleDateString()}
                  </p>
                )}

                {/* Encrypted Link Box */}
                <div className="mt-4 w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-left">
                  <div className="overflow-hidden mr-2">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Emergency Profile URL</div>
                    <div className="text-[10px] font-mono text-slate-300 truncate">
                      {emergencyUrl}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    title="Copy URL"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg shrink-0 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* ACTION BUTTONS */}
                <div className="w-full space-y-2.5 mt-5">
                  <button
                    onClick={handleDownloadPNG}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-black font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-red-500/10 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR as PNG</span>
                  </button>

                  <button
                    onClick={handlePreviewProfile}
                    className="w-full py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preview Emergency Profile</span>
                  </button>

                  <button
                    onClick={handleRegenerateQR}
                    disabled={regenerating}
                    className="w-full py-2 px-4 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-semibold transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                    <span>{regenerating ? "Regenerating..." : "Revoke & Regenerate QR"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-dark-950 font-bold text-xs"
                >
                  Generate Emergency QR
                </button>
              </div>
            )}
          </div>

          {/* QUICK SUMMARY CARD OF WHAT DOCTOR SEES */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 text-left">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Visible in Emergency Profile</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Blood Group:</span>
                <span className="font-semibold text-white">
                  {settings.bloodGroup ? (patientData.bloodGroup || "Not Set") : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Allergies:</span>
                <span className="font-semibold text-white">
                  {settings.allergies ? `${patientData.allergies?.length || 0} Listed` : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Medications:</span>
                <span className="font-semibold text-white">
                  {settings.medications ? `${patientData.medications?.length || 0} Active` : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span>Medical Conditions:</span>
                <span className="font-semibold text-white">
                  {settings.conditions ? `${patientData.conditions?.length || 0} Diagnosed` : "Hidden"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Emergency Contact:</span>
                <span className="font-semibold text-white">
                  {settings.emergencyContact ? (emergencyContact.name || "Configured") : "Hidden"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}