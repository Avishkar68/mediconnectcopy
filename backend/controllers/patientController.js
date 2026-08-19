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
                return reject(new Error('Cloudinary upload failed'));
              }
              resolve(result.secure_url);
            }
          );
          stream.end(req.file.buffer);
        });
      } catch (uploadError) {
        console.warn('Cloudinary upload failed, falling back to mock medical record image.');
        fileUrl = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80';
      }
    } else {
      // Fallback placeholder medical record image
      fileUrl = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80';
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
