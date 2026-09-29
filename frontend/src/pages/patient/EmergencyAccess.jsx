import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const DEFAULT_SETTINGS = {
  enabled: true,
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
    description:
      "Allow emergency healthcare professionals to see your blood group.",
    icon: "🩸",
  },
  {
    key: "allergies",
    title: "Allergies",
    description:
      "Important allergies that emergency healthcare professionals should know.",
    icon: "⚠️",
  },
  {
    key: "medications",
    title: "Current Medications",
    description:
      "Medications you currently take.",
    icon: "💊",
  },
  {
    key: "conditions",
    title: "Medical Conditions",
    description:
      "Medical conditions that may be important during emergency treatment.",
    icon: "🏥",
  },
  {
    key: "emergencyContact",
    title: "Emergency Contact",
    description:
      "Allow emergency healthcare professionals to contact your emergency contact.",
    icon: "📞",
  },
  {
    key: "criticalNotes",
    title: "Critical Medical Notes",
    description:
      "Other critical information you have explicitly chosen to share.",
    icon: "📋",
  },
];

export default function EmergencyAccess() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emergencyUrl, setEmergencyUrl] = useState("");
  const [copied, setCopied] = useState(false);

  /*
   * Temporary patient data.
   *
   * Later replace this with data from your authenticated patient API.
   */
  const patientData = {
    name: "Test Patient",
    bloodGroup: "O+",
    allergies: ["Penicillin", "Dust"],
    medications: ["Metformin 500mg"],
    conditions: ["Type 2 Diabetes"],
    emergencyContact: {
      name: "Emergency Contact",
      phone: "+91 98765 43210",
      relation: "Family",
    },
    criticalNotes: "Patient has a history of diabetes.",
  };

  /*
   * Load previously saved settings.
   *
   * We use localStorage for now so your demo works immediately.
   */
  useEffect(() => {
    const stored = localStorage.getItem("mediconnect_emergency_settings");

    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }

    const storedUrl = localStorage.getItem("mediconnect_emergency_url");

    if (storedUrl) {
      setEmergencyUrl(storedUrl);
    }
  }, []);

  const updateSetting = (key) => {
    setSaved(false);

    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMasterToggle = () => {
    setSaved(false);

    setSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const saveSettings = async () => {
    setLoading(true);

    try {
      /*
       * DEMO STORAGE
       *
       * Replace this later with:
       *
       * PUT /api/patient/emergency-access
       */

      localStorage.setItem(
        "mediconnect_emergency_settings",
        JSON.stringify(settings)
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      setSaved(true);
    } catch (error) {
      console.error(error);
      alert("Failed to save emergency settings.");
    } finally {
      setLoading(false);
    }
  };

  const generateQR = () => {
    if (!settings.enabled) {
      alert("Please enable Emergency Access first.");
      return;
    }

    /*
     * Generate a demo public token.
     *
     * IMPORTANT:
     * Medical data is NOT stored inside the QR.
     */
    const token =
      "MC-" +
      crypto.randomUUID().replaceAll("-", "").slice(0, 16);

    const url =
      `${window.location.origin}/emergency/${token}`;

    localStorage.setItem(
      "mediconnect_emergency_profile",
      JSON.stringify({
        token,
        settings,
        patientData,
        updatedAt: new Date().toISOString(),
      })
    );

    localStorage.setItem(
      "mediconnect_emergency_url",
      url
    );

    setEmergencyUrl(url);
  };

  const copyLink = async () => {
    if (!emergencyUrl) return;

    try {
      await navigator.clipboard.writeText(emergencyUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      alert("Could not copy link.");
    }
  };

  const previewProfile = () => {
    if (!emergencyUrl) return;

    window.open(
      emergencyUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const enabledCount = useMemo(() => {
    return FIELD_CONFIG.filter(
      (field) => settings[field.key]
    ).length;
  }, [settings]);

  return (
    <div className="min-h-screen bg-[#050914] text-white px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">

          <div className="flex items-center gap-4 mb-3">

            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-2xl">
              🚨
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Emergency Medical Access
              </h1>

              <p className="text-slate-400 mt-1">
                Choose the medical information healthcare professionals
                can access during an emergency.
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
            🔒 <strong className="text-white">
              You control what is shared.
            </strong>{" "}
            Only information you explicitly enable will be available
            through your Emergency QR.
          </div>

        </div>


        {/* MASTER ACCESS */}

        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-6 mb-6">

          <div className="flex items-center justify-between gap-4">

            <div>

              <h2 className="text-xl font-semibold">
                Emergency Access
              </h2>

              <p className="text-slate-400 text-sm mt-1">
                Allow emergency healthcare professionals to access
                your selected medical information.
              </p>

            </div>

            <button
              onClick={handleMasterToggle}
              className={`relative w-14 h-7 rounded-full transition ${
                settings.enabled
                  ? "bg-cyan-500"
                  : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${
                  settings.enabled
                    ? "left-8"
                    : "left-1"
                }`}
              />
            </button>

          </div>

        </div>


        {/* INFORMATION CONTROLS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {FIELD_CONFIG.map((field) => (

            <div
              key={field.key}
              className={`rounded-2xl border p-5 transition ${
                settings.enabled
                  ? "border-slate-800 bg-[#0b1220]"
                  : "border-slate-900 bg-[#080d17] opacity-50"
              }`}
            >

              <div className="flex items-start justify-between gap-4">

                <div className="flex gap-4">

                  <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                    {field.icon}
                  </div>

                  <div>

                    <h3 className="font-semibold text-lg">
                      {field.title}
                    </h3>

                    <p className="text-sm text-slate-400 mt-1 leading-6">
                      {field.description}
                    </p>

                  </div>

                </div>

                <button
                  disabled={!settings.enabled}
                  onClick={() =>
                    updateSetting(field.key)
                  }
                  className={`relative shrink-0 w-12 h-6 rounded-full transition ${
                    settings[field.key]
                      ? "bg-cyan-500"
                      : "bg-slate-700"
                  }`}
                >

                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                      settings[field.key]
                        ? "left-7"
                        : "left-1"
                    }`}
                  />

                </button>

              </div>

            </div>

          ))}

        </div>


        {/* SAVE */}

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-5">

          <div className="text-sm text-slate-400">
            {enabledCount} information categories selected
          </div>

          <button
            onClick={saveSettings}
            disabled={loading}
            className="w-full md:w-auto px-7 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : saved
              ? "✓ Settings Saved"
              : "Save Emergency Access Settings"}
          </button>

        </div>


        {/* QR SECTION */}

        <div className="mt-8 rounded-3xl border border-cyan-400/20 bg-[#0b1220] p-6 md:p-8">

          <div className="text-center max-w-2xl mx-auto">

            <div className="text-3xl mb-3">
              🔐
            </div>

            <h2 className="text-2xl font-bold">
              Your Emergency QR
            </h2>

            <p className="text-slate-400 mt-2">
              Emergency healthcare professionals can scan this QR
              to view the medical information you've authorized.
            </p>

          </div>


          {!settings.enabled && (

            <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300 text-center">
              Enable Emergency Access to create your Emergency QR.
            </div>

          )}


          {settings.enabled && !emergencyUrl && (

            <div className="flex justify-center mt-7">

              <button
                onClick={generateQR}
                className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
              >
                Generate Emergency QR
              </button>

            </div>

          )}


          {emergencyUrl && (

            <div className="mt-8 flex flex-col items-center">

              <div className="bg-white p-5 rounded-2xl shadow-2xl">

                <QRCodeSVG
                  value={emergencyUrl}
                  size={240}
                  level="H"
                />

              </div>

              <p className="mt-5 text-slate-300 font-medium">
                Scan this QR during an emergency
              </p>

              <div className="mt-4 w-full max-w-xl rounded-xl bg-black/30 border border-slate-700 p-3 text-sm text-slate-400 break-all text-center">
                {emergencyUrl}
              </div>


              <div className="flex flex-col sm:flex-row gap-3 mt-5">

                <button
                  onClick={copyLink}
                  className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
                >
                  {copied
                    ? "✓ Link Copied"
                    : "Copy Emergency Link"}
                </button>

                <button
                  onClick={previewProfile}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition"
                >
                  Preview Emergency Profile
                </button>

                <button
                  onClick={generateQR}
                  className="px-5 py-3 rounded-xl border border-cyan-400/30 hover:bg-cyan-500/10 transition"
                >
                  Regenerate QR
                </button>

              </div>

            </div>

          )}

        </div>


        {/* PRIVACY */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0b1220] p-5 text-center">

          <div className="text-cyan-400 font-semibold">
            🔒 Privacy controlled by you
          </div>

          <p className="text-sm text-slate-400 mt-2">
            Only information you've explicitly enabled is intended
            to be available through your Emergency QR.
          </p>

        </div>

      </div>
    </div>
  );
}