import express from 'express';
import {
  getPatients,
  getPendingRequests,
  handleConsentRequest,
  getDoctorAppointments,
  createPrescription,
  getDoctorCarePlans,
  createCarePlan,
  updateCarePlan,
  searchPatients,
  getPatientMedicalHistory,
  createConsultation,
  getPatientDirectory,
  requestPatientAccess,
  getSentRequests,
  getPatientEmergencyProfile,
  scheduleFollowupAppointment,
  generateCopilotSummary,
  checkDrugInteractions,
  getDifferentialDiagnosis,
} from '../controllers/doctorController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All doctor routes are protected and restricted to the doctor role
router.use(protect);
router.use(authorizeRoles('doctor'));

router.get('/patients', getPatients);
router.get('/patients/:patientId/medical-history', getPatientMedicalHistory);
router.get('/patients/:patientId/emergency-profile', getPatientEmergencyProfile);
router.get('/directory', getPatientDirectory);
router.route('/requests')
  .get(getSentRequests)
  .post(requestPatientAccess);
router.post('/requests/:id', handleConsentRequest);
router.get('/appointments', getDoctorAppointments);
router.post('/appointments/schedule-followup', scheduleFollowupAppointment);
router.post('/consultations', createConsultation);
router.post('/prescriptions', createPrescription);
router.route('/care-plans')
  .get(getDoctorCarePlans)
  .post(createCarePlan);
router.put('/care-plans/:id', updateCarePlan);
router.get('/search-patients', searchPatients);

// 🤖 AI Doctor Copilot Routes
router.post('/copilot/summary', generateCopilotSummary);
router.post('/copilot/interaction-check', checkDrugInteractions);
router.post('/copilot/differential-diagnosis', getDifferentialDiagnosis);

export default router;
