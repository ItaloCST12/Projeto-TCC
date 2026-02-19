import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AUTH_SECRET } from "../utils/auth-secret";

type JwtPayload = {
  usuarioId: number;
  role?: string;
  email?: string;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as JwtPayload;
    req.usuario = {
      usuarioId: decoded.usuarioId,
      ...(decoded.role ? { role: decoded.role } : {}),
      ...(decoded.email ? { email: decoded.email } : {}),
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const role = req.usuario?.role;
  if (role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Acesso negado: requer privilégios de administrador" });
  }
  next();
};
