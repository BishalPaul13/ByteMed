const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  
  // AI Triage Mock Data
  aiTriage: {
    isEmergency: { type: Boolean, default: false },
    confidenceScore: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Query', QuerySchema);
