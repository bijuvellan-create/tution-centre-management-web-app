import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 150, index: true },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, lowercase: true, trim: true, maxlength: 200 },
    subjects: { type: [String], default: [] },
    qualifications: { type: String, trim: true, maxlength: 500 },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    // Optional link to a login account (User with role "teacher").
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

teacherSchema.index({ createdAt: -1 });

const Teacher = mongoose.model('Teacher', teacherSchema);

export default Teacher;
