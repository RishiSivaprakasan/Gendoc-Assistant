import { z } from 'zod';
import { authService } from '../services/authService.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

const loginSchema = registerSchema;

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export const authController = {
  async register(req, res, next) {
    try {
      const body = registerSchema.parse(req.body);
      const result = await authService.register(body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const token = getBearerToken(req);
      if (!token) return res.status(401).json({ message: 'Missing Authorization header' });

      const result = await authService.logout({ token });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async me(req, res) {
    res.status(200).json({ user: req.user });
  },
};
