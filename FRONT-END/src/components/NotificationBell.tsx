import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock3,
  Inbox,
  Loader2,
  MessageCircle,
  Package,
  Settings2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { getAuthToken, getAuthUser } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notificacao = {
  id: number;
  pedidoId?: number | null;
  tipo?: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  createdAt: string;
};

type RespostaNotificacoes = {
  data: Notificacao[];
  meta: {
    naoLidas: number;
  };
};

type Props = {
  mobile?: boolean;
};

type PushPublicKeyResponse = {
  publicKey: string | null;
};

type EventoSocketAtendimento =
  | {
      type: "mensagem_nova";
      payload:
        | {
            id: number;
            usuarioId: number;
          }
        | { ready: true };
    }
  | {
      type: "conversa_limpada";
      payload: { usuarioId: number };
    };

const WS_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";

const buildWsUrl = (token: string) => {
  if (WS_BASE_URL) {
    const normalizedBase = WS_BASE_URL.endsWith("/")
      ? WS_BASE_URL.slice(0, -1)
      : WS_BASE_URL;
    const wsBase = normalizedBase.replace(/^http/i, "ws");
    return `${wsBase}/atendimentos/ws?token=${encodeURIComponent(token)}`;
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/atendimentos/ws?token=${encodeURIComponent(token)}`;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const formatarData = (valor: string) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
};

const obterIconeNotificacao = (item: Notificacao) => {
  const tipo = String(item.tipo ?? "").toLowerCase();

  if (tipo.includes("chat")) {
    return MessageCircle;
  }

  if (item.pedidoId || tipo.includes("pedido") || tipo.includes("entrega")) {
    return Package;
  }

  if (tipo.includes("sistema") || tipo.includes("config")) {
    return Settings2;
  }

  return Bell;
};

const extrairUsuarioIdConversa = (tipo: string | undefined) => {
  const valorTipo = String(tipo ?? "").trim();
  const match = valorTipo.match(/^CHAT_NOVA_MENSAGEM:(\d+)$/i);

  if (!match) {
    return null;
  }

  const usuarioId = Number(match[1]);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return null;
  }

  return usuarioId;
};

const NotificationBell = ({ mobile = false }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = getAuthUser();
  const authToken = getAuthToken();
  const isAdmin = usuario?.role === "ADMIN";
  const estaNaTelaDeChat = location.pathname.startsWith("/chat");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const suportaNotificationApi = typeof window !== "undefined" && "Notification" in window;

  const temNotificacoes = itens.length > 0;

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const resposta = await apiRequest<RespostaNotificacoes>(
        "/notificacoes/recentes?limite=8",
      );
      setItens(resposta.data);
      setNaoLidas(resposta.meta.naoLidas);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao carregar notificações.");
    }
  }, []);

  const obterChavePublicaPush = async () => {
    const envKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").trim();
    if (envKey) {
      return envKey;
    }

    const resposta = await apiRequest<PushPublicKeyResponse>("/notificacoes/push/public-key");
    return String(resposta.publicKey ?? "").trim();
  };

  const inscreverPushNoDispositivo = async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !suportaNotificationApi
    ) {
      return;
    }

    const permissaoAtual = Notification.permission;
    if (permissaoAtual === "denied") {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const chavePublica = await obterChavePublicaPush();
    if (!chavePublica) {
      return;
    }

    const permissao =
      permissaoAtual === "granted"
        ? permissaoAtual
        : await Notification.requestPermission();

    if (permissao !== "granted") {
      return;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(chavePublica),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return;
    }

    await apiRequest("/notificacoes/push/inscrever", {
      method: "POST",
      body: {
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
    });
  };

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      setLoading(true);
      await carregar();
      if (ativo) {
        setLoading(false);
      }
    };

    void carregarInicial();

    const intervalo = window.setInterval(() => {
      void carregar();
    }, 30000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  useEffect(() => {
    if (!usuario?.id || !authToken || estaNaTelaDeChat) {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
      return;
    }

    let shouldReconnect = true;

    const conectar = () => {
      const socket = new WebSocket(buildWsUrl(authToken));
      socketRef.current = socket;

      socket.onopen = () => {
        void carregar();
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as EventoSocketAtendimento;

          if (parsed.type === "mensagem_nova" && "id" in parsed.payload) {
            void carregar();

            // Segundo refresh curto para evitar corrida entre evento WS e persistência da notificação.
            if (refreshTimeoutRef.current) {
              window.clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = window.setTimeout(() => {
              void carregar();
              refreshTimeoutRef.current = null;
            }, 500);
          }
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        if (!shouldReconnect) {
          return;
        }
        reconnectTimeoutRef.current = window.setTimeout(conectar, 1500);
      };
    };

    conectar();

    return () => {
      shouldReconnect = false;
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
    };
  }, [authToken, carregar, estaNaTelaDeChat, usuario?.id]);

  useEffect(() => {
    void inscreverPushNoDispositivo();
  }, []);

  const tituloBotao = useMemo(() => {
    if (naoLidas > 0) {
      return `Notificações (${naoLidas} não lidas)`;
    }
    return "Notificações";
  }, [naoLidas]);

  const marcarTodasComoLidas = async () => {
    try {
      await apiRequest("/notificacoes/marcar-lidas", { method: "PATCH" });
      setItens((atual) => atual.map((item) => ({ ...item, lida: true })));
      setNaoLidas(0);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao marcar notificações.");
    }
  };

  const limparNotificacoes = async () => {
    try {
      await apiRequest("/notificacoes", { method: "DELETE" });
      setItens([]);
      setNaoLidas(0);
      setErro("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao limpar notificações.");
    }
  };

  const resolverDestinoNotificacao = (item: Notificacao) => {
    const tipo = String(item.tipo ?? "").trim().toUpperCase();

    if (tipo.startsWith("CHAT_NOVA_MENSAGEM")) {
      const usuarioConversaId = extrairUsuarioIdConversa(item.tipo);

      if (isAdmin && usuarioConversaId) {
        return `/chat?usuarioId=${usuarioConversaId}`;
      }

      return "/chat";
    }

    if (!item.pedidoId) {
      return isAdmin ? "/painel-entregas" : "/minhas-encomendas";
    }

    if (isAdmin) {
      return `/painel-entregas?aba=entregas&pedidoId=${item.pedidoId}`;
    }

    return `/minhas-encomendas?pedidoId=${item.pedidoId}`;
  };

  const abrirDestinoDaNotificacao = async (item: Notificacao) => {
    if (!item.lida) {
      try {
        await marcarTodasComoLidas();
      } catch {
        // Segue com a navegação mesmo se houver erro ao atualizar leitura.
      }
    }

    navigate(resolverDestinoNotificacao(item));
  };

  if (estaNaTelaDeChat) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={tituloBotao}
          title={tituloBotao}
          className={`relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted transition-colors ${
            mobile ? "" : ""
          }`}
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
          <DropdownMenuLabel className="p-0 text-sm inline-flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-primary" />
            Notificações recentes
          </DropdownMenuLabel>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => void marcarTodasComoLidas()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar lidas
            </button>
            <button
              type="button"
              onClick={() => void limparNotificacoes()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando notificações...
            </p>
          ) : erro ? (
            <p className="px-2 py-3 text-sm text-destructive inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {erro}
            </p>
          ) : !temNotificacoes ? (
            <p className="px-2 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Nenhuma notificação recente.
            </p>
          ) : (
            <ul className="space-y-1">
              {itens.map((item) => {
                const IconeNotificacao = obterIconeNotificacao(item);

                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-muted/70 ${
                      item.lida
                        ? "border-border/70 bg-background"
                        : "border-primary/25 bg-primary/5"
                    }`}
                    onClick={() => {
                      void abrirDestinoDaNotificacao(item);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void abrirDestinoDaNotificacao(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
                        <IconeNotificacao className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{item.titulo}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-snug">{item.mensagem}</p>
                        <div className="mt-2 flex items-center justify-between">
                          {item.pedidoId ? (
                            <span className="text-xs text-foreground font-medium inline-flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              Pedido #{item.pedidoId}
                            </span>
                          ) : String(item.tipo ?? "").toUpperCase().startsWith("CHAT_NOVA_MENSAGEM") ? (
                            <span className="text-xs text-foreground font-medium inline-flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              Atendimento
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <Settings2 className="h-3.5 w-3.5" />
                              Sistema
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatarData(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
