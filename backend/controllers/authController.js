import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Register a new user (Patient, Doctor, or Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic Validation
  if (!name || !email || !password) {
    return sendError(res, 'Name, email, and password are required', 400);
  }

  if (password.length < 6) {
    return sendError(res, 'Password must be at least 6 characters long', 400);
  }

  // Validate Role
  const allowedRoles = ['patient', 'doctor', 'admin'];
  const userRole = role ? role.toLowerCase() : 'patient';
  if (!allowedRoles.includes(userRole)) {
    return sendError(res, 'Invalid user role specified', 400);
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendError(res, 'User with this email already exists', 400);
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Create User (isVerified: false by default)
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      isVerified: false,
      otpCode,
      otpExpiresAt,
    });

    if (user) {
      // Mock OTP delivery: Log it clearly to backend console
      console.log(`\n======================================================`);
      console.log(`[OTP SERVICE] Verification code for ${email}: ${otpCode}`);
      console.log(`[OTP SERVICE] Code expires at: ${otpExpiresAt}`);
      console.log(`======================================================\n`);

      // Create a default welcome notification
      await Notification.create({
        recipient: user._id,
        type: 'info',
        message: `Welcome to MediConnect, ${user.name}! Please verify your account with the OTP code.`,
      });

      return sendSuccess(
        res,
        'Registration successful! Please verify your account using the OTP code sent to your email.',
        { email },
        201
      );
    } else {
      return sendError(res, 'Invalid user data received', 400);
    }
  } catch (error) {
    console.error('Registration Error:', error.message);
    return sendError(res, 'Server error during user registration', 500);
  }
};

/**
 * @desc    Verify OTP for registering user
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    return sendError(res, 'Email and OTP code are required', 400);
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, 'No registered user found with this email', 404);
    }

    if (user.isVerified) {
      return sendError(res, 'Account is already verified. Please proceed to login.', 400);
    }

    // Check if code matches
    if (user.otpCode !== otpCode) {
      return sendError(res, 'Invalid OTP code. Please try again.', 400);
    }

    // Check expiration
    if (new Date() > user.otpExpiresAt) {
      return sendError(res, 'OTP code has expired. Please register again or request a new OTP.', 400);
    }

    // Mark as verified, clear OTP fields
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    // Create success notification
    await Notification.create({
      recipient: user._id,
      type: 'success',
      message: 'Your account has been successfully verified! You can now log in.',
    });

    return sendSuccess(res, 'Account verified successfully. You can now log in.', { email });
  } catch (error) {
    console.error('OTP Verification Error:', error.message);
    return sendError(res, 'Server error during OTP verification', 500);
  }
};

/**
 * @desc    Authenticate user & get token (login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }

  try {
    // Find user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Block login if not verified
    if (!user.isVerified) {
      return sendError(res, 'Please verify your email via OTP before logging in', 403);
    }

    // Generate Token & Set Cookie
    const token = generateToken(res, user._id);

    // Create login notification
    await Notification.create({
      recipient: user._id,
      type: 'info',
      message: `New login detected at ${new Date().toLocaleString()}`,
    });

    return sendSuccess(res, 'Login successful', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      token, // Return token as fallback for custom auth header
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return sendError(res, 'Server error during login', 500);
  }
};

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Public (or Protected)
 */
const logoutUser = async (req, res) => {
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    console.error('Logout Error:', error.message);
    return sendError(res, 'Server error during logout', 500);
  }
};

/**
 * @desc    Get currently logged-in user profile session
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User session not found', 404);
    }
    return sendSuccess(res, 'Current user data retrieved', user);
  } catch (error) {
    console.error('getMe Error:', error.message);
    return sendError(res, 'Server error retrieving current session', 500);
  }
};

/**
 * @desc    Get OTP for dev purposes only
 * @route   GET /api/auth/dev-otp
 * @access  Public (dev only)
 */
const getDevOtp = async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return sendError(res, 'Not found', 404);
  }

  const { email } = req.query;
  if (!email) {
    return sendError(res, 'Email query parameter is required', 400);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, 'OTP retrieved successfully', { otpCode: user.otpCode });
  } catch (error) {
    console.error('getDevOtp Error:', error.message);
    return sendError(res, 'Server error during dev OTP retrieval', 500);
  }
};

export { registerUser, verifyOtp, loginUser, logoutUser, getMe, getDevOtp };
