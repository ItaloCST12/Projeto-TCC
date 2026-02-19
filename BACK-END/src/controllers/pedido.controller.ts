import { Request, Response } from "express";
import { PedidoService } from "../services/pedido.service";

const pedidoService = new PedidoService();

export const criarPedido = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    const {
      produtoId,
      quantidade,
      unidade,
      tipoEntrega,
      formaPagamento,
      items,
    } = req.body;
    const pedido = await pedidoService.criarPedido(
      usuarioId,
      produtoId,
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

export const getTodosPedidos = async (_req: Request, res: Response) => {
  try {
    const pedidos = await pedidoService.getTodosPedidos();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
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
