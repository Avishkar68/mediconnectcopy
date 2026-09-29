import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function EmergencyProfile() {
  const { token } = useParams();

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(
      "mediconnect_emergency_profile"
    );

    if (!stored) return;

    try {
      const data = JSON.parse(stored);

      if (data.token === token) {
        setProfile(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050914] text-white flex items-center justify-center p-6">

        <div className="text-center">

          <div className="text-5xl mb-5">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold">
            Emergency Profile Not Found
          </h1>

          <p className="text-slate-400 mt-2">
            This Emergency QR may be invalid or unavailable.
          </p>

        </div>

      </div>
    );
  }

  const { settings, patientData } = profile;

  return (
    <div className="min-h-screen bg-[#050914] text-white px-4 py-8">

      <div className="max-w-3xl mx-auto">

        {/* HEADER */}

        <div className="rounded-3xl border border-red-500/20 bg-[#0b1220] p-6">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-2xl">
              🚨
            </div>

            <div>

              <p className="text-red-400 text-sm font-semibold">
                MEDICONNECT
              </p>

              <h1 className="text-3xl font-bold">
                Emergency Medical Profile
              </h1>

            </div>

          </div>

          <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-300 text-sm">
            This information has been explicitly shared by the
            patient for emergency medical situations.
          </div>

        </div>


        {/* PATIENT */}

        <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0b1220] p-6">

          <p className="text-sm text-slate-400">
            Patient
          </p>

          <h2 className="text-2xl font-bold mt-1">
            {patientData.name}
          </h2>

        </div>


        {/* BLOOD GROUP */}

        {settings.bloodGroup && (

          <InfoCard
            icon="🩸"
            title="Blood Group"
          >
            <div className="text-3xl font-bold text-red-400">
              {patientData.bloodGroup}
            </div>
          </InfoCard>

        )}


        {/* ALLERGIES */}

        {settings.allergies && (

          <InfoCard
            icon="⚠️"
            title="Allergies"
          >

            {patientData.allergies?.length ? (

              <div className="flex flex-wrap gap-2">

                {patientData.allergies.map(
                  (item, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300"
                    >
                      {item}
                    </span>
                  )
                )}

              </div>

            ) : (
              <p className="text-slate-400">
                No allergies recorded.
              </p>
            )}

          </InfoCard>

        )}


        {/* MEDICATIONS */}

        {settings.medications && (

          <InfoCard
            icon="💊"
            title="Current Medications"
          >

            {patientData.medications?.map(
              (item, index) => (
                <div
                  key={index}
                  className="py-2 border-b border-slate-800 last:border-0"
                >
                  {item}
                </div>
              )
            )}

          </InfoCard>

        )}


        {/* CONDITIONS */}

        {settings.conditions && (

          <InfoCard
            icon="🏥"
            title="Medical Conditions"
          >

            {patientData.conditions?.map(
              (item, index) => (
                <div
                  key={index}
                  className="py-2 border-b border-slate-800 last:border-0"
                >
                  {item}
                </div>
              )
            )}

          </InfoCard>

        )}


        {/* CONTACT */}

        {settings.emergencyContact && (

          <InfoCard
            icon="📞"
            title="Emergency Contact"
          >

            <div className="space-y-2">

              <p>
                <span className="text-slate-400">
                  Name:
                </span>{" "}
                {patientData.emergencyContact.name}
              </p>

              <p>
                <span className="text-slate-400">
                  Relation:
                </span>{" "}
                {patientData.emergencyContact.relation}
              </p>

              <a
                href={`tel:${patientData.emergencyContact.phone}`}
                className="inline-block mt-2 px-5 py-3 rounded-xl bg-green-500 text-black font-bold"
              >
                📞 Call Emergency Contact
              </a>

            </div>

          </InfoCard>

        )}


        {/* CRITICAL NOTES */}

        {settings.criticalNotes && (

          <InfoCard
            icon="📋"
            title="Critical Medical Notes"
          >

            <p className="text-slate-300">
              {patientData.criticalNotes}
            </p>

          </InfoCard>

        )}


        {/* FOOTER */}

        <div className="mt-6 text-center text-sm text-slate-500">

          MediConnect Emergency Medical Access

          <br />

          Patient-controlled information sharing

        </div>

      </div>

    </div>
  );
}


function InfoCard({ icon, title, children }) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0b1220] p-6">

      <div className="flex items-center gap-3 mb-5">

        <span className="text-xl">
          {icon}
        </span>

        <h2 className="text-lg font-semibold">
          {title}
        </h2>

      </div>

      <div className="text-slate-300">
        {children}
      </div>

    </div>
  );
}