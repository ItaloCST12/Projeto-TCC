import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
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

const upsertMensagem = (lista: Mensagem[], nova: Mensagem) => {
  const exists = lista.some((item) => item.id === nova.id);
  if (exists) {
    return lista;
  }

  return [...lista, nova].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

const Chat = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";
  const authToken = getAuthToken();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const usuarioSelecionadoRef = useRef<number | null>(null);

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    usuarioSelecionadoRef.current = usuarioSelecionado;
  }, [usuarioSelecionado]);

  const loadConversasAdmin = useCallback(async () => {
    const response = await apiRequest<ConversaResumo[]>("/atendimentos/admin/conversas");
    setConversas(response);
    if (!usuarioSelecionado && response.length > 0) {
      setUsuarioSelecionado(response[0].usuarioId);
    }
  }, [usuarioSelecionado]);

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
      return;
    }

    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(buildWsUrl(authToken));
      socketRef.current = socket;

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

                const novaConversa: ConversaResumo = {
                  usuarioId: mensagem.usuarioId,
                  nome: nomeAtual,
                  email: emailAtual,
                  ultimaMensagem: mensagem.texto,
                  ultimaAtualizacao: mensagem.createdAt,
                  totalMensagens: existente ? existente.totalMensagens + 1 : 1,
                };

                const semAtual = prev.filter((item) => item.usuarioId !== mensagem.usuarioId);
                return [novaConversa, ...semAtual];
              });

              setUsuarioSelecionado((valorAtual) => valorAtual ?? mensagem.usuarioId);

              if (usuarioSelecionadoRef.current === mensagem.usuarioId) {
                setMensagens((prev) => upsertMensagem(prev, mensagem));
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
    };
  }, [authenticated, authToken, isAdmin, user?.id]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!texto.trim()) {
      return;
    }

    setSending(true);
    setError("");
    try {
      if (isAdmin) {
        if (!usuarioSelecionado) {
          throw new Error("Selecione uma conversa.");
        }
        await apiRequest(`/atendimentos/admin/conversas/${usuarioSelecionado}/responder`, {
          method: "POST",
          body: { texto },
        });
        await loadConversasAdmin();
      } else {
        await apiRequest("/atendimentos/me", {
          method: "POST",
          body: { texto },
        });
      }

      setTexto("");
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Não foi possível enviar mensagem.",
      );
    } finally {
      setSending(false);
    }
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/chat" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <PageShell
        title="Atendimento da Plataforma"
        titleIcon={<MessageCircle className="h-5 w-5" />}
        subtitle={isAdmin ? "Atenda clientes e acompanhe conversas." : "Converse com nosso suporte."}
        containerClassName="max-w-5xl px-2 sm:px-4"
      >

        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[280px_minmax(0,1fr)] md:gap-4">
          <div className="hidden rounded-xl border border-border bg-card p-4 md:block">
            <h2 className="font-semibold text-foreground mb-3">Conversas</h2>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">Conversa com suporte</p>
            ) : conversas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conversa iniciada.</p>
            ) : (
              <ul className="space-y-2">
                {conversas.map((conversa) => (
                  <li key={conversa.usuarioId}>
                    <button
                      type="button"
                      onClick={() => setUsuarioSelecionado(conversa.usuarioId)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                        usuarioSelecionado === conversa.usuarioId
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <p className="font-semibold text-foreground truncate">{conversa.nome}</p>
                      <p className="text-muted-foreground truncate">{conversa.ultimaMensagem}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
            <h2 className="font-semibold text-foreground mb-3">Mensagens</h2>
            {isAdmin && conversas.length > 0 && (
              <div className="mb-3 md:hidden">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Conversas
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {conversas.map((conversa) => (
                    <button
                      key={conversa.usuarioId}
                      type="button"
                      onClick={() => setUsuarioSelecionado(conversa.usuarioId)}
                      className={`max-w-[65vw] shrink-0 truncate rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        usuarioSelecionado === conversa.usuarioId
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                      title={conversa.nome}
                    >
                      {conversa.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-2/3 ml-auto" />
                <Skeleton className="h-16 w-4/5" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div className="mb-4 h-[45dvh] min-h-[240px] w-full overflow-y-auto rounded-lg border border-border p-3 md:h-auto md:min-h-[280px] md:max-h-[420px] space-y-2">
                  {mensagens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  ) : (
                    mensagens.map((mensagem) => {
                      const minhaMensagem = isAdmin
                        ? mensagem.autor === "SUPORTE"
                        : mensagem.autor === "USUARIO";

                      const remetente = minhaMensagem
                        ? "Você"
                        : mensagem.autor === "SUPORTE"
                          ? "Suporte"
                          : "Cliente";

                      return (
                        <div
                          key={mensagem.id}
                          className={`max-w-[85%] break-words rounded-lg px-3 py-2 text-sm ${
                            minhaMensagem
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p
                            className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
                              minhaMensagem
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {remetente}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{mensagem.texto}</p>
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
                </div>

                <form onSubmit={sendMessage} className="w-full space-y-2">
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-foreground md:min-h-[90px]"
                    placeholder="Digite sua mensagem"
                    maxLength={300}
                    required
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending || (isAdmin && !usuarioSelecionado)}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    {sending ? "Enviando..." : "Enviar mensagem"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </PageShell>
    </div>
  );
};

export default Chat;