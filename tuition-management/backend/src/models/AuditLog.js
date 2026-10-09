import mongoose from 'mongoose';

/**
 * An append-only trail of important actions (who did what, and when).
 * Useful for accountability. Financial documents are never deleted,
 * only marked, so this log stays reliable.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
