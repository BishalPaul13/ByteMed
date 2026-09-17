const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN'], default: 'PATIENT' },
  
  // Doctor specific fields
  credentials: { type: String }, // Mock URL or text
  status: { type: String, enum: ['PENDING', 'VERIFIED'], default: 'PENDING' },
  availability: { type: String, enum: ['AVAILABLE', 'OFFLINE', 'RESERVED'], default: 'OFFLINE' },
  
  // Reputation specific fields
  ratingSum: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  plusRank: { type: String, default: 'Plus 1 (+)' }
}, { timestamps: true });

UserSchema.methods.updateRank = function(newRating) {
  this.ratingSum += newRating;
  this.ratingCount += 1;
  const avg = this.ratingSum / this.ratingCount;
  
  // Simple mapping logic for 1-5 to Plus 1-8
  // 1 -> Plus 1 (+), 5 -> Plus 8 (++++++++)
  const rankNumber = Math.max(1, Math.min(8, Math.round((avg / 5) * 8)));
  this.plusRank = `Plus ${rankNumber} (${'+'.repeat(rankNumber)})`;
};

module.exports = mongoose.model('User', UserSchema);
