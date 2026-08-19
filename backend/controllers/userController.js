import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @desc    Get current user's profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, 'User profile retrieved successfully', user);
  } catch (error) {
    console.error('GetUserProfile Error:', error.message);
    return sendError(res, 'Server error retrieving profile', 500);
  }
};

/**
 * @desc    Update current user's profile details
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Update top level name if provided
    if (req.body.name) {
      user.name = req.body.name;
    }

    // Update nested profile fields
    if (req.body.profile) {
      const {
        phone,
        bio,
        gender,
        dateOfBirth,
        specialization,
        experienceYears,
        clinicAddress,
        bloodGroup,
        allergies,
      } = req.body.profile;

      // Base fields shared by all roles
      if (phone !== undefined) user.profile.phone = phone;
      if (bio !== undefined) user.profile.bio = bio;
      if (gender !== undefined) user.profile.gender = gender;
      if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;

      // Doctor-specific updates
      if (user.role === 'doctor') {
        if (specialization !== undefined) user.profile.specialization = specialization;
        if (experienceYears !== undefined) user.profile.experienceYears = experienceYears;
        if (clinicAddress !== undefined) user.profile.clinicAddress = clinicAddress;
      }

      // Patient-specific updates
      if (user.role === 'patient') {
        if (bloodGroup !== undefined) user.profile.bloodGroup = bloodGroup;
        if (allergies !== undefined) user.profile.allergies = allergies;
      }
    }

    // Update password if provided (pre-save hook will hash it)
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters long', 400);
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    
    // Omit sensitive data when returning
    updatedUser.password = undefined;

    return sendSuccess(res, 'Profile updated successfully', updatedUser);
  } catch (error) {
    console.error('UpdateUserProfile Error:', error.message);
    return sendError(res, 'Server error updating profile', 500);
  }
};

export { getUserProfile, updateUserProfile };
