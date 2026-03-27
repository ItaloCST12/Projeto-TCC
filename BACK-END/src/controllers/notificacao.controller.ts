import { Request, Response } from "express";
import { NotificacaoService } from "../services/notificacao.service";

const notificacaoService = new NotificacaoService();

const parseLimite = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? "10"), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }
  return parsed;
};

const validarSubscription = (body: unknown) => {
  const payload = body as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  const endpoint = String(payload?.endpoint ?? "").trim();
  const p256dh = String(payload?.keys?.p256dh ?? "").trim();
  const auth = String(payload?.keys?.auth ?? "").trim();
  const expirationTimeRaw = payload?.expirationTime;
  const expirationTime =
    expirationTimeRaw === null || expirationTimeRaw === undefined
      ? null
      : Number(expirationTimeRaw);

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Subscription inválida");
  }

  return {
    endpoint,
    expirationTime,
    keys: {
      p256dh,
      auth,
    },
  };
};

export const obterChavePublicaPush = (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  return res.json({
    publicKey: publicKey || null,
  });
};

export const listarNotificacoesRecentes = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const limite = parseLimite(req.query.limite);
    const notificacoes = await notificacaoService.listarRecentes({
      usuarioId,
      ...(req.usuario?.role ? { role: req.usuario.role } : {}),
      limite,
    });

    return res.json(notificacoes);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const marcarNotificacoesComoLidas = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const resultado = await notificacaoService.marcarTodasComoLidas(
      usuarioId,
      req.usuario?.role,
    );

    return res.json(resultado);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const registrarPushSubscription = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const subscription = validarSubscription(req.body);
    const resultado = await notificacaoService.registrarPushSubscription({
      usuarioId,
      ...(req.usuario?.role ? { role: req.usuario.role } : {}),
      subscription,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};

export const removerPushSubscription = async (req: Request, res: Response) => {
  try {
    const usuarioId = req.usuario?.usuarioId;
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const endpoint = String(req.body?.endpoint ?? "").trim();
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint inválido" });
    }

    const resultado = await notificacaoService.removerPushSubscription(usuarioId, endpoint);
    return res.json(resultado);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
};
