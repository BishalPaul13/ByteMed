/**
 * ByteMed Reputation & Ranking Engine
 * Implements Section 12, 13, 14 of Lifecycle Model
 * Implements Section 11, 12 of Module Architecture
 * Brand architecture: Byte -> 8 bits -> 8 contribution ranks (Plus 1 to Plus 8)
 */

const User = require('../models/User');
const ContributionLedger = require('../models/ContributionLedger');
const AuditEvent = require('../models/AuditEvent');
const Notification = require('../models/Notification');

// Ranks definition: Byte -> 8 bits -> 8 ranks
const RANKS = [
  { rank: 1, name: 'Plus 1 (+)', title: 'Entry Contributor', minScore: 0, description: 'Newly verified contributor with initial clinical contributions.' },
  { rank: 2, name: 'Plus 2 (++)', title: 'Active Contributor', minScore: 250, description: 'Early sustained contribution record with positive peer and patient reception.' },
  { rank: 3, name: 'Plus 3 (+++)', title: 'Trusted Contributor', minScore: 500, description: 'Established contributor with reliable clinical safety and consistent activity.' },
  { rank: 4, name: 'Plus 4 (++++)', title: 'Senior Contributor', minScore: 850, description: 'High-impact clinical advisor demonstrating thorough guidance.' },
  { rank: 5, name: 'Plus 5 (+++++)', title: 'Expert Contributor', minScore: 1300, description: 'Consistently exceptional quality across complex medical categories.' },
  { rank: 6, name: 'Plus 6 (++++++)', title: 'Distinguished Contributor', minScore: 1850, description: 'Distinguished community record, multi-specialty triage, and top trust signals.' },
  { rank: 7, name: 'Plus 7 (+++++++)', title: 'Elite Contributor', minScore: 2500, description: 'Elite physician contributor with high volume and peer-validated accuracy.' },
  { rank: 8, name: 'Plus 8 (++++++++)', title: 'Master Contributor', minScore: 3300, description: 'Highest ByteMed contribution rank; cornerstone medical leader on the platform.' }
];

function resolveRank(score) {
  let matched = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.minScore) {
      matched = r;
    }
  }
  return matched;
}

/**
 * Record doctor contribution in the ledger and update doctor reputation
 */
async function recordContribution({
  doctorId,
  contributionType, // 'ASYNC_RESPONSE' | 'LIVE_SESSION'
  referenceId,
  aiEvaluation = null,
  feedback = null,
  durationMinutes = 0
}) {
  try {
    const doctor = await User.findById(doctorId);
    if (!doctor) return null;

    // Calculate contribution points per formula
    let points = 25; // Base contribution baseline

    let aiScore = 85;
    let aiConf = 0.9;
    let safetyScore = 95;

    if (aiEvaluation) {
      aiScore = aiEvaluation.compositeScore || 85;
      aiConf = aiEvaluation.confidence || 0.9;
      safetyScore = aiEvaluation.safety || 95;
      
      // Quality weight: up to 40 points from AI evaluation
      points += Math.round((aiScore / 100) * aiConf * 35);
      
      // Safety penalty if flagged
      if (aiEvaluation.outcome === 'SAFETY_FLAG') {
        points = Math.max(5, points - 30);
      }
    }

    let patientAvg = 5.0;
    let trustWeight = 1.0;

    if (feedback) {
      const avgRating = (feedback.helpfulness + feedback.clarity + feedback.communication) / 3;
      patientAvg = avgRating;
      trustWeight = feedback.trustWeight || 1.0;
      
      // Feedback weight: up to 35 points from patient feedback
      points += Math.round((avgRating / 5) * 35 * trustWeight);
    } else {
      // Default initial credit if patient has not rated yet
      points += 20;
    }

    if (contributionType === 'LIVE_SESSION') {
      // Live sessions get additional dedicated time bonus (up to 30 points)
      const durationBonus = Math.min(30, Math.round(durationMinutes * 2));
      points += 15 + durationBonus;
    } else if (contributionType === 'PEER_ENDORSEMENT') {
      points = 20; // Peer clinical review & consensus endorsement
    } else if (contributionType === 'FOLLOW_UP_REPLY') {
      points = 25; // Patient follow-up clarification answered
    }

    // Save ledger entry (immutable record per Doc 1: Sec 12)
    const ledgerEntry = new ContributionLedger({
      doctorId,
      contributionType,
      referenceId,
      aiEvaluationSnapshot: {
        compositeScore: aiScore,
        confidence: aiConf,
        safetyScore
      },
      feedbackSnapshot: {
        averageRating: patientAvg,
        trustWeight
      },
      pointsAwarded: points,
      formulaVersion: 'v1.2-canonical',
      explanation: contributionType === 'LIVE_SESSION'
        ? `Completed live telehealth consultation (${durationMinutes} mins)`
        : contributionType === 'PEER_ENDORSEMENT'
        ? 'Peer physician clinical consensus endorsement'
        : contributionType === 'FOLLOW_UP_REPLY'
        ? 'Answered patient clinical follow-up clarification'
        : `Published clinical query response (AI Quality: ${aiScore}%, Patient Rating: ${patientAvg.toFixed(1)}/5)`
    });

    await ledgerEntry.save();

    // Now reproject doctor's reputation stats
    const oldRankNumber = doctor.rankNumber || 1;
    await recomputeDoctorReputation(doctorId);

    const updatedDoctor = await User.findById(doctorId);

    // If rank increased, emit Rank Advancement notification!
    if (updatedDoctor && updatedDoctor.rankNumber > oldRankNumber) {
      await Notification.create({
        recipientId: doctorId,
        title: `🎖️ Rank Promoted: ${updatedDoctor.plusRank}`,
        message: `Congratulations Dr. ${doctor.name}! Your sustained clinical contributions have earned you the ${updatedDoctor.plusRank} (${updatedDoctor.totalReputationScore} points) tier.`,
        type: 'RANK_ADVANCEMENT',
        link: '/leaderboard'
      });
    }

    return ledgerEntry;
  } catch (err) {
    console.error('Error recording contribution to ledger:', err);
    throw err;
  }
}

/**
 * Recomputes doctor's total reputation score from the ledger (Event-derived projection)
 */
async function recomputeDoctorReputation(doctorId) {
  const doctor = await User.findById(doctorId);
  if (!doctor) return null;

  const ledgerEntries = await ContributionLedger.find({ 
    doctorId, 
    isQuarantined: { $ne: true } 
  });

  let totalScore = 100; // Base starting points for verified physician
  let sumAiScores = 0;
  let countAiScores = 0;
  let sumFeedback = 0;
  let countFeedback = 0;
  let asyncCount = 0;
  let liveCount = 0;

  for (const entry of ledgerEntries) {
    totalScore += entry.pointsAwarded || 0;
    
    if (entry.contributionType === 'ASYNC_RESPONSE') asyncCount++;
    if (entry.contributionType === 'LIVE_SESSION') liveCount++;

    if (entry.aiEvaluationSnapshot?.compositeScore) {
      sumAiScores += entry.aiEvaluationSnapshot.compositeScore;
      countAiScores++;
    }
    if (entry.feedbackSnapshot?.averageRating) {
      sumFeedback += entry.feedbackSnapshot.averageRating;
      countFeedback++;
    }
  }

  const rankInfo = resolveRank(totalScore);

  doctor.totalReputationScore = totalScore;
  doctor.rankNumber = rankInfo.rank;
  doctor.plusRank = rankInfo.name;
  doctor.contributionsCount = asyncCount;
  doctor.liveSessionsCount = liveCount;
  if (countAiScores > 0) doctor.averageAiScore = Math.round(sumAiScores / countAiScores);
  if (countFeedback > 0) doctor.averagePatientRating = parseFloat((sumFeedback / countFeedback).toFixed(1));

  await doctor.save();

  // Audit log
  await AuditEvent.create({
    actorId: doctorId,
    actorRole: 'SYSTEM',
    action: 'REPUTATION_RECALCULATED',
    targetType: 'DOCTOR',
    targetId: doctorId,
    details: { totalScore, rank: rankInfo.name, ledgerCount: ledgerEntries.length }
  });

  return doctor;
}

/**
 * Get explainability breakdown for a doctor
 */
async function getDoctorReputationBreakdown(doctorId) {
  const doctor = await User.findById(doctorId).select('-password');
  if (!doctor) return null;

  const currentRank = resolveRank(doctor.totalReputationScore || 100);
  const nextRank = RANKS.find(r => r.rank === currentRank.rank + 1) || null;

  let progressPercent = 100;
  let pointsNeeded = 0;
  if (nextRank) {
    const currentMin = currentRank.minScore;
    const nextMin = nextRank.minScore;
    const progress = Math.max(0, doctor.totalReputationScore - currentMin);
    const range = nextMin - currentMin;
    progressPercent = Math.min(100, Math.round((progress / range) * 100));
    pointsNeeded = Math.max(0, nextMin - doctor.totalReputationScore);
  }

  const recentContributions = await ContributionLedger.find({ doctorId })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    doctor: {
      id: doctor._id,
      name: doctor.name,
      credentials: doctor.credentials,
      specialty: doctor.specialty || 'General',
      status: doctor.status,
      availability: doctor.availability,
      totalReputationScore: doctor.totalReputationScore,
      plusRank: doctor.plusRank,
      rankNumber: doctor.rankNumber,
      rankTitle: currentRank.title,
      rankDescription: currentRank.description,
      averageAiScore: doctor.averageAiScore || 88,
      averagePatientRating: doctor.averagePatientRating || 4.9,
      contributionsCount: doctor.contributionsCount || 0,
      liveSessionsCount: doctor.liveSessionsCount || 0
    },
    ranking: {
      currentRank,
      nextRank,
      progressPercent,
      pointsNeeded
    },
    recentContributions,
    formulaExplainer: {
      components: [
        { name: 'Base Physician Verification', points: '100 pts starting foundation' },
        { name: 'AI Clinical Quality', points: 'Up to 35 pts per response weighted by clinical confidence' },
        { name: 'Patient Feedback', points: 'Up to 35 pts per consultation based on multi-dimensional patient ratings' },
        { name: 'Live Telehealth Sessions', points: 'Up to 50 pts based on active consultation length & patient review' }
      ],
      allRanks: RANKS
    }
  };
}

module.exports = {
  RANKS,
  resolveRank,
  recordContribution,
  recomputeDoctorReputation,
  getDoctorReputationBreakdown
};

