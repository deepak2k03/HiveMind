import { Room } from '../models/Room.js';
import { performFedAvg } from '../utils/fedAvg.js';

// In-memory store for the current round's weight submissions
// Map<roomId, Array<Weights>>
const roomWeightSubmissions = new Map();

export const setupSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);
    socket.data.joinedRooms = new Set();

    // 1. Client joins a training room
    socket.on('JOIN_ROOM', async ({ roomId, userId }) => {
      const normalizedRoomId = String(roomId || '').trim().toUpperCase();
      if (!normalizedRoomId) {
        socket.emit('ERROR', { message: 'roomId is required' });
        return;
      }

      roomId = normalizedRoomId;
      socket.join(roomId);
      socket.data.joinedRooms.add(roomId);
      
      // Upsert the room and increment connected devices
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $inc: { deviceCount: 1 } },
        { new: true, upsert: true }
      );

      // Notify everyone in the room to update their 3D UI
      io.to(roomId).emit('ROOM_STATE_UPDATE', {
        peers: room.deviceCount,
        currentRound: room.currentRound,
      });
      
      console.log(`User ${userId || socket.id} joined room ${roomId}. Total devices: ${room.deviceCount}`);
    });

    // 2. Host clicks "Start" -> Tell all GPUs to begin
    socket.on('START_TRAINING', async ({ roomId }) => {
      // Reset the submission collector for this new round
      roomWeightSubmissions.set(roomId, []);
      
      await Room.findOneAndUpdate({ roomId }, { isTraining: true });
      
      console.log(`🚀 Initiating training sequence for room ${roomId}`);
      io.to(roomId).emit('TRAINING_STARTED'); // Triggers the Web Workers on the frontend!
    });

    // 3. Client finishes local epoch and sends weights
    socket.on('SUBMIT_WEIGHTS', async ({ roomId, weights }) => {
      console.log(`📥 Received tensor payload from ${socket.id} for room ${roomId}`);
      
      const submissions = roomWeightSubmissions.get(roomId) || [];
      submissions.push(weights);
      roomWeightSubmissions.set(roomId, submissions);

      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('ERROR', { message: `Room ${roomId} does not exist` });
        return;
      }

      // If we have received weights from EVERY connected device...
      if (submissions.length >= room.deviceCount) {
        console.log(`🧠 All weights received for room ${roomId}. Computing FedAvg...`);
        
        // Compute the new global model
        const globalWeights = performFedAvg(submissions);
        
        // Update database state
        const updatedRoom = await Room.findOneAndUpdate(
          { roomId },
          { 
            $inc: { currentRound: 1 }, 
            isTraining: false,
            // In a full production app, you'd serialize globalWeights to a Buffer here to save it
          },
          { new: true }
        );

        // Broadcast the new global brain back to the clients
        io.to(roomId).emit('GLOBAL_WEIGHTS_UPDATED', {
          round: updatedRoom.currentRound,
          globalWeights: globalWeights,
        });

        // Clear memory for the next round
        roomWeightSubmissions.set(roomId, []);
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (${reason})`);

      // Keep peer counts correct when a browser refresh/tab close happens.
      const joinedRooms = Array.from(socket.data.joinedRooms || []);
      for (const roomId of joinedRooms) {
        const room = await Room.findOneAndUpdate(
          { roomId },
          { $inc: { deviceCount: -1 } },
          { new: true }
        );

        if (room && room.deviceCount < 0) {
          room.deviceCount = 0;
          await room.save();
        }

        const latest = await Room.findOne({ roomId });
        if (latest) {
          io.to(roomId).emit('ROOM_STATE_UPDATE', {
            peers: latest.deviceCount,
            currentRound: latest.currentRound,
          });
        }
      }
    });
  });
};