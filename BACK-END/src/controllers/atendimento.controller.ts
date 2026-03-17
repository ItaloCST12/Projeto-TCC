import { Request, Response } from "express";
import * as AtendimentoService from "../services/atendimento.service";
import {
  emitConversaLimpada,
  emitMensagemNova,
} from "../socket/atendimento.socket";

export const listarMinhasMensagens = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const mensagens = await AtendimentoService.listarMensagensDoUsuario(usuarioId);
    return res.json(mensagens);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const enviarMensagemUsuario = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { texto } = req.body;
    const mensagem = await AtendimentoService.enviarMensagem(
      usuarioId,
      "USUARIO",
      texto,
    );

    emitMensagemNova(mensagem);

    return res.status(201).json(mensagem);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const limparMinhaConversa = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const result = await AtendimentoService.limparConversaDoUsuario(usuarioId);
    emitConversaLimpada(usuarioId);
    return res.json({ deletedCount: result.count });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const listarConversasAdmin = async (_req: Request, res: Response) => {
  try {
    const conversas = await AtendimentoService.listarConversasAdmin();
    return res.json(conversas);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const listarConversaUsuarioAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const usuarioId = Number(req.params.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    const mensagens = await AtendimentoService.listarMensagensPorUsuarioAdmin(
      usuarioId,
    );
    return res.json(mensagens);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const responderComoSuporte = async (req: Request, res: Response) => {
  try {
    const usuarioId = Number(req.params.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    const { texto } = req.body;
    const mensagem = await AtendimentoService.enviarMensagem(
      usuarioId,
      "SUPORTE",
      texto,
    );

    emitMensagemNova(mensagem);

    return res.status(201).json(mensagem);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};
