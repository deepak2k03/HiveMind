import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
		},
	},
	{
		timestamps: true,
	}
);

userSchema.pre('save', async function hashPassword(next) {
	if (!this.isModified('password')) {
		return next();
	}

	this.password = await bcrypt.hash(this.password, 10);
	return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
	return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
