const express = require('express');
const Query = require('../models/Query');
const router = express.Router();

const EMERGENCY_KEYWORDS = ['chest pain', 'bleeding', 'heart attack', 'stroke', 'unconscious', 'breathing difficulty'];

const mockAITriage = (title, description) => {
  const text = (title + ' ' + description).toLowerCase();
  const isEmergency = EMERGENCY_KEYWORDS.some(kw => text.includes(kw));
  
  // Mock confidence score calculation (0 to 1)
  const confidenceScore = Math.random() * (1 - 0.7) + 0.7; // Random between 0.7 and 1.0
  
  return { isEmergency, confidenceScore: parseFloat(confidenceScore.toFixed(2)) };
};

router.post('/', async (req, res) => {
  try {
    const { title, description, category, patientId } = req.body;
    
    const triageResult = mockAITriage(title, description);
    
    const query = new Query({
      title,
      description,
      category,
      patientId,
      aiTriage: triageResult
    });
    
    await query.save();
    res.status(201).json(query);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'OPEN' };
    if (category) filter.category = category;
    
    const queries = await Query.find(filter).populate('patientId', 'name').sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
