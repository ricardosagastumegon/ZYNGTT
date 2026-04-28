import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '_refresh';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: '30d' } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
