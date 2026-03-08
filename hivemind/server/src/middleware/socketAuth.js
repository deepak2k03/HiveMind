import jwt from 'jsonwebtoken';

export const socketAuth = (socket, next) => {
	try {
		const token = socket.handshake.auth?.token;
		const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

		// Allow anonymous sockets for demo mode when token is missing.
		if (!token || !secret) {
			return next();
		}

		const payload = jwt.verify(token, secret);
		socket.user = { id: payload.sub };
		return next();
	} catch {
		return next(new Error('Unauthorized socket connection'));
	}
};
