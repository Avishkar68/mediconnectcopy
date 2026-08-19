import mongoose from 'mongoose';

const doctorAccessSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: ['view_records', 'view_vitals'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked', 'expired'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorAccess = mongoose.model('DoctorAccess', doctorAccessSchema);
export default DoctorAccess;
