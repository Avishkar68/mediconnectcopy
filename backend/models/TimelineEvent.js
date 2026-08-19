import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['medical_record', 'appointment', 'medication', 'vital', 'condition'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    eventDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);
export default TimelineEvent;
