const express = require('express');
const Response = require('../models/Response');
const User = require('../models/User');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { queryId, doctorId, content } = req.body;
    const response = new Response({
      queryId,
      doctorId,
      currentContent: content,
      versions: [{ content }]
    });
    
    await response.save();
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const response = await Response.findById(req.params.id);
    
    if (!response) return res.status(404).json({ message: 'Response not found' });
    
    // Add current content to versions if editing
    response.versions.push({ content: response.currentContent });
    response.currentContent = content;
    
    await response.save();
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body; // 1 to 5
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: 'Response not found' });
    if (response.rating) return res.status(400).json({ message: 'Already rated' });
    
    response.rating = rating;
    await response.save();
    
    // Update Doctor's reputation
    const doctor = await User.findById(response.doctorId);
    if (doctor) {
      doctor.updateRank(rating);
      await doctor.save();
    }
    
    res.json({ message: 'Rating submitted', response, newRank: doctor ? doctor.plusRank : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/query/:queryId', async (req, res) => {
  try {
    const responses = await Response.find({ queryId: req.params.queryId })
      .populate('doctorId', 'name plusRank')
      .sort({ createdAt: -1 });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
