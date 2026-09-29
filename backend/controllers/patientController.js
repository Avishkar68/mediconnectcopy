import fs from 'fs';
import path from 'path';
import HealthProfile from '../models/HealthProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Medication from '../models/Medication.js';
import Appointment from '../models/Appointment.js';
import DoctorAccess from '../models/DoctorAccess.js';
import TimelineEvent from '../models/TimelineEvent.js';
import User from '../models/User.js';
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

    if (analysis.metrics && !analysis.metricsBreakdown) {
      analysis.metricsBreakdown = analysis.metrics;
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
function generateFallbackMedicalAnalysis(text, title = '') {
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
      if (line.includes(':')) {
        parts = line.split(':', 2);
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
          const refRange = refMatch ? (refMatch[1].strip ? refMatch[1].strip() : refMatch[1].trim()) : 'N/A';

          // Status calculation
          let status = 'normal';
          const lineUpper = line.toUpperCase();
          if (lineUpper.includes('CRITICAL') || lineUpper.includes('PANIC')) {
            status = 'critical';
          } else if (lineUpper.includes('HIGH') || lineUpper.includes(' H ')) {
            status = 'high';
          } else if (lineUpper.includes('LOW') || lineUpper.includes(' L ')) {
            status = 'low';
          } else if (numVal !== null) {
            const rangeMatch = refRange.match(/([0-9.]+)\s*(?:-|–|to)\s*([0-9.]+)/);
            if (rangeMatch) {
              const low = parseFloat(rangeMatch[1]);
              const high = parseFloat(rangeMatch[2]);
              if (numVal > high) status = 'high';
              else if (numVal < low) status = 'low';
            } else if (refRange.includes('<') || refRange.toLowerCase().includes('below')) {
              const highMatch = refRange.match(/([0-9.]+)/);
              if (highMatch && numVal >= parseFloat(highMatch[1])) status = 'high';
            } else if (refRange.includes('>') || refRange.toLowerCase().includes('above')) {
              const lowMatch = refRange.match(/([0-9.]+)/);
              if (lowMatch && numVal <= parseFloat(lowMatch[1])) status = 'low';
            }
          }

          if (status === 'critical') {
            hasCritical = true;
            hasAbnormal = true;
            criticalFindings.push(`CRITICAL: ${namePart} is ${valPart} (Reference: ${refRange})`);
          } else if (status === 'high' || status === 'low' || status === 'attention') {
            hasAbnormal = true;
            attentionFindings.push(`${namePart} is ${valPart} (${status.toUpperCase()}) - Reference: ${refRange}`);
          } else {
            healthyFindings.push(`${namePart} is ${valPart} (Normal)`);
          }

          metrics.push({
            section: secName,
            name: namePart,
            value: valPart,
            val: valPart,
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

  return {
    simplifiedSummary: summary,
    overallStatus: overallStatus,
    statusHighlights: {
      healthyFindings,
      attentionFindings,
      criticalFindings
    },
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

