import { Request, Response } from "express";
import { PedidoService } from "../services/pedido.service";

const pedidoService = new PedidoService();

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

const getPeriodoDatas = (periodo: string) => {
  const agora = new Date();
  const fim = new Date(agora);
  fim.setHours(23, 59, 59, 999);

  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);

  if (periodo === "last_month") {
    inicio.setMonth(inicio.getMonth() - 1);
    return { inicio, fim };
  }

  if (periodo === "last_3_months") {
    inicio.setMonth(inicio.getMonth() - 3);
    return { inicio, fim };
  }

  if (periodo === "last_6_months") {
    inicio.setMonth(inicio.getMonth() - 6);
    return { inicio, fim };
  }

  if (periodo === "last_year") {
    inicio.setFullYear(inicio.getFullYear() - 1);
    return { inicio, fim };
  }

  return null;
};

export const criarPedido = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (req.usuario?.role === "ADMIN") {
      return res
        .status(403)
        .json({ error: "Administradores podem apenas visualizar produtos." });
    }

    const {
      produtoId,
      enderecoId,
      quantidade,
      unidade,
      tipoEntrega,
      formaPagamento,
      items,
    } = req.body;
    const pedido = await pedidoService.criarPedido(
      usuarioId,
      produtoId,
      enderecoId ?? null,
      quantidade,
      unidade,
      tipoEntrega,
      formaPagamento,
      items,
    );
    res.status(201).json(pedido);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getHistoricoUsuario = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const historico = await pedidoService.getHistoricoUsuario(usuarioId);
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getMinhasEncomendas = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const page = parsePagina(req.query.page);
    const dataInicio = parseData(req.query.dataInicio, "inicio");
    const dataFim = parseData(req.query.dataFim, "fim");

    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new Error("Data inicial não pode ser maior que a data final");
    }

    const encomendas = await pedidoService.getMinhasEncomendas(usuarioId, {
      page,
      pageSize: 15,
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
    });
    res.json(encomendas);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getTodosPedidos = async (req: Request, res: Response) => {
  try {
    const page = parsePagina(req.query.page);
    const dataInicio = parseData(req.query.dataInicio, "inicio");
    const dataFim = parseData(req.query.dataFim, "fim");

    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new Error("Data inicial não pode ser maior que a data final");
    }

    const pedidos = await pedidoService.getTodosPedidos({
      page,
      pageSize: 15,
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
    });
    res.json(pedidos);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getControleVendas = async (req: Request, res: Response) => {
  try {
    const page = parsePagina(req.query.page);
    const periodo = String(req.query.periodo ?? "last_month");

    let dataInicio: Date | undefined;
    let dataFim: Date | undefined;

    if (periodo === "custom") {
      dataInicio = parseData(req.query.dataInicio, "inicio");
      dataFim = parseData(req.query.dataFim, "fim");

      if (!dataInicio || !dataFim) {
        throw new Error("Para período custom, informe dataInicio e dataFim");
      }
    } else {
      const periodoDatas = getPeriodoDatas(periodo);
      if (!periodoDatas) {
        throw new Error("Período inválido");
      }

      dataInicio = periodoDatas.inicio;
      dataFim = periodoDatas.fim;
    }

    if (dataInicio && dataFim && dataInicio > dataFim) {
      throw new Error("Data inicial não pode ser maior que a data final");
    }

    const vendas = await pedidoService.getControleVendas({
      page,
      pageSize: 15,
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
    });

    res.json(vendas);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const finalizarPedido = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do pedido não fornecido");
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }
    const pedido = await pedidoService.finalizarPedido(id);
    res.json(pedido);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const marcarPedidoProntoParaRetirada = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do pedido não fornecido");
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }
    const pedido = await pedidoService.marcarPedidoProntoParaRetirada(id);
    res.json(pedido);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const marcarPedidoSaiuParaEntrega = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do pedido não fornecido");
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }
    const pedido = await pedidoService.marcarPedidoSaiuParaEntrega(id);
    res.json(pedido);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const cancelarPedidoUsuario = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const idParam = req.params.id;
    if (!idParam) {
      throw new Error("ID do pedido não fornecido");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new Error("ID inválido");
    }

    const pedido = await pedidoService.cancelarPedidoUsuario(usuarioId, id);
    res.json(pedido);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
