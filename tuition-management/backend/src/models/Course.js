import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150, index: true },
    subject: { type: String, trim: true, maxlength: 100 },
    grade: { type: String, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 1000 },
    durationMonths: { type: Number, min: 0, max: 120, default: 0 },
    // Standard monthly fee for this course, in paise.
    standardFeePaise: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true }
);

courseSchema.index({ createdAt: -1 });
courseSchema.index({ name: 'text', subject: 'text' });

const Course = mongoose.model('Course', courseSchema);

export default Course;
