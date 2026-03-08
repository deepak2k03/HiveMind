import mongoose from 'mongoose';

export const connectDB = async (mongoUri) => {
	if (!mongoUri) {
		throw new Error('MONGO_URI is required to connect to MongoDB');
	}

	await mongoose.connect(mongoUri);
	return mongoose.connection;
};
