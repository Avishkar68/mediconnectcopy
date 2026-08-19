import User from '../models/User.js';
import DoctorAccess from '../models/DoctorAccess.js';
import Appointment from '../models/Appointment.js';
import Medication from '../models/Medication.js';
import TimelineEvent from '../models/TimelineEvent.js';
import Notification from '../models/Notification.js';
import HealthProfile from '../models/HealthProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
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
const createPatientNotification = async (patientId, message, type = 'info') => {
  try {
    await Notification.create({
      recipient: patientId,
      type,
      message
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
 * @desc    Assign recovery / care task to an authorized patient
 * @route   POST /api/doctor/care-plans
 * @access  Private (Doctor only)
 */
export const createCarePlan = async (req, res) => {
  const { patientId, title, description } = req.body;

  if (!patientId || !title) {
    return sendError(res, 'Patient ID and task title are required', 400);
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

    // Register a timeline activity representing the care recommendation
    await createTimelineEvent(
      patientId,
      'condition',
      'Care Plan Recommendation',
      `Dr. ${req.user.name} added care plan target: "${title}" - ${description || ''}`
    );

    await createPatientNotification(
      patientId,
      `Dr. ${req.user.name} updated your care plan instructions: "${title}".`,
      'info'
    );

    return sendSuccess(res, 'Care plan task generated successfully', null, 201);
  } catch (error) {
    console.error('createCarePlan error:', error.message);
    return sendError(res, 'Server error creating care plan target', 500);
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
      .select('name email profile.gender profile.phone profile.dateOfBirth');

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
        accessId: consent ? consent._id : null
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
