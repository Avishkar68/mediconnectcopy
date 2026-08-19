import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to protect routes and verify JWT tokens
 */
const protect = async (req, res, next) => {
  let token = req.cookies.jwt;

  // Fallback to Bearer token in headers if cookie is missing
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorized, no token session found', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return sendError(res, 'User session invalid, user not found', 404);
    }

    // Check verification status
    if (!user.isVerified) {
      return sendError(res, 'Account is not verified. Please complete OTP verification.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return sendError(res, 'Not authorized, token validation failed', 401);
  }
};

/**
 * Middleware to restrict access based on user roles
 * @param {...String} roles - Allowed roles (e.g. 'admin', 'doctor', 'patient')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role '${req.user?.role || 'Guest'}' is not authorized.`,
        403
      );
    }
    next();
  };
};

export { protect, authorizeRoles };
