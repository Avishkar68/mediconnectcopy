import express from 'express';
import {
  getPatients,
  getPendingRequests,
  handleConsentRequest,
  getDoctorAppointments,
  createPrescription,
  createCarePlan,
  searchPatients,
  getPatientMedicalHistory,
  createConsultation,
  getPatientDirectory,
  requestPatientAccess,
  getSentRequests,
} from '../controllers/doctorController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All doctor routes are protected and restricted to the doctor role
router.use(protect);
router.use(authorizeRoles('doctor'));

router.get('/patients', getPatients);
router.get('/patients/:patientId/medical-history', getPatientMedicalHistory);
router.get('/directory', getPatientDirectory);
router.route('/requests')
  .get(getSentRequests)
  .post(requestPatientAccess);
router.post('/requests/:id', handleConsentRequest);
router.get('/appointments', getDoctorAppointments);
router.post('/consultations', createConsultation);
router.post('/prescriptions', createPrescription);
router.post('/care-plans', createCarePlan);
router.get('/search-patients', searchPatients);

export default router;
