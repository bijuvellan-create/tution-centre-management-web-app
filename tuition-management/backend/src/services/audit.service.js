import AuditLog from '../models/AuditLog.js';

/**
 * Writes one audit entry. Failures here must never break the main request,
 * so errors are only logged to the console.
 */
export async function recordAudit({ req, action, entityType, entityId, description, metadata }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id,
      action,
      entityType,
      entityId,
      description,
      metadata,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
    });
  } catch (error) {
    console.error('[audit] failed to write log:', error.message);
  }
}

export default recordAudit;
