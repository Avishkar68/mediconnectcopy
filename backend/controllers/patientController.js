import fs from 'fs';
import path from 'path';
import HealthProfile from '../models/HealthProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Medication from '../models/Medication.js';
import Appointment from '../models/Appointment.js';
import DoctorAccess from '../models/DoctorAccess.js';
import TimelineEvent from '../models/TimelineEvent.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import CarePlan from '../models/CarePlan.js';
import crypto from 'crypto';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { cloudinary, isConfigured } from '../utils/cloudinary.js';


// Helper to log timeline events
const createTimelineEvent = async (patientId, category, title, description) => {
  try {
    await TimelineEvent.create({
      patient: patientId,
      category,
      title,
      description,
      eventDate: new Date()
    });
  } catch (err) {
    console.error('Failed to create timeline event:', err.message);
  }
};

/**
 * @desc    Get patient health profile (vitals & conditions)
 * @route   GET /api/patient/health
 * @access  Private
 */
export const getHealthProfile = async (req, res) => {
  try {
    let profile = await HealthProfile.findOne({ patient: req.user._id });
    if (!profile) {
      profile = await HealthProfile.create({
        patient: req.user._id,
        conditions: [],
        vitals: []
      });
    }
    
    // Retrieve additional fields (allergies, bloodGroup) from User model
    const user = await User.findById(req.user._id);

    return sendSuccess(res, 'Health profile retrieved', {
      profile,
      bloodGroup: user?.profile?.bloodGroup || '',
      allergies: user?.profile?.allergies || [],
    });
  } catch (error) {
    console.error('getHealthProfile error:', error.message);
    return sendError(res, 'Server error retrieving health profile', 500);
  }
};

/**
 * @desc    Log new vitals or add active condition
 * @route   POST /api/patient/health
 * @access  Private
 */
export const updateHealthProfile = async (req, res) => {
  const { type, vitalData, conditionData, bloodGroup, allergies } = req.body;

  try {
    let profile = await HealthProfile.findOne({ patient: req.user._id });
    if (!profile) {
      profile = await HealthProfile.create({ patient: req.user._id });
    }

    if (type === 'vital') {
      profile.vitals.unshift({
        ...vitalData,
        loggedAt: new Date()
      });
      await profile.save();
      await createTimelineEvent(
        req.user._id,
        'vital',
        'Vitals Logged',
        `Recorded new vital signs: BP ${vitalData.bloodPressureSystolic}/${vitalData.bloodPressureDiastolic}, HR ${vitalData.heartRate} bpm.`
      );
    } else if (type === 'condition') {
      profile.conditions.unshift({
        name: conditionData.name,
        diagnosedAt: conditionData.diagnosedAt || new Date(),
        status: 'active'
      });
      await profile.save();
      await createTimelineEvent(
        req.user._id,
        'condition',
        'Condition Diagnosed',
        `Diagnosed with active condition: ${conditionData.name}.`
      );
    } else if (type === 'profile') {
      // Update User profile details directly
      const user = await User.findById(req.user._id);
      if (user) {
        user.profile.bloodGroup = bloodGroup || user.profile.bloodGroup;
        user.profile.allergies = allergies || user.profile.allergies;
        await user.save();
      }
    }

    // Refresh and fetch updated profile
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 'Health profile updated successfully', {
      profile,
      bloodGroup: user?.profile?.bloodGroup || '',
      allergies: user?.profile?.allergies || [],
    });
  } catch (error) {
    console.error('updateHealthProfile error:', error.message);
    return sendError(res, 'Server error updating health profile', 500);
  }
};

/**
 * @desc    Get patient medical records
 * @route   GET /api/patient/records
 * @access  Private
 */
export const getMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id }).sort({ recordDate: -1 });
    return sendSuccess(res, 'Medical records retrieved', records);
  } catch (error) {
    console.error('getMedicalRecords error:', error.message);
    return sendError(res, 'Server error retrieving medical records', 500);
  }
};

/**
 * @desc    Upload / create a new medical record
 * @route   POST /api/patient/records
 * @access  Private
 */
export const createMedicalRecord = async (req, res) => {
  const { title, category, recordDate, notes, fileUrl } = req.body;

  if (!title) {
    return sendError(res, 'Title is required', 400);
  }

  try {
    const record = await MedicalRecord.create({
      patient: req.user._id,
      uploadedBy: req.user._id,
      title,
      category: category || 'other',
      recordDate: recordDate || new Date(),
      notes: notes || '',
      fileUrl: fileUrl || '',
      isEncrypted: false
    });

    await createTimelineEvent(
      req.user._id,
      'medical_record',
      'Record Uploaded',
      `Uploaded new ${category.replace('_', ' ')} record: "${title}".`
    );

    return sendSuccess(res, 'Medical record created successfully', record, 201);
  } catch (error) {
    console.error('createMedicalRecord error:', error.message);
    return sendError(res, 'Server error creating medical record', 500);
  }
};

/**
 * @desc    Get chronological timeline events
 * @route   GET /api/patient/timeline
 * @access  Private
 */
export const getTimelineEvents = async (req, res) => {
  try {
    const events = await TimelineEvent.find({ patient: req.user._id }).sort({ eventDate: -1 });
    return sendSuccess(res, 'Timeline events retrieved', events);
  } catch (error) {
    console.error('getTimelineEvents error:', error.message);
    return sendError(res, 'Server error retrieving timeline events', 500);
  }
};

/**
 * @desc    Get patient medications
 * @route   GET /api/patient/medications
 * @access  Private
 */
export const getMedications = async (req, res) => {
  try {
    const medications = await Medication.find({ patient: req.user._id }).sort({ startDate: -1 });
    return sendSuccess(res, 'Medications retrieved', medications);
  } catch (error) {
    console.error('getMedications error:', error.message);
    return sendError(res, 'Server error retrieving medications', 500);
  }
};

/**
 * @desc    Log / prescribe a new medication
 * @route   POST /api/patient/medications
 * @access  Private
 */
export const createMedication = async (req, res) => {
  const { name, dosage, frequency, startDate, endDate, instructions, doctor, doctorName } = req.body;

  if (!name || !dosage || !frequency) {
    return sendError(res, 'Medication name, dosage, and frequency are required', 400);
  }

  try {
    const medication = await Medication.create({
      patient: req.user._id,
      name,
      dosage,
      frequency,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      instructions: instructions || '',
      doctor: doctor || null,
      status: 'active'
    });

    const docText = doctorName ? ` by Dr. ${doctorName}` : '';
    await createTimelineEvent(
      req.user._id,
      'medication',
      'Medication Prescribed & Accepted',
      `Prescribed medication: ${name} (${dosage}, ${frequency})${docText} during consultation.`
    );

    return sendSuccess(res, 'Medication accepted and added to profile', medication, 201);
  } catch (error) {
    console.error('createMedication error:', error.message);
    return sendError(res, 'Server error creating medication', 500);
  }
};

/**
 * @desc    Get patient scheduled appointments
 * @route   GET /api/patient/appointments
 * @access  Private
 */
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate('doctor', 'name profile.specialization')
      .sort({ dateTime: 1 });
    return sendSuccess(res, 'Appointments retrieved', appointments);
  } catch (error) {
    console.error('getAppointments error:', error.message);
    return sendError(res, 'Server error retrieving appointments', 500);
  }
};

/**
 * @desc    Book a new appointment with a doctor
 * @route   POST /api/patient/appointments
 * @access  Private
 */
export const createAppointment = async (req, res) => {
  const { doctorId, dateTime, purpose, notes } = req.body;

  if (!doctorId || !dateTime || !purpose) {
    return sendError(res, 'Doctor, date/time, and purpose are required', 400);
  }

  try {
    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return sendError(res, 'Specified doctor not found in repository', 404);
    }

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      dateTime,
      purpose,
      notes: notes || '',
      status: 'scheduled'
    });

    await createTimelineEvent(
      req.user._id,
      'appointment',
      'Appointment Booked',
      `Scheduled consultation with Dr. ${doctor.name} on ${new Date(dateTime).toLocaleString()} for ${purpose}.`
    );

    return sendSuccess(res, 'Appointment created successfully', appointment, 201);
  } catch (error) {
    console.error('createAppointment error:', error.message);
    return sendError(res, 'Server error creating appointment', 500);
  }
};

/**
 * @desc    Get consents, links, and all registered doctors
 * @route   GET /api/patient/doctors
 * @access  Private
 */
export const getDoctorAccess = async (req, res) => {
  try {
    // Find all active/pending consents
    const consents = await DoctorAccess.find({ patient: req.user._id }).populate('doctor', 'name email profile.specialization profile.clinicAddress');
    
    // Also fetch all doctors registered in the system so patient can add them
    const allDoctors = await User.find({ role: 'doctor' }).select('name email profile.specialization profile.clinicAddress');

    return sendSuccess(res, 'Doctor access data retrieved', {
      consents,
      allDoctors
    });
  } catch (error) {
    console.error('getDoctorAccess error:', error.message);
    return sendError(res, 'Server error retrieving doctor access logs', 500);
  }
};

/**
 * @desc    Grant/Request connection to a doctor
 * @route   POST /api/patient/doctors
 * @access  Private
 */
export const grantDoctorAccess = async (req, res) => {
  const { doctorId, permissions } = req.body;

  if (!doctorId) {
    return sendError(res, 'Doctor ID is required', 400);
  }

  try {
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    let access = await DoctorAccess.findOne({ patient: req.user._id, doctor: doctorId });
    
    if (access) {
      access.status = 'approved';
      access.approvedAt = new Date();
      access.permissions = permissions || ['view_records', 'view_vitals'];
      await access.save();
    } else {
      access = await DoctorAccess.create({
        patient: req.user._id,
        doctor: doctorId,
        permissions: permissions || ['view_records', 'view_vitals'],
        status: 'approved',
        approvedAt: new Date()
      });
    }

    await createTimelineEvent(
      req.user._id,
      'appointment',
      'Consent Approved',
      `Approved medical records access consent for Dr. ${doctor.name}.`
    );

    return sendSuccess(res, 'Doctor access approved successfully', access);
  } catch (error) {
    console.error('grantDoctorAccess error:', error.message);
    return sendError(res, 'Server error granting doctor access', 500);
  }
};

/**
 * @desc    Revoke consent for a doctor
 * @route   DELETE /api/patient/doctors/:id
 * @access  Private
 */
export const revokeDoctorAccess = async (req, res) => {
  const { id } = req.params;

  try {
    const access = await DoctorAccess.findOne({ _id: id, patient: req.user._id }).populate('doctor', 'name');
    if (!access) {
      return sendError(res, 'Access record not found', 404);
    }

    access.status = 'revoked';
    access.revokedAt = new Date();
    await access.save();

    await createTimelineEvent(
      req.user._id,
      'appointment',
      'Consent Revoked',
      `Revoked medical records access consent for Dr. ${access.doctor?.name || 'Doctor'}.`
    );

    return sendSuccess(res, 'Doctor access revoked successfully', access);
  } catch (error) {
    console.error('revokeDoctorAccess error:', error.message);
    return sendError(res, 'Server error revoking doctor access', 500);
  }
};

/**
 * @desc    Upload an image file and return the Cloudinary URL
 * @route   POST /api/patient/upload
 * @access  Private
 */
export const uploadRecordImage = async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }

  try {
    let fileUrl = '';
    
    if (isConfigured) {
      try {
        // Upload buffer to Cloudinary
        fileUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'mediconnect_records' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary stream upload error:', error.message);
                return reject(error);
              }
              resolve(result.secure_url);
            }
          );
          stream.end(req.file.buffer);
        });
      } catch (uploadError) {
        console.warn('Cloudinary upload failed/restricted. Saving uploaded file to local /uploads directory...');
      }
    }

    if (!fileUrl) {
      // Save file locally to backend/uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const rawExt = path.extname(req.file.originalname) || '.png';
      const cleanExt = rawExt.toLowerCase();
      const filename = `record-${Date.now()}-${Math.round(Math.random() * 1e9)}${cleanExt}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }

    return sendSuccess(res, 'File uploaded successfully', { fileUrl });
  } catch (error) {
    console.error('Upload error:', error.message);
    return sendError(res, 'Server error uploading file', 500);
  }
};



/**
 * @desc    Delete a medical record
 * @route   DELETE /api/patient/records/:id
 * @access  Private
 */
export const deleteMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return sendError(res, 'Medical record not found', 404);
    }

    // Ensure the record belongs to the authenticated patient
    if (record.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to delete this record', 403);
    }

    // Optional: Delete from Cloudinary if configured and url is a cloudinary url
    if (isConfigured && record.fileUrl && record.fileUrl.includes('cloudinary.com')) {
      try {
        const parts = record.fileUrl.split('/');
        const folderIndex = parts.indexOf('mediconnect_records');
        if (folderIndex !== -1) {
          const publicIdWithExtension = parts.slice(folderIndex).join('/');
          const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudinaryError) {
        console.error('Failed to delete image from Cloudinary:', cloudinaryError.message);
      }
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);

    await createTimelineEvent(
      req.user._id,
      'medical_record',
      'Record Deleted',
      `Deleted medical record: "${record.title}".`
    );

    return sendSuccess(res, 'Medical record deleted successfully');
  } catch (error) {
    console.error('deleteMedicalRecord error:', error.message);
    return sendError(res, 'Server error deleting medical record', 500);
  }
};

/**
 * @desc    Analyze medical report with AI into plain, easy language
 * @route   POST /api/patient/analyze-report
 * @access  Private
 */
export const analyzeMedicalReport = async (req, res) => {
  const { reportText, recordId, reportTitle } = req.body;

  let textToAnalyze = reportText || '';

  try {
    // If a recordId is passed, load record notes and title from DB
    if (recordId) {
      const record = await MedicalRecord.findOne({ _id: recordId, patient: req.user._id });
      if (record) {
        textToAnalyze = `Title: ${record.title}\nCategory: ${record.category}\nNotes: ${record.notes}\n${reportText || ''}`;
      }
    }

    if (!textToAnalyze.trim()) {
      return sendError(res, 'Please provide report text or select a valid medical record to analyze', 400);
    }

    // Try Gemini API if GEMINI_API_KEY environment variable is set
//     if (process.env.GEMINI_API_KEY) {
//       try {
//         const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
//         const prompt = `You are an expert, empathetic medical communicator. Analyze the following medical report or lab text and explain EVERY SINGLE field, marker, or test parameter in VERY SIMPLE, generic layperson terms so a patient with zero medical background can understand.

// Report Content:
// """
// ${textToAnalyze}
// """

// Instructions:
// 1. Explain EVERY test parameter / field found in the text individually.
// 2. For each field, provide a clear 1-2 sentence definition ("what is this field/organ test"), what their specific result means ("what is happening in their body"), and a practical tip.
// 3. Use plain everyday language (no unexplained jargon).

// Return ONLY a valid JSON object matching this exact structure without markdown formatting:
// {
//   "simplifiedSummary": "2-3 clear sentences explaining in plain language overall what is happening in the patient's body.",
//   "overallStatus": "normal" | "attention" | "critical",
//   "statusHighlights": [
//     { "label": "Healthy Findings", "type": "normal", "message": "Clear summary of normal body functions" },
//     { "label": "Needs Attention", "type": "attention", "message": "Clear summary of elevated or abnormal findings" }
//   ],
//   "metricsBreakdown": [
//     {
//       "name": "Parameter Name (e.g. Hemoglobin, Fasting Blood Glucose, TSH, Total Cholesterol)",
//       "val": "Value found in report",
//       "range": "Standard normal reference range",
//       "status": "normal" | "high" | "low" | "attention",
//       "simpleDefinition": "What is this field? Explain in 1-2 simple sentences what this organ or body test checks.",
//       "simpleMeaning": "What does your result mean? Explain in simple terms what this specific value means for your health and body.",
//       "fieldTip": "Specific practical advice or lifestyle tip for this test field."
//     }
//   ],
//   "actionableAdvice": [
//     "Simple daily lifestyle / diet tip 1",
//     "Recommendation for doctor consultation"
//   ],
//   "disclaimer": "This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions."
// }`;

//         const geminiResponse = await fetch(geminiUrl, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             contents: [{ parts: [{ text: prompt }] }]
//           })
//         });

//         if (geminiResponse.ok) {
//           const geminiData = await geminiResponse.json();
//           const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
//           if (rawText) {
//             const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
//             const parsedAnalysis = JSON.parse(cleanJsonStr);
//             return sendSuccess(res, 'AI Medical Report Analysis complete', parsedAnalysis);
//           }
//         }
//       } catch (geminiError) {
//         console.warn('Gemini API call failed, falling back to built-in medical report engine:', geminiError.message);
//       }
//     }



// Local MediConnect AI Service
// Runs Qwen locally through our FastAPI inference server.
try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 125000);

  console.log("RAW REPORT LENGTH:", textToAnalyze?.length);
  console.log("RAW REPORT PREVIEW:", textToAnalyze?.slice(0, 500));

  const aiResponse = await fetch(
    'http://127.0.0.1:8000/analyze-report',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportText: textToAnalyze,
        reportTitle: reportTitle || 'Medical Report',
        recordId: recordId || null,
      }),
      signal: controller.signal
    }
  );
  clearTimeout(timeoutId);

  if (aiResponse.ok) {
    const analysis = await aiResponse.json();
    const extractedMetrics = analysis.metrics || analysis.metricsBreakdown || [];
    console.log("EXTRACTED METRICS COUNT:", extractedMetrics?.length);
    console.log("EXTRACTED METRICS:", extractedMetrics);

    extractedMetrics.forEach(m => {
      const v = m.val ?? m.value ?? 'N/A';
      const r = m.range ?? m.referenceRange ?? 'N/A';
      m.val = v;
      m.value = v;
      m.range = r;
      m.referenceRange = r;
    });

    if (analysis.metrics && !analysis.metricsBreakdown) {
      analysis.metricsBreakdown = analysis.metrics;
    }
    if (analysis.metricsBreakdown && !analysis.metrics) {
      analysis.metrics = analysis.metricsBreakdown;
    }

    if (analysis.statusHighlights && !Array.isArray(analysis.statusHighlights)) {
      const sh = analysis.statusHighlights;
      const critical = Array.isArray(sh.criticalFindings) ? sh.criticalFindings : (Array.isArray(sh.critical) ? sh.critical : []);
      const attention = Array.isArray(sh.attentionFindings) ? sh.attentionFindings : (Array.isArray(sh.attention) ? sh.attention : []);
      const healthy = Array.isArray(sh.healthyFindings) ? sh.healthyFindings : (Array.isArray(sh.healthy) ? sh.healthy : []);

      analysis.statusHighlightsList = [
        ...critical.map(c => ({ type: 'critical', label: 'CRITICAL CLINICAL FINDING', message: typeof c === 'string' ? c : (c.message || '') })),
        ...attention.map(a => ({ type: 'attention', label: 'Needs Attention', message: typeof a === 'string' ? a : (a.message || '') })),
        ...healthy.map(h => ({ type: 'normal', label: 'Healthy Finding', message: typeof h === 'string' ? h : (h.message || '') }))
      ];
    }

    return sendSuccess(
      res,
      'AI Medical Report Analysis complete',
      analysis
    );
  } else {
    const errJson = await aiResponse.json().catch(() => ({}));
    console.warn(
      'Local AI service returned non-200 status:',
      aiResponse.status,
      errJson.detail || errJson.message || ''
    );
  }
} catch (aiError) {
  console.warn(
    'Local AI service unavailable or timed out, using deterministic fallback engine:',
    aiError.message
  );
}

    // Built-in Intelligent Medical Report Rule & Parsing Engine
    const analysis = generateFallbackMedicalAnalysis(textToAnalyze, reportTitle);
    const fallbackMetrics = analysis.metrics || analysis.metricsBreakdown || [];
    console.log("EXTRACTED METRICS COUNT:", fallbackMetrics?.length);
    console.log("EXTRACTED METRICS:", fallbackMetrics);
    return sendSuccess(res, 'AI Medical Report Analysis complete', analysis);

  } catch (error) {
    console.error('analyzeMedicalReport error:', error.message);
    return sendError(res, 'Server error analyzing medical report', 500);
  }
};

/**
 * Built-in Intelligent Medical Report Rule & Translation Engine
 * Comprehensive section-aware and parameter-complete parser.
 */
export function generateFallbackMedicalAnalysis(text, title = '') {
  const lines = text.split ? text.split('\n') : [];

  // Section & Clinical Context Detection
  let currentSection = 'General Findings';
  const sections = {};
  sections[currentSection] = [];

  const clinicalNotes = [];
  const physicianImpression = [];
  const remarks = [];

  const sectionKeywords = [
    { pattern: /\b(complete\s+blood\s+count|cbc|haematology|hematology)\b/i, name: 'Complete Blood Count (CBC)' },
    { pattern: /\b(cardiac\s+markers|cardiac\s+panel)\b/i, name: 'Cardiac Markers' },
    { pattern: /\b(inflammatory\s+markers)\b/i, name: 'Inflammatory Markers' },
    { pattern: /\b(kidney\s+function|renal\s+function|kft|rft)\b/i, name: 'Kidney Function' },
    { pattern: /\b(liver\s+function|lft|hepatic\s+profile)\b/i, name: 'Liver Function' },
    { pattern: /\b(diabetes\s+profile|glycemic\s+profile)\b/i, name: 'Diabetes Profile' },
    { pattern: /\b(lipid\s+profile|lipid\s+panel)\b/i, name: 'Lipid Profile' },
    { pattern: /\b(arterial\s+blood\s+gas|abg)\b/i, name: 'Arterial Blood Gas (ABG)' },
    { pattern: /\b(urinalysis|urine\s+examination)\b/i, name: 'Urinalysis' },
    { pattern: /\b(vital\s+signs|vitals)\b/i, name: 'Vital Signs' },
    { pattern: /\b(clinical\s+notes|clinical\s+history)\b/i, name: 'Clinical Notes' },
    { pattern: /\b(physician\s+impression|impression|diagnosis)\b/i, name: 'Physician Impression' },
    { pattern: /\b(remarks|comments|conclusion)\b/i, name: 'Remarks' },
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let matchedSec = null;
    const cleanLine = line.replace(/[:\-_#*=]/g, '').trim();
    if (cleanLine.length < 80 && !/\d/.test(cleanLine)) {
      for (const item of sectionKeywords) {
        if (item.pattern.test(cleanLine)) {
          matchedSec = item.name;
          break;
        }
      }
    }

    if (matchedSec) {
      currentSection = matchedSec;
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    if (currentSection === 'Clinical Notes') clinicalNotes.push(line);
    else if (currentSection === 'Physician Impression') physicianImpression.push(line);
    else if (currentSection === 'Remarks') remarks.push(line);
    else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  // Parameter extraction
  const metrics = [];
  const healthyFindings = [];
  const attentionFindings = [];
  const criticalFindings = [];
  const seenKeys = new Set();

  let hasAbnormal = false;
  let hasCritical = false;

  for (const [secName, secLines] of Object.entries(sections)) {
    for (const line of secLines) {
      if (line.startsWith('---') || line.startsWith('===')) continue;

      let parts;
      const firstColon = line.indexOf(':');
      if (firstColon !== -1) {
        parts = [line.slice(0, firstColon), line.slice(firstColon + 1)];
      } else {
        parts = line.split(/[\t|]|\s{2,}/);
      }

      if (parts.length >= 2) {
        const namePart = parts[0].replace(/[*•#-]/g, '').trim();
        const valPart = parts[1].trim();

        if (namePart.length > 2 && namePart.length < 60 && (/\d/.test(valPart) || /(positive|negative|normal|high|low)/i.test(valPart))) {
          const key = `${secName}:${namePart.toLowerCase()}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          // Numeric extraction
          const cleanVal = valPart.replace(/,/g, '');
          const numMatch = cleanVal.match(/([0-9]+(?:\.[0-9]+)?)/);
          const numVal = numMatch ? parseFloat(numMatch[1]) : null;

          // Unit extraction
          const unitMatch = valPart.match(/([0-9.]+)\s*([a-zA-Z%/µuLmgdLmmolL]+)/);
          const unit = unitMatch ? unitMatch[2] : '';

          // Ref range extraction
          const refMatch = line.match(/(?:ref|reference|range)[\s:]*([^)\n]+)/i) || line.match(/\(([^)]+)\)/);
          const refRange = refMatch ? refMatch[1].replace(/^[;,\s]+|[;,\s]+$/g, '').trim() : 'N/A';

          // Clean display value by stripping out reference range annotations and status tags
          const cleanValPart = valPart
            .replace(/\((?:ref|reference|range)[\s:]*[^)]+\)/gi, '')
            .replace(/\[(?:high|low|normal|critical|attention)\]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          const displayVal = cleanValPart || valPart;

          // Status calculation
          let status = 'normal';
          const lineUpper = line.toUpperCase();
          if (line.match(/\[\s*(?:CRITICAL|PANIC)\s*\]/i) || lineUpper.includes('CRITICAL:')) {
            status = 'critical';
          } else if (line.match(/\[\s*(?:HIGH|ELEVATED)\s*\]/i)) {
            status = 'high';
          } else if (line.match(/\[\s*(?:LOW|DECREASED)\s*\]/i)) {
            status = 'low';
          } else if (line.match(/\[\s*(?:NORMAL|SAFE)\s*\]/i)) {
            status = 'normal';
          } else if (numVal !== null && refRange !== 'N/A') {
            const cleanRefRange = refRange.replace(/,/g, '');
            const rangeMatch = cleanRefRange.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|to)\s*([0-9]+(?:\.[0-9]+)?)/);
            if (rangeMatch) {
              const low = parseFloat(rangeMatch[1]);
              const high = parseFloat(rangeMatch[2]);
              if (numVal > high) status = 'high';
              else if (numVal < low) status = 'low';
              else status = 'normal';
            } else if (refRange.includes('<') || refRange.toLowerCase().includes('below')) {
              const highMatch = cleanRefRange.match(/([0-9]+(?:\.[0-9]+)?)/);
              if (highMatch && numVal >= parseFloat(highMatch[1])) status = 'high';
            } else if (refRange.includes('>') || refRange.toLowerCase().includes('above')) {
              const lowMatch = cleanRefRange.match(/([0-9]+(?:\.[0-9]+)?)/);
              if (lowMatch && numVal <= parseFloat(lowMatch[1])) status = 'low';
            }
          }

          // Plain-language medical dictionary for everyday understanding
          const getPlainLanguageExplanation = (paramName, stat, val, range, sec) => {
            const p = paramName.toLowerCase();

            // 1. Hemoglobin
            if (p.includes('hemoglobin') || p === 'hb') {
              return {
                def: 'Hemoglobin is the iron-rich protein in red blood cells that carries oxygen from your lungs to the rest of your body.',
                meaning: stat === 'normal'
                  ? 'Your hemoglobin level is healthy. Your body has plenty of oxygen-carrying power.'
                  : stat === 'low'
                  ? 'Your hemoglobin is lower than normal (Anemia). This can make you feel unusually tired, weak, pale, or short of breath.'
                  : 'Your hemoglobin is higher than normal. This can happen with dehydration or low oxygen environments.',
                tip: stat === 'normal'
                  ? 'Keep eating iron-rich foods like leafy greens, beans, and healthy proteins.'
                  : 'Eat iron-rich foods (spinach, lentils, beets) and ask your doctor if you need an iron supplement.'
              };
            }

            // 2. White Blood Cells (WBC)
            if (p.includes('white blood cell') || p.includes('wbc') || p.includes('leukocyte')) {
              return {
                def: 'White blood cells are your body’s immune soldiers. They defend you against bacteria, viruses, and infections.',
                meaning: stat === 'normal'
                  ? 'Your infection-fighting white blood cells are in a healthy, balanced range.'
                  : stat === 'high'
                  ? 'Your white blood cells are elevated. This usually means your body is actively fighting off an infection or inflammation (like a cold or sore throat).'
                  : 'Your white blood cells are lower than normal. Your immune system may be temporarily weakened.',
                tip: stat === 'high'
                  ? 'Get plenty of rest, drink warm fluids, and consult your doctor if you have fever or pain.'
                  : 'Rest well and wash hands frequently to protect against everyday germs.'
              };
            }

            // 3. Platelets
            if (p.includes('platelet')) {
              return {
                def: 'Platelets are tiny blood cells that stick together to stop bleeding when you get a cut or bruise.',
                meaning: stat === 'normal'
                  ? 'Your platelet count is normal. Your blood can clot safely when needed.'
                  : stat === 'low'
                  ? 'Platelet count is low. You might bruise or bleed more easily from minor cuts.'
                  : 'Platelet count is high. Blood may clot more quickly than usual.',
                tip: stat === 'normal'
                  ? 'Healthy platelet levels show good bone marrow function.'
                  : 'Avoid vigorous sports that cause deep bruising, and let your doctor know.'
              };
            }

            // 4. Red Blood Cells (RBC)
            if (p.includes('red blood cell') || p.includes('rbc') || p.includes('erythrocyte')) {
              return {
                def: 'Red blood cells are the delivery trucks in your blood that carry fresh oxygen to every organ.',
                meaning: stat === 'normal'
                  ? 'Healthy count of red blood cells delivering oxygen to your muscles and brain.'
                  : stat === 'low'
                  ? 'Lower count of red blood cells. You may feel low on energy or tire quickly.'
                  : 'Higher red blood cell count. Often seen with dehydration or living at high altitudes.',
                tip: 'Stay well hydrated and maintain a balanced diet with vitamin B12 and iron.'
              };
            }

            // 5. Blood Glucose / Sugar
            if (p.includes('glucose') || p.includes('sugar') || p.includes('glycemic')) {
              return {
                def: 'Blood glucose is the primary sugar your body uses for daily energy from the food you eat.',
                meaning: stat === 'normal'
                  ? 'Your blood sugar is balanced. Your body is processing food and energy smoothly.'
                  : stat === 'high'
                  ? 'Your blood sugar is higher than normal. This can put stress on blood vessels and is a sign of diabetes or pre-diabetes.'
                  : 'Your blood sugar is low. You may feel shaky, sweaty, dizzy, or hungry.',
                tip: stat === 'high'
                  ? 'Reduce sugary drinks, white bread, and sweets. Enjoy daily 20-minute walks after meals.'
                  : 'Keep a small healthy snack handy and consult your doctor.'
              };
            }

            // 6. HbA1c
            if (p.includes('hba1c') || p.includes('a1c')) {
              return {
                def: 'HbA1c shows your average blood sugar level over the past 2 to 3 months.',
                meaning: stat === 'normal'
                  ? 'Your 3-month sugar average is in the healthy safe zone (below 5.7%).'
                  : 'Your 3-month average sugar is elevated. This indicates diabetes or pre-diabetes.',
                tip: 'Work with your doctor on a healthy meal plan and take any prescribed sugar medicines regularly.'
              };
            }

            // 7. Cholesterol & Lipids
            if (p.includes('cholesterol') || p.includes('triglyceride') || p.includes('ldl') || p.includes('hdl')) {
              const isHdl = p.includes('hdl');
              return {
                def: isHdl
                  ? 'HDL is "Good" cholesterol. It helps clear excess fats out of your arteries back to the liver.'
                  : 'Cholesterol and triglycerides are fats in your blood needed for cells, but too much can clog arteries.',
                meaning: stat === 'normal'
                  ? 'Your blood fat levels look healthy and supportive of good heart health.'
                  : isHdl && stat === 'low'
                  ? 'Your "good" protective cholesterol is low. Higher HDL is better for your heart.'
                  : 'Blood fats are higher than ideal. Over time, extra fat can build up in heart vessels.',
                tip: 'Enjoy heart-healthy foods like oats, nuts, olive oil, and limit deep-fried snacks.'
              };
            }

            // 8. Creatinine & BUN (Kidney)
            if (p.includes('creatinine') || p.includes('bun') || p.includes('urea') || p.includes('egfr')) {
              return {
                def: 'These markers measure how well your two kidneys filter waste and excess water from your blood.',
                meaning: stat === 'normal'
                  ? 'Your kidneys are filtering waste effectively and keeping your body clean.'
                  : stat === 'critical' || stat === 'high'
                  ? 'Kidney waste markers are elevated. This means your kidneys are working extra hard or filtering more slowly.'
                  : 'Kidney filtration numbers are slightly low. Often related to muscle mass or hydration.',
                tip: 'Drink plenty of clean water daily, avoid excessive salt, and avoid taking unnecessary painkiller pills.'
              };
            }

            // 9. Liver Markers (ALT, AST, Bilirubin, ALP)
            if (p.includes('alt') || p.includes('ast') || p.includes('sgpt') || p.includes('sgot') || p.includes('bilirubin') || p.includes('alp')) {
              return {
                def: 'These are natural enzymes produced by your liver that help digest nutrients and process toxins.',
                meaning: stat === 'normal'
                  ? 'Your liver cells are healthy and processing nutrients normally.'
                  : 'Liver enzyme levels are elevated. This indicates your liver may be irritated, inflamed, or under stress.',
                tip: 'Avoid alcohol, limit fatty or overly processed foods, and check with your doctor.'
              };
            }

            // 10. Cardiac Markers (Troponin, CK-MB)
            if (p.includes('troponin') || p.includes('ck-mb') || p.includes('cardiac')) {
              return {
                def: 'Cardiac markers are special proteins released into the bloodstream when the heart muscle is stressed or injured.',
                meaning: stat === 'normal'
                  ? 'Heart muscle markers are safe and normal. No acute heart muscle stress detected.'
                  : 'Cardiac markers are elevated. This is an urgent sign that your heart muscle needs medical attention immediately.',
                tip: 'If you have chest tightness, arm pain, or breathlessness, seek immediate medical care.'
              };
            }

            // 11. Inflammatory Markers (CRP, ESR)
            if (p.includes('crp') || p.includes('c-reactive') || p.includes('esr')) {
              return {
                def: 'These markers indicate whether there is swelling, irritation, or infection anywhere in your body.',
                meaning: stat === 'normal'
                  ? 'No unusual inflammation or swelling detected in your system.'
                  : 'Inflammation markers are elevated. Your body is fighting an active infection or experiencing joint/tissue swelling.',
                tip: 'Rest, hydrate, and discuss possible causes with your doctor.'
              };
            }

            // 12. Blood Pressure & Heart Rate
            if (p.includes('blood pressure') || p.includes('systolic') || p.includes('diastolic') || p.includes('heart rate') || p.includes('pulse') || p.includes('spo2')) {
              return {
                def: 'Vitals measure the heartbeat, blood flow pressure, and oxygen levels keeping you energized.',
                meaning: stat === 'normal'
                  ? 'Your vital signs are in a healthy, comfortable range.'
                  : 'Vital readings are outside the standard range. May indicate stress, dehydration, or cardiovascular strain.',
                tip: 'Sit calmly, breathe slowly, and check your vitals again in 15 minutes.'
              };
            }

            // Default generic fallback
            return {
              def: `${paramName} is a diagnostic test parameter measured in the ${sec} panel.`,
              meaning: stat === 'normal'
                ? `Your ${paramName} level (${val}) is within the healthy, expected range.`
                : `Your ${paramName} level (${val}) is ${stat} compared to standard reference bounds (${range}).`,
              tip: stat === 'normal'
                ? 'Continue maintaining a balanced daily routine and healthy nutrition.'
                : 'Discuss this reading with your doctor to see if any simple lifestyle adjustment is recommended.'
            };
          };

          const explanation = getPlainLanguageExplanation(namePart, status, displayVal, refRange, secName);

          if (status === 'critical') {
            hasCritical = true;
            hasAbnormal = true;
            criticalFindings.push(`Attention Needed: ${namePart} is ${displayVal} (Normal is ${refRange})`);
          } else if (status === 'high' || status === 'low' || status === 'attention') {
            hasAbnormal = true;
            attentionFindings.push(`${namePart} is ${displayVal} (${status === 'high' ? 'High' : 'Low'}) - Normal is ${refRange}`);
          } else {
            healthyFindings.push(`${namePart} is ${displayVal} (Healthy & Normal)`);
          }

          metrics.push({
            section: secName,
            name: namePart,
            value: displayVal,
            val: displayVal,
            numericValue: numVal,
            unit: unit,
            referenceRange: refRange,
            range: refRange,
            status: status,
            simpleDefinition: explanation.def,
            simpleMeaning: explanation.meaning,
            fieldTip: explanation.tip
          });
        }
      }
    }
  }

  if (metrics.length === 0) {
    return {
      simplifiedSummary: 'We could not detect any readable test numbers in the text provided. Please make sure the report text contains test names and values.',
      overallStatus: 'attention',
      statusHighlights: {
        healthyFindings: [],
        attentionFindings: ['No lab test parameters found in the text.'],
        criticalFindings: []
      },
      sections: [],
      metricsBreakdown: [],
      metrics: [],
      clinicalContext: {
        clinicalNotes,
        physicianImpression: physicianImpression.join(' '),
        remarks
      },
      actionableAdvice: ['Upload a clear photo of your lab test or paste the test names and numbers.'],
      disclaimer: 'This AI report explainer translates complex medical numbers into plain everyday language. Always consult your doctor for medical advice and prescriptions.',
      analysisCoverage: {
        extractedMetrics: 0,
        explainedMetrics: 0,
        complete: false
      },
      analysisWarning: 'No medical parameters could be extracted from this report.'
    };
  }

  // Section grouping
  const sectionsMap = {};
  for (const m of metrics) {
    if (!sectionsMap[m.section]) sectionsMap[m.section] = [];
    sectionsMap[m.section].push(m);
  }
  const sectionsList = Object.entries(sectionsMap).map(([sectionName, secMetrics]) => ({
    sectionName,
    metrics: secMetrics
  }));

  const overallStatus = hasCritical ? 'critical' : (hasAbnormal ? 'attention' : 'normal');

  const summary = hasCritical
    ? 'Your report has a few important numbers (such as cardiac, kidney, or inflammation markers) that need prompt attention. We strongly recommend sharing this report with your doctor as soon as possible.'
    : (hasAbnormal
      ? 'Most of your body readings are doing well, but a few numbers (such as blood sugar, cholesterol, or blood count) are slightly outside normal ranges. Simple dietary changes and a quick chat with your doctor will help get them back on track.'
      : `Great news! All ${metrics.length} test parameters in this report are in the safe, healthy normal range.`);

  const statusHighlightsList = [
    ...criticalFindings.map(c => ({ type: 'critical', label: 'Doctor Review Advised', message: typeof c === 'string' ? c : (c.message || '') })),
    ...attentionFindings.map(a => ({ type: 'attention', label: 'Keep An Eye On This', message: typeof a === 'string' ? a : (a.message || '') })),
    ...healthyFindings.map(h => ({ type: 'normal', label: 'Healthy & Normal', message: typeof h === 'string' ? h : (h.message || '') }))
  ];

  return {
    simplifiedSummary: summary,
    overallStatus: overallStatus,
    statusHighlights: {
      healthyFindings,
      attentionFindings,
      criticalFindings
    },
    statusHighlightsList,
    sections: sectionsList,
    metricsBreakdown: metrics,
    metrics: metrics,
    clinicalContext: {
      clinicalNotes: clinicalNotes,
      physicianImpression: physicianImpression.join(' '),
      remarks: remarks
    },
    actionableAdvice: [
      'Review all findings with your treating physician.',
      'Maintain regular hydration, balanced nutrition, and prescribed medication.'
    ],
    disclaimer: 'This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions.',
    analysisCoverage: {
      extractedMetrics: metrics.length,
      explainedMetrics: metrics.length,
      complete: true
    }
  };
}

/**
 * @desc    Get patient emergency access configuration and preview data
 * @route   GET /api/patient/emergency
 * @access  Private (Patient)
 */
export const getEmergencySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const [healthProfile, medications] = await Promise.all([
      HealthProfile.findOne({ patient: req.user._id }),
      Medication.find({ patient: req.user._id, status: 'active' }).select('name dosage frequency instructions')
    ]);

    const activeConditions = healthProfile?.conditions?.filter(c => c.status === 'active') || [];

    const defaultSettings = {
      bloodGroup: true,
      allergies: true,
      medications: true,
      conditions: true,
      emergencyContact: true,
      criticalNotes: false,
    };

    const emergencyAccess = user.emergencyAccess || {
      enabled: false,
      token: null,
      tokenExpiresAt: null,
      settings: defaultSettings,
      emergencyContact: { name: '', phone: '', relation: '' },
      criticalNotes: '',
    };

    return sendSuccess(res, 'Emergency settings retrieved successfully', {
      enabled: Boolean(emergencyAccess.enabled),
      token: emergencyAccess.token || null,
      tokenExpiresAt: emergencyAccess.tokenExpiresAt || null,
      settings: emergencyAccess.settings ? { ...defaultSettings, ...emergencyAccess.settings.toObject?.() || emergencyAccess.settings } : defaultSettings,
      emergencyContact: emergencyAccess.emergencyContact || { name: '', phone: '', relation: '' },
      criticalNotes: emergencyAccess.criticalNotes || '',
      patientData: {
        name: user.name,
        bloodGroup: user.profile?.bloodGroup || '',
        allergies: user.profile?.allergies || [],
        medications: medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`),
        conditions: activeConditions.map(c => c.name),
        emergencyContact: emergencyAccess.emergencyContact || { name: '', phone: '', relation: '' },
        criticalNotes: emergencyAccess.criticalNotes || '',
      }
    });
  } catch (error) {
    console.error('getEmergencySettings error:', error.message);
    return sendError(res, 'Server error retrieving emergency settings', 500);
  }
};

/**
 * @desc    Update patient emergency access configuration and contact
 * @route   POST /api/patient/emergency
 * @access  Private (Patient)
 */
export const updateEmergencySettings = async (req, res) => {
  const { enabled, settings, emergencyContact, criticalNotes } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (!user.emergencyAccess) {
      user.emergencyAccess = {
        enabled: false,
        token: null,
        tokenExpiresAt: null,
        settings: {
          bloodGroup: true,
          allergies: true,
          medications: true,
          conditions: true,
          emergencyContact: true,
          criticalNotes: false,
        },
        emergencyContact: { name: '', phone: '', relation: '' },
        criticalNotes: '',
      };
    }

    if (typeof enabled === 'boolean') {
      user.emergencyAccess.enabled = enabled;
      // If enabling and token doesn't exist or is expired, generate one
      if (enabled && (!user.emergencyAccess.token || (user.emergencyAccess.tokenExpiresAt && new Date(user.emergencyAccess.tokenExpiresAt) < new Date()))) {
        user.emergencyAccess.token = 'mc_emg_' + crypto.randomBytes(24).toString('hex');
        user.emergencyAccess.tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days validity
      }
    }

    if (settings && typeof settings === 'object') {
      user.emergencyAccess.settings = {
        bloodGroup: Boolean(settings.bloodGroup),
        allergies: Boolean(settings.allergies),
        medications: Boolean(settings.medications),
        conditions: Boolean(settings.conditions),
        emergencyContact: Boolean(settings.emergencyContact),
        criticalNotes: Boolean(settings.criticalNotes),
      };
    }

    if (emergencyContact && typeof emergencyContact === 'object') {
      user.emergencyAccess.emergencyContact = {
        name: typeof emergencyContact.name === 'string' ? emergencyContact.name.trim() : user.emergencyAccess.emergencyContact?.name || '',
        phone: typeof emergencyContact.phone === 'string' ? emergencyContact.phone.trim() : user.emergencyAccess.emergencyContact?.phone || '',
        relation: typeof emergencyContact.relation === 'string' ? emergencyContact.relation.trim() : user.emergencyAccess.emergencyContact?.relation || '',
      };
    }

    if (typeof criticalNotes === 'string') {
      user.emergencyAccess.criticalNotes = criticalNotes.trim();
    }

    await user.save();

    await createTimelineEvent(
      req.user._id,
      'condition',
      'Emergency Settings Updated',
      user.emergencyAccess.enabled
        ? 'Emergency Medical QR profile updated and sharing enabled.'
        : 'Emergency Medical QR profile sharing disabled.'
    );

    return sendSuccess(res, 'Emergency settings updated successfully', {
      enabled: user.emergencyAccess.enabled,
      token: user.emergencyAccess.token,
      tokenExpiresAt: user.emergencyAccess.tokenExpiresAt,
      settings: user.emergencyAccess.settings,
      emergencyContact: user.emergencyAccess.emergencyContact,
      criticalNotes: user.emergencyAccess.criticalNotes,
    });
  } catch (error) {
    console.error('updateEmergencySettings error:', error.message);
    return sendError(res, 'Server error updating emergency settings', 500);
  }
};

/**
 * @desc    Regenerate emergency access token (immediately revokes old token)
 * @route   POST /api/patient/emergency/regenerate
 * @access  Private (Patient)
 */
export const regenerateEmergencyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (!user.emergencyAccess) {
      user.emergencyAccess = {};
    }

    const newToken = 'mc_emg_' + crypto.randomBytes(24).toString('hex');
    user.emergencyAccess.token = newToken;
    user.emergencyAccess.tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days validity
    user.emergencyAccess.enabled = true; // Automatically active

    await user.save();

    await createTimelineEvent(
      req.user._id,
      'condition',
      'Emergency QR Code Regenerated',
      'A new Emergency Medical QR token was generated. Any previously printed or shared QR codes are now revoked.'
    );

    return sendSuccess(res, 'Emergency QR regenerated successfully', {
      token: user.emergencyAccess.token,
      tokenExpiresAt: user.emergencyAccess.tokenExpiresAt,
      enabled: user.emergencyAccess.enabled,
    });
  } catch (error) {
    console.error('regenerateEmergencyToken error:', error.message);
    return sendError(res, 'Server error regenerating emergency QR token', 500);
  }
};

/**
 * @desc    Retrieve patient's emergency medical profile via secure token
 * @route   GET /api/patient/emergency-view/:token
 * @access  Private (Authorized Doctor or the Patient owner)
 */
export const getEmergencyProfileByToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return sendError(res, 'Emergency token is required', 400);
  }

  try {
    const patient = await User.findOne({ 'emergencyAccess.token': token });

    if (!patient) {
      return sendError(res, 'Emergency profile not found or invalid token', 404);
    }

    // 1. Verify emergency access is enabled
    if (!patient.emergencyAccess?.enabled) {
      return sendError(res, 'Emergency medical profile sharing has been disabled by the patient', 403);
    }

    // 2. Check token expiration
    if (patient.emergencyAccess?.tokenExpiresAt && new Date(patient.emergencyAccess.tokenExpiresAt) < new Date()) {
      return sendError(res, 'This Emergency QR code has expired. Please ask the patient for an updated QR code.', 403);
    }

    // 3. Authorization verification: Doctor role OR the patient owner themselves
    const isOwner = req.user._id.toString() === patient._id.toString();
    const isDoctor = req.user.role === 'doctor';

    if (!isOwner && !isDoctor) {
      return sendError(
        res,
        'Access denied. Only licensed medical doctors or the patient can access this emergency medical profile.',
        403
      );
    }

    // 4. Fetch medical data
    const [healthProfile, medications] = await Promise.all([
      HealthProfile.findOne({ patient: patient._id }),
      Medication.find({ patient: patient._id, status: 'active' }).select('name dosage frequency instructions')
    ]);

    const activeConditions = healthProfile?.conditions?.filter(c => c.status === 'active') || [];
    const settings = patient.emergencyAccess.settings || {};

    // 5. Build response containing ONLY explicitly enabled fields
    const emergencyProfileData = {
      patientName: patient.name,
      settings: {
        bloodGroup: Boolean(settings.bloodGroup),
        allergies: Boolean(settings.allergies),
        medications: Boolean(settings.medications),
        conditions: Boolean(settings.conditions),
        emergencyContact: Boolean(settings.emergencyContact),
        criticalNotes: Boolean(settings.criticalNotes),
      },
      patientData: {
        name: patient.name,
        bloodGroup: settings.bloodGroup ? (patient.profile?.bloodGroup || '') : undefined,
        allergies: settings.allergies ? (patient.profile?.allergies || []) : undefined,
        medications: settings.medications ? medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`) : undefined,
        conditions: settings.conditions ? activeConditions.map(c => c.name) : undefined,
        emergencyContact: settings.emergencyContact ? (patient.emergencyAccess.emergencyContact || { name: '', phone: '', relation: '' }) : undefined,
        criticalNotes: settings.criticalNotes ? (patient.emergencyAccess.criticalNotes || '') : undefined,
      },
      updatedAt: patient.updatedAt,
      tokenExpiresAt: patient.emergencyAccess.tokenExpiresAt,
      viewer: {
        role: req.user.role,
        name: req.user.name,
      }
    };

    // 6. If accessed by a doctor, log timeline audit event and notify patient
    if (isDoctor && !isOwner) {
      await createTimelineEvent(
        patient._id,
        'condition',
        'Emergency Profile Accessed',
        `Emergency medical profile was accessed via QR by Dr. ${req.user.name}.`
      );

      try {
        await Notification.create({
          recipient: patient._id,
          type: 'warning',
          message: `Dr. ${req.user.name} accessed your Emergency Medical profile via Emergency QR.`
        });
      } catch (err) {
        console.error('Failed to create emergency access notification:', err.message);
      }
    }

    return sendSuccess(res, 'Emergency medical profile retrieved successfully', emergencyProfileData);
  } catch (error) {
    console.error('getEmergencyProfileByToken error:', error.message);
    return sendError(res, 'Server error retrieving emergency profile', 500);
  }
};

/**
 * Helper to normalize lab parameter name for matching across multiple reports
 */
function normalizeParamName(name) {
  if (!name) return '';
  const clean = name.toLowerCase().replace(/[*•#\-()]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Ignore non-biomarker header metadata
  const ignoredMetadata = /^(date|time|patient|patient name|patient clinical history|name|age|gender|sex|doctor|physician|hospital|clinic|specimen|collected|reported|sample id|barcode|status|ref|reference|notes)$/i;
  if (ignoredMetadata.test(clean)) return '';

  if (/^(hgb|hb|hemoglobin)/i.test(clean)) return 'hemoglobin';
  if (/^(wbc|white blood cells?|total leukocyte count|tlc)/i.test(clean)) return 'wbc';
  if (/^(rbc|red blood cells?|erythrocyte count)/i.test(clean)) return 'rbc';
  if (/^(plt|platelet count|platelets)/i.test(clean)) return 'platelets';
  if (/^(hba1c|glycated hemoglobin|hemoglobin a1c)/i.test(clean)) return 'hba1c';
  if (/^(fasting blood glucose|fasting blood sugar|fbs|glucose fasting)/i.test(clean)) return 'fasting_glucose';
  if (/^(random blood glucose|random blood sugar|rbs|glucose random)/i.test(clean)) return 'random_glucose';
  if (/^(total cholesterol|cholesterol total)/i.test(clean)) return 'total_cholesterol';
  if (/^(ldl|ldl cholesterol)/i.test(clean)) return 'ldl_cholesterol';
  if (/^(hdl|hdl cholesterol)/i.test(clean)) return 'hdl_cholesterol';
  if (/^(triglycerides|tg)/i.test(clean)) return 'triglycerides';
  if (/^(serum creatinine|creatinine)/i.test(clean)) return 'creatinine';
  if (/^(blood urea nitrogen|bun)/i.test(clean)) return 'bun';
  if (/^(egfr|gfr)/i.test(clean)) return 'egfr';
  if (/^(sgpt|alt)/i.test(clean)) return 'alt';
  if (/^(sgot|ast)/i.test(clean)) return 'ast';
  if (/^(crp|c-reactive protein)/i.test(clean)) return 'crp';
  if (/^(esr|erythrocyte sedimentation rate)/i.test(clean)) return 'esr';
  if (/^(tsh|thyroid stimulating hormone)/i.test(clean)) return 'tsh';
  if (/^(systolic|systolic blood pressure|sbp)/i.test(clean)) return 'systolic_bp';
  if (/^(diastolic|diastolic blood pressure|dbp)/i.test(clean)) return 'diastolic_bp';
  if (/^(heart rate|pulse|pulse rate)/i.test(clean)) return 'heart_rate';
  if (/^(spo2|oxygen saturation)/i.test(clean)) return 'spo2';

  return clean;
}

/**
 * Helper to evaluate trajectory between 2 metric measurements
 */
function evaluateParameterTrajectory(m1, m2) {
  const n1 = m1.numericValue;
  const n2 = m2.numericValue;
  const s1 = m1.status || 'normal';
  const s2 = m2.status || 'normal';

  let delta = null;
  let percentChange = null;
  if (n1 !== null && n2 !== null && !isNaN(n1) && !isNaN(n2)) {
    delta = +(n2 - n1).toFixed(2);
    if (n1 !== 0) {
      percentChange = +(((n2 - n1) / Math.abs(n1)) * 100).toFixed(1);
    }
  }

  let trajectory = 'stable';
  let message = '';

  // Case 1: Status moved from abnormal to normal -> Improvement!
  if (s1 !== 'normal' && s2 === 'normal') {
    trajectory = 'improved';
    message = `Normalized into safe reference bounds (${m2.range || 'Normal'}). Excellent health progress.`;
  }
  // Case 2: Status moved from normal to abnormal -> Regression / Needs attention!
  else if (s1 === 'normal' && s2 !== 'normal') {
    trajectory = 'worsened';
    message = `Shifted from normal bounds to ${s2.toUpperCase()}. Consult your physician.`;
  }
  // Case 3: Critical in report 1, but downgraded to high/low/normal -> Improvement!
  else if (s1 === 'critical' && s2 !== 'critical') {
    trajectory = 'improved';
    message = `Decreased from critical risk level to ${s2.toUpperCase()}. Positive clinical trend.`;
  }
  // Case 4: Moved into critical in report 2 -> Serious worsening!
  else if (s2 === 'critical' && s1 !== 'critical') {
    trajectory = 'worsened';
    message = `Elevated into CRITICAL range. Urgent medical consultation advised.`;
  }
  // Case 5: Both abnormal (both high)
  else if (s1 === 'high' && s2 === 'high') {
    if (delta !== null && delta < 0) {
      trajectory = 'improved';
      message = `Decreased by ${Math.abs(delta)} (${Math.abs(percentChange)}%), trending downward toward normal.`;
    } else if (delta !== null && delta > 0) {
      trajectory = 'worsened';
      message = `Increased further by +${delta} (${percentChange}%), moving further away from normal limits.`;
    } else {
      trajectory = 'stable';
      message = `Remains elevated at ${m2.val}, showing no significant change.`;
    }
  }
  // Case 6: Both abnormal (both low)
  else if (s1 === 'low' && s2 === 'low') {
    if (delta !== null && delta > 0) {
      trajectory = 'improved';
      message = `Increased by +${delta} (${percentChange}%), rising toward safe normal bounds.`;
    } else if (delta !== null && delta < 0) {
      trajectory = 'worsened';
      message = `Decreased further by ${delta} (${percentChange}%), moving lower than previous baseline.`;
    } else {
      trajectory = 'stable';
      message = `Remains below reference bounds at ${m2.val}.`;
    }
  }
  // Case 7: Both normal
  else if (s1 === 'normal' && s2 === 'normal') {
    trajectory = 'stable_normal';
    message = `Consistently maintained within healthy reference limits.`;
  } else {
    trajectory = 'stable';
    message = `Parameter tracked across both test points.`;
  }

  return {
    trajectory,
    delta,
    percentChange,
    message
  };
}

/**
 * @desc    Compare 2 medical reports over time to understand improvements or regressions
 * @route   POST /api/patient/compare-reports
 * @access  Private (Patient / Doctor)
 */
export const compareMedicalReports = async (req, res) => {
  const { report1, report2 } = req.body;

  if (!report1 || !report2) {
    return sendError(res, 'Please provide both reports (Report 1 baseline and Report 2 follow-up) to compare.', 400);
  }

  try {
    let text1 = report1.text || '';
    let title1 = report1.title || 'Baseline Report (Report 1)';
    let date1 = report1.date || 'Earlier Date';

    let text2 = report2.text || '';
    let title2 = report2.title || 'Follow-up Report (Report 2)';
    let date2 = report2.date || 'Later Date';

    // If report1 recordId is provided, pull from DB
    if (report1.recordId) {
      const rec1 = await MedicalRecord.findOne({ _id: report1.recordId, patient: req.user._id });
      if (rec1) {
        title1 = rec1.title;
        date1 = rec1.recordDate ? new Date(rec1.recordDate).toLocaleDateString() : date1;
        text1 = `Title: ${rec1.title}\nCategory: ${rec1.category}\nNotes: ${rec1.notes}\n${text1}`;
      }
    }

    // If report2 recordId is provided, pull from DB
    if (report2.recordId) {
      const rec2 = await MedicalRecord.findOne({ _id: report2.recordId, patient: req.user._id });
      if (rec2) {
        title2 = rec2.title;
        date2 = rec2.recordDate ? new Date(rec2.recordDate).toLocaleDateString() : date2;
        text2 = `Title: ${rec2.title}\nCategory: ${rec2.category}\nNotes: ${rec2.notes}\n${text2}`;
      }
    }

    if (!text1.trim() || !text2.trim()) {
      return sendError(res, 'Both reports must contain readable diagnostic text or valid medical records.', 400);
    }

    // Run clinical metric extraction for both reports
    const analysis1 = generateFallbackMedicalAnalysis(text1, title1);
    const analysis2 = generateFallbackMedicalAnalysis(text2, title2);

    const metrics1 = analysis1.metrics || analysis1.metricsBreakdown || [];
    const metrics2 = analysis2.metrics || analysis2.metricsBreakdown || [];

    // Build map for report 1 metrics
    const map1 = new Map();
    metrics1.forEach(m => {
      const norm = normalizeParamName(m.name);
      if (norm) map1.set(norm, m);
    });

    // Match parameters between reports
    const matchedParams = [];
    const seenNorms = new Set();

    metrics2.forEach(m2 => {
      const norm = normalizeParamName(m2.name);
      if (map1.has(norm)) {
        const m1 = map1.get(norm);
        seenNorms.add(norm);

        const evaluation = evaluateParameterTrajectory(m1, m2);

        matchedParams.push({
          name: m2.name,
          normalizedName: norm,
          section: m2.section || m1.section || 'General',
          report1: {
            val: m1.val,
            value: m1.value,
            numericValue: m1.numericValue,
            status: m1.status,
            range: m1.range,
            date: date1
          },
          report2: {
            val: m2.val,
            value: m2.value,
            numericValue: m2.numericValue,
            status: m2.status,
            range: m2.range,
            date: date2
          },
          delta: evaluation.delta,
          percentChange: evaluation.percentChange,
          trajectory: evaluation.trajectory, // 'improved', 'worsened', 'stable_normal', 'stable'
          clinicalInsight: evaluation.message,
          simpleDefinition: m2.simpleDefinition || m1.simpleDefinition || `${m2.name} laboratory test.`
        });
      }
    });

    // Unmatched metrics
    const uniqueToReport1 = metrics1.filter(m => !seenNorms.has(normalizeParamName(m.name)));
    const uniqueToReport2 = metrics2.filter(m => !seenNorms.has(normalizeParamName(m.name)));

    // Categorize matched parameters
    const improvements = matchedParams.filter(p => p.trajectory === 'improved');
    const regressions = matchedParams.filter(p => p.trajectory === 'worsened');
    const stable = matchedParams.filter(p => p.trajectory === 'stable_normal' || p.trajectory === 'stable');

    // Overall trajectory assessment
    let overallBadge = 'stable_health';
    let overallStatusText = 'Stable Clinical Trajectory';
    let summarySentence = '';

    if (improvements.length > regressions.length) {
      overallBadge = 'positive_progress';
      overallStatusText = 'Positive Health Improvement';
      summarySentence = `Comparing ${title1} to ${title2} demonstrates measurable clinical improvement across ${improvements.length} parameter${improvements.length > 1 ? 's' : ''}.`;
    } else if (regressions.length > improvements.length) {
      overallBadge = 'needs_attention';
      overallStatusText = 'Attention Required / Regressed Trends';
      summarySentence = `Comparison reveals ${regressions.length} parameter${regressions.length > 1 ? 's' : ''} have shifted outside normal bounds or elevated from baseline, warranting physician follow-up.`;
    } else {
      overallBadge = 'stable_health';
      overallStatusText = 'Stable Parameters';
      summarySentence = `Parameters across both reports remain largely consistent and stable compared to your earlier baseline.`;
    }

    const advice = [];
    if (improvements.length > 0) {
      advice.push(`Maintain the lifestyle, dietary, or medication regimens that supported improvement in ${improvements.map(i => i.name).slice(0, 3).join(', ')}.`);
    }
    if (regressions.length > 0) {
      advice.push(`Schedule a clinical consult with your attending doctor to discuss elevated or shifting parameters: ${regressions.map(r => r.name).slice(0, 3).join(', ')}.`);
    }
    advice.push('Bring both reports and this comparison timeline to your next medical consultation.');

    const comparisonResult = {
      report1Meta: { title: title1, date: date1, overallStatus: analysis1.overallStatus, metricsCount: metrics1.length },
      report2Meta: { title: title2, date: date2, overallStatus: analysis2.overallStatus, metricsCount: metrics2.length },
      matchedCount: matchedParams.length,
      stats: {
        improvedCount: improvements.length,
        worsenedCount: regressions.length,
        stableCount: stable.length,
        totalCompared: matchedParams.length
      },
      overallBadge,
      overallStatusText,
      summary: summarySentence,
      matchedParameters: matchedParams,
      improvements,
      regressions,
      stable,
      uniqueToReport1,
      uniqueToReport2,
      actionableAdvice: advice,
      disclaimer: 'This comparison analysis tracks relative differences between diagnostic reports to support patient awareness and is not a definitive clinical diagnosis. Always consult a qualified physician for treatment decisions.'
    };

    return sendSuccess(res, 'Report comparison completed successfully', comparisonResult);

  } catch (error) {
    console.error('compareMedicalReports error:', error.message);
    return sendError(res, 'Server error comparing medical reports', 500);
  }
};

/**
 * Multi-Turn Conversational Clinical Emergency Engine
 * Deeply personalized to patient medical history (allergies, medications, chronic conditions, blood group)
 */
async function callGeminiEmergencyAssistant(message, patientContext, history = []) {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const contactStr = patientContext.emergencyContact?.name
      ? `${patientContext.emergencyContact.name} (${patientContext.emergencyContact.relation || 'Contact'}, ${patientContext.emergencyContact.phone})`
      : 'None designated';

    const systemPrompt = `You are MediConnect Emergency AI Assistant, a compassionate, highly trained clinical emergency physician conversing in real-time with patient ${patientContext.name}.

PATIENT MEDICAL RECORD ON FILE:
- Patient Name: ${patientContext.name}
- Blood Group: ${patientContext.bloodGroup || 'Not specified'}
- Documented Allergies: ${patientContext.allergies?.length ? patientContext.allergies.join(', ') : 'None documented'}
- Active Chronic Conditions: ${patientContext.conditions?.length ? patientContext.conditions.join(', ') : 'None documented'}
- Active Prescriptions / Medications: ${patientContext.activeMedications?.length ? patientContext.activeMedications.join('; ') : 'None documented'}
- Recent Lab & Clinical History: ${patientContext.recentHistory?.length ? patientContext.recentHistory.join('; ') : 'None documented'}
- Emergency Contact: ${contactStr}
- Critical Health Notes: ${patientContext.criticalNotes || 'None'}

CRITICAL INSTRUCTIONS:
1. Address ${patientContext.name} directly, empathetically, and conversationally.
2. YOU MUST ACTIVELY CROSS-REFERENCE THEIR EXACT MEDICAL HISTORY:
   - If they have documented allergies (e.g. Aspirin, Penicillin, NSAIDs), ALWAYS check proposed first-aid medications against this list and warn explicitly against allergens!
   - If they are on blood thinners, insulin, inhalers, or cardiac drugs, explicitly weave those specific medications and their dosages into your advice.
   - If they have chronic conditions (e.g. Diabetes, Asthma, CAD, Hypertension), correlate their acute symptoms with those conditions.
3. BE TRULY CONVERSATIONAL AND INTERACTIVE:
   - If the user asks a follow-up question (e.g. "Can I drink water?", "Should I lie down or sit up?", "My pulse is 120", "My emergency contact is not picking up"), DIRECTLY ANSWER THEIR EXACT QUESTION FIRST with clear medical reasoning, and then provide the next immediate safe action.
   - Do NOT produce a rigid, identical static template every time. Adapt to what the patient is actually asking right now.
4. For acute life-threatening situations, prioritize calling 911 / 112 / 999, instruct them on immediate stabilization, what NOT to do, and provide a 20-second summary for arriving paramedics.
5. Use clean GitHub-flavored markdown with bolding and bullet points.`;

    // Format previous messages for Gemini
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      // Limit to last 6 messages for context efficiency
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (!h.text) continue;
        contents.push({
          role: h.sender === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText && rawText.trim()) {
        return rawText.trim();
      }
    }
  } catch (err) {
    console.warn('Gemini emergency call failed, falling back to built-in conversational clinical engine:', err.message);
  }

  return null;
}

/**
 * Built-in Conversational Emergency Clinical Dialogue Engine
 * Generates dynamic, multi-turn conversational responses tailored to the patient's exact history
 */
function generateEmergencyFirstAidResponse(message, patientContext, history = []) {
  const text = (message || '').toLowerCase().trim();
  const patientName = patientContext.name || 'Patient';

  // Helper check for patient conditions / allergies / meds
  const hasAllergy = (regex) => (patientContext.allergies || []).some(a => regex.test(a));
  const matchingMeds = (regex) => (patientContext.activeMedications || []).filter(m => regex.test(m));
  const matchingConditions = (regex) => (patientContext.conditions || []).filter(c => regex.test(c));

  const hasAspirinAllergy = hasAllergy(/aspirin|nsaid|salicylate|ibuprofen/i);
  const onBloodThinners = matchingMeds(/warfarin|eliquis|xarelto|clopidogrel|plavix|heparin|aspirin/i);
  const onDiabetesMeds = matchingMeds(/insulin|metformin|glipizide|glimepiride|januvia|jardiance/i);
  const onAsthmaMeds = matchingMeds(/albuterol|salbutamol|inhaler|budesonide|fluticasone|formoterol|montelukast/i);
  const onCardiacMeds = matchingMeds(/amlodipine|losartan|metoprolol|atenolol|lisinopril|nitro|nitroglycerin/i);

  // Check if this is an ongoing dialogue (history contains prior messages)
  const isOngoingChat = Array.isArray(history) && history.length > 1;

  // Detect conversation intent
  const isMedicationQuestion = /can\s*i\s*take|painkiller|aspirin|paracetamol|tylenol|ibuprofen|advil|medicine|pill|tablet|medication/i.test(text);
  const isHydrationQuestion = /drink\s*water|water|thirsty|drink|eat|food|juice|tea|coffee/i.test(text);
  const isPositionQuestion = /lie\s*down|sit\s*up|position|sleep|lie\s*on|flat|couch|bed/i.test(text);
  const isWorseningQuestion = /worse|worsening|more\s*pain|spreading|can'?t\s*take\s*it|faint|passing\s*out|dizzy|nauseous/i.test(text);
  const isVitalsReport = /pulse|heart\s*rate|bpm|blood\s*pressure|bp|sugar|glucose|saturation|spo2/i.test(text) && /\d+/.test(text);
  const isAloneOrContactQuestion = /alone|nobody|contact.*not\s*answering|no\s*one\s*here|scared/i.test(text);

  let emergencyType = 'general';
  let severity = 'high';
  let severityBadge = 'URGENT MEDICAL GUIDANCE — SEEK IMMEDIATE ATTENTION';
  let primarySymptom = message;
  let immediateSteps = [];
  let whatNotToDo = [];
  let redFlags = [];
  let contraindications = [];
  let conversationalReply = '';

  // --- BRANCH A: INTERACTIVE FOLLOW-UP QUESTIONS ---

  if (isMedicationQuestion && isOngoingChat) {
    severity = 'high';
    severityBadge = `MEDICATION SAFETY EVALUATION FOR ${patientName.toUpperCase()}`;
    primarySymptom = 'Medication / Painkiller Query';

    let medAdvice = '';
    if (hasAspirinAllergy && /aspirin|nsaid|ibuprofen|advil|aleve/i.test(text)) {
      medAdvice = `❌ **ABSOLUTELY DO NOT TAKE ASPIRIN OR NSAIDs (Ibuprofen, Advil, Aleve)**.\nYour medical record clearly documents an **allergy to Aspirin/NSAIDs**. Ingesting it during this acute episode could trigger life-threatening anaphylaxis or bronchospasm.`;
      contraindications.push('CRITICAL: Aspirin/NSAID allergy on file.');
    } else if (hasAspirinAllergy) {
      medAdvice = `⚠️ **Patient Allergy Alert**: Please remember you have a documented **Aspirin/NSAID allergy** on file. Avoid any non-steroidal anti-inflammatory drugs.`;
      contraindications.push('Aspirin/NSAID allergy on file.');
    }

    if (onBloodThinners.length > 0) {
      medAdvice += `\n⚠️ **Blood Thinner Interaction**: You are actively prescribed **${onBloodThinners.join(', ')}**. Taking non-prescribed over-the-counter painkillers increases severe internal bleeding risks.`;
      contraindications.push(`Active Anticoagulants: ${onBloodThinners.join(', ')}`);
    }

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, regarding your question about taking medication right now:\n\n` +
      `${medAdvice || `In acute emergency situations, **do not take oral painkillers or medications** without direct approval from the emergency dispatcher or attending physician, as they can mask vital diagnostic signs or interfere with emergency hospital procedures.`}\n\n` +
      `#### ⚡ What you should do right now:\n` +
      `1. **Focus on rest and posture**: Sit in a comfortable half-sitting position (45° angle) with your back and knees supported.\n` +
      `2. **Have your medication list ready**: When paramedics arrive, show them your active prescriptions (${patientContext.activeMedications.length ? patientContext.activeMedications.join(', ') : 'None documented'}) and allergies (${patientContext.allergies.length ? patientContext.allergies.join(', ') : 'None documented'}).\n` +
      `3. **If you have prescribed sublingual Nitroglycerin** (for cardiac angina) or **Rescue Inhaler** (for asthma), use only what was prescribed specifically for your acute condition.`;

    immediateSteps = [
      'Avoid unprescribed oral painkillers',
      'Maintain supported half-sitting Fowler’s position',
      'Keep your active prescriptions ready for arriving paramedics'
    ];
  }
  else if (isHydrationQuestion && isOngoingChat) {
    severity = 'high';
    severityBadge = `HYDRATION & INGESTION SAFETY GUIDANCE`;
    primarySymptom = 'Hydration Query During Emergency';

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, regarding drinking water or having food right now:\n\n` +
      `⚠️ **DO NOT drink full glasses of water or consume any food during an acute emergency.**\n\n` +
      `**Here is why this is critical for your safety:**\n` +
      `1. **Aspiration Hazard**: If you feel dizzy, nauseous, or suddenly faint, liquids in your stomach can be inhaled into your lungs (aspiration pneumonia).\n` +
      `2. **Hospital Delay**: If emergency doctors need to administer anesthesia, perform an emergency cardiac catheterization, or give IV contrast, having liquids or food in your stomach can delay these urgent procedures.\n\n` +
      `👉 **Exception**: If your mouth is extremely dry, you may use a damp cloth to moisten your lips or take a **single tiny sip** of water to wet your throat, provided you are fully awake, alert, and sitting completely upright.\n\n` +
      `Stay calmly seated and focus on slow, gentle breathing through your nose.`;

    immediateSteps = [
      'Do not gulp water or eat food',
      'Moisten lips with a damp cloth if mouth is parched',
      'Remain seated upright at 45 degrees'
    ];
  }
  else if (isPositionQuestion && isOngoingChat) {
    severity = 'high';
    severityBadge = `OPTIMAL PATIENT POSITIONING PROTOCOL`;
    primarySymptom = 'Body Positioning Guidance';

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, regarding how you should position your body right now:\n\n` +
      `❌ **DO NOT LIE FLAT ON YOUR BACK.**\n\n` +
      `The clinically recommended posture for suspected cardiac or breathing distress is **Fowler’s Position (Half-Sitting)**:\n\n` +
      `1. **Sit on the floor, couch, or bed** with your upper body propped up at approximately **45 degrees** using firm pillows or cushions.\n` +
      `2. **Bend your knees slightly**, placing a small pillow or folded towel under your knees.\n` +
      `3. **Loosen tight clothing**: Unbutton collar buttons, loosen belts, and remove tight footwear.\n\n` +
      `**Why this position helps your body:**\n` +
      `• Lying flat forces more venous blood back to your heart, increasing myocardial strain, and compresses the lower lobes of your lungs.\n` +
      `• Sitting at 45° allows gravity to assist diaphragm movement, making every breath significantly easier and reducing cardiac workload.`;

    immediateSteps = [
      'Sit up at 45 degrees in Fowler’s position',
      'Do not lie flat on your back',
      'Place a pillow under slightly bent knees',
      'Loosen tight clothing around chest and neck'
    ];
  }
  else if (isWorseningQuestion && isOngoingChat) {
    severity = 'critical';
    severityBadge = `🔴 CRITICAL ESCALATION — CALL EMERGENCY SERVICES (112 / 911)`;
    primarySymptom = 'Escalating Emergency Symptoms';

    const contactStr = patientContext.emergencyContact?.name
      ? `Contacting your designated emergency contact **${patientContext.emergencyContact.name}** at **${patientContext.emergencyContact.phone}** is recommended.`
      : 'Alert anyone nearby immediately.';

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, because your symptoms are worsening, **THIS IS AN IMMEDIATE MEDICAL EMERGENCY**.\n\n` +
      `🚨 **TAKE THESE IMMEDIATE LIFE-SAVING STEPS RIGHT NOW:**\n\n` +
      `1. **CALL 112 / 911 / 999 IMMEDIATELY**: Tell the dispatcher: *"Patient ${patientName}, experiencing worsening acute symptoms, feeling faint/clammy."*\n` +
      `2. **UNLOCK YOUR FRONT DOOR**: If you are inside, unlock the entrance door right now so emergency paramedics do not lose critical minutes breaking in if you lose consciousness.\n` +
      `3. **TURN ON OUTSIDE LIGHTS**: Switch on the exterior porch or entrance light so the ambulance team can spot your address instantly.\n` +
      `4. **SIT DOWN ON THE FLOOR**: Do not stand or attempt to walk. Sitting on the floor prevents head trauma or injury if you faint.\n` +
      `5. **EMERGENCY CONTACT**: ${contactStr}\n\n` +
      `Stay on the phone line with the emergency operator. Do NOT hang up.`;

    immediateSteps = [
      'Call 112 / 911 immediately and keep dispatcher on speakerphone',
      'Unlock front entrance door for arriving paramedics',
      'Sit immediately on the floor with back supported to prevent falls',
      'Turn on outside porch light for easy address identification'
    ];
  }
  else if (isVitalsReport) {
    severity = 'high';
    severityBadge = `CLINICAL VITALS ANALYSIS FOR ${patientName.toUpperCase()}`;
    primarySymptom = 'Vitals Update Evaluation';

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, thank you for logging those vital readings: **"${message}"**.\n\n` +
      `I am cross-referencing this against your clinical baseline:\n` +
      `• **Patient**: ${patientName} (${patientContext.bloodGroup})\n` +
      `• **Known Conditions**: ${patientContext.conditions.length ? patientContext.conditions.join(', ') : 'None documented'}\n` +
      `• **Active Prescriptions**: ${patientContext.activeMedications.length ? patientContext.activeMedications.join('; ') : 'None documented'}\n\n` +
      `**Clinical Assessment**:\n` +
      `Any acute spike in heart rate (>100 bpm) or abnormal blood pressure alongside your symptoms indicates significant physical distress or compensatory tachycardia. Write these numbers down or keep your meter handy to show the paramedics the moment they enter.`;

    immediateSteps = [
      'Record the exact time and reading on paper',
      'Keep the measuring device next to you for paramedics',
      'Continue resting quietly in half-sitting position'
    ];
  }
  else if (isAloneOrContactQuestion && isOngoingChat) {
    severity = 'high';
    severityBadge = `EMERGENCY SUPPORT & REASSURANCE PROTOCOL`;
    primarySymptom = 'Solo Patient Support';

    conversationalReply = `### ${severityBadge}\n\n` +
      `**${patientName}**, please take a slow, deep breath. You are not alone, and help is reachable:\n\n` +
      `1. **The 911 / 112 Dispatcher will stay with you**: When you call emergency dispatch, tell them you are home alone. Operators are clinically trained to remain on speakerphone with you until paramedics physically arrive.\n` +
      `2. **Unlock your door now**: Make sure your door is unlocked so you do not have to get up again.\n` +
      `3. **Keep your phone within arm’s reach**: Keep it plugged in or close to your hand.\n` +
      `4. **Recorded Emergency Contact**: Your profile lists **${patientContext.emergencyContact?.name || 'Emergency Contact'}** (${patientContext.emergencyContact?.phone || 'No phone recorded'}). If you haven't called them, tap their number or text them: *"Emergency at my home, called ambulance."*`;

    immediateSteps = [
      'Keep emergency dispatcher on speakerphone',
      'Unlock entrance door',
      'Keep mobile phone directly within arm’s reach'
    ];
  }

  // --- BRANCH B: INITIAL ACUTE EMERGENCY REPORT (CARDIAC, ASTHMA, BLEEDING, ETC.) ---
  else {
    // 1. CARDIAC / CHEST PAIN
    if (/chest\s*pain|chest\s*tightness|chest\s*pressure|heart\s*attack|left\s*arm\s*pain|jaw\s*pain|angina|palpitation.*heavy/i.test(text)) {
      emergencyType = 'cardiac';
      severity = 'critical';
      severityBadge = '🔴 CRITICAL EMERGENCY — SUSPECTED CARDIAC EVENT (CALL 911 / 112)';
      primarySymptom = 'Acute Chest Pain / Suspected Cardiac Event';

      if (hasAspirinAllergy) {
        contraindications.push(`CRITICAL: DO NOT TAKE ASPIRIN. ${patientName}'s profile lists a documented allergy/sensitivity to Aspirin/NSAIDs.`);
      } else if (onBloodThinners.length > 0) {
        contraindications.push(`CAUTION: You are on prescribed blood thinners (${onBloodThinners.join(', ')}). Do not take additional Aspirin unless explicitly instructed by the emergency dispatcher.`);
      } else {
        immediateSteps.push('If conscious, not allergic to aspirin, and not bleeding, chew one adult 300mg Aspirin (or four 81mg baby aspirins) while awaiting EMS.');
      }

      if (onCardiacMeds.length > 0) {
        contraindications.push(`Recorded cardiac medications: ${onCardiacMeds.join(', ')}. If you have prescribed Sublingual Nitroglycerin, take 1 dose under the tongue while seated.`);
      }

      immediateSteps.unshift(
        'CALL EMERGENCY SERVICES (911 / 112 / 999) IMMEDIATELY. State clearly: "Suspected heart attack, patient experiencing acute chest pressure."',
        'Stop all physical activity immediately. Sit down on the floor or bed in a half-sitting Fowler’s position (back supported at 45°, knees bent) to reduce cardiac workload.',
        'Loosen any tight clothing around the neck, chest, and waist to facilitate effortless breathing.',
        'Stay completely calm, breathe slowly and deeply through the nose and out the mouth. Do NOT walk or attempt to drive yourself to the hospital.'
      );

      whatNotToDo = [
        'DO NOT walk, exert yourself, or attempt to drive yourself to the hospital.',
        'DO NOT take Aspirin if you have an allergy, active ulcer, or taking blood thinners.',
        'DO NOT consume heavy food or drink while waiting for paramedics.'
      ];

      redFlags = [
        'Pain spreading to left arm, neck, jaw, back, or upper stomach',
        'Sudden cold sweat, nausea, lightheadedness, or feeling faint',
        'Severe shortness of breath or blue lips/fingertips'
      ];
    }
    // 2. RESPIRATORY DISTRESS / ASTHMA / WHEEZING
    else if (/breath|asthma|wheezing|can'?t\s*breathe|shortness\s*of\s*breath|gasping|suffocating|stridor/i.test(text)) {
      emergencyType = 'respiratory';
      severity = 'critical';
      severityBadge = '🔴 CRITICAL RESPIRATORY DISTRESS — CALL 911 / 112';
      primarySymptom = 'Severe Breathing Difficulty / Acute Asthma Exacerbation';

      if (onAsthmaMeds.length > 0) {
        immediateSteps.push(`IMMEDIATELY USE RESCUE INHALER: You have ${onAsthmaMeds.join(', ')} in your profile. Take 2 to 4 puffs immediately (with spacer if available), waiting 1 minute between each puff.`);
        immediateSteps.push('If symptoms do not improve after 4 minutes, take another 4 puffs every 4 minutes until EMS arrives.');
      } else {
        immediateSteps.push('If an asthma rescue inhaler (Albuterol / Salbutamol) is available in the vicinity, take 2 to 4 puffs immediately.');
      }

      immediateSteps.unshift(
        'CALL 911 / 112 IMMEDIATELY if you cannot speak full sentences or your lips/fingernails appear pale, gray, or blue.',
        'Sit completely upright. Lean slightly forward with elbows on your knees (tripod position) to expand diaphragm capacity. DO NOT LIE DOWN.',
        'Perform pursed-lip breathing: Inhale slowly through your nose for 2 counts, and exhale gently through pursed lips for 4 counts.'
      );

      whatNotToDo = [
        'DO NOT lie flat on your back — this severely compresses your airway and lung volume.',
        'DO NOT stay in an area with smoke, dust, cold air, or chemical fumes.',
        'DO NOT panic: Rapid shallow gasping worsens carbon dioxide retention.'
      ];

      redFlags = [
        'Inability to speak more than a couple of words between breaths',
        'Cyanosis (blue/gray tint to lips, gums, or nail beds)',
        'Chest and neck muscles pulling hard with each breath (retractions)'
      ];
    }
    // 3. DIABETIC HYPOGLYCEMIA / HYPERGLYCEMIA
    else if (/sugar|diabetes|diabetic|hypoglycemia|shaking|sweating|insulin|glucose|dizziness|faint|shaky/i.test(text)) {
      emergencyType = 'diabetic';
      primarySymptom = 'Diabetic Glucose Crisis / Suspected Acute Hypoglycemia';

      if (onDiabetesMeds.length > 0) {
        contraindications.push(`Active diabetes regimen noted: ${onDiabetesMeds.join(', ')}. Symptoms of sweating, tremor, and rapid heartbeat strongly suggest acute low blood sugar (Hypoglycemia < 70 mg/dL).`);
      }

      severity = 'high';
      severityBadge = '⚠️ URGENT DIABETIC FIRST-AID — EXECUTE 15-15 RULE';

      immediateSteps = [
        'If you have a glucometer, check blood glucose immediately. If below 70 mg/dL (or if no meter is available and patient is conscious and shaky):',
        'APPLY THE 15-15 RULE: Consume 15 grams of fast-acting simple carbohydrates right now (e.g., 1/2 cup fruit juice, 1/2 can regular soda, 3-4 glucose tablets, or 1 tablespoon honey/sugar).',
        'Wait 15 minutes in a safe seated position without moving around.',
        'Re-check blood glucose after 15 minutes. If still below 70 mg/dL, take another 15 grams of fast-acting carbohydrates.',
        'Once glucose rises above 70 mg/dL, eat a small snack with complex carbs and protein to stabilize levels.'
      ];

      whatNotToDo = [
        'DO NOT give liquids or food if the person is drowsy, confused, or unconscious (severe choking hazard).',
        'DO NOT take additional insulin or oral diabetes medication while feeling shaky or low.',
        'DO NOT use chocolate or high-fat snacks for emergency hypoglycemia — fat delays sugar absorption.'
      ];

      redFlags = [
        'Loss of consciousness or seizure — CALL 911 / 112 IMMEDIATELY. Place in recovery position.',
        'Extreme confusion, slurred speech, or inability to swallow'
      ];
    }
    // 4. UNCONTROLLED BLEEDING / DEEP LACERATION
    else if (/bleed|blood|cut|laceration|wound|hemorrhage|stab|puncture/i.test(text)) {
      emergencyType = 'bleeding';
      primarySymptom = 'Acute Hemorrhage / Severe Bleeding Wound';

      if (onBloodThinners.length > 0) {
        severity = 'critical';
        severityBadge = '🔴 CRITICAL BLEEDING — PATIENT ON PRESCRIBED ANTICOAGULANTS';
        contraindications.push(`ALERT: Your profile records blood thinners (${onBloodThinners.join(', ')}). Normal clotting is significantly impaired. Uninterrupted firm pressure and emergency medical assistance are mandatory.`);
      } else {
        severity = 'high';
        severityBadge = '⚠️ URGENT FIRST-AID — HEMORRHAGE CONTROL';
      }

      immediateSteps = [
        'APPLY DIRECT, CONTINUOUS PRESSURE: Place a clean sterile gauze, clean towel, or cloth directly over the bleeding site and press firmly with both hands.',
        'DO NOT REMOVE THE CLOTH: If blood soaks through, do NOT lift the first cloth (lifting destroys developing clots). Add more layers of cloth on top and maintain hard pressure.',
        'ELEVATE THE WOUND: If the injury is on an arm or leg and there is no suspected bone fracture, elevate the limb above heart level while maintaining firm pressure.',
        'HAVE THE PATIENT LIE DOWN: Rest quietly to reduce blood pressure and prevent fainting from hypovolemic shock. Keep patient warm with a blanket.',
        'If blood is spurting brightly (arterial bleeding) or bleeding does not stop after 10 minutes of direct hard pressure, CALL 911 / 112 IMMEDIATELY.'
      ];

      whatNotToDo = [
        'DO NOT remove soaked dressings — always layer more on top.',
        'DO NOT wash a deep, heavily bleeding wound with water while it is actively bleeding.',
        'DO NOT attempt to remove large embedded objects (glass, knife, metal) — stabilize around the object.'
      ];

      redFlags = [
        'Pulsating or spurting bright red blood',
        'Dizziness, cold clammy skin, rapid weak pulse, or loss of consciousness',
        'Bleeding that fails to stop after 10-15 minutes of uninterrupted direct pressure'
      ];
    }
    // 5. STROKE / NEUROLOGICAL EMERGENCY (FAST)
    else if (/stroke|face\s*droop|slurred|weakness.*arm|numbness.*side|confusion|paralysis|can'?t\s*speak/i.test(text)) {
      emergencyType = 'stroke';
      severity = 'critical';
      severityBadge = '🔴 CRITICAL EMERGENCY — SUSPECTED STROKE (ACT F.A.S.T.)';
      primarySymptom = 'Acute Neurological Deficit / Suspected Stroke';

      immediateSteps = [
        'CALL 911 / 112 IMMEDIATELY: State "Suspected acute stroke." Note the EXACT TIME symptoms first appeared — this dictates thrombolytic eligibility.',
        'F - FACE: Ask the person to smile. Does one side of the face droop?',
        'A - ARMS: Ask the person to raise both arms. Does one arm drift downward or feel weak/numb?',
        'S - SPEECH: Ask the person to repeat a simple sentence. Is speech slurred, strange, or absent?',
        'T - TIME: If any of these signs are present, time is brain tissue. Emergency transport is critical.',
        'Position the patient comfortably on their side (recovery position) with head slightly elevated if conscious.'
      ];

      whatNotToDo = [
        'DO NOT give Aspirin — if the stroke is hemorrhagic (bleeding in brain), aspirin can be fatal.',
        'DO NOT give any food, liquids, or oral medications (swallowing reflexes may be paralyzed).',
        'DO NOT let the patient sleep or "wait it out" — every minute millions of neurons die.'
      ];

      redFlags = [
        'Sudden severe "thunderclap" headache unlike any before',
        'Sudden loss of vision in one or both eyes',
        'Sudden loss of balance, vertigo, or inability to walk'
      ];
    }
    // 6. ALLERGIC REACTION / ANAPHYLAXIS
    else if (/allergic|allergy|anaphylaxis|swelling.*lip|swelling.*tongue|hives|throat.*close|bee\s*sting|peanut/i.test(text)) {
      emergencyType = 'allergic_reaction';
      severity = 'critical';
      severityBadge = '🔴 CRITICAL ALLERGIC REACTION — SUSPECTED ANAPHYLAXIS';
      primarySymptom = 'Acute Allergic Reaction / Anaphylaxis Risk';

      if (patientContext.allergies?.length > 0) {
        contraindications.push(`Known patient allergies on file: ${patientContext.allergies.join(', ')}. Check if any accidental ingestion or contact occurred.`);
      }

      immediateSteps = [
        'CALL 911 / 112 IMMEDIATELY if there is swelling of the lips, tongue, throat tightness, or difficulty breathing.',
        'ADMINISTER EPINEPHRINE AUTO-INJECTOR (EpiPen) IMMEDIATELY if prescribed or available: Inject firmly into the outer mid-thigh muscle, hold for 3-10 seconds, and massage area.',
        'Have the patient lie flat with legs elevated (unless breathing is difficult, in which case sit upright). Avoid sudden standing.',
        'If an oral antihistamine is available AND the patient can swallow safely without airway compromise, it may be administered alongside calling EMS.'
      ];

      whatNotToDo = [
        'DO NOT hesitate to use Epinephrine — it is the only life-saving first-line medication for anaphylaxis.',
        'DO NOT have the patient stand up suddenly — rapid drop in blood pressure (anaphylactic shock) can cause collapse.',
        'DO NOT give oral pills if the patient is struggling to breathe or tongue is swollen.'
      ];

      redFlags = [
        'Hoarseness, feeling of a lump in the throat, or high-pitched sound on breathing (stridor)',
        'Widespread itchy hives, severe dizziness, vomiting, or fainting'
      ];
    }
    // 7. SEVERE BURNS
    else if (/burn|scald|boiling\s*water|flame|fire|chemical\s*burn/i.test(text)) {
      emergencyType = 'burn';
      severity = 'high';
      severityBadge = '⚠️ URGENT BURN FIRST-AID PROTOCOL';
      primarySymptom = 'Thermal / Scald Burn Injury';

      immediateSteps = [
        'COOL THE BURN WITH COOL RUNNING WATER IMMEDIATELY for 10 to 20 minutes. Do NOT use ice or freezing water.',
        'Gently remove rings, watches, tight belts, or jewelry near the burned area before swelling begins.',
        'Cover the burn loosely with clean, sterile, non-adherent dressing or clean plastic food wrap.',
        'Keep the patient warm with a clean blanket over non-burned areas to prevent hypothermia from prolonged cooling.',
        'CALL 911 / 112 if the burn is larger than the patient’s palm, involves the face, hands, joints, or genitals, or appears charred/white/leathery.'
      ];

      whatNotToDo = [
        'DO NOT apply ice, ice water, butter, oils, toothpaste, or home ointments to the burn.',
        'DO NOT burst blisters — intact blisters protect against severe bacterial infection.',
        'DO NOT peel off clothing that is stuck to the burned skin.'
      ];

      redFlags = [
        'Burn on face, neck, hands, feet, groin, or major joints',
        'Burn appears charred black, leathery, or painless white (third-degree full thickness)',
        'Inhalation of smoke or soot around nostrils / coughing up dark mucus'
      ];
    }
    // 8. GENERAL EMERGENCY
    else {
      emergencyType = 'general';
      severity = 'high';
      severityBadge = `⚠️ EMERGENCY FIRST-AID TRIAGE FOR ${patientName.toUpperCase()}`;
      primarySymptom = message;

      immediateSteps = [
        'ASSESS SCENE SAFETY: Ensure the immediate surroundings are safe for you and the patient.',
        'CHECK RESPONSIVENESS & AIRWAY: Confirm the person is conscious, responding, and breathing normally.',
        'REST IN A COMFORTABLE POSITION: Have the patient sit or lie down in a safe position to prevent falls or fainting.',
        'CALL EMERGENCY SERVICES (911 / 112) or your attending physician if pain is severe, symptoms appeared suddenly, or condition is worsening.',
        'Monitor vital signs (breathing rate, pulse, skin color) and stay with the patient until medical help arrives.'
      ];

      whatNotToDo = [
        'DO NOT ignore sudden, severe, or worsening physical symptoms.',
        'DO NOT administer prescription medications belonging to someone else.',
        'DO NOT leave an unstable or disoriented patient unattended.'
      ];

      redFlags = [
        'Sudden loss of consciousness, confusion, or slurred speech',
        'Severe unremitting pain or difficulty breathing',
        'Bluish tint to lips, profuse cold sweating, or uncontrolled bleeding'
      ];
    }

    // Build personalized initial response
    const allPatientAlerts = [];
    if (contraindications.length > 0) {
      allPatientAlerts.push(...contraindications);
    }
    if (patientContext.allergies?.length > 0 && !hasAspirinAllergy && emergencyType !== 'allergic_reaction') {
      allPatientAlerts.push(`Documented Allergies: ${patientContext.allergies.join(', ')} (verify any proposed medication against this list).`);
    }
    if (patientContext.conditions?.length > 0) {
      allPatientAlerts.push(`Active Medical History: ${patientContext.conditions.join(', ')}.`);
    }
    if (patientContext.activeMedications?.length > 0) {
      allPatientAlerts.push(`Active Medications: ${patientContext.activeMedications.join('; ')}.`);
    }

    const contactStr = patientContext.emergencyContact?.name
      ? `${patientContext.emergencyContact.name} (${patientContext.emergencyContact.relation || 'Contact'}, ${patientContext.emergencyContact.phone})`
      : 'Not designated';

    const handoverNote = `Patient: ${patientName} | Blood Group: ${patientContext.bloodGroup} | Chronic Conditions: ${patientContext.conditions.length ? patientContext.conditions.join(', ') : 'None documented'} | Documented Allergies: ${patientContext.allergies.length ? patientContext.allergies.join(', ') : 'None'} | Active Medications: ${patientContext.activeMedications.length ? patientContext.activeMedications.join('; ') : 'None'} | Acute Presentation: "${message}" | Emergency Contact: ${contactStr}`;

    conversationalReply = `### ${severityBadge}\n\n` +
      `Hello **${patientName}**, I have received your emergency report: **"${message}"**.\n\n` +
      `I have cross-referenced your medical file: **Blood Group ${patientContext.bloodGroup}**, Allergies: **${patientContext.allergies.length ? patientContext.allergies.join(', ') : 'None documented'}**, Active Conditions: **${patientContext.conditions.length ? patientContext.conditions.join(', ') : 'None documented'}**.\n\n`;

    if (allPatientAlerts.length > 0) {
      conversationalReply += `> [!IMPORTANT]\n` +
        `> **Patient History Warnings for ${patientName}:**\n` +
        allPatientAlerts.map(a => `> • ${a}`).join('\n') + '\n\n';
    }

    conversationalReply += `#### ⚡ Immediate Life-Saving Steps (Do This Right Now):\n` +
      immediateSteps.map((s, i) => `${i + 1}. **${s}**`).join('\n') + '\n\n';

    if (whatNotToDo.length > 0) {
      conversationalReply += `#### 🛑 Critical Warnings (What NOT To Do):\n` +
        whatNotToDo.map(w => `• ${w}`).join('\n') + '\n\n';
    }

    if (redFlags.length > 0) {
      conversationalReply += `#### 🚨 Red Flag Deterioration Signs:\n` +
        redFlags.map(r => `• ${r}`).join('\n') + '\n\n';
    }

    conversationalReply += `#### 📋 20-Second EMT / Doctor Handover Briefing:\n` +
      `\`\`\`text\n${handoverNote}\n\`\`\`\n\n` +
      `*Emergency Dispatch: **911** (US/Canada) | **112** (Universal/Europe/India) | **999** (UK). You can ask me any follow-up question right now (e.g. "Should I drink water?", "Can I take pain medicine?", "What if symptoms worsen?").*`;
  }

  const allPatientAlerts = [];
  if (contraindications.length > 0) {
    allPatientAlerts.push(...contraindications);
  }

  const contactStr = patientContext.emergencyContact?.name
    ? `${patientContext.emergencyContact.name} (${patientContext.emergencyContact.relation || 'Contact'}, ${patientContext.emergencyContact.phone})`
    : 'Not designated';

  const handoverNote = `Patient: ${patientName} | Blood Group: ${patientContext.bloodGroup} | Chronic Conditions: ${patientContext.conditions.length ? patientContext.conditions.join(', ') : 'None documented'} | Documented Allergies: ${patientContext.allergies.length ? patientContext.allergies.join(', ') : 'None'} | Active Medications: ${patientContext.activeMedications.length ? patientContext.activeMedications.join('; ') : 'None'} | Acute Presentation: "${message}" | Emergency Contact: ${contactStr}`;

  return {
    reply: conversationalReply,
    structuredData: {
      emergencyType,
      severity,
      severityBadge,
      primarySymptom,
      patientContextUsed: {
        name: patientName,
        bloodGroup: patientContext.bloodGroup,
        allergies: patientContext.allergies,
        conditions: patientContext.conditions,
        activeMedications: patientContext.activeMedications,
        emergencyContact: patientContext.emergencyContact,
        criticalNotes: patientContext.criticalNotes
      },
      patientAlerts: allPatientAlerts,
      immediateSteps,
      whatNotToDo,
      redFlags,
      handoverNote,
      emergencyNumbers: [
        { label: 'Universal Emergency (India/EU)', number: '112' },
        { label: 'US / Canada Emergency', number: '911' },
        { label: 'UK Emergency', number: '999' }
      ]
    }
  };
}

/**
 * @desc    Patient Emergency AI Assistant: analyzes full history and gives instant context-aware first aid
 * @route   POST /api/patient/emergency-assistant
 * @access  Private (Patient)
 */
export const emergencyFirstAidAssistant = async (req, res) => {
  const { message, history, profileOverride } = req.body;

  if (!message || !message.trim()) {
    return sendError(res, 'Please provide the acute symptom or problem you are experiencing.', 400);
  }

  try {
    const patientId = req.user._id;

    // 1. Fetch complete patient medical profile
    const user = await User.findById(patientId).select('name email profile emergencyAccess');
    const health = await HealthProfile.findOne({ patient: patientId });
    const medications = await Medication.find({ patient: patientId, status: 'active' });
    const recentRecords = await MedicalRecord.find({ patient: patientId }).sort({ createdAt: -1 }).limit(3);

    // Merge database context with any testing persona override provided
    const patientContext = {
      name: profileOverride?.name || user?.name || 'Patient',
      bloodGroup: profileOverride?.bloodGroup || user?.profile?.bloodGroup || 'Not specified',
      allergies: profileOverride?.allergies !== undefined ? profileOverride.allergies : (user?.profile?.allergies || []),
      conditions: profileOverride?.conditions !== undefined ? profileOverride.conditions : (health?.conditions?.filter(c => c.status === 'active').map(c => c.name) || []),
      activeMedications: profileOverride?.activeMedications !== undefined
        ? profileOverride.activeMedications
        : medications.map(m => `${m.name} (${m.dosage || 'dosage unspecified'}, ${m.frequency || 'active'})`),
      emergencyContact: profileOverride?.emergencyContact || user?.emergencyAccess?.emergencyContact || {},
      criticalNotes: profileOverride?.criticalNotes || user?.emergencyAccess?.criticalNotes || '',
      recentHistory: recentRecords.map(r => `${r.title} (${r.category})`)
    };

    // 2. If Gemini API key is present, try Gemini LLM first for ultra-natural generation
    let geminiReply = null;
    if (process.env.GEMINI_API_KEY) {
      geminiReply = await callGeminiEmergencyAssistant(message, patientContext, history || []);
    }

    // 3. Run built-in Conversational Clinical Triage & First-Aid Engine
    const assistantResult = generateEmergencyFirstAidResponse(message, patientContext, history || []);

    // If Gemini provided a richer dynamic response, use its reply text while preserving safety structured data
    if (geminiReply) {
      assistantResult.reply = geminiReply;
    }

    return sendSuccess(res, 'Emergency first-aid guidance generated successfully', assistantResult);
  } catch (error) {
    console.error('emergencyFirstAidAssistant error:', error);
    return sendError(res, 'Server error evaluating emergency first-aid', 500);
  }
};

/**
 * @desc    Get care plans assigned to the logged-in patient
 * @route   GET /api/patient/care-plans
 * @access  Private (Patient only)
 */
export const getPatientCarePlans = async (req, res) => {
  try {
    const carePlans = await CarePlan.find({ patient: req.user._id })
      .populate('doctor', 'name email profile.specialization profile.clinicAddress profile.phone')
      .sort({ status: 1, createdAt: -1 });

    return sendSuccess(res, 'Patient care plans retrieved successfully', carePlans);
  } catch (error) {
    console.error('getPatientCarePlans error:', error.message);
    return sendError(res, 'Server error retrieving care plans', 500);
  }
};

/**
 * @desc    Toggle or log daily care plan task completion
 * @route   POST /api/patient/care-plans/:id/tasks/:taskId/toggle
 * @access  Private (Patient only)
 */
export const toggleCarePlanTask = async (req, res) => {
  const { id, taskId } = req.params;
  const { date, loggedValue, notes } = req.body;

  const targetDate = date || new Date().toISOString().slice(0, 10);

  try {
    const carePlan = await CarePlan.findOne({ _id: id, patient: req.user._id });
    if (!carePlan) {
      return sendError(res, 'Care plan not found or unauthorized', 404);
    }

    // Verify task exists in care plan
    const task = carePlan.dailyTasks.find((t) => t.taskId === taskId);
    if (!task) {
      return sendError(res, 'Specified task not found in care plan', 404);
    }

    const existingIndex = carePlan.taskCompletions.findIndex(
      (c) => c.date === targetDate && c.taskId === taskId
    );

    let isCompleted = false;
    if (existingIndex > -1) {
      // Toggle off / remove completion
      carePlan.taskCompletions.splice(existingIndex, 1);
      isCompleted = false;
    } else {
      // Add completion
      carePlan.taskCompletions.push({
        date: targetDate,
        taskId,
        completedAt: new Date(),
        loggedValue: loggedValue || 'completed',
        notes: notes || '',
      });
      isCompleted = true;
    }

    await carePlan.save();

    const populated = await CarePlan.findById(carePlan._id)
      .populate('doctor', 'name email profile.specialization profile.phone');

    return sendSuccess(res, `Task marked as ${isCompleted ? 'completed' : 'pending'}`, {
      carePlan: populated,
      isCompleted,
      targetDate,
      taskId,
    });
  } catch (error) {
    console.error('toggleCarePlanTask error:', error.message);
    return sendError(res, 'Server error toggling care plan task', 500);
  }
};
