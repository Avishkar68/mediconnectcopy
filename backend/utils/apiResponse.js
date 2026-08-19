/**
 * Standardized success response structure
 * @param {Object} res - Express response object
 * @param {String} message - Human-readable success message
 * @param {Object|Array} data - Payload data to return
 * @param {Number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standardized error response structure
 * @param {Object} res - Express response object
 * @param {String} message - Human-readable error message
 * @param {Number} statusCode - HTTP status code (default 500)
 * @param {Object|Array} errors - Detailed validation errors or debugging metadata
 */
const sendError = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export { sendSuccess, sendError };
