import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide the medication name'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Please provide the dosage'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Please provide the frequency'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    instructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Medication = mongoose.model('Medication', medicationSchema);
export default Medication;
