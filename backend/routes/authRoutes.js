const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bytemed_secret_key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, credentials, specialty, bio } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'PATIENT',
      credentials: role === 'DOCTOR' ? credentials : null,
      specialty: role === 'DOCTOR' ? (specialty || 'General') : undefined,
      bio: bio || '',
      status: role === 'DOCTOR' ? 'PENDING' : 'VERIFIED',
      accountState: 'ACTIVE',
      totalReputationScore: role === 'DOCTOR' ? 100 : 0,
      plusRank: 'Plus 1 (+)',
      rankNumber: 1
    });
    
    await user.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: user._id,
      details: { role: user.role, email: user.email }
    });

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        status: user.status 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.accountState === 'SUSPENDED') {
      return res.status(403).json({ message: 'This account has been suspended by trust & safety moderators.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user._id, role: user.role, status: user.status }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role, 
        status: user.status, 
        accountState: user.accountState,
        specialty: user.specialty,
        plusRank: user.plusRank,
        rankNumber: user.rankNumber,
        totalReputationScore: user.totalReputationScore,
        averageAiScore: user.averageAiScore,
        averagePatientRating: user.averagePatientRating,
        contributionsCount: user.contributionsCount,
        liveSessionsCount: user.liveSessionsCount,
        availability: user.availability
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        accountState: user.accountState,
        specialty: user.specialty,
        plusRank: user.plusRank,
        rankNumber: user.rankNumber,
        totalReputationScore: user.totalReputationScore,
        averageAiScore: user.averageAiScore,
        averagePatientRating: user.averagePatientRating,
        contributionsCount: user.contributionsCount,
        liveSessionsCount: user.liveSessionsCount,
        availability: user.availability
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
