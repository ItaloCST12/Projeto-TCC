import { Request, Response } from "express";
import { listarFormasPagamento } from "../services/pagamento.service";

export const getFormasPagamento = (_req: Request, res: Response) => {
  const formas = listarFormasPagamento();
  res.json({ formas });
};
