import User from '../models/User.js';
import DoctorAccess from '../models/DoctorAccess.js';
import Appointment from '../models/Appointment.js';
import Medication from '../models/Medication.js';
import TimelineEvent from '../models/TimelineEvent.js';
import Notification from '../models/Notification.js';
import HealthProfile from '../models/HealthProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
import CarePlan from '../models/CarePlan.js';
import crypto from 'crypto';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

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

// Helper to send notifications
const createPatientNotification = async (patientId, message, type = 'info', category = 'general', actionUrl = '') => {
  try {
    await Notification.create({
      recipient: patientId,
      type,
      category,
      message,
      actionUrl,
    });
  } catch (err) {
    console.error('Failed to create patient notification:', err.message);
  }
};

/**
 * @desc    Get all authorized patients for the doctor
 * @route   GET /api/doctor/patients
 * @access  Private (Doctor only)
 */
export const getPatients = async (req, res) => {
  try {
    const consents = await DoctorAccess.find({
      doctor: req.user._id,
      status: 'approved'
    }).populate('patient', 'name email profile.phone profile.gender profile.dateOfBirth profile.bloodGroup profile.allergies');

    const patients = consents.map(c => c.patient).filter(p => p !== null);

    return sendSuccess(res, 'Patients retrieved successfully', patients);
  } catch (error) {
    console.error('getPatients error:', error.message);
    return sendError(res, 'Server error retrieving patients list', 500);
  }
};

/**
 * @desc    Get all pending consent requests
 * @route   GET /api/doctor/requests
 * @access  Private (Doctor only)
 */
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await DoctorAccess.find({
      doctor: req.user._id,
      status: 'pending'
    }).populate('patient', 'name email');

    return sendSuccess(res, 'Pending requests retrieved', requests);
  } catch (error) {
    console.error('getPendingRequests error:', error.message);
    return sendError(res, 'Server error retrieving pending consent requests', 500);
  }
};

/**
 * @desc    Approve or decline connection request
 * @route   POST /api/doctor/requests/:id
 * @access  Private (Doctor only)
 */
export const handleConsentRequest = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'decline'

  if (!['approve', 'decline'].includes(action)) {
    return sendError(res, 'Invalid action specified', 400);
  }

  try {
    const access = await DoctorAccess.findOne({ _id: id, doctor: req.user._id }).populate('patient', 'name');
    if (!access) {
      return sendError(res, 'Consent record not found', 404);
    }

    if (action === 'approve') {
      access.status = 'approved';
      access.approvedAt = new Date();
      await access.save();
      await createTimelineEvent(
        access.patient._id,
        'condition',
        'Access Consent Approved',
        `Approved medical records access consent for Dr. ${req.user.name}.`
      );
      await createPatientNotification(
        access.patient._id,
        `Dr. ${req.user.name} has approved your records access request.`,
        'success'
      );
    } else {
      access.status = 'rejected';
      access.revokedAt = new Date(); // Using revokedAt as a fallback date for rejection/revocation
      await access.save();
    }

    return sendSuccess(res, `Consent request ${action}d successfully`, access);
  } catch (error) {
    console.error('handleConsentRequest error:', error.message);
    return sendError(res, 'Server error handling consent request', 500);
  }
};

/**
 * @desc    Get scheduled consultations for the doctor
 * @route   GET /api/doctor/appointments
 * @access  Private (Doctor only)
 */
export const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user._id })
      .populate('patient', 'name email profile.phone')
      .sort({ dateTime: 1 });

    return sendSuccess(res, 'Appointments retrieved successfully', appointments);
  } catch (error) {
    console.error('getDoctorAppointments error:', error.message);
    return sendError(res, 'Server error retrieving doctor appointments', 500);
  }
};

/**
 * @desc    Prescribe medication to an authorized patient
 * @route   POST /api/doctor/prescriptions
 * @access  Private (Doctor only)
 */
export const createPrescription = async (req, res) => {
  const { patientId, name, dosage, frequency, startDate, endDate, instructions } = req.body;

  if (!patientId || !name || !dosage || !frequency) {
    return sendError(res, 'Patient, drug name, dosage, and frequency are required', 400);
  }

  try {
    // Verify records access consent is approved
    const consent = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id,
      status: 'approved'
    });

    if (!consent) {
      return sendError(res, 'You do not have medical records access authorization for this patient', 403);
    }

    const medication = await Medication.create({
      patient: patientId,
      name,
      dosage,
      frequency,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      instructions: instructions || '',
      doctor: req.user._id,
      status: 'active'
    });

    await createTimelineEvent(
      patientId,
      'medication',
      'Prescription Received',
      `Prescribed medication: ${name} (${dosage}, ${frequency}) by Dr. ${req.user.name}.`
    );

    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} added a new prescription: ${name}.`,
      'info'
    );

    return sendSuccess(res, 'Medication prescribed successfully', medication, 201);
  } catch (error) {
    console.error('createPrescription error:', error.message);
    return sendError(res, 'Server error creating prescription', 500);
  }
};

/**
 * @desc    Get all care plans created by the logged-in doctor
 * @route   GET /api/doctor/care-plans
 * @access  Private (Doctor only)
 */
export const getDoctorCarePlans = async (req, res) => {
  try {
    const carePlans = await CarePlan.find({ doctor: req.user._id })
      .populate('patient', 'name email profile.phone profile.gender profile.bloodGroup')
      .sort({ updatedAt: -1 });

    return sendSuccess(res, 'Doctor care plans retrieved successfully', carePlans);
  } catch (error) {
    console.error('getDoctorCarePlans error:', error.message);
    return sendError(res, 'Server error retrieving care plans', 500);
  }
};

/**
 * @desc    Create structured treatment / care pathway for an authorized patient
 * @route   POST /api/doctor/care-plans
 * @access  Private (Doctor only)
 */
export const createCarePlan = async (req, res) => {
  const {
    patientId,
    title,
    diagnosis,
    description,
    category,
    targetEndDate,
    phases,
    dailyTasks,
    targetVitals,
  } = req.body;

  if (!patientId || !title || !diagnosis) {
    return sendError(res, 'Patient, care plan title, and diagnosis focus are required', 400);
  }

  try {
    const consent = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id,
      status: 'approved'
    });

    if (!consent) {
      return sendError(res, 'Unauthorized records access. Consent required.', 403);
    }

    // Default phases if none provided
    const planPhases = phases && phases.length > 0 ? phases : [
      {
        phaseNumber: 1,
        name: 'Phase 1: Stabilization & Immediate Care',
        durationDays: 7,
        description: 'Focus on symptom stabilization and vital checks.',
        goals: ['Vital signs stabilization', 'Initial recovery compliance'],
        status: 'in-progress',
      },
      {
        phaseNumber: 2,
        name: 'Phase 2: Active Recovery & Lifestyle Modification',
        durationDays: 14,
        description: 'Gradual increase in activity and dietary compliance.',
        goals: ['Consistent target vitals', 'Activity progression'],
        status: 'pending',
      },
      {
        phaseNumber: 3,
        name: 'Phase 3: Long-term Maintenance & Secondary Prevention',
        durationDays: 30,
        description: 'Sustain therapeutic goals and maintain health milestones.',
        goals: ['Sustained lifestyle goals', 'Follow-up consultation review'],
        status: 'pending',
      },
    ];

    // Format tasks with unique ids
    const tasks = (dailyTasks || []).map((t, idx) => ({
      taskId: t.taskId || `task_${Date.now()}_${idx}`,
      title: t.title,
      category: t.category || 'lifestyle',
      frequency: t.frequency || 'daily',
      instructions: t.instructions || '',
      targetMetric: t.targetMetric || { metricName: '', targetValue: '' },
      isActive: t.isActive !== false,
    }));

    const carePlan = await CarePlan.create({
      patient: patientId,
      doctor: req.user._id,
      title,
      diagnosis,
      description: description || '',
      category: category || 'general',
      status: 'active',
      startDate: new Date(),
      targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      phases: planPhases,
      dailyTasks: tasks,
      targetVitals: targetVitals || {},
      taskCompletions: [],
    });

    await createTimelineEvent(
      patientId,
      'condition',
      'Care Pathway Prescribed',
      `Dr. ${req.user.name} initiated Care Pathway: "${title}" (Diagnosis: ${diagnosis}).`
    );

    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} prescribed a new Care Pathway: "${title}". Check your daily recovery checklist.`,
      'info',
      'care_plan',
      '/dashboard/care-plan'
    );

    const populated = await CarePlan.findById(carePlan._id)
      .populate('patient', 'name email profile.phone');

    return sendSuccess(res, 'Care pathway created successfully', populated, 201);
  } catch (error) {
    console.error('createCarePlan error:', error.message);
    return sendError(res, 'Server error creating care pathway', 500);
  }
};

/**
 * @desc    Update care plan status, milestones, target metrics, or doctor reviews
 * @route   PUT /api/doctor/care-plans/:id
 * @access  Private (Doctor only)
 */
export const updateCarePlan = async (req, res) => {
  const { id } = req.params;
  const { status, phaseUpdates, reviewNote, targetVitals, dailyTasks, description } = req.body;

  try {
    const carePlan = await CarePlan.findOne({ _id: id, doctor: req.user._id });
    if (!carePlan) {
      return sendError(res, 'Care plan not found or unauthorized', 404);
    }

    if (status) {
      carePlan.status = status;
    }

    if (description !== undefined) {
      carePlan.description = description;
    }

    if (targetVitals) {
      carePlan.targetVitals = { ...carePlan.targetVitals, ...targetVitals };
    }

    if (dailyTasks && Array.isArray(dailyTasks)) {
      carePlan.dailyTasks = dailyTasks;
    }

    if (phaseUpdates && Array.isArray(phaseUpdates)) {
      carePlan.phases = phaseUpdates;
    }

    if (reviewNote) {
      carePlan.doctorReviews.push({
        date: new Date(),
        note: reviewNote,
        doctorName: req.user.name,
      });

      await createPatientNotification(
        carePlan.patient,
        `Dr. ${req.user.name} reviewed your Care Plan: "${reviewNote.slice(0, 70)}"`,
        'info',
        'care_plan',
        '/dashboard/care-plan'
      );
    }

    await carePlan.save();

    const populated = await CarePlan.findById(carePlan._id)
      .populate('patient', 'name email profile.phone');

    return sendSuccess(res, 'Care plan updated successfully', populated);
  } catch (error) {
    console.error('updateCarePlan error:', error.message);
    return sendError(res, 'Server error updating care plan', 500);
  }
};

/**
 * @desc    Search for patients by email or name to request connect
 * @route   GET /api/doctor/search-patients
 * @access  Private (Doctor only)
 */
export const searchPatients = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return sendError(res, 'Search query is required', 400);
  }

  try {
    const patients = await User.find({
      role: 'patient',
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).select('name email profile.gender profile.phone');

    return sendSuccess(res, 'Patients found', patients);
  } catch (error) {
    console.error('searchPatients error:', error.message);
    return sendError(res, 'Server error searching patients', 500);
  }
};

/**
 * @desc    Get complete medical history of an authorized patient
 * @route   GET /api/doctor/patients/:patientId/medical-history
 * @access  Private (Doctor only)
 */
export const getPatientMedicalHistory = async (req, res) => {
  const { patientId } = req.params;

  try {
    // 1. Verify access consent
    const consent = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id,
      status: 'approved'
    });

    if (!consent) {
      return sendError(res, 'You do not have medical records access authorization for this patient', 403);
    }

    // 2. Query patient data in parallel
    const [healthProfile, records, timeline] = await Promise.all([
      HealthProfile.findOne({ patient: patientId }),
      MedicalRecord.find({ patient: patientId }).sort({ recordDate: -1 }),
      TimelineEvent.find({ patient: patientId }).sort({ eventDate: -1 })
    ]);

    // Also get the basic profile info (allergies, bloodGroup) from User
    const patientUser = await User.findById(patientId).select('name email profile.phone profile.gender profile.dateOfBirth');

    return sendSuccess(res, 'Patient medical history retrieved successfully', {
      patient: patientUser,
      profile: healthProfile || { conditions: [], vitals: [] },
      records: records || [],
      timeline: timeline || []
    });
  } catch (error) {
    console.error('getPatientMedicalHistory error:', error.message);
    return sendError(res, 'Server error retrieving patient medical history', 500);
  }
};

/**
 * @desc    Record a new consultation (log notes & update appointment)
 * @route   POST /api/doctor/consultations
 * @access  Private (Doctor only)
 */
export const createConsultation = async (req, res) => {
  const { patientId, appointmentId, diagnosis, notes } = req.body;

  if (!patientId || !diagnosis) {
    return sendError(res, 'Patient and diagnosis summary are required', 400);
  }

  try {
    const consent = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id,
      status: 'approved'
    });

    if (!consent) {
      return sendError(res, 'Unauthorized records access. Consent required.', 403);
    }

    // 1. Log timeline event
    await createTimelineEvent(
      patientId,
      'appointment',
      'Consultation Conducted',
      `Diagnosed: ${diagnosis}. Notes: ${notes || 'none'}`
    );

    // 2. Update Appointment to completed if appointmentId is present
    if (appointmentId) {
      const appt = await Appointment.findOne({ _id: appointmentId, doctor: req.user._id });
      if (appt) {
        appt.status = 'completed';
        appt.notes = notes || '';
        await appt.save();
      }
    }

    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} logged consultation notes for your recent visit.`,
      'info'
    );

    return sendSuccess(res, 'Consultation logged successfully', null, 201);
  } catch (error) {
    console.error('createConsultation error:', error.message);
    return sendError(res, 'Server error creating consultation note', 500);
  }
};

/**
 * @desc    Retrieve all patients in the system with their access status for the current doctor
 * @route   GET /api/doctor/directory
 * @access  Private (Doctor only)
 */
export const getPatientDirectory = async (req, res) => {
  try {
    // 1. Fetch all patients in the system
    const patients = await User.find({ role: 'patient' })
      .select('name email profile.gender profile.phone profile.dateOfBirth emergencyAccess.enabled emergencyAccess.token');

    // 2. Fetch all access consent records for this doctor
    const consents = await DoctorAccess.find({ doctor: req.user._id });

    // Create a map of patientId -> consent status details
    const consentMap = {};
    consents.forEach(c => {
      consentMap[c.patient.toString()] = c;
    });

    // 3. Map patients with their access status
    const directory = patients.map(p => {
      const consent = consentMap[p._id.toString()];
      
      // Calculate age if date of birth exists
      let age = null;
      if (p.profile?.dateOfBirth) {
        const birthDate = new Date(p.profile.dateOfBirth);
        const ageDiff = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiff);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      return {
        _id: p._id,
        name: p.name,
        email: p.email,
        phone: p.profile?.phone || '',
        gender: p.profile?.gender || '',
        age,
        accessStatus: consent ? consent.status : 'none',
        accessId: consent ? consent._id : null,
        emergencyEnabled: Boolean(p.emergencyAccess?.enabled),
        emergencyToken: p.emergencyAccess?.enabled ? p.emergencyAccess?.token : null,
      };
    });

    return sendSuccess(res, 'Patient directory retrieved successfully', directory);
  } catch (error) {
    console.error('getPatientDirectory error:', error.message);
    return sendError(res, 'Server error fetching patient directory', 500);
  }
};

/**
 * @desc    Request medical records access for a patient
 * @route   POST /api/doctor/requests
 * @access  Private (Doctor only)
 */
export const requestPatientAccess = async (req, res) => {
  const { patientId } = req.body;

  if (!patientId) {
    return sendError(res, 'Patient ID is required', 400);
  }

  try {
    // Verify patient exists
    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) {
      return sendError(res, 'Patient not found', 404);
    }

    // Check for existing pending/active request to prevent duplicates
    let access = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id
    });

    if (access) {
      if (access.status === 'pending') {
        return sendError(res, 'A records access request is already pending approval', 400);
      }
      if (access.status === 'approved') {
        return sendError(res, 'You already have active approved access to this patient\'s records', 400);
      }
      // If status is rejected, revoked, or expired, we reset status to pending
      access.status = 'pending';
      access.requestedAt = new Date();
      access.approvedAt = null;
      access.revokedAt = null;
      await access.save();
    } else {
      // Create new request
      access = await DoctorAccess.create({
        patient: patientId,
        doctor: req.user._id,
        status: 'pending',
        requestedAt: new Date()
      });
    }

    // Create a notification for the patient
    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} has requested access to view your medical records and vitals history.`,
      'info'
    );

    return sendSuccess(res, 'Records access request submitted successfully', access);
  } catch (error) {
    console.error('requestPatientAccess error:', error.message);
    return sendError(res, 'Server error requesting access to patient records', 500);
  }
};

/**
 * @desc    Get all consent requests sent by the doctor
 * @route   GET /api/doctor/requests/sent
 * @access  Private (Doctor only)
 */
export const getSentRequests = async (req, res) => {
  try {
    const requests = await DoctorAccess.find({ doctor: req.user._id })
      .populate('patient', 'name email')
      .sort({ requestedAt: -1 });

    return sendSuccess(res, 'Sent requests retrieved successfully', requests);
  } catch (error) {
    console.error('getSentRequests error:', error.message);
    return sendError(res, 'Server error retrieving sent requests list', 500);
  }
};

/**
 * @desc    Get emergency medical profile of a patient by ID
 * @route   GET /api/doctor/patients/:patientId/emergency-profile
 * @access  Private (Doctor only)
 */
export const getPatientEmergencyProfile = async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await User.findById(patientId);
    if (!patient) {
      return sendError(res, 'Patient not found', 404);
    }

    if (!patient.emergencyAccess) {
      patient.emergencyAccess = {
        enabled: true,
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

    // Ensure patient has an active emergency QR token so the QR code can be scanned and viewed
    let needsSave = false;
    if (
      !patient.emergencyAccess.token ||
      (patient.emergencyAccess.tokenExpiresAt && new Date(patient.emergencyAccess.tokenExpiresAt) < new Date())
    ) {
      patient.emergencyAccess.token = 'mc_emg_' + crypto.randomBytes(24).toString('hex');
      patient.emergencyAccess.tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      patient.emergencyAccess.enabled = true;
      needsSave = true;
    }

    if (!patient.emergencyAccess.enabled) {
      patient.emergencyAccess.enabled = true;
      needsSave = true;
    }

    if (needsSave) {
      await patient.save();
    }

    const [healthProfile, medications] = await Promise.all([
      HealthProfile.findOne({ patient: patient._id }),
      Medication.find({ patient: patient._id, status: 'active' }).select('name dosage frequency instructions')
    ]);

    const activeConditions = healthProfile?.conditions?.filter(c => c.status === 'active') || [];
    const settings = patient.emergencyAccess.settings || {};

    const emergencyProfileData = {
      patientId: patient._id,
      patientName: patient.name,
      token: patient.emergencyAccess.token,
      tokenExpiresAt: patient.emergencyAccess.tokenExpiresAt,
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
      viewedAt: new Date()
    };

    // Log timeline event and notify patient of emergency access
    await createTimelineEvent(
      patient._id,
      'condition',
      'Emergency Profile Accessed',
      `Emergency medical profile was accessed by Dr. ${req.user.name}.`
    );

    await createPatientNotification(
      patient._id,
      `Dr. ${req.user.name} accessed your Emergency Medical profile.`,
      'warning'
    );

    return sendSuccess(res, 'Patient emergency profile retrieved successfully', emergencyProfileData);
  } catch (error) {
    console.error('getPatientEmergencyProfile error:', error.message);
    return sendError(res, 'Server error retrieving patient emergency profile', 500);
  }
};

/**
 * @desc    Directly schedule a follow-up consultation for an authorized patient
 * @route   POST /api/doctor/appointments/schedule-followup
 * @access  Private (Doctor only)
 */
export const scheduleFollowupAppointment = async (req, res) => {
  const { patientId, dateTime, purpose, notes } = req.body;

  if (!patientId || !dateTime || !purpose) {
    return sendError(res, 'Patient, appointment date & time, and purpose are required', 400);
  }

  try {
    const consent = await DoctorAccess.findOne({
      patient: patientId,
      doctor: req.user._id,
      status: 'approved',
    });

    if (!consent) {
      return sendError(res, 'Unauthorized. Active patient consent required to schedule consultations.', 403);
    }

    const apptDate = new Date(dateTime);
    if (isNaN(apptDate.getTime())) {
      return sendError(res, 'Invalid date format provided', 400);
    }

    const appointment = await Appointment.create({
      patient: patientId,
      doctor: req.user._id,
      dateTime: apptDate,
      purpose,
      notes: notes || '',
      status: 'scheduled',
    });

    const formattedTime = apptDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await createTimelineEvent(
      patientId,
      'appointment',
      'Follow-up Consultation Scheduled',
      `Dr. ${req.user.name} scheduled a clinical follow-up for "${purpose}" on ${formattedTime}.`
    );

    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} scheduled a follow-up consultation with you on ${formattedTime} for "${purpose}".`,
      'warning',
      'reminder',
      '/dashboard/appointments'
    );

    const populated = await Appointment.findById(appointment._id)
      .populate('patient', 'name email profile.phone');

    return sendSuccess(res, 'Follow-up appointment scheduled successfully', populated, 201);
  } catch (error) {
    console.error('scheduleFollowupAppointment error:', error.message);
    return sendError(res, 'Server error scheduling follow-up appointment', 500);
  }
};

/**
 * ========================================================
 * 🤖 SMART AI DOCTOR COPILOT CONTROLLERS
 * ========================================================
 */

/**
 * @desc    Generate comprehensive AI clinical brief for a patient
 * @route   POST /api/doctor/copilot/summary
 * @access  Private (Doctor only)
 */
export const generateCopilotSummary = async (req, res) => {
  const { patientId } = req.body;

  if (!patientId) {
    return sendError(res, 'Patient ID is required', 400);
  }

  try {
    const [patientUser, healthProfile, medications, records, carePlans] = await Promise.all([
      User.findById(patientId).select('name email profile'),
      HealthProfile.findOne({ patient: patientId }),
      Medication.find({ patient: patientId, status: 'active' }),
      MedicalRecord.find({ patient: patientId }).sort({ recordDate: -1 }).limit(10),
      CarePlan.find({ patient: patientId, status: 'active' }),
    ]);

    if (!patientUser) {
      return sendError(res, 'Patient not found', 404);
    }

    const allergies = patientUser.profile?.allergies || [];
    const bloodGroup = patientUser.profile?.bloodGroup || 'Not Documented';
    const conditions = healthProfile?.conditions?.map((c) => c.name) || [];
    const vitals = healthProfile?.vitals || [];
    const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;

    // Evaluate Vitals & Risk Level
    let riskLevel = 'Low';
    let riskReasons = [];
    let vitalEvaluation = 'Within Expected Parameters';

    if (latestVital) {
      const sys = latestVital.bloodPressureSystolic;
      const dia = latestVital.bloodPressureDiastolic;
      const hr = latestVital.heartRate;

      if (sys >= 160 || dia >= 100) {
        riskLevel = 'High';
        vitalEvaluation = `Hypertensive Crisis / Stage 2 Range (${sys}/${dia} mmHg)`;
        riskReasons.push(`Markedly elevated blood pressure: ${sys}/${dia} mmHg`);
      } else if (sys >= 140 || dia >= 90) {
        if (riskLevel !== 'High') riskLevel = 'Moderate';
        vitalEvaluation = `Stage 1 Hypertension (${sys}/${dia} mmHg)`;
        riskReasons.push(`Elevated systolic/diastolic BP (${sys}/${dia} mmHg)`);
      } else if (sys >= 120 && dia < 80) {
        vitalEvaluation = `Elevated Pre-hypertension (${sys}/${dia} mmHg)`;
      } else {
        vitalEvaluation = `Normotensive (${sys}/${dia} mmHg)`;
      }

      if (hr > 105) {
        riskReasons.push(`Tachycardia observed: ${hr} BPM`);
        if (riskLevel === 'Low') riskLevel = 'Moderate';
      } else if (hr < 50) {
        riskReasons.push(`Sinus Bradycardia: ${hr} BPM`);
      }
    }

    if (allergies.length > 0) {
      riskReasons.push(`Documented hypersensitivity: ${allergies.join(', ')}`);
    }

    if (conditions.length >= 2) {
      if (riskLevel === 'Low') riskLevel = 'Moderate';
      riskReasons.push(`Multimorbidity burden (${conditions.length} active conditions)`);
    }

    // Recommendations Engine
    const recommendations = [];
    if (vitals.length < 3) {
      recommendations.push('Establish structured baseline vitals monitoring (at least 2 logs per week).');
    }
    if (conditions.some((c) => /diabetes/i.test(c))) {
      recommendations.push('Review HbA1c trending and schedule annual diabetic foot/retinal screen.');
    }
    if (conditions.some((c) => /hypertens|cardio/i.test(c))) {
      recommendations.push('Recommend ambulatory blood pressure monitoring (ABPM) and low-sodium diet.');
    }
    if (allergies.length > 0) {
      recommendations.push(`Cross-verify all new prescriptions against active allergens: ${allergies.join(', ')}.`);
    }
    if (medications.length >= 4) {
      recommendations.push('Perform periodic polypharmacy review to minimize adverse drug events.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue preventive health maintenance and routine annual wellness exam.');
    }

    // Synthesized Executive Narrative
    const executiveSummary = `Patient ${patientUser.name} (${patientUser.profile?.gender || 'Patient'}, Blood Group: ${bloodGroup}) presents with ${
      conditions.length > 0 ? conditions.join(', ') : 'no formally diagnosed chronic ailments'
    }. Currently maintained on ${medications.length} active prescription(s) [${
      medications.map((m) => m.name).join(', ') || 'None'
    }]. Vital telemetry reflects ${vitalEvaluation}. Documented allergies include: ${
      allergies.length > 0 ? allergies.join(', ') : 'None documented'
    }. Overall clinical risk tier is evaluated as ${riskLevel.toUpperCase()}${
      riskReasons.length > 0 ? ` secondary to ${riskReasons.slice(0, 2).join(' and ')}` : ''
    }.`;

    const copilotData = {
      patientName: patientUser.name,
      patientEmail: patientUser.email,
      riskLevel,
      riskReasons,
      vitalEvaluation,
      latestVital,
      allergies,
      bloodGroup,
      activeConditions: conditions,
      activeMedications: medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      })),
      activeCarePlansCount: carePlans.length,
      medicalRecordsCount: records.length,
      recommendations,
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };

    return sendSuccess(res, 'AI Doctor Copilot clinical brief generated', copilotData);
  } catch (error) {
    console.error('generateCopilotSummary error:', error.message);
    return sendError(res, 'Server error generating AI clinical brief', 500);
  }
};

/**
 * @desc    AI Drug-Drug & Allergy Interaction Safety Checker
 * @route   POST /api/doctor/copilot/interaction-check
 * @access  Private (Doctor only)
 */
export const checkDrugInteractions = async (req, res) => {
  const { patientId, medicationName } = req.body;

  if (!medicationName) {
    return sendError(res, 'Medication name is required for safety screening', 400);
  }

  try {
    let allergies = [];
    let activeMedications = [];

    if (patientId) {
      const [patientUser, meds] = await Promise.all([
        User.findById(patientId).select('profile.allergies name'),
        Medication.find({ patient: patientId, status: 'active' }),
      ]);
      allergies = patientUser?.profile?.allergies || [];
      activeMedications = meds.map((m) => m.name);
    }

    const medLower = medicationName.toLowerCase();
    const alerts = [];
    let severity = 'none'; // 'none' | 'mild' | 'moderate' | 'severe' | 'critical'
    let allergyConflict = false;

    // 1. ALLERGY SCREENING MATRIX
    allergies.forEach((allergy) => {
      const aLower = allergy.toLowerCase();

      // Penicillins / Beta-lactams
      if (
        (aLower.includes('penicillin') || aLower.includes('amoxicillin') || aLower.includes('ampicillin')) &&
        (medLower.includes('amox') || medLower.includes('penicillin') || medLower.includes('ampicillin') || medLower.includes('augmentin') || medLower.includes('clav'))
      ) {
        allergyConflict = true;
        severity = 'critical';
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          title: 'Direct Penicillin Hypersensitivity Alert',
          description: `Patient has documented allergy to "${allergy}". Prescribing "${medicationName}" presents high risk of anaphylaxis or severe cutaneous adverse reactions.`,
          recommendation: 'Do NOT prescribe. Substitute with a macrolide (e.g. Azithromycin) or fluoroquinolone if clinically indicated.',
        });
      }

      // Cephalosporins cross-reactivity
      if (
        aLower.includes('penicillin') &&
        (medLower.includes('ceph') || medLower.includes('cefp') || medLower.includes('ceft') || medLower.includes('keflex'))
      ) {
        severity = severity === 'critical' ? 'critical' : 'moderate';
        alerts.push({
          type: 'allergy_cross',
          severity: 'moderate',
          title: 'Potential Cephalosporin Cross-Reactivity',
          description: `Patient is allergic to penicillin. First/second-generation cephalosporins carry a 1-3% cross-hypersensitivity rate.`,
          recommendation: 'Exercise caution. Monitor closely or choose non-beta-lactam alternative.',
        });
      }

      // Sulfa / Sulfonamides
      if (
        (aLower.includes('sulfa') || aLower.includes('sulfonamide')) &&
        (medLower.includes('sulfa') || medLower.includes('bactrim') || medLower.includes('septra') || medLower.includes('trimethoprim'))
      ) {
        allergyConflict = true;
        severity = 'critical';
        alerts.push({
          type: 'allergy',
          severity: 'critical',
          title: 'Sulfa Allergy Conflict',
          description: `Patient is allergic to "${allergy}". "${medicationName}" contains sulfonamide moieties.`,
          recommendation: 'Absolute contraindication. Select alternate antimicrobial class.',
        });
      }

      // NSAID / Aspirin
      if (
        (aLower.includes('aspirin') || aLower.includes('nsaid') || aLower.includes('ibuprofen')) &&
        (medLower.includes('ibuprofen') || medLower.includes('aspirin') || medLower.includes('naproxen') || medLower.includes('diclofenac') || medLower.includes('combiflam'))
      ) {
        allergyConflict = true;
        severity = 'severe';
        alerts.push({
          type: 'allergy',
          severity: 'severe',
          title: 'NSAID / Aspirin Hypersensitivity',
          description: `Patient has documented intolerance/allergy to "${allergy}". Risk of bronchospasm or angioedema.`,
          recommendation: 'Substitute with Acetaminophen / Paracetamol for analgesia and antipyresis.',
        });
      }
    });

    // 2. DRUG-DRUG INTERACTIONS MATRIX
    activeMedications.forEach((activeMed) => {
      const aMedLower = activeMed.toLowerCase();

      // NSAID + Anticoagulant / Antiplatelet
      if (
        (medLower.includes('ibuprofen') || medLower.includes('naproxen') || medLower.includes('diclofenac')) &&
        (aMedLower.includes('warfarin') || aMedLower.includes('aspirin') || aMedLower.includes('clopidogrel') || aMedLower.includes('eliquis') || aMedLower.includes('xarelto'))
      ) {
        severity = severity === 'critical' ? 'critical' : 'severe';
        alerts.push({
          type: 'drug_interaction',
          severity: 'severe',
          title: 'Synergistic Hemorrhage & GI Bleed Risk',
          description: `Co-administration of ${medicationName} with active anticoagulant/antiplatelet ${activeMed} significantly amplifies gastrointestinal mucosal injury and major bleeding risk.`,
          recommendation: 'Avoid systemic NSAIDs. Use Paracetamol or topical analgesics; add PPI (Pantoprazole) if co-therapy is strictly unavoidable.',
        });
      }

      // ACE-I / ARB + Potassium Sparing / ARB Duplicate
      if (
        (medLower.includes('pril') || medLower.includes('sartan')) &&
        (aMedLower.includes('pril') || aMedLower.includes('sartan') || aMedLower.includes('spironolactone'))
      ) {
        severity = severity === 'critical' ? 'critical' : 'severe';
        alerts.push({
          type: 'drug_interaction',
          severity: 'severe',
          title: 'Dual Renin-Angiotensin Blockade / Hyperkalemia Risk',
          description: `Combining ${medicationName} with ${activeMed} increases risk of acute renal failure, symptomatic hypotension, and hyperkalemia without added clinical benefit.`,
          recommendation: 'Dual ACEi/ARB therapy is contraindicated. Discontinue one agent.',
        });
      }

      // Macrolide (Azithromycin) + QT Prolonging Agents
      if (
        (medLower.includes('azithromycin') || medLower.includes('clarithromycin')) &&
        (aMedLower.includes('ondansetron') || aMedLower.includes('amiodarone') || aMedLower.includes('citalopram') || aMedLower.includes('escitalopram'))
      ) {
        severity = severity === 'critical' || severity === 'severe' ? severity : 'moderate';
        alerts.push({
          type: 'drug_interaction',
          severity: 'moderate',
          title: 'Additive QTc Interval Prolongation',
          description: `Both ${medicationName} and ${activeMed} can lengthen cardiac repolarization, elevating risk of Torsades de Pointes.`,
          recommendation: 'Check baseline ECG; monitor electrolyte levels (K+, Mg2+). Consider alternative antibiotic.',
        });
      }

      // Duplicate Therapy
      if (medLower.replace(/\s+/g, '') === aMedLower.replace(/\s+/g, '')) {
        severity = severity === 'critical' || severity === 'severe' ? severity : 'moderate';
        alerts.push({
          type: 'duplicate',
          severity: 'moderate',
          title: 'Duplicate Active Medication',
          description: `Patient is already actively taking ${activeMed}. Prescribing ${medicationName} creates unintentional double dosing.`,
          recommendation: 'Verify dosage adjustment rather than generating a duplicate concurrent regimen.',
        });
      }
    });

    const safeToPrescribe = severity !== 'critical' && severity !== 'severe';

    return sendSuccess(res, 'Interaction check evaluated', {
      medicationName,
      safeToPrescribe,
      severity,
      allergyConflict,
      alertsCount: alerts.length,
      alerts,
      patientAllergiesScreened: allergies,
      activeMedicationsScreened: activeMedications,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('checkDrugInteractions error:', error.message);
    return sendError(res, 'Server error checking drug interactions', 500);
  }
};

/**
 * @desc    AI Differential Diagnosis & Clinical Test Recommender
 * @route   POST /api/doctor/copilot/differential-diagnosis
 * @access  Private (Doctor only)
 */
export const getDifferentialDiagnosis = async (req, res) => {
  const { symptoms, patientAge, patientGender, duration } = req.body;

  if (!symptoms || symptoms.length === 0) {
    return sendError(res, 'Symptoms input is required', 400);
  }

  const queryText = (Array.isArray(symptoms) ? symptoms.join(' ') : symptoms).toLowerCase();

  // Clinical Syndromic Matching Engine
  const differentials = [];
  const recommendedTests = [];
  const redFlags = [];

  // Respiratory / Febrile Pattern
  if (queryText.includes('fever') || queryText.includes('cough') || queryText.includes('throat') || queryText.includes('cold')) {
    if (queryText.includes('breath') || queryText.includes('wheez') || queryText.includes('chest pain')) {
      differentials.push({
        condition: 'Community-Acquired Pneumonia (CAP)',
        probability: 'High',
        icdCode: 'J18.9',
        rationale: 'Fever accompanied by cough and lower respiratory symptoms (dyspnea/chest discomfort).',
      });
      differentials.push({
        condition: 'Acute Bronchitis with Bronchospasm',
        probability: 'Moderate',
        icdCode: 'J20.9',
        rationale: 'Inflammatory bronchial process; frequently viral with secondary reactive airway response.',
      });
      recommendedTests.push('Chest X-Ray PA/Lateral View', 'Complete Blood Count (CBC) with Differential', 'Pulse Oximetry (SpO2)');
      redFlags.push('SpO2 < 93% on room air', 'Respiratory rate > 28 bpm', 'Cyanosis or hemoptysis');
    } else {
      differentials.push({
        condition: 'Acute Upper Respiratory Tract Infection (URTI)',
        probability: 'High',
        icdCode: 'J06.9',
        rationale: 'Typical constellation of sore throat, low-to-moderate fever, and rhinitis symptoms.',
      });
      differentials.push({
        condition: 'Acute Viral Pharyngitis / Tonsillitis',
        probability: 'Moderate',
        icdCode: 'J02.9',
        rationale: 'Localized pharyngeal erythema and odynophagia without focal lower lung signs.',
      });
      recommendedTests.push('Rapid Antigen Strep Test (if Centor Criteria met)', 'Complete Blood Count');
    }
  }

  // Gastrointestinal Pattern
  if (queryText.includes('abdomen') || queryText.includes('stomach') || queryText.includes('vomit') || queryText.includes('diarrhea') || queryText.includes('nausea')) {
    differentials.push({
      condition: 'Acute Gastroenteritis (Viral / Bacterial)',
      probability: 'High',
      icdCode: 'A09',
      rationale: 'Nausea, emesis, or diarrheal episodes indicative of intestinal mucosal inflammation.',
    });
    differentials.push({
      condition: 'Gastroesophageal Reflux Disease (GERD) with Dyspepsia',
      probability: 'Moderate',
      icdCode: 'K21.9',
      rationale: 'Epigastric burning, postprandial discomfort, and acid regurgitation.',
    });
    recommendedTests.push('Serum Electrolytes (Na+, K+, Cl-)', 'Stool Routine & Microscopy', 'Abdominal Ultrasound (if localized pain)');
    redFlags.push('Peritoneal signs (guarding, rebound tenderness)', 'Hematemesis or melena', 'Severe dehydration');
  }

  // Metabolic / General Malaise Pattern
  if (queryText.includes('fatigue') || queryText.includes('thirst') || queryText.includes('urination') || queryText.includes('weight loss')) {
    differentials.push({
      condition: 'Type 2 Diabetes Mellitus (New Onset / Decompensation)',
      probability: 'Moderate',
      icdCode: 'E11.9',
      rationale: 'Classic osmotic triad (polyuria, polydipsia) and unexplained energy depletion.',
    });
    differentials.push({
      condition: 'Microcytic / Iron Deficiency Anemia',
      probability: 'Moderate',
      icdCode: 'D50.9',
      rationale: 'Fatigue, pallor, reduced exercise tolerance common in primary care.',
    });
    differentials.push({
      condition: 'Primary Hypothyroidism',
      probability: 'Consider',
      icdCode: 'E03.9',
      rationale: 'Indolent metabolic slowing, cold intolerance, and chronic lethargy.',
    });
    recommendedTests.push('Fasting Blood Glucose & HbA1c', 'Complete Blood Count & Serum Ferritin', 'Serum Thyroid Stimulating Hormone (TSH)');
  }

  // Fallback if generic symptoms
  if (differentials.length === 0) {
    differentials.push({
      condition: 'Non-Specific Viral Syndrome',
      probability: 'Moderate',
      icdCode: 'B34.9',
      rationale: 'Constitutional prodromal symptoms without localizing organ-specific signs.',
    });
    differentials.push({
      condition: 'Tension / Stress-Related Somatization',
      probability: 'Consider',
      icdCode: 'G44.2',
      rationale: 'Musculoskeletal tension and fatigue without objective laboratory derangements.',
    });
    recommendedTests.push('Baseline Complete Blood Count (CBC)', 'Comprehensive Metabolic Panel (CMP)');
  }

  return sendSuccess(res, 'AI Differential Diagnosis generated', {
    analyzedSymptoms: queryText,
    patientDemographics: { age: patientAge || 'Not specified', gender: patientGender || 'Not specified' },
    differentials,
    recommendedTests,
    redFlags,
    clinicalNotice: 'AI guidance is for informational decision-support only. Definitive diagnosis requires direct physician clinical evaluation.',
  });
};


