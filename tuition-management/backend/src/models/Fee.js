import mongoose from 'mongoose';

/**
 * A fee due (invoice) raised against a student.
 * The amount is what the student is expected to pay. Payments are stored
 * separately so the full history is preserved.
 */
const feeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // Optional billing period in "YYYY-MM" form (e.g. monthly fee).
    periodLabel: { type: String, trim: true, match: /^\d{4}-\d{2}$/ },
    amountPaise: { type: Number, required: true, min: 1 },
    dueDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 500 },
    // Invoices are never hard-deleted; they may be cancelled instead.
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feeSchema.index({ createdAt: -1 });
feeSchema.index({ dueDate: 1 });
// One monthly invoice per student per period (only when a period is given).
feeSchema.index(
  { student: 1, periodLabel: 1 },
  { unique: true, partialFilterExpression: { periodLabel: { $type: 'string' } } }
);

const Fee = mongoose.model('Fee', feeSchema);

export default Fee;
