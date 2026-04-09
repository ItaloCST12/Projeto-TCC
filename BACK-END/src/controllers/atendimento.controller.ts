import { Request, Response } from "express";
import * as AtendimentoService from "../services/atendimento.service";
import {
  emitConversaLimpada,
  emitMensagemNova,
} from "../socket/atendimento.socket";
import { NotificacaoService } from "../services/notificacao.service";

const notificacaoService = new NotificacaoService();

const executarNotificacaoSemFalhar = async (callback: () => Promise<unknown>) => {
  try {
    await callback();
  } catch (error) {
    console.error("[NOTIFICACOES] Falha ao criar notificação de atendimento:", error);
  }
};

const getImagemUrlFromFile = (req: Request, localFolderName: string) => {
  if (!req.file) {
    return undefined;
  }

  const cloudinaryPath =
    (req.file as Express.Multer.File & { path?: string }).path?.trim() || "";
  if (cloudinaryPath.startsWith("http://") || cloudinaryPath.startsWith("https://")) {
    return cloudinaryPath;
  }

  return `/uploads/${localFolderName}/${req.file.filename}`;
};

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

    const texto = typeof req.body?.texto === "string" ? req.body.texto : "";
    const imagemUrl = getImagemUrlFromFile(req, "atendimento");
    const mensagem = await AtendimentoService.enviarMensagem(
      usuarioId,
      "USUARIO",
      { texto, imagemUrl: imagemUrl ?? null },
    );

    const identificacaoUsuario = req.usuario?.email?.trim() || `Cliente #${usuarioId}`;
    await executarNotificacaoSemFalhar(() =>
      notificacaoService.criarParaAdmins({
        tipo: "CHAT_NOVA_MENSAGEM",
        titulo: "Você tem uma nova mensagem",
        mensagem: `${identificacaoUsuario} enviou uma nova mensagem no atendimento.`,
        url: `/chat?usuarioId=${usuarioId}`,
        conversaUsuarioId: usuarioId,
      }),
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

    const texto = typeof req.body?.texto === "string" ? req.body.texto : "";
    const imagemUrl = getImagemUrlFromFile(req, "atendimento");
    const mensagem = await AtendimentoService.enviarMensagem(
      usuarioId,
      "SUPORTE",
      { texto, imagemUrl: imagemUrl ?? null },
    );

    await executarNotificacaoSemFalhar(() =>
      notificacaoService.criarParaCliente(usuarioId, {
        tipo: "CHAT_NOVA_MENSAGEM",
        titulo: "Você tem uma nova mensagem",
        mensagem: "O suporte enviou uma nova mensagem no atendimento.",
        url: "/chat",
      }),
    );

    emitMensagemNova(mensagem);

    return res.status(201).json(mensagem);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};
