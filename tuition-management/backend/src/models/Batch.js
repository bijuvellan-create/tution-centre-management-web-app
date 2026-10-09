import mongoose from 'mongoose';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', index: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    classDays: { type: [{ type: String, enum: WEEKDAYS }], default: [] },
    startTime: { type: String, trim: true }, // "HH:mm" 24-hour
    endTime: { type: String, trim: true },
    capacity: { type: Number, min: 1, max: 500, default: 30 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    // Enrolled students. Batch sizes are small and bounded by capacity,
    // so embedding references here keeps "who is in this batch" fast.
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

batchSchema.index({ createdAt: -1 });
batchSchema.index({ teacher: 1, status: 1 });

batchSchema.virtual('enrolledCount').get(function enrolledCount() {
  return Array.isArray(this.students) ? this.students.length : 0;
});

const Batch = mongoose.model('Batch', batchSchema);

export { WEEKDAYS };
export default Batch;
