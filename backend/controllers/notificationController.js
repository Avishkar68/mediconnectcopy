import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Get all notifications for logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, 'Notifications retrieved successfully', notifications);
  } catch (error) {
    console.error('GetNotifications Error:', error.message);
    return sendError(res, 'Server error fetching notifications', 500);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }

    // Verify recipient owns notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return sendError(res, 'Access denied. Unauthorized notification owner.', 403);
    }

    notification.read = true;
    await notification.save();

    return sendSuccess(res, 'Notification marked as read', notification);
  } catch (error) {
    console.error('MarkAsRead Error:', error.message);
    return sendError(res, 'Server error marking notification as read', 500);
  }
};

export { getNotifications, markAsRead };
