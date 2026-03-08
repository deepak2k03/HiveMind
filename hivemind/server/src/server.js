import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import { socketAuth } from './middleware/socketAuth.js';
import { setupSockets } from './sockets/socketManager.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const httpServer = createServer(app);

// Initialize Socket.io with CORS allowing your React client
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
  // We increase the maxHttpBufferSize so large tensor payloads don't get rejected
  maxHttpBufferSize: 1e8 // 100 MB
});

io.use(socketAuth);

// Setup socket event listeners
setupSockets(io);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'HiveMind Coordinator Online' });
});

// Connect to MongoDB and start the server
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hivemind';

connectDB(MONGO_URI)
  .then(() => {
    console.log('📦 Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Coordinator running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });