const express = require('express');
const User = require('../models/User');
const { RANKS, getDoctorReputationBreakdown, recomputeDoctorReputation } = require('../services/reputationService');

const router = express.Router();

/**
 * Get Leaderboard of verified physicians (Doc 1: Sec 12, 13; Doc 2: Sec 13)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { specialty, rank } = req.query;
    const filter = { role: 'DOCTOR', status: 'VERIFIED' };

    if (specialty && specialty !== 'All') {
      filter.specialty = specialty;
    }
    if (rank) {
      filter.rankNumber = Number(rank);
    }

    const doctors = await User.find(filter)
      .select('name specialty credentials status availability plusRank rankNumber totalReputationScore averageAiScore averagePatientRating contributionsCount liveSessionsCount createdAt')
      .sort({ totalReputationScore: -1 });

    res.json({
      totalDoctors: doctors.length,
      ranks: RANKS,
      doctors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get canonical 8 ranks specification
 */
router.get('/ranks', (req, res) => {
  res.json(RANKS);
});

/**
 * Get transparent reputation breakdown & explanation for a doctor
 */
router.get('/doctor/:id', async (req, res) => {
  try {
    const breakdown = await getDoctorReputationBreakdown(req.params.id);
    if (!breakdown) return res.status(404).json({ message: 'Doctor not found' });
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Trigger reputation recalculation from ledger (Admin or doctor request)
 */
router.post('/recalculate/:id', async (req, res) => {
  try {
    const doctor = await recomputeDoctorReputation(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Reputation recalculated successfully from ledger', doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

