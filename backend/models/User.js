const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'MODERATOR'], default: 'PATIENT' },
  
  // Account state per Section 3 & 4 of Lifecycle Model
  accountState: { 
    type: String, 
    enum: ['ACTIVE', 'RESTRICTED', 'SUSPENDED', 'DEACTIVATED'], 
    default: 'ACTIVE' 
  },

  // Doctor specific fields
  specialty: { type: String, default: 'General' },
  bio: { type: String, default: '' },
  credentials: { type: String }, // e.g., 'MD - Harvard Medical (Cardiology) - Lic #78921'
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'], default: 'PENDING' },
  availability: { type: String, enum: ['AVAILABLE', 'OFFLINE', 'RESERVED', 'IN_SESSION'], default: 'OFFLINE' },
  lastActiveAt: { type: Date, default: Date.now },
  
  // Reputation specific fields (Plus 1 to Plus 8, Doc 1 & Doc 2)
  totalReputationScore: { type: Number, default: 100 },
  rankNumber: { type: Number, default: 1, min: 1, max: 8 },
  plusRank: { type: String, default: 'Plus 1 (+)' },
  contributionsCount: { type: Number, default: 0 },
  liveSessionsCount: { type: Number, default: 0 },
  averageAiScore: { type: Number, default: 85 },
  averagePatientRating: { type: Number, default: 5.0 },
  
  // Legacy fields for backward compatibility
  ratingSum: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

// Rank lookup helper for 8 contribution ranks (Byte -> 8 bits -> 8 ranks)
const RANK_NAMES = [
  { rank: 1, name: 'Plus 1 (+)', title: 'Entry Contributor', minScore: 0 },
  { rank: 2, name: 'Plus 2 (++)', title: 'Active Contributor', minScore: 250 },
  { rank: 3, name: 'Plus 3 (+++)', title: 'Trusted Contributor', minScore: 500 },
  { rank: 4, name: 'Plus 4 (++++)', title: 'Senior Contributor', minScore: 850 },
  { rank: 5, name: 'Plus 5 (+++++)', title: 'Expert Contributor', minScore: 1300 },
  { rank: 6, name: 'Plus 6 (++++++)', title: 'Distinguished Contributor', minScore: 1850 },
  { rank: 7, name: 'Plus 7 (+++++++)', title: 'Elite Contributor', minScore: 2500 },
  { rank: 8, name: 'Plus 8 (++++++++)', title: 'Master Contributor', minScore: 3300 }
];

UserSchema.statics.RANK_NAMES = RANK_NAMES;

UserSchema.statics.getRankForScore = function(score) {
  let matched = RANK_NAMES[0];
  for (const r of RANK_NAMES) {
    if (score >= r.minScore) {
      matched = r;
    }
  }
  return matched;
};

UserSchema.methods.updateRank = function(newRating) {
  this.ratingSum += newRating;
  this.ratingCount += 1;
  const avg = this.ratingSum / this.ratingCount;
  this.averagePatientRating = parseFloat(avg.toFixed(1));
  
  // Also increment total score
  this.totalReputationScore += Math.round(newRating * 25);
  const rankInfo = this.constructor.getRankForScore(this.totalReputationScore);
  this.rankNumber = rankInfo.rank;
  this.plusRank = rankInfo.name;
};

module.exports = mongoose.model('User', UserSchema);
