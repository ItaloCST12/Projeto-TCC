declare namespace Express {
  export interface Request {
    usuario?: {
      usuarioId: number;
      role?: string;
      email?: string;
    };
  }
}
