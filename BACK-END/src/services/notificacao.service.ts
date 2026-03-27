import prisma from "../models/client";
import webpush from "web-push";

type DestinoRole = "ADMIN" | "CLIENTE";

type CriarNotificacaoInput = {
  tipo: string;
  titulo: string;
  mensagem: string;
  pedidoId?: number;
};

type ListarRecentesInput = {
  usuarioId: number;
  role?: string;
  limite?: number;
};

type PushSubscriptionInput = {
  usuarioId: number;
  role?: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
};

const MAX_LIMITE_NOTIFICACOES = 30;

const resolverDestino = (role?: string): DestinoRole =>
  role === "ADMIN" ? "ADMIN" : "CLIENTE";

let webPushConfigurado = false;
let webPushAvisado = false;

const garantirWebPushConfigurado = () => {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidSubject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@fazendabispo.local";
  const webPushDisponivel = Boolean(vapidPublicKey && vapidPrivateKey);

  if (!webPushDisponivel) {
    if (!webPushAvisado) {
      console.warn("[PUSH] Web push desabilitado. Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
      webPushAvisado = true;
    }
    return {
      disponivel: false,
      publicKey: null as string | null,
    };
  }

  if (!webPushConfigurado) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
    webPushConfigurado = true;
  }

  return {
    disponivel: true,
    publicKey: vapidPublicKey!,
  };
};

export class NotificacaoService {
  private async enviarPush(destinoRole: DestinoRole, payload: Record<string, unknown>, usuarioId?: number) {
    if (!garantirWebPushConfigurado().disponivel) {
      return;
    }

    if (destinoRole === "CLIENTE" && !usuarioId) {
      return;
    }

    const whereBase =
      destinoRole === "ADMIN"
        ? { destinoRole: "ADMIN" as const, ativa: true }
        : { destinoRole: "CLIENTE" as const, ativa: true, usuarioId: usuarioId! };

    const assinaturas = await prisma.pushSubscription.findMany({
      where: whereBase,
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (assinaturas.length === 0) {
      return;
    }

    const mensagem = JSON.stringify(payload);
    await Promise.all(
      assinaturas.map(async (assinatura) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: assinatura.endpoint,
              keys: {
                p256dh: assinatura.p256dh,
                auth: assinatura.auth,
              },
            },
            mensagem,
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: assinatura.id },
              data: { ativa: false },
            });
          }
          console.error("[PUSH] Falha ao enviar notificação push:", error);
        }
      }),
    );
  }

  async registrarPushSubscription(input: PushSubscriptionInput) {
    const destinoRole = resolverDestino(input.role);
    const expirationTime =
      input.subscription.expirationTime === null ||
      input.subscription.expirationTime === undefined
        ? null
        : BigInt(Math.trunc(input.subscription.expirationTime));

    const registro = await prisma.pushSubscription.upsert({
      where: { endpoint: input.subscription.endpoint },
      update: {
        usuarioId: input.usuarioId,
        destinoRole,
        p256dh: input.subscription.keys.p256dh,
        auth: input.subscription.keys.auth,
        expirationTime,
        ativa: true,
      },
      create: {
        usuarioId: input.usuarioId,
        destinoRole,
        endpoint: input.subscription.endpoint,
        p256dh: input.subscription.keys.p256dh,
        auth: input.subscription.keys.auth,
        expirationTime,
        ativa: true,
      },
      select: {
        id: true,
        endpoint: true,
      },
    });

    return {
      sucesso: true,
      id: registro.id,
      endpoint: registro.endpoint,
    };
  }

  async removerPushSubscription(usuarioId: number, endpoint: string) {
    const resultado = await prisma.pushSubscription.updateMany({
      where: {
        usuarioId,
        endpoint,
        ativa: true,
      },
      data: {
        ativa: false,
      },
    });

    return {
      desativadas: resultado.count,
    };
  }

  async criarParaAdmins(input: CriarNotificacaoInput) {
    const notificacao = await prisma.notificacao.create({
      data: {
        destinoRole: "ADMIN",
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
      },
    });

    await this.enviarPush("ADMIN", {
      title: input.titulo,
      body: input.mensagem,
      tipo: input.tipo,
      pedidoId: input.pedidoId ?? null,
      url: "/painel-entregas",
      createdAt: new Date().toISOString(),
    });

    return notificacao;
  }

  async criarParaCliente(usuarioId: number, input: CriarNotificacaoInput) {
    const notificacao = await prisma.notificacao.create({
      data: {
        usuarioId,
        destinoRole: "CLIENTE",
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        ...(input.pedidoId !== undefined ? { pedidoId: input.pedidoId } : {}),
      },
    });

    await this.enviarPush(
      "CLIENTE",
      {
        title: input.titulo,
        body: input.mensagem,
        tipo: input.tipo,
        pedidoId: input.pedidoId ?? null,
        url: "/minhas-encomendas",
        createdAt: new Date().toISOString(),
      },
      usuarioId,
    );

    return notificacao;
  }

  async listarRecentes(input: ListarRecentesInput) {
    const destino = resolverDestino(input.role);
    const limiteNormalizado = Math.min(
      Math.max(1, Number(input.limite) || 10),
      MAX_LIMITE_NOTIFICACOES,
    );

    const whereBase =
      destino === "ADMIN"
        ? { destinoRole: "ADMIN" as const }
        : { destinoRole: "CLIENTE" as const, usuarioId: input.usuarioId };

    const [naoLidas, notificacoes] = await Promise.all([
      prisma.notificacao.count({
        where: {
          ...whereBase,
          lida: false,
        },
      }),
      prisma.notificacao.findMany({
        where: whereBase,
        orderBy: { createdAt: "desc" },
        take: limiteNormalizado,
      }),
    ]);

    return {
      data: notificacoes,
      meta: {
        naoLidas,
      },
    };
  }

  async marcarTodasComoLidas(usuarioId: number, role?: string) {
    const destino = resolverDestino(role);

    const whereBase =
      destino === "ADMIN"
        ? { destinoRole: "ADMIN" as const }
        : { destinoRole: "CLIENTE" as const, usuarioId };

    const resultado = await prisma.notificacao.updateMany({
      where: {
        ...whereBase,
        lida: false,
      },
      data: {
        lida: true,
      },
    });

    return {
      atualizadas: resultado.count,
    };
  }

  async limparTodas(usuarioId: number, role?: string) {
    const destino = resolverDestino(role);

    const whereBase =
      destino === "ADMIN"
        ? { destinoRole: "ADMIN" as const }
        : { destinoRole: "CLIENTE" as const, usuarioId };

    const resultado = await prisma.notificacao.deleteMany({
      where: whereBase,
    });

    return {
      removidas: resultado.count,
    };
  }
}
