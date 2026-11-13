/**
 * ByteMed Stale Reservation & Presence Recovery Worker
 * Implements Doc 1 (Sec 11) & Doc 3 (Sec 9, 10)
 * Reconciles server state and releases doctors who were reserved but where no session established within 60s.
 */

const User = require('../models/User');
const LiveSession = require('../models/LiveSession');
const { logAudit } = require('./auditService');

const RESERVATION_TIMEOUT_MS = 60 * 1000; // 60 seconds lease

async function cleanStaleReservations() {
  try {
    const cutoffTime = new Date(Date.now() - RESERVATION_TIMEOUT_MS);

    // Find sessions in RESERVED state created earlier than cutoff
    const staleSessions = await LiveSession.find({
      status: 'RESERVED',
      startedAt: { $lt: cutoffTime }
    });

    for (const session of staleSessions) {
      session.status = 'TIMEOUT_EXPIRED';
      session.endedAt = new Date();
      await session.save();

      // Release doctor back to AVAILABLE if still in RESERVED state
      const doctor = await User.findOneAndUpdate(
        { _id: session.doctorId, availability: 'RESERVED' },
        { $set: { availability: 'AVAILABLE' } },
        { new: true }
      );

      if (doctor) {
        await logAudit({
          actorId: doctor._id,
          actorRole: 'SYSTEM',
          action: 'DOCTOR_AVAILABILITY_CHANGED',
          targetType: 'DOCTOR',
          targetId: doctor._id,
          details: { 
            reason: 'STALE_RESERVATION_LEASE_EXPIRED', 
            previousState: 'RESERVED', 
            newState: 'AVAILABLE',
            sessionId: session._id
          }
        });
      }
    }

    // Automatically mark doctors OFFLINE if their browser closed or heartbeat ceased (> 60s)
    const inactiveCutoff = new Date(Date.now() - 60000);
    await User.updateMany(
      {
        role: 'DOCTOR',
        availability: 'AVAILABLE',
        $or: [
          { lastActiveAt: { $lt: inactiveCutoff } },
          { lastActiveAt: { $exists: false } }
        ]
      },
      { $set: { availability: 'OFFLINE' } }
    );
  } catch (err) {
    console.error('Error running reservation reconciliation worker:', err);
  }
}

function startReservationWorker(intervalMs = 20000) {
  const timer = setInterval(cleanStaleReservations, intervalMs);
  return timer;
}

module.exports = {
  cleanStaleReservations,
  startReservationWorker
};

