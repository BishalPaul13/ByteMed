const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bytemed_secret_key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, credentials } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      credentials: role === 'DOCTOR' ? credentials : null,
      status: role === 'DOCTOR' ? 'PENDING' : undefined
    });
    
    await user.save();
    res.status(201).json({ message: 'User created successfully', user: { id: user._id, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, status: user.status, plusRank: user.plusRank } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
