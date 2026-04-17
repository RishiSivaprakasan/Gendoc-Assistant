import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authService } from '../services/authService.js';

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!payload || typeof payload !== 'object') return res.status(401).json({ message: 'Unauthorized' });

    if (payload.jti) {
      const revoked = await authService.isTokenRevoked(payload.jti);
      if (revoked) return res.status(401).json({ message: 'Token revoked' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
