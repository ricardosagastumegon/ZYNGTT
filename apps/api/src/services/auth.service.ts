import bcrypt from 'bcryptjs';
import { userModel } from '../models/user.model';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { activityLogService } from './activity-log.service';

function sanitizeUser(user: { password?: string; [key: string]: unknown }) {
  const { password, ...safe } = user;
  return safe;
}

export const authService = {
  async register(data: {
    email: string; password: string; firstName: string;
    lastName: string; companyName?: string;
  }) {
    const existing = await userModel.findByEmail(data.email);
    if (existing) throw new AppError('Email already registered', 409);

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await userModel.create({ ...data, password: hashed });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await userModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { user: sanitizeUser(user), token, refreshToken };
  },

  async login(email: string, password: string) {
    const user = await userModel.findByEmail(email);
    if (!user) throw new AppError('Invalid credentials', 401);

    if (!user.isActive) {
      await activityLogService.log(user.id, 'LOGIN_FAILED', 'Login rechazado — cuenta desactivada');
      throw new AppError('Cuenta desactivada. Contacta al administrador.', 403);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await activityLogService.log(user.id, 'LOGIN_FAILED', 'Intento de login fallido');
      throw new AppError('Invalid credentials', 401);
    }

    await activityLogService.log(user.id, 'LOGIN', 'Inicio de sesión exitoso');

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await userModel.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { user: sanitizeUser(user), token, refreshToken };
  },

  async refreshToken(token: string) {
    const stored = await userModel.findRefreshToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 401);
    }

    const payload = verifyRefreshToken(token);
    const newToken = generateToken({ userId: payload.userId, email: payload.email, role: payload.role });

    return { token: newToken };
  },

  async logout(token: string) {
    await userModel.deleteRefreshToken(token);
  },
};
