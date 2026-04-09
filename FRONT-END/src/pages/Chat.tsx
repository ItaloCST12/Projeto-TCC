import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { MessageCircle, Paperclip, Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { getAuthToken, getAuthUser, isAuthenticated } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

type Mensagem = {
  id: number;
  usuarioId: number;
  autor: "USUARIO" | "SUPORTE";
  texto: string;
  imagemUrl?: string | null;
  createdAt: string;
};

type ConversaResumo = {
  usuarioId: number;
  nome: string;
  email: string;
  ultimaMensagem: string;
  ultimaAtualizacao: string;
  totalMensagens: number;
};

type EventoSocket =
  | {
      type: "mensagem_nova";
      payload: Mensagem;
    }
  | {
      type: "conversa_limpada";
      payload: { usuarioId: number };
    };

const WS_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";
const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BADGE_NAO_LIDAS = 99;

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

const resolverImagemMensagem = (imagemUrl: string | null | undefined) => {
  if (!imagemUrl?.trim()) {
    return null;
  }

  if (imagemUrl.startsWith("http://") || imagemUrl.startsWith("https://")) {
    return imagemUrl;
  }

  const normalizedPath = imagemUrl.startsWith("/") ? imagemUrl : `/${imagemUrl}`;

  if (!WS_BASE_URL) {
    return normalizedPath;
  }

  const normalizedBase = WS_BASE_URL.endsWith("/")
    ? WS_BASE_URL.slice(0, -1)
    : WS_BASE_URL;

  return `${normalizedBase}${normalizedPath}`;
};

const upsertMensagem = (lista: Mensagem[], nova: Mensagem) => {
  const exists = lista.some((item) => item.id === nova.id);
  if (exists) {
    return lista;
  }

  return [...lista, nova].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const formatarTempoRelativo = (valor: string) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return "Data inválida";
  }

  const agora = Date.now();
  const diferencaMs = data.getTime() - agora;
  const diferencaAbsMs = Math.abs(diferencaMs);
  const minutoMs = 60 * 1000;
  const horaMs = 60 * minutoMs;
  const diaMs = 24 * horaMs;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (diferencaAbsMs < horaMs) {
    return rtf.format(Math.round(diferencaMs / minutoMs), "minute");
  }

  if (diferencaAbsMs < diaMs) {
    return rtf.format(Math.round(diferencaMs / horaMs), "hour");
  }

  if (diferencaAbsMs < 7 * diaMs) {
    return rtf.format(Math.round(diferencaMs / diaMs), "day");
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(data);
};

const formatarBadgeNaoLidas = (quantidade: number) => {
  if (quantidade > MAX_BADGE_NAO_LIDAS) {
    return `${MAX_BADGE_NAO_LIDAS}...`;
  }

  return String(quantidade);
};

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const authenticated = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";
  const authToken = getAuthToken();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const usuarioSelecionadoRef = useRef<number | null>(null);
  const imagemInputRef = useRef<HTMLInputElement | null>(null);
  const mensagensEndRef = useRef<HTMLDivElement | null>(null);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState<Record<number, number>>({});
  const [buscaConversa, setBuscaConversa] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [imagemSelecionada, setImagemSelecionada] = useState<File | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"conectado" | "reconectando" | "desconectado">("desconectado");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imagemSelecionada) {
      setPreviewImagem(null);
      return;
    }

    const localUrl = URL.createObjectURL(imagemSelecionada);
    setPreviewImagem(localUrl);

    return () => {
      URL.revokeObjectURL(localUrl);
    };
  }, [imagemSelecionada]);

  const limparImagemSelecionada = () => {
    setImagemSelecionada(null);
    if (imagemInputRef.current) {
      imagemInputRef.current.value = "";
    }
  };

  const formatarDataHoraMensagem = (valor: string) => {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return "Data inválida";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(data);
  };

  const endpointMensagens = useMemo(() => {
    if (!isAdmin) {
      return "/atendimentos/me";
    }
    return usuarioSelecionado
      ? `/atendimentos/admin/conversas/${usuarioSelecionado}`
      : null;
  }, [isAdmin, usuarioSelecionado]);

  const usuarioSelecionadoViaQuery = useMemo(() => {
    const rawValue = searchParams.get("usuarioId");
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [searchParams]);

  const conversasFiltradas = useMemo(() => {
    if (!isAdmin) {
      return [] as ConversaResumo[];
    }

    const termo = buscaConversa.trim().toLowerCase();
    if (!termo) {
      return conversas;
    }

    return conversas.filter((conversa) => {
      const nome = conversa.nome?.toLowerCase() || "";
      const usuarioId = String(conversa.usuarioId);

      return (
        nome.includes(termo) ||
        usuarioId.includes(termo)
      );
    });
  }, [buscaConversa, conversas, isAdmin]);

  useEffect(() => {
    usuarioSelecionadoRef.current = usuarioSelecionado;
  }, [usuarioSelecionado]);

  useEffect(() => {
    if (!usuarioSelecionado) {
      return;
    }

    setMensagensNaoLidas((prev) => {
      if (!prev[usuarioSelecionado]) {
        return prev;
      }
      const next = { ...prev };
      delete next[usuarioSelecionado];
      return next;
    });
  }, [usuarioSelecionado]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setError("");
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [error]);

  useEffect(() => {
    if (!imagemExpandida) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagemExpandida(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [imagemExpandida]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  const loadConversasAdmin = useCallback(async () => {
    const response = await apiRequest<ConversaResumo[]>("/atendimentos/admin/conversas");
    setConversas(response);

    if (response.length === 0) {
      setUsuarioSelecionado(null);
      return;
    }

    if (
      usuarioSelecionadoViaQuery &&
      response.some((item) => item.usuarioId === usuarioSelecionadoViaQuery)
    ) {
      setUsuarioSelecionado(usuarioSelecionadoViaQuery);
      return;
    }

    if (
      !usuarioSelecionado ||
      !response.some((item) => item.usuarioId === usuarioSelecionado)
    ) {
      setUsuarioSelecionado(response[0].usuarioId);
    }
  }, [usuarioSelecionado, usuarioSelecionadoViaQuery]);

  const loadMensagens = useCallback(async () => {
    if (!endpointMensagens) {
      setMensagens([]);
      return;
    }
    const response = await apiRequest<Mensagem[]>(endpointMensagens);
    setMensagens(response);
  }, [endpointMensagens]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (isAdmin) {
          await loadConversasAdmin();
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar as conversas.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAdmin, loadConversasAdmin]);

  useEffect(() => {
    const load = async () => {
      if (loading) {
        return;
      }
      setError("");
      try {
        await loadMensagens();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar mensagens.",
        );
      }
    };

    void load();
  }, [loading, loadMensagens]);

  useEffect(() => {
    if (!authenticated || !authToken || !user?.id) {
      setWsStatus("desconectado");
      return;
    }

    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(buildWsUrl(authToken));
      socketRef.current = socket;

      socket.onopen = () => {
        setWsStatus("conectado");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as EventoSocket | { type: "mensagem_nova"; payload: { ready: true } };

          if (parsed.type === "mensagem_nova" && "id" in parsed.payload) {
            const mensagem = parsed.payload;

            if (isAdmin) {
              setConversas((prev) => {
                const nomeAtual = prev.find((item) => item.usuarioId === mensagem.usuarioId)?.nome ?? "Cliente";
                const emailAtual = prev.find((item) => item.usuarioId === mensagem.usuarioId)?.email ?? "";
                const existente = prev.find((item) => item.usuarioId === mensagem.usuarioId);
                const resumoMensagem =
                  mensagem.texto?.trim() || (mensagem.imagemUrl ? "Imagem enviada" : "Nova mensagem");

                const novaConversa: ConversaResumo = {
                  usuarioId: mensagem.usuarioId,
                  nome: nomeAtual,
                  email: emailAtual,
                  ultimaMensagem: resumoMensagem,
                  ultimaAtualizacao: mensagem.createdAt,
                  totalMensagens: existente ? existente.totalMensagens + 1 : 1,
                };

                const semAtual = prev.filter((item) => item.usuarioId !== mensagem.usuarioId);
                return [novaConversa, ...semAtual];
              });

              setUsuarioSelecionado((valorAtual) => valorAtual ?? mensagem.usuarioId);

              if (usuarioSelecionadoRef.current === mensagem.usuarioId) {
                setMensagens((prev) => upsertMensagem(prev, mensagem));
              } else {
                setMensagensNaoLidas((prev) => ({
                  ...prev,
                  [mensagem.usuarioId]: (prev[mensagem.usuarioId] ?? 0) + 1,
                }));
              }
              return;
            }

            if (mensagem.usuarioId === user.id) {
              setMensagens((prev) => upsertMensagem(prev, mensagem));
            }
            return;
          }

          if (parsed.type === "conversa_limpada") {
            const { usuarioId } = parsed.payload;

            if (isAdmin) {
              setConversas((prev) => prev.filter((item) => item.usuarioId !== usuarioId));
              setMensagensNaoLidas((prev) => {
                if (!prev[usuarioId]) {
                  return prev;
                }
                const next = { ...prev };
                delete next[usuarioId];
                return next;
              });
              if (usuarioSelecionadoRef.current === usuarioId) {
                setMensagens([]);
              }
              return;
            }

            if (usuarioId === user.id) {
              setMensagens([]);
            }
          }
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        setWsStatus(shouldReconnect ? "reconectando" : "desconectado");
        if (!shouldReconnect) {
          return;
        }
        reconnectTimeoutRef.current = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
      setWsStatus("desconectado");
    };
  }, [authenticated, authToken, isAdmin, user?.id]);

  useEffect(() => {
    if (!isAdmin || !usuarioSelecionadoViaQuery) {
      return;
    }

    if (!conversas.some((item) => item.usuarioId === usuarioSelecionadoViaQuery)) {
      return;
    }

    setUsuarioSelecionado(usuarioSelecionadoViaQuery);
    setMensagensNaoLidas((prev) => {
      if (!prev[usuarioSelecionadoViaQuery]) {
        return prev;
      }

      const next = { ...prev };
      delete next[usuarioSelecionadoViaQuery];
      return next;
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("usuarioId");
    setSearchParams(nextParams, { replace: true });
  }, [
    conversas,
    isAdmin,
    searchParams,
    setSearchParams,
    usuarioSelecionadoViaQuery,
  ]);

  const enviarMensagem = useCallback(async () => {
    const textoNormalizado = texto.trim();

    if (!textoNormalizado && !imagemSelecionada) {
      return;
    }

    const payload: FormData | { texto: string } = imagemSelecionada
      ? (() => {
          const formData = new FormData();
          formData.append("texto", textoNormalizado);
          formData.append("imagem", imagemSelecionada);
          return formData;
        })()
      : { texto: textoNormalizado };

    setSending(true);
    setError("");
    try {
      if (isAdmin) {
        if (!usuarioSelecionado) {
          throw new Error("Selecione uma conversa.");
        }
        await apiRequest(`/atendimentos/admin/conversas/${usuarioSelecionado}/responder`, {
          method: "POST",
          body: payload,
        });
        await loadConversasAdmin();
      } else {
        await apiRequest("/atendimentos/me", {
          method: "POST",
          body: payload,
        });
      }

      setTexto("");
      limparImagemSelecionada();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Não foi possível enviar mensagem.",
      );
    } finally {
      setSending(false);
    }
  }, [imagemSelecionada, isAdmin, loadConversasAdmin, texto, usuarioSelecionado]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await enviarMensagem();
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/chat" replace />;
  }

  const handleImagemSelecionada = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImagemSelecionada(null);
      return;
    }

    if (!ALLOWED_CHAT_IMAGE_TYPES.includes(file.type)) {
      setError("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
      limparImagemSelecionada();
      return;
    }

    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      setError("A imagem deve ter no máximo 5 MB.");
      limparImagemSelecionada();
      return;
    }

    setError("");
    setImagemSelecionada(file);
  };

  const handleTextareaKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (sending || (isAdmin && !usuarioSelecionado) || (!texto.trim() && !imagemSelecionada)) {
      return;
    }

    void enviarMensagem();
  };

  const selecionarConversa = (idUsuario: number) => {
    setUsuarioSelecionado(idUsuario);
    setMensagensNaoLidas((prev) => {
      if (!prev[idUsuario]) {
        return prev;
      }
      const next = { ...prev };
      delete next[idUsuario];
      return next;
    });
  };

  const wsStatusConfig =
    wsStatus === "conectado"
      ? { label: "Conectado", dotClassName: "bg-emerald-500" }
      : wsStatus === "reconectando"
        ? { label: "Reconectando...", dotClassName: "bg-amber-500" }
        : { label: "Desconectado", dotClassName: "bg-red-500" };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <PageShell
        title="Atendimento da Plataforma"
        titleIcon={<MessageCircle className="h-5 w-5" />}
        subtitle={isAdmin ? "Atenda clientes e acompanhe conversas." : "Converse com nosso suporte."}
        containerClassName="max-w-5xl px-2 sm:px-4 [&_h1]:flex-wrap [&_h1]:text-2xl sm:[&_h1]:text-4xl"
      >

        <div className="grid min-w-0 gap-3 md:grid-cols-[280px_1fr] md:gap-4">
          <div className="min-w-0 bg-card border border-border rounded-xl p-3 sm:p-4">
            <h2 className="font-semibold text-foreground mb-3">Conversas</h2>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">Conversa com suporte</p>
            ) : conversas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conversa iniciada.</p>
            ) : (
              <>
                <label className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaConversa}
                    onChange={(event) => setBuscaConversa(event.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Buscar por nome ou ID"
                  />
                </label>

                {conversasFiltradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
                ) : (
                  <ul className="space-y-2 max-h-[34vh] overflow-y-auto pr-1 md:max-h-none md:overflow-visible md:pr-0">
                    {conversasFiltradas.map((conversa) => (
                  <li key={conversa.usuarioId}>
                    <button
                      type="button"
                      onClick={() => selecionarConversa(conversa.usuarioId)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                        usuarioSelecionado === conversa.usuarioId
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{conversa.nome}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatarTempoRelativo(conversa.ultimaAtualizacao)}
                          </span>
                          {(mensagensNaoLidas[conversa.usuarioId] ?? 0) > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                              {formatarBadgeNaoLidas(mensagensNaoLidas[conversa.usuarioId])}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {conversa.ultimaMensagem?.trim() || "Imagem enviada"}
                      </p>
                    </button>
                  </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="min-w-0 bg-card border border-border rounded-xl p-3 sm:p-4 flex min-h-[420px] flex-col overflow-y-auto md:max-h-[78vh] md:overflow-hidden">
            <h2 className="font-semibold text-foreground mb-3">Mensagens</h2>
            <div className="mb-3 inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${wsStatusConfig.dotClassName}`} />
              {wsStatusConfig.label}
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-2/3 ml-auto" />
                <Skeleton className="h-16 w-4/5" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 min-h-[250px] max-h-[52vh] flex-1 overflow-y-auto rounded-lg border border-border p-3 space-y-2 scroll-smooth">
                  {mensagens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  ) : (
                    mensagens.map((mensagem) => {
                      const minhaMensagem = isAdmin
                        ? mensagem.autor === "SUPORTE"
                        : mensagem.autor === "USUARIO";
                      const textoMensagem = mensagem.texto?.trim() || "";
                      const imagemMensagem = resolverImagemMensagem(mensagem.imagemUrl);

                      const remetente = minhaMensagem
                        ? "Você"
                        : mensagem.autor === "SUPORTE"
                          ? "Suporte"
                          : "Cliente";
                      const inicialRemetente = remetente.charAt(0).toUpperCase();

                      return (
                        <div
                          key={mensagem.id}
                          className={`max-w-[85%] break-words rounded-lg px-3 py-2 text-sm ${
                            minhaMensagem
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                minhaMensagem
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/20 text-primary"
                              }`}
                            >
                              {inicialRemetente}
                            </span>
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-wide ${
                                minhaMensagem
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {remetente}
                            </p>
                          </div>
                          {textoMensagem ? (
                            <p className="whitespace-pre-wrap break-words">{textoMensagem}</p>
                          ) : null}
                          {imagemMensagem ? (
                            <button
                              type="button"
                              onClick={() => setImagemExpandida(imagemMensagem)}
                              className="mt-2 block"
                            >
                              <img
                                src={imagemMensagem}
                                alt="Imagem enviada no chat"
                                className="max-h-60 w-auto rounded-md border border-border/30"
                              />
                            </button>
                          ) : null}
                          <p
                            className={`mt-1 text-[11px] ${
                              minhaMensagem
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatarDataHoraMensagem(mensagem.createdAt)}
                          </p>
                        </div>
                      );
                    })
                  )}
                  <div ref={mensagensEndRef} />
                </div>

                <form onSubmit={sendMessage} className="space-y-2">
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Digite sua mensagem (opcional ao enviar foto)"
                    maxLength={300}
                  />
                  <p
                    className={`text-right text-xs ${
                      texto.length > 270 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {texto.length}/300
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                      <Paperclip className="h-4 w-4" />
                      Anexar foto
                      <input
                        ref={imagemInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImagemSelecionada}
                        className="hidden"
                      />
                    </label>

                    {imagemSelecionada ? (
                      <button
                        type="button"
                        onClick={limparImagemSelecionada}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                        Remover foto
                      </button>
                    ) : null}
                  </div>

                  {previewImagem ? (
                    <div className="rounded-lg border border-border p-2">
                      <p className="mb-2 text-xs text-muted-foreground">Pré-visualização</p>
                      <img
                        src={previewImagem}
                        alt="Pré-visualização da imagem"
                        className="max-h-48 w-auto rounded-md"
                      />
                    </div>
                  ) : null}

                  {error ? (
                    <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <p>{error}</p>
                      <button
                        type="button"
                        onClick={() => setError("")}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-destructive/20"
                        aria-label="Fechar erro"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      (isAdmin && !usuarioSelecionado) ||
                      (!texto.trim() && !imagemSelecionada)
                    }
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    {sending ? "Enviando..." : "Enviar mensagem"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </PageShell>

      {imagemExpandida ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagemExpandida(null)}
        >
          <button
            type="button"
            onClick={() => setImagemExpandida(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Fechar imagem"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <img
              src={imagemExpandida}
              alt="Imagem expandida"
              className="max-h-[90vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Chat;