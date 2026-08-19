import express from 'express';
import {
  registerUser,
  verifyOtp,
  loginUser,
  logoutUser,
  getMe,
  getDevOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.get('/dev-otp', getDevOtp);

export default router;
