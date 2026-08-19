import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
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
    dateTime: {
      type: Date,
      required: [true, 'Please provide appointment date and time'],
    },
    purpose: {
      type: String,
      required: [true, 'Please provide the purpose of the appointment'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
