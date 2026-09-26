import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense-super-secret-jwt-key-2026';

export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Try Firebase verification first
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
    };
    return next();
  } catch (_fbErr) {
    // If Firebase verification fails, try local JWT token (used by Email/Password/OTP auth)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
      return next();
    } catch (_jwtErr) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  }
};

export const createLocalToken = (user: AuthUser): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
