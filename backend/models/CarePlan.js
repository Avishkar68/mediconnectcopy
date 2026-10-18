import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
  phaseNumber: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  durationDays: {
    type: Number,
    default: 7,
  },
  description: {
    type: String,
    default: '',
  },
  goals: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
});

const dailyTaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['vital', 'medication', 'exercise', 'diet', 'lifestyle', 'symptom_check'],
    default: 'lifestyle',
  },
  frequency: {
    type: String,
    enum: ['daily', 'twice_daily', 'weekly', 'as_needed'],
    default: 'daily',
  },
  instructions: {
    type: String,
    default: '',
  },
  targetMetric: {
    metricName: { type: String, default: '' },
    targetValue: { type: String, default: '' },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const taskCompletionSchema = new mongoose.Schema({
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    default: '',
  },
  loggedValue: {
    type: String,
    default: 'completed',
  },
});

const carePlanSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Please provide care plan title'],
      trim: true,
    },
    diagnosis: {
      type: String,
      required: [true, 'Please provide diagnosis or condition focus'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['cardiac', 'diabetes', 'post-op', 'hypertension', 'respiratory', 'orthopedic', 'general', 'lifestyle'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'discontinued'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    targetEndDate: {
      type: Date,
    },
    phases: [phaseSchema],
    dailyTasks: [dailyTaskSchema],
    taskCompletions: [taskCompletionSchema],
    targetVitals: {
      systolicMax: { type: Number, default: null },
      diastolicMax: { type: Number, default: null },
      heartRateTarget: { type: String, default: '' },
      bloodSugarTarget: { type: String, default: '' },
      weightTargetKg: { type: Number, default: null },
      specialNotes: { type: String, default: '' },
    },
    doctorReviews: [
      {
        date: { type: Date, default: Date.now },
        note: { type: String, required: true },
        doctorName: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CarePlan = mongoose.model('CarePlan', carePlanSchema);
export default CarePlan;
