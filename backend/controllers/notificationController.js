import Notification from '../models/Notification.js';
import Appointment from '../models/Appointment.js';
import CarePlan from '../models/CarePlan.js';
import Medication from '../models/Medication.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Helper to generate contextual reminders automatically without spamming
 */
const generateSmartReminders = async (user) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    if (user.role === 'patient') {
      // 1. Upcoming Appointments / Follow-ups in the next 48 hours
      const next48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const upcomingAppointments = await Appointment.find({
        patient: user._id,
        status: 'scheduled',
        dateTime: { $gte: now, $lte: next48Hours },
      }).populate('doctor', 'name');

      for (const appt of upcomingAppointments) {
        const existingReminder = await Notification.findOne({
          recipient: user._id,
          category: 'reminder',
          'metadata.appointmentId': appt._id.toString(),
          createdAt: { $gte: twelveHoursAgo },
        });

        if (!existingReminder) {
          const apptTime = new Date(appt.dateTime).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          await Notification.create({
            recipient: user._id,
            type: 'warning',
            category: 'reminder',
            message: `Upcoming Follow-up: Consultation with Dr. ${appt.doctor?.name || 'Practitioner'} on ${apptTime} for "${appt.purpose}".`,
            actionUrl: '/dashboard/appointments',
            metadata: { appointmentId: appt._id.toString() },
          });
        }
      }

      // 2. Active Care Plan Daily Compliance Reminder
      const activePlan = await CarePlan.findOne({
        patient: user._id,
        status: 'active',
      }).populate('doctor', 'name');

      if (activePlan && activePlan.dailyTasks && activePlan.dailyTasks.length > 0) {
        const todayCompletions = (activePlan.taskCompletions || []).filter(
          (c) => c.date === todayStr
        );
        const pendingCount = activePlan.dailyTasks.length - todayCompletions.length;

        if (pendingCount > 0) {
          const existingPlanReminder = await Notification.findOne({
            recipient: user._id,
            category: 'care_plan',
            'metadata.carePlanId': activePlan._id.toString(),
            'metadata.reminderDate': todayStr,
          });

          if (!existingPlanReminder) {
            await Notification.create({
              recipient: user._id,
              type: 'info',
              category: 'care_plan',
              message: `Care Pathway Reminder: You have ${pendingCount} pending health checklist task(s) today for "${activePlan.title}".`,
              actionUrl: '/dashboard/care-plan',
              metadata: {
                carePlanId: activePlan._id.toString(),
                reminderDate: todayStr,
              },
            });
          }
        }
      }
    } else if (user.role === 'doctor') {
      // Doctor Reminders: Upcoming consultations scheduled today/tomorrow
      const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const upcomingVisits = await Appointment.find({
        doctor: user._id,
        status: 'scheduled',
        dateTime: { $gte: now, $lte: next24Hours },
      }).populate('patient', 'name');

      if (upcomingVisits.length > 0) {
        const existingDocReminder = await Notification.findOne({
          recipient: user._id,
          category: 'reminder',
          'metadata.reminderDate': todayStr,
        });

        if (!existingDocReminder) {
          await Notification.create({
            recipient: user._id,
            type: 'info',
            category: 'reminder',
            message: `Clinical Schedule Reminder: You have ${upcomingVisits.length} patient consultation(s) scheduled in the next 24 hours.`,
            actionUrl: '/dashboard/follow-ups',
            metadata: { reminderDate: todayStr },
          });
        }
      }
    }
  } catch (err) {
    console.warn('Smart reminder generation warning:', err.message);
  }
};

/**
 * @desc    Get all notifications for logged-in user (triggers smart reminder check)
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    // Generate context reminders for user
    await generateSmartReminders(req.user);

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(60);

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

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return sendSuccess(res, 'All notifications marked as read', null);
  } catch (error) {
    console.error('MarkAllAsRead Error:', error.message);
    return sendError(res, 'Server error marking all notifications as read', 500);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return sendError(res, 'Notification not found or access denied', 404);
    }

    return sendSuccess(res, 'Notification deleted successfully', null);
  } catch (error) {
    console.error('DeleteNotification Error:', error.message);
    return sendError(res, 'Server error deleting notification', 500);
  }
};

export { getNotifications, markAsRead, markAllAsRead, deleteNotification };
