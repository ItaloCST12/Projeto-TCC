import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { usuarioId: number; role?: string };
    (req as any).usuario = { usuarioId: decoded.usuarioId, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).usuario.role;
  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado: requer privilégios de administrador' });
  }
  next();
};