import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'reminder'],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['general', 'appointment', 'reminder', 'care_plan', 'medication', 'emergency', 'consent'],
      default: 'general',
    },
    message: {
      type: String,
      required: true,
    },
    actionUrl: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
