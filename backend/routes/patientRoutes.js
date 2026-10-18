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
  analyzeMedicalReport,
  compareMedicalReports,
  getEmergencySettings,
  updateEmergencySettings,
  regenerateEmergencyToken,
  getEmergencyProfileByToken,
} from '../controllers/patientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// In-memory rate limiter for emergency access endpoints to prevent brute-force token enumeration
const emergencyRateLimiter = (() => {
  const requests = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 60; // 60 requests per 15 minutes

    const userReqs = requests.get(ip) || [];
    const validReqs = userReqs.filter((t) => now - t < windowMs);

    if (validReqs.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many emergency requests from this IP. Please try again later.',
      });
    }

    validReqs.push(now);
    requests.set(ip, validReqs);
    next();
  };
})();

// Emergency Access Routes
router.route('/emergency')
  .get(protect, getEmergencySettings)
  .post(protect, updateEmergencySettings);

router.post('/emergency/regenerate', protect, regenerateEmergencyToken);
router.get('/emergency-view/:token', emergencyRateLimiter, protect, getEmergencyProfileByToken);

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
router.post('/analyze-report', protect, analyzeMedicalReport);
router.post('/compare-reports', protect, compareMedicalReports);

export default router;

