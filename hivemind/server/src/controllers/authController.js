import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const createToken = (userId) => {
	const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

	return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
};

export const register = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ message: 'name, email, and password are required' });
		}

		const existing = await User.findOne({ email: email.toLowerCase() });
		if (existing) {
			return res.status(409).json({ message: 'Email already in use' });
		}

		const user = await User.create({ name, email, password });
		const token = createToken(user._id.toString());

		return res.status(201).json({
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Registration failed' });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: 'email and password are required' });
		}

		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		const valid = await user.comparePassword(password);
		if (!valid) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		const token = createToken(user._id.toString());

		return res.status(200).json({
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Login failed' });
	}
};

export const me = async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select('_id name email createdAt');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		return res.status(200).json({
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Failed to fetch profile' });
	}
};
