import mongoose from 'mongoose';

const healthProfileSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    conditions: [
      {
        name: { type: String, required: true },
        diagnosedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['active', 'resolved'], default: 'active' },
      },
    ],
    vitals: [
      {
        bloodPressureSystolic: { type: Number },
        bloodPressureDiastolic: { type: Number },
        heartRate: { type: Number },
        temperature: { type: Number },
        weight: { type: Number },
        loggedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const HealthProfile = mongoose.model('HealthProfile', healthProfileSchema);
export default HealthProfile;
