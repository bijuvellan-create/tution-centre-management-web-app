import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 150, index: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'unspecified'], default: 'unspecified' },
    guardianName: { type: String, required: true, trim: true, maxlength: 150 },
    guardianPhone: { type: String, required: true, trim: true, maxlength: 30, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 500 },
    admissionDate: { type: Date, default: Date.now },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    // Agreed monthly tuition fee in paise.
    monthlyFeePaise: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

studentSchema.index({ createdAt: -1 });
studentSchema.index({ fullName: 'text', studentId: 'text', guardianName: 'text' });

const Student = mongoose.model('Student', studentSchema);

export default Student;
