const AuditEvent = require('../models/AuditEvent');

async function logAudit({ actorId, actorRole = 'SYSTEM', action, targetType, targetId, details = {} }) {
  try {
    return await AuditEvent.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error logging audit event:', err);
    return null;
  }
}

module.exports = {
  logAudit
};

