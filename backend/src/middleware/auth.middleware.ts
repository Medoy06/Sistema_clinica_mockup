import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PERMISSIONS, type Capability } from '../config/permissions';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'doctor' | 'recepcionista' | 'enfermera' | 'farmaceutico' | 'bodega';
}

// Extend Express Request to carry the auth payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Token requerido.',
    });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.',
    });
  }
};

// Direct role-list authorize (kept for any ad-hoc use).
export const authorize = (...roles: AuthPayload['role'][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado.',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción.',
      });
    }
    next();
  };
};

// Map-based authorize: the PREFERRED gate. Reads the single permissions
// map (config/permissions.ts) so access rules live in one place and are
// toggleable without hunting across route files.
export const can = (capability: Capability) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado.',
      });
    }
    const allowedRoles = PERMISSIONS[capability];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción.',
      });
    }
    next();
  };
};