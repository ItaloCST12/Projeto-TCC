import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
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

const NotificationBell = ({ mobile = false }: Props) => {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pushAtivo, setPushAtivo] = useState(false);

  const temNotificacoes = itens.length > 0;

  const carregar = async () => {
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
  };

  const obterChavePublicaPush = async () => {
    const envKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").trim();
    if (envKey) {
      return envKey;
    }

    const resposta = await apiRequest<PushPublicKeyResponse>("/notificacoes/push/public-key");
    return String(resposta.publicKey ?? "").trim();
  };

  const inscreverPushNoDispositivo = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
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

    setPushAtivo(true);
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
  }, []);

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
          <DropdownMenuLabel className="p-0 text-sm">Notificações recentes</DropdownMenuLabel>
          <div className="inline-flex items-center gap-2">
            {!pushAtivo && Notification.permission !== "denied" && (
              <button
                type="button"
                onClick={() => void inscreverPushNoDispositivo()}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Ativar push
              </button>
            )}
            <button
              type="button"
              onClick={() => void marcarTodasComoLidas()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar lidas
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Carregando notificações...</p>
          ) : erro ? (
            <p className="px-2 py-3 text-sm text-destructive">{erro}</p>
          ) : !temNotificacoes ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação recente.</p>
          ) : (
            <ul className="space-y-1">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 ${
                    item.lida
                      ? "border-border/70 bg-background"
                      : "border-primary/25 bg-primary/5"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.titulo}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{item.mensagem}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {item.pedidoId ? (
                      <span className="text-xs text-foreground font-medium">Pedido #{item.pedidoId}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sistema</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatarData(item.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
