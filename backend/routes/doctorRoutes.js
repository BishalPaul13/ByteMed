const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Mock endpoint to approve doctor
router.put('/:id/approve', async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'DOCTOR') return res.status(404).json({ message: 'Doctor not found' });
    
    doctor.status = 'VERIFIED';
    await doctor.save();
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update availability toggle
router.put('/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    if (!['AVAILABLE', 'OFFLINE'].includes(availability)) {
      return res.status(400).json({ message: 'Invalid availability state' });
    }
    
    const doctor = await User.findByIdAndUpdate(req.params.id, { availability }, { new: true });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a live consultation (Atomic Lock)
router.post('/:id/book', async (req, res) => {
  try {
    // Atomic lock: Only update if the doctor is currently AVAILABLE
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'DOCTOR', availability: 'AVAILABLE' },
      { $set: { availability: 'RESERVED' } },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(409).json({ message: 'Doctor is not available or already reserved by another patient' });
    }
    
    res.json({ message: 'Consultation booked successfully', roomUrl: `/room/${doctor._id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End session
router.post('/:id/end-session', async (req, res) => {
  try {
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'DOCTOR', availability: 'RESERVED' },
      { $set: { availability: 'AVAILABLE' } },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(400).json({ message: 'Doctor is not in a reserved state' });
    }
    
    res.json({ message: 'Session ended, doctor is available again' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
