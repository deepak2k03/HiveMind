import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || '';
		const [scheme, token] = authHeader.split(' ');

		if (scheme !== 'Bearer' || !token) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

		const payload = jwt.verify(token, secret);
		req.user = { id: payload.sub };
		return next();
	} catch {
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
};
