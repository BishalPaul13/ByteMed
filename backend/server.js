const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const responseRoutes = require('./routes/responseRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const reputationRoutes = require('./routes/reputationRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startReservationWorker } = require('./services/reservationWorker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Real-time WebRTC Signaling (Doc 1: Sec 10, Doc 2: Sec 6)
io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName, role });

    socket.on('ready', () => {
      socket.to(roomId).emit('ready', { socketId: socket.id });
    });

    socket.on('offer', (data) => {
      socket.to(roomId).emit('offer', { offer: data.offer, senderSocketId: socket.id });
    });

    socket.on('answer', (data) => {
      socket.to(roomId).emit('answer', { answer: data.answer, senderSocketId: socket.id });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(roomId).emit('ice-candidate', { candidate: data.candidate, senderSocketId: socket.id });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', { socketId: socket.id, userId, userName });
    });
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bytemed';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start background reservation & presence lease recovery worker (Doc 1: Sec 11, Doc 3: Sec 9)
    startReservationWorker(20000);
    server.listen(PORT, () => {
      console.log(`ByteMed Core Server & WebRTC Signaling running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
