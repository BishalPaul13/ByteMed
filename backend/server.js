const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const responseRoutes = require('./routes/responseRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/doctors', doctorRoutes);

const PORT = process.env.PORT || 5000;

// Simple in-memory MongoDB URI for prototype purposes
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bytemed';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
