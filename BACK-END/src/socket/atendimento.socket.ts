import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { IncomingMessage } from "http";
import { AUTH_SECRET } from "../utils/auth-secret";

type Role = "ADMIN" | "USUARIO";

type JwtPayload = {
  usuarioId: number;
  role?: string;
};

type SocketMeta = {
  usuarioId: number;
  role: Role;
};

type AtendimentoMensagemEvento = {
  id: number;
  usuarioId: number;
  autor: "USUARIO" | "SUPORTE";
  texto: string;
  imagemUrl?: string | null;
  createdAt: Date | string;
};

type EventoSocket = {
  type: "mensagem_nova" | "conversa_limpada" | "notificacao_nova" | "pedido_atualizado";
  payload: unknown;
};

type PedidoAtualizadoPayload = {
  pedidoId: number;
  usuarioId: number;
  status: string;
  origem: "NOVO_PEDIDO" | "STATUS_ATUALIZADO";
};

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, SocketMeta>();

const parseToken = (reqUrl?: string | null) => {
  if (!reqUrl) {
    return null;
  }

  const url = new URL(reqUrl, "http://localhost");
  return url.searchParams.get("token");
};

const enviar = (socket: WebSocket, evento: EventoSocket) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(evento));
  }
};

const broadcastParaAtendimento = (
  usuarioId: number,
  evento: EventoSocket,
) => {
  for (const [socket, meta] of clients.entries()) {
    if (meta.role === "ADMIN" || meta.usuarioId === usuarioId) {
      enviar(socket, evento);
    }
  }
};

const broadcastParaAdmins = (evento: EventoSocket) => {
  for (const [socket, meta] of clients.entries()) {
    if (meta.role === "ADMIN") {
      enviar(socket, evento);
    }
  }
};

const broadcastParaUsuario = (usuarioId: number, evento: EventoSocket) => {
  for (const [socket, meta] of clients.entries()) {
    if (meta.usuarioId === usuarioId) {
      enviar(socket, evento);
    }
  }
};

export const initAtendimentoSocket = (server: HttpServer) => {
  wss = new WebSocketServer({ server, path: "/atendimentos/ws" });

  wss.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.warn("[WS] Conflito de porta detectado. Aguardando nova tentativa de inicialização do servidor.");
      return;
    }

    console.error("[WS] Erro no WebSocket server", error);
  });

  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    const token = parseToken(req.url);
    if (!token) {
      socket.close(1008, "Token não fornecido");
      return;
    }

    try {
      const decoded = jwt.verify(token, AUTH_SECRET) as JwtPayload;
      const role: Role = decoded.role === "ADMIN" ? "ADMIN" : "USUARIO";

      clients.set(socket, {
        usuarioId: decoded.usuarioId,
        role,
      });

      enviar(socket, {
        type: "mensagem_nova",
        payload: { ready: true },
      });

      socket.on("close", () => {
        clients.delete(socket);
      });
    } catch {
      socket.close(1008, "Token inválido");
    }
  });
};

export const emitMensagemNova = (mensagem: AtendimentoMensagemEvento) => {
  if (!wss) {
    return;
  }

  broadcastParaAtendimento(mensagem.usuarioId, {
    type: "mensagem_nova",
    payload: {
      ...mensagem,
      createdAt:
        mensagem.createdAt instanceof Date
          ? mensagem.createdAt.toISOString()
          : mensagem.createdAt,
    },
  });
};

export const emitConversaLimpada = (usuarioId: number) => {
  if (!wss) {
    return;
  }

  broadcastParaAtendimento(usuarioId, {
    type: "conversa_limpada",
    payload: { usuarioId },
  });
};

export const emitNotificacaoNovaParaAdmins = (payload: {
  tipo?: string;
  pedidoId?: number;
}) => {
  if (!wss) {
    return;
  }

  broadcastParaAdmins({
    type: "notificacao_nova",
    payload: {
      destinoRole: "ADMIN",
      ...payload,
    },
  });
};

export const emitNotificacaoNovaParaUsuario = (
  usuarioId: number,
  payload: {
    tipo?: string;
    pedidoId?: number;
  },
) => {
  if (!wss) {
    return;
  }

  broadcastParaUsuario(usuarioId, {
    type: "notificacao_nova",
    payload: {
      destinoRole: "USUARIO",
      usuarioId,
      ...payload,
    },
  });
};

export const emitPedidoAtualizado = (payload: PedidoAtualizadoPayload) => {
  if (!wss) {
    return;
  }

  for (const [socket, meta] of clients.entries()) {
    if (meta.role === "ADMIN" || meta.usuarioId === payload.usuarioId) {
      enviar(socket, {
        type: "pedido_atualizado",
        payload,
      });
    }
  }
};
