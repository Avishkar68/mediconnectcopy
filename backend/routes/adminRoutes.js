import express from 'express';
import {
  getPlatformStats,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getDoctorVerificationQueue,
  verifyDoctorCredentials,
  getAuditLogs,
  broadcastAnnouncement,
} from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require authentication and 'admin' role
router.use(protect);
router.use(authorizeRoles('admin'));

// Platform Analytics & System Metrics
router.get('/stats', getPlatformStats);

// User Directory & Account Governance
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);

// Doctor Clinical Credential Verification
router.get('/doctors/verification-queue', getDoctorVerificationQueue);
router.patch('/doctors/:id/verify', verifyDoctorCredentials);

// Compliance & System Audit Logs
router.get('/audit-logs', getAuditLogs);

// Platform System Announcements
router.post('/broadcast', broadcastAnnouncement);

export default router;
