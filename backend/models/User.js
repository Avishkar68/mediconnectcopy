import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default in queries
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    profile: {
      phone: { type: String, default: '' },
      bio: { type: String, default: '' },
      gender: { type: String, default: '' },
      dateOfBirth: { type: Date, default: null },
      // Doctor specific fields
      specialization: { type: String, default: '' },
      experienceYears: { type: Number, default: 0 },
      clinicAddress: { type: String, default: '' },
      // Patient specific fields
      bloodGroup: { type: String, default: '' },
      allergies: [{ type: String }],
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    doctorVerification: {
      licenseNumber: { type: String, default: '' },
      medicalCouncil: { type: String, default: '' },
      hospitalAffiliation: { type: String, default: '' },
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
      rejectionReason: { type: String, default: '' },
      submittedAt: { type: Date, default: Date.now },
      verifiedAt: { type: Date, default: null },
    },
    emergencyAccess: {
      enabled: {
        type: Boolean,
        default: false,
      },
      token: {
        type: String,
        default: null,
        index: true,
      },
      tokenExpiresAt: {
        type: Date,
        default: null,
      },
      settings: {
        bloodGroup: { type: Boolean, default: true },
        allergies: { type: Boolean, default: true },
        medications: { type: Boolean, default: true },
        conditions: { type: Boolean, default: true },
        emergencyContact: { type: Boolean, default: true },
        criticalNotes: { type: Boolean, default: false },
      },
      emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        relation: { type: String, default: '' },
      },
      criticalNotes: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
