import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['lab_report', 'prescription', 'scan', 'vaccine', 'other'],
      default: 'other',
    },
    recordDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
