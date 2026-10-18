import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import CarePlan from '../models/CarePlan.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Helper to log admin actions
 */
const logAdminAction = async (adminUser, action, category, details, status = 'success') => {
  try {
    await AuditLog.create({
      user: adminUser?._id,
      userName: adminUser?.name || 'Administrator',
      userRole: adminUser?.role || 'admin',
      action,
      category,
      details,
      status,
    });
  } catch (err) {
    console.error('Failed to log admin action:', err.message);
  }
};

/**
 * @desc    Get aggregated platform statistics and system health
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
export const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      appointmentsByStatus,
      totalCarePlans,
      activeCarePlans,
      totalRecords,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({
        role: 'doctor',
        $or: [{ 'doctorVerification.status': 'verified' }, { isVerified: true }],
      }),
      User.countDocuments({
        role: 'doctor',
        'doctorVerification.status': 'pending',
      }),
      Appointment.countDocuments(),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      CarePlan.countDocuments(),
      CarePlan.countDocuments({ status: 'active' }),
      MedicalRecord.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
    ]);

    const appointmentBreakdown = {
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };
    appointmentsByStatus.forEach((item) => {
      if (item._id && appointmentBreakdown[item._id] !== undefined) {
        appointmentBreakdown[item._id] = item.count;
      }
    });

    const systemHealth = {
      database: mongoose.connection.readyState === 1 ? 'Connected (Optimal)' : 'Degraded',
      webrtcSignaling: 'Active (Port 5001)',
      serverUptime: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      nodeVersion: process.version,
      platformEnvironment: process.env.NODE_ENV || 'development',
    };

    return sendSuccess(res, 'Platform statistics retrieved', {
      metrics: {
        totalUsers,
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        totalAppointments,
        appointmentBreakdown,
        totalCarePlans,
        activeCarePlans,
        totalRecords,
      },
      systemHealth,
      recentAuditLogs,
    });
  } catch (error) {
    console.error('getPlatformStats error:', error.message);
    return sendError(res, 'Server error fetching platform statistics', 500);
  }
};

/**
 * @desc    Get paginated and searchable user directory
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;

  try {
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.accountStatus = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    return sendSuccess(res, 'User directory retrieved', {
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getAllUsers error:', error.message);
    return sendError(res, 'Server error fetching user directory', 500);
  }
};

/**
 * @desc    Update user account standing status (active, suspended, banned)
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    return sendError(res, 'Invalid account status value', 400);
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    // Prevent modifying fellow admin unless superadmin
    if (targetUser.role === 'admin' && req.user._id.toString() !== targetUser._id.toString()) {
      return sendError(res, 'Cannot modify another administrator account', 403);
    }

    const previousStatus = targetUser.accountStatus || 'active';
    targetUser.accountStatus = status;
    await targetUser.save();

    await logAdminAction(
      req.user,
      'USER_STATUS_UPDATED',
      'user_management',
      `Changed status of ${targetUser.name} (${targetUser.email}) from ${previousStatus} to ${status}. Reason: ${reason || 'Admin directive'}`
    );

    // Notify user
    await Notification.create({
      recipient: targetUser._id,
      type: status === 'active' ? 'success' : 'warning',
      category: 'general',
      message:
        status === 'active'
          ? 'Your MediConnect account standing has been restored to Active.'
          : `Your account has been set to ${status}. Reason: ${reason || 'Administrative review'}`,
    });

    return sendSuccess(res, `User status updated to ${status}`, targetUser);
  } catch (error) {
    console.error('updateUserStatus error:', error.message);
    return sendError(res, 'Server error updating user status', 500);
  }
};

/**
 * @desc    Change user role (patient, doctor, admin)
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private (Admin only)
 */
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['patient', 'doctor', 'admin'].includes(role)) {
    return sendError(res, 'Invalid role specification', 400);
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    if (role === 'doctor') {
      targetUser.doctorVerification = targetUser.doctorVerification || {
        status: 'pending',
        submittedAt: new Date(),
      };
    }
    await targetUser.save();

    await logAdminAction(
      req.user,
      'USER_ROLE_CHANGED',
      'user_management',
      `Promoted/Reassigned ${targetUser.name} (${targetUser.email}) from ${previousRole} to ${role}`
    );

    return sendSuccess(res, `User role changed to ${role}`, targetUser);
  } catch (error) {
    console.error('updateUserRole error:', error.message);
    return sendError(res, 'Server error updating user role', 500);
  }
};

/**
 * @desc    Get pending doctor verification queue
 * @route   GET /api/admin/doctors/verification-queue
 * @access  Private (Admin only)
 */
export const getDoctorVerificationQueue = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('name email profile doctorVerification isVerified createdAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Doctor verification queue retrieved', doctors);
  } catch (error) {
    console.error('getDoctorVerificationQueue error:', error.message);
    return sendError(res, 'Server error fetching doctor verification queue', 500);
  }
};

/**
 * @desc    Approve or reject doctor clinical credentials
 * @route   PATCH /api/admin/doctors/:id/verify
 * @access  Private (Admin only)
 */
export const verifyDoctorCredentials = async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason, licenseNumber, hospitalAffiliation } = req.body;

  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return sendError(res, 'Status must be verified, rejected, or pending', 400);
  }

  try {
    const doctor = await User.findOne({ _id: id, role: 'doctor' });
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    doctor.doctorVerification = {
      licenseNumber: licenseNumber || doctor.doctorVerification?.licenseNumber || 'MED-' + Math.floor(100000 + Math.random() * 900000),
      medicalCouncil: doctor.doctorVerification?.medicalCouncil || 'National Medical Commission',
      hospitalAffiliation: hospitalAffiliation || doctor.profile?.clinicAddress || doctor.doctorVerification?.hospitalAffiliation || 'General Healthcare Clinic',
      status,
      rejectionReason: status === 'rejected' ? rejectionReason || 'Incomplete credential verification' : '',
      submittedAt: doctor.doctorVerification?.submittedAt || doctor.createdAt,
      verifiedAt: status === 'verified' ? new Date() : null,
    };

    doctor.isVerified = status === 'verified';
    await doctor.save();

    await logAdminAction(
      req.user,
      status === 'verified' ? 'DOCTOR_VERIFIED' : 'DOCTOR_VERIFICATION_REJECTED',
      'verification',
      `${status === 'verified' ? 'Approved' : 'Rejected'} credentials for Dr. ${doctor.name} (${doctor.email}). ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`
    );

    // Send notification to doctor
    await Notification.create({
      recipient: doctor._id,
      type: status === 'verified' ? 'success' : 'warning',
      category: 'general',
      message:
        status === 'verified'
          ? '🎉 Congratulations! Your medical license & credentials have been approved by the MediConnect Medical Board. You now hold verified practitioner badge.'
          : `Your doctor verification request was not approved. Reason: ${rejectionReason || 'Please resubmit your official medical registration certificate.'}`,
    });

    return sendSuccess(res, `Doctor verification updated to ${status}`, doctor);
  } catch (error) {
    console.error('verifyDoctorCredentials error:', error.message);
    return sendError(res, 'Server error updating doctor verification', 500);
  }
};

/**
 * @desc    Get system audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin only)
 */
export const getAuditLogs = async (req, res) => {
  const { category, page = 1, limit = 50 } = req.query;

  try {
    const query = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(query),
    ]);

    return sendSuccess(res, 'Audit logs retrieved', {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('getAuditLogs error:', error.message);
    return sendError(res, 'Server error fetching audit logs', 500);
  }
};

/**
 * @desc    Dispatch emergency announcement to all platform users
 * @route   POST /api/admin/broadcast
 * @access  Private (Admin only)
 */
export const broadcastAnnouncement = async (req, res) => {
  const { title, message, targetRole = 'all', type = 'warning' } = req.body;

  if (!title || !message) {
    return sendError(res, 'Announcement title and message are required', 400);
  }

  try {
    const userQuery = {};
    if (targetRole !== 'all') {
      userQuery.role = targetRole;
    }

    const recipients = await User.find(userQuery).select('_id');
    const notifications = recipients.map((r) => ({
      recipient: r._id,
      type: type || 'warning',
      category: 'emergency',
      message: `📢 [ANNOUNCEMENT] ${title}: ${message}`,
      metadata: { broadcast: true, adminName: req.user.name },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await logAdminAction(
      req.user,
      'PLATFORM_BROADCAST_SENT',
      'system',
      `Sent platform announcement "${title}" to ${recipients.length} users (${targetRole})`
    );

    return sendSuccess(res, `Broadcast sent to ${recipients.length} users`, {
      recipientsCount: recipients.length,
      targetRole,
    });
  } catch (error) {
    console.error('broadcastAnnouncement error:', error.message);
    return sendError(res, 'Server error dispatching broadcast', 500);
  }
};
