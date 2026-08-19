import jwt from 'jsonwebtoken';

/**
 * Generates a JWT token and sets it as an HTTP-only cookie on the response
 * @param {Object} res - Express response object
 * @param {String} userId - User ID to encode in token
 * @returns {String} The generated token
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });

  // Set JWT as HTTP-only cookie
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure in production
    sameSite: 'strict', // CSRF Protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return token;
};

export default generateToken;
