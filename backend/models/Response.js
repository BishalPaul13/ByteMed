const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ResponseSchema = new mongoose.Schema({
  queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentContent: { type: String, required: true },
  versions: [VersionSchema],
  rating: { type: Number, min: 1, max: 5 } // Patient rating
}, { timestamps: true });

module.exports = mongoose.model('Response', ResponseSchema);
