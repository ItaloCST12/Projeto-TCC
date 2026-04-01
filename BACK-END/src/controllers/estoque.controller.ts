import { Request, Response } from "express";
import { EstoqueService } from "../services/estoque.service";

const estoqueService = new EstoqueService();

const parsePagina = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
};

const parseData = (value: unknown, tipo: "inicio" | "fim") => {
  if (!value) {
    return undefined;
  }

  const raw = String(value).trim();
  if (!raw) {
    return undefined;
  }

  const hasHorario = /[tT ]\d{2}:\d{2}/.test(raw);
  const parsed = hasHorario
    ? new Date(raw)
    : new Date(tipo === "inicio" ? `${raw}T00:00:00.000` : `${raw}T23:59:59.999`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data ${tipo} inválida`);
  }

  return parsed;
};

export const ajustarEstoqueProduto = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do produto não fornecido");
    }

    const produtoId = Number.parseInt(idParam, 10);
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("ID do produto inválido");
    }

    const { tipo, quantidade, motivo, pedidoId } = req.body;
    if (typeof tipo !== "string" || !tipo.trim()) {
      throw new Error("Tipo de movimentação é obrigatório");
    }

    const tipoNormalizado = tipo.trim().toUpperCase();

    const quantidadeNumber = Number(quantidade);
    if (!Number.isFinite(quantidadeNumber)) {
      throw new Error("Quantidade inválida");
    }

    if (tipoNormalizado === "AJUSTE") {
      if (quantidadeNumber < 0) {
        throw new Error("Quantidade inválida");
      }
    } else if (quantidadeNumber <= 0) {
      throw new Error("Quantidade inválida");
    }

    const pedidoIdNumber =
      pedidoId === undefined || pedidoId === null || pedidoId === ""
        ? undefined
        : Number(pedidoId);

    if (
      pedidoIdNumber !== undefined &&
      (!Number.isInteger(pedidoIdNumber) || pedidoIdNumber <= 0)
    ) {
      throw new Error("Pedido vinculado inválido");
    }

    const produto = await estoqueService.ajustarEstoque(
      produtoId,
      tipo,
      Math.trunc(quantidadeNumber),
      typeof motivo === "string" ? motivo : undefined,
      pedidoIdNumber,
    );

    return res.json(produto);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const getMovimentacoesEstoque = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const produtoId = idParam ? Number.parseInt(idParam, 10) : undefined;

    if (idParam && (!Number.isInteger(produtoId) || (produtoId ?? 0) <= 0)) {
      throw new Error("ID do produto inválido");
    }

    const page = parsePagina(req.query.page);
    const dataInicio = parseData(req.query.dataInicio, "inicio");
    const dataFim = parseData(req.query.dataFim, "fim");

    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new Error("Data inicial não pode ser maior que a data final");
    }

    const movimentacoes = await estoqueService.getMovimentacoes({
      ...(produtoId ? { produtoId } : {}),
      page,
      pageSize: 15,
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
    });

    return res.json(movimentacoes);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const getResumoEstoque = async (_req: Request, res: Response) => {
  try {
    const resumo = await estoqueService.getResumoEstoque();
    return res.json(resumo);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
