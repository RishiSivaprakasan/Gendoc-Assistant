import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { TokenBlocklist } from '../models/TokenBlocklist.js';
import { AppError } from '../utils/AppError.js';

function signAccessToken({ userId, email }) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, email, jti }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  return { token, jti };
}

function decodeExpiry(token) {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
}

export const authService = {
  async register({ email, password }) {
    const existing = await User.findOne({ email }).lean();
    if (existing) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });

    const { token } = signAccessToken({ userId: user._id.toString(), email: user.email });

    return {
      user: { id: user._id.toString(), email: user.email },
      accessToken: token,
    };
  },

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new AppError('Invalid credentials', 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('Invalid credentials', 401);

    const { token } = signAccessToken({ userId: user._id.toString(), email: user.email });

    return {
      user: { id: user._id.toString(), email: user.email },
      accessToken: token,
    };
  },

  async logout({ token }) {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !decoded.jti) {
      throw new AppError('Invalid token', 401);
    }

    const expiresAt = decodeExpiry(token);
    if (!expiresAt) throw new AppError('Invalid token', 401);

    await TokenBlocklist.updateOne(
      { jti: decoded.jti },
      {
        $setOnInsert: {
          jti: decoded.jti,
          userId: decoded.sub,
          expiresAt,
        },
      },
      { upsert: true }
    );

    return { ok: true };
  },

  async isTokenRevoked(jti) {
    const hit = await TokenBlocklist.findOne({ jti }).select({ _id: 1 }).lean();
    return !!hit;
  },
};
