import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion';

export interface AuthPayload {
  id: string;
  rol: 'CLIENTE' | 'GRUERO' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generarToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const token = header.slice('Bearer '.length);
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(rol: AuthPayload['rol']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.rol !== rol) {
      return res.status(403).json({ error: `Requiere rol ${rol}` });
    }
    next();
  };
}
