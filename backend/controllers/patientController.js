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
  const { name, dosage, frequency, startDate, endDate, instructions } = req.body;

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
      status: 'active'
    });

    await createTimelineEvent(
      req.user._id,
      'medication',
      'Medication Added',
      `Prescribed medication: ${name} (${dosage}, ${frequency}).`
    );

    return sendSuccess(res, 'Medication created successfully', medication, 201);
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

          if (status === 'critical') {
            hasCritical = true;
            hasAbnormal = true;
            criticalFindings.push(`CRITICAL: ${namePart} is ${displayVal} (Reference: ${refRange})`);
          } else if (status === 'high' || status === 'low' || status === 'attention') {
            hasAbnormal = true;
            attentionFindings.push(`${namePart} is ${displayVal} (${status.toUpperCase()}) - Reference: ${refRange}`);
          } else {
            healthyFindings.push(`${namePart} is ${displayVal} (Normal)`);
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
            simpleDefinition: `${namePart} is a clinical measurement in ${secName}.`,
            simpleMeaning: status === 'normal'
              ? `Your ${namePart} level (${valPart}) is within the expected normal range.`
              : `Your ${namePart} level (${valPart}) is ${status} compared to normal bounds (${refRange}).`,
            fieldTip: status === 'normal'
              ? 'Maintain healthy nutrition and active daily routine.'
              : 'Consult your attending physician to evaluate this parameter.'
          });
        }
      }
    }
  }

  if (metrics.length === 0) {
    return {
      simplifiedSummary: 'No medical parameters could be extracted from this report text.',
      overallStatus: 'attention',
      statusHighlights: {
        healthyFindings: [],
        attentionFindings: ['No lab or clinical parameters isolated from the provided text.'],
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
      actionableAdvice: ['Ensure the uploaded image or text contains readable medical lab parameters.'],
      disclaimer: 'This AI medical report breakdown translates technical diagnostic terms into easy language for patient awareness. Always consult your attending doctor for clinical decisions.',
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
    ? 'The medical report contains critical laboratory findings that require urgent physician attention and follow-up.'
    : (hasAbnormal
      ? 'The medical report shows elevated or lower-than-normal findings across lab parameters that require dietary adjustment and doctor consultation.'
      : `All ${metrics.length} analyzed medical parameters are within safe reference bounds.`);

  const statusHighlightsList = [
    ...criticalFindings.map(c => ({ type: 'critical', label: 'CRITICAL CLINICAL FINDING', message: typeof c === 'string' ? c : (c.message || '') })),
    ...attentionFindings.map(a => ({ type: 'attention', label: 'Needs Attention', message: typeof a === 'string' ? a : (a.message || '') })),
    ...healthyFindings.map(h => ({ type: 'normal', label: 'Healthy Finding', message: typeof h === 'string' ? h : (h.message || '') }))
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



