import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
	{
		roomId: {
			type: String,
			required: true,
			unique: true,
			uppercase: true,
			trim: true,
		},
		hostUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		deviceCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		currentRound: {
			type: Number,
			default: 0,
			min: 0,
		},
		isTraining: {
			type: Boolean,
			default: false,
		},
		globalWeights: {
			type: Buffer,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

export const Room = mongoose.model('Room', roomSchema);
