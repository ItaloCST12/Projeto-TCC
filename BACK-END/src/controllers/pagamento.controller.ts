import { Request, Response } from "express";
import { listarFormasPagamento } from "../models/pagamento.service";

export const getFormasPagamento = (_req: Request, res: Response) => {
  const formas = listarFormasPagamento();
  res.json({ formas });
};
