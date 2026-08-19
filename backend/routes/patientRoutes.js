import express from 'express';
import multer from 'multer';
import {
  getHealthProfile,
  updateHealthProfile,
  getMedicalRecords,
  createMedicalRecord,
  deleteMedicalRecord,
  getTimelineEvents,
  getMedications,
  createMedication,
  getAppointments,
  createAppointment,
  getDoctorAccess,
  grantDoctorAccess,
  revokeDoctorAccess,
  uploadRecordImage,
} from '../controllers/patientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes are protected by JWT authentication
router.route('/health')
  .get(protect, getHealthProfile)
  .post(protect, updateHealthProfile);

router.route('/records')
  .get(protect, getMedicalRecords)
  .post(protect, createMedicalRecord);

router.route('/records/:id')
  .delete(protect, deleteMedicalRecord);

router.route('/timeline')
  .get(protect, getTimelineEvents);

router.route('/medications')
  .get(protect, getMedications)
  .post(protect, createMedication);

router.route('/appointments')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/doctors')
  .get(protect, getDoctorAccess)
  .post(protect, grantDoctorAccess);

router.route('/doctors/:id')
  .delete(protect, revokeDoctorAccess);

router.post('/upload', protect, upload.single('image'), uploadRecordImage);

export default router;
