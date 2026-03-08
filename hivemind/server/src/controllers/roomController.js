import { Room } from '../models/Room.js';

export const createRoom = async (req, res) => {
	try {
		const requestedRoomId = (req.body?.roomId || '').trim().toUpperCase();
		const roomId = requestedRoomId || `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

		const existing = await Room.findOne({ roomId });
		if (existing) {
			return res.status(409).json({ message: 'Room already exists', roomId });
		}

		const room = await Room.create({
			roomId,
			hostUser: req.user?.id || null,
			deviceCount: 0,
			currentRound: 0,
			isTraining: false,
		});

		return res.status(201).json({
			roomId: room.roomId,
			peers: room.deviceCount,
			currentRound: room.currentRound,
			isTraining: room.isTraining,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Could not create room' });
	}
};

export const joinRoom = async (req, res) => {
	try {
		const roomId = (req.params.roomId || '').trim().toUpperCase();
		if (!roomId) {
			return res.status(400).json({ message: 'roomId is required' });
		}

		const room = await Room.findOne({ roomId });
		if (!room) {
			return res.status(404).json({ message: 'Room not found' });
		}

		return res.status(200).json({
			roomId: room.roomId,
			peers: room.deviceCount,
			currentRound: room.currentRound,
			isTraining: room.isTraining,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Could not join room' });
	}
};
