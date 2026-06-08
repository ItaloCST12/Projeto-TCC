import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, PackageCheck, Search, Truck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getAuthToken, getAuthUser, isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Pedido = {
  id: number;
  status: string;
  quantidade: number;
  unidade: string;
  tipoEntrega: string;
  formaPagamento: string;
  createdAt?: string;
  created_at?: string;
  produto?: {
    nome: string;
  };
  endereco?: {
    rua: string;
    numero?: string | null;
    cidade: string;
    cep: string;
  } | null;
  items?: {
    id: number;
    quantidade: number;
    unidade?: string;
    produto?: {
      nome: string;
    };
  }[];
};

type RespostaPaginada<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type EventoSocketTempoReal =
  | {
      type: "pedido_atualizado";
      payload: {
        pedidoId: number;
        usuarioId: number;
        status: string;
        origem: "NOVO_PEDIDO" | "STATUS_ATUALIZADO";
      };
    }
  | {
      type: "notificacao_nova";
      payload: {
        destinoRole: "ADMIN" | "USUARIO";
        usuarioId?: number;
        tipo?: string;
        pedidoId?: number;
      };
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

const ENDERECO_LOJA_RETIRADA = "R. Pastor Sozinho, 3071 - Provedor, Santana - AP, 68927-078";
const HORARIO_RETIRADA = "Seg a sáb, das 8h às 18h";

const formatarData = (data?: string) => {
  if (!data) {
    return null;
  }

  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

const resolverDataPedido = (pedido: Pedido) => pedido.createdAt ?? pedido.created_at;

const normalizarTipoEntrega = (tipoEntrega?: string) => (tipoEntrega ?? "").trim().toLowerCase();

const isRetirada = (pedido: Pedido) => normalizarTipoEntrega(pedido.tipoEntrega) === "retirada";

const isProntoParaRetirada = (pedido: Pedido) =>
  (pedido.status ?? "").trim().toUpperCase() === "PRONTO_PARA_RETIRADA";

const isSaiuParaEntrega = (pedido: Pedido) =>
  (pedido.status ?? "").trim().toUpperCase() === "SAIU_PARA_ENTREGA";

const isConcluido = (pedido: Pedido) =>
  (pedido.status ?? "").trim().toUpperCase() === "COMPLETADO";

const formatarTipoEntrega = (tipoEntrega?: string) => {
  const tipoNormalizado = normalizarTipoEntrega(tipoEntrega);

  if (tipoNormalizado === "retirada") {
    return "Retirada no local";
  }

  if (tipoNormalizado === "entrega") {
    return "Entrega em domicílio";
  }

  return tipoEntrega || "-";
};

const formatarEnderecoEntrega = (pedido: Pedido) => {
  const endereco = pedido.endereco;

  if (!endereco) {
    return "Endereço não informado";
  }

  const numero = endereco.numero?.trim() ? `, ${endereco.numero.trim()}` : "";
  return `${endereco.rua}${numero} - ${endereco.cidade} - CEP ${endereco.cep}`;
};

const formatarStatusPedido = (status?: string) => {
  const statusNormalizado = (status ?? "").trim().toUpperCase();

  if (statusNormalizado === "PENDENTE") {
    return "Pendente";
  }

  if (statusNormalizado === "PRONTO_PARA_RETIRADA") {
    return "Pronto para retirada";
  }

  if (statusNormalizado === "SAIU_PARA_ENTREGA") {
    return "Saiu para entrega";
  }

  if (statusNormalizado === "COMPLETADO") {
    return "Encomenda entregue";
  }

  if (statusNormalizado === "CANCELADO") {
    return "Cancelado";
  }

  return status || "-";
};

const classStatusPedido = (status?: string) => {
  const statusNormalizado = (status ?? "").trim().toUpperCase();

  if (statusNormalizado === "PENDENTE") {
    return "border-orange-400 bg-orange-50 text-orange-900";
  }

  if (statusNormalizado === "PRONTO_PARA_RETIRADA") {
    return "border-cyan-400 bg-cyan-50 text-cyan-900";
  }

  if (statusNormalizado === "SAIU_PARA_ENTREGA") {
    return "border-violet-400 bg-violet-50 text-violet-900";
  }

  if (statusNormalizado === "COMPLETADO") {
    return "border-emerald-400 bg-emerald-50 text-emerald-900";
  }

  if (statusNormalizado === "CANCELADO") {
    return "border-rose-400 bg-rose-50 text-rose-900";
  }

  return "border-slate-300 bg-slate-100 text-slate-800";
};

const ETAPAS_STATUS_ENTREGA = [
  { label: "Pendente", icon: Clock3 },
  { label: "Pronto", icon: CheckCircle2 },
  { label: "Saiu para entrega", icon: Truck },
  { label: "Entregue", icon: PackageCheck },
] as const;

const ETAPAS_STATUS_RETIRADA = [
  { label: "Pendente", icon: Clock3 },
  { label: "Pronto para retirada", icon: CheckCircle2 },
  { label: "Retirado", icon: PackageCheck },
] as const;

const resolverIndiceStatusEntrega = (status?: string) => {
  const statusNormalizado = (status ?? "").trim().toUpperCase();

  if (statusNormalizado === "PENDENTE") return 0;
  if (statusNormalizado === "PRONTO_PARA_RETIRADA") return 1;
  if (statusNormalizado === "SAIU_PARA_ENTREGA") return 2;
  if (statusNormalizado === "COMPLETADO") return 3;
  return 0;
};

const resolverIndiceStatusRetirada = (status?: string) => {
  const statusNormalizado = (status ?? "").trim().toUpperCase();

  if (statusNormalizado === "PENDENTE") return 0;
  if (statusNormalizado === "PRONTO_PARA_RETIRADA") return 1;
  if (statusNormalizado === "COMPLETADO") return 2;
  return 0;
};

const ordenarPedidosMaisRecentes = (lista: Pedido[]) =>
  [...lista].sort((a, b) => b.id - a.id);

const MinhasEncomendas = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();
  const authToken = getAuthToken();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams] = useSearchParams();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoPedidoId, setCancelandoPedidoId] = useState<number | null>(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [dataFiltro, setDataFiltro] = useState("");
  const [buscaPedido, setBuscaPedido] = useState("");
  const socketPedidosRef = useRef<WebSocket | null>(null);
  const reconnectSocketPedidosTimeoutRef = useRef<number | null>(null);
  const refreshPedidosTimeoutRef = useRef<number | null>(null);
  const paginaAtualRef = useRef(1);
  const carregarPedidosRef = useRef<(page?: number) => Promise<void>>(async () => {});
  const primeiraRenderFiltrosRef = useRef(true);

  const pedidoIdAlvo = useMemo(() => {
    const valor = searchParams.get("pedidoId");
    if (!valor) {
      return null;
    }

    const parsed = Number.parseInt(valor, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }, [searchParams]);

  const carregarPedidos = useCallback(async (page = paginaAtual) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page) });

      if (dataFiltro) {
        params.set("dataInicio", dataFiltro);
        params.set("dataFim", dataFiltro);
      }

      const prefixoPedido = buscaPedido.replace(/\D/g, "").slice(0, 9);
      if (prefixoPedido) {
        params.set("pedidoPrefixo", prefixoPedido);
      }

      const response = await apiRequest<RespostaPaginada<Pedido>>(
        `/pedidos/minhas-encomendas?${params.toString()}`,
      );

      setPedidos(ordenarPedidosMaisRecentes(response.data));
      setPaginaAtual(response.pagination.page);
      setTotalPaginas(response.pagination.totalPages);
      setTotalPedidos(response.pagination.total);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar suas encomendas.",
      );
    } finally {
      setLoading(false);
    }
  }, [dataFiltro, buscaPedido, paginaAtual]);

  useEffect(() => {
    paginaAtualRef.current = paginaAtual;
  }, [paginaAtual]);

  useEffect(() => {
    carregarPedidosRef.current = carregarPedidos;
  }, [carregarPedidos]);

  // Busca automática: número com pequeno atraso (debounce) para não disparar a
  // cada tecla; a data aplica praticamente na hora ao ser selecionada.
  useEffect(() => {
    if (primeiraRenderFiltrosRef.current) {
      primeiraRenderFiltrosRef.current = false;
      return;
    }

    const handler = window.setTimeout(() => {
      void carregarPedidosRef.current(1);
    }, 400);

    return () => window.clearTimeout(handler);
  }, [dataFiltro, buscaPedido]);

  useEffect(() => {
    void carregarPedidos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoIdAlvo]);

  useEffect(() => {
    if (loading || !pedidoIdAlvo || pedidos.length === 0) {
      return;
    }

    const elemento = document.getElementById(`pedido-${pedidoIdAlvo}`);
    if (!elemento) {
      return;
    }

    elemento.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, pedidoIdAlvo, pedidos]);

  useEffect(() => {
    if (!authenticated || isAdmin || !user?.id || !authToken) {
      if (refreshPedidosTimeoutRef.current) {
        window.clearTimeout(refreshPedidosTimeoutRef.current);
      }
      if (reconnectSocketPedidosTimeoutRef.current) {
        window.clearTimeout(reconnectSocketPedidosTimeoutRef.current);
      }
      socketPedidosRef.current?.close();
      return;
    }

    let shouldReconnect = true;

    const agendarAtualizacaoPedidos = () => {
      if (refreshPedidosTimeoutRef.current) {
        window.clearTimeout(refreshPedidosTimeoutRef.current);
      }

      refreshPedidosTimeoutRef.current = window.setTimeout(() => {
        void carregarPedidosRef.current(paginaAtualRef.current || 1);
        refreshPedidosTimeoutRef.current = null;
      }, 200);
    };

    const conectar = () => {
      const socket = new WebSocket(buildWsUrl(authToken));
      socketPedidosRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as EventoSocketTempoReal;

          if (
            parsed.type === "pedido_atualizado" &&
            parsed.payload.usuarioId === user.id
          ) {
            agendarAtualizacaoPedidos();
            return;
          }

          if (parsed.type === "notificacao_nova") {
            const tipo = String(parsed.payload.tipo ?? "").trim().toUpperCase();
            const pertenceAoUsuario = parsed.payload.usuarioId === user.id;
            const ehNotificacaoDePedido = tipo.includes("PEDIDO") || Boolean(parsed.payload.pedidoId);

            if (parsed.payload.destinoRole === "USUARIO" && pertenceAoUsuario && ehNotificacaoDePedido) {
              agendarAtualizacaoPedidos();
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

        reconnectSocketPedidosTimeoutRef.current = window.setTimeout(conectar, 1500);
      };
    };

    conectar();

    return () => {
      shouldReconnect = false;
      if (refreshPedidosTimeoutRef.current) {
        window.clearTimeout(refreshPedidosTimeoutRef.current);
      }
      if (reconnectSocketPedidosTimeoutRef.current) {
        window.clearTimeout(reconnectSocketPedidosTimeoutRef.current);
      }
      socketPedidosRef.current?.close();
    };
  }, [authToken, authenticated, isAdmin, user?.id]);

  const limparFiltroData = () => {
    setDataFiltro("");
    setBuscaPedido("");
    setPaginaAtual(1);
  };

  const cancelarPedido = async (pedidoId: number) => {
    setCancelandoPedidoId(pedidoId);
    setError("");

    try {
      await apiRequest(`/pedidos/${pedidoId}/cancelar`, {
        method: "PATCH",
      });
      await carregarPedidos();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Não foi possível cancelar o pedido.",
      );
    } finally {
      setCancelandoPedidoId(null);
      setPedidoParaCancelar(null);
    }
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/minhas-encomendas" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/painel-entregas" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Minhas Encomendas"
        titleIcon={<CalendarDays className="h-5 w-5" />}
        subtitle={`${user?.nome ? `Olá, ${user.nome}.` : "Você está logado."} Acompanhe todos os seus pedidos em um só lugar.`}
        containerClassName="max-w-5xl"
      >
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Histórico de pedidos ({totalPedidos})
            </h2>
            <button
              type="button"
              onClick={() => void carregarPedidos(paginaAtual)}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted"
            >
              Atualizar
            </button>
          </div>

          <div className="mb-4 relative overflow-hidden flex items-center gap-3.5 rounded-xl border border-emerald-300/70 bg-gradient-to-r from-emerald-50 to-teal-100/40 p-3.5 shadow-sm dark:border-emerald-700/50 dark:from-emerald-950/30 dark:to-teal-900/10">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-emerald-500 dark:bg-emerald-500" aria-hidden="true" />
            <span className="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:ring-emerald-700/50">
              <Truck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Dias de entrega</p>
              <p className="text-sm leading-relaxed text-emerald-800/90 dark:text-emerald-200/80">
                As entregas são realizadas apenas aos domingos e segundas-feiras.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mb-4"
          >
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(event) => setDataFiltro(event.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none"
                aria-label="Data do pedido"
              />
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={buscaPedido}
                onChange={(event) => setBuscaPedido(event.target.value)}
                placeholder="Nº do pedido"
                className="w-full bg-transparent text-sm text-foreground outline-none"
                aria-label="Número do pedido"
              />
            </label>
            <button
              type="button"
              onClick={() => void limparFiltroData()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted"
            >
              Limpar
            </button>
          </form>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`pedido-skeleton-${index}`} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-8 w-36" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : pedidos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4">
              {buscaPedido.trim() ? (
                <p className="text-sm text-muted-foreground">
                  Você não tem nenhum pedido com o número #{buscaPedido.trim()}.
                </p>
              ) : dataFiltro ? (
                <p className="text-sm text-muted-foreground">
                  Você não tem pedidos nessa data.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Você ainda não possui encomendas.
                  </p>
                  <Link
                    to="/encomenda"
                    className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Ver produtos
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {pedidos.map((pedido) => {
                const dataFormatada = formatarData(resolverDataPedido(pedido));
                const itensPedido =
                  pedido.items && pedido.items.length > 0
                    ? pedido.items
                    : [
                        {
                          id: -pedido.id,
                          quantidade: pedido.quantidade,
                          unidade: pedido.unidade,
                          produto: { nome: pedido.produto?.nome ?? "Produto" },
                        },
                      ];
                const totalItensPedido = itensPedido.reduce(
                  (total, item) => total + (Number(item.quantidade) || 0),
                  0,
                );
                const etapasStatus = isRetirada(pedido)
                  ? ETAPAS_STATUS_RETIRADA
                  : ETAPAS_STATUS_ENTREGA;
                const indiceStatusAtual = isRetirada(pedido)
                  ? resolverIndiceStatusRetirada(pedido.status)
                  : resolverIndiceStatusEntrega(pedido.status);

                return (
                  <li
                    key={pedido.id}
                    id={`pedido-${pedido.id}`}
                    className={`rounded-lg border bg-background p-4 transition-colors ${
                      pedidoIdAlvo === pedido.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        Pedido #{pedido.id}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-extrabold tracking-wide uppercase ${classStatusPedido(pedido.status)}`}
                      >
                        {formatarStatusPedido(pedido.status)}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                      <p className="text-muted-foreground">
                        Entrega: <span className="text-foreground">{formatarTipoEntrega(pedido.tipoEntrega)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Pagamento: <span className="text-foreground">{pedido.formaPagamento}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Data: <span className="text-foreground">{dataFormatada ?? "-"}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Itens: <span className="text-foreground">{totalItensPedido}</span>
                      </p>
                    </div>

                    {pedido.status !== "CANCELADO" && (
                      <div className="mb-3 space-y-2">
                        <p className="text-xs text-muted-foreground md:hidden">
                          Etapa atual: <span className="font-semibold text-foreground">{formatarStatusPedido(pedido.status)}</span>
                        </p>

                        <div className="grid grid-cols-2 gap-2 md:hidden">
                          {etapasStatus.map((etapa, index) => {
                            const Icone = etapa.icon;
                            const concluida = index < indiceStatusAtual;
                            const ativa = index === indiceStatusAtual;

                            return (
                              <div
                                key={`${pedido.id}-mobile-${etapa.label}`}
                                className={`rounded-md border px-2.5 py-2 ${
                                  concluida || ativa
                                    ? "border-primary/30 bg-primary/10"
                                    : "border-border bg-muted/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-6 w-6 rounded-full border inline-flex items-center justify-center shrink-0 ${
                                      concluida || ativa
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border bg-background text-muted-foreground"
                                    }`}
                                  >
                                    <Icone className="h-3.5 w-3.5" />
                                  </div>
                                  <p
                                    className={`text-[11px] leading-tight font-semibold ${
                                      ativa ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  >
                                    {etapa.label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                          <div className="flex items-start min-w-[560px] gap-2">
                            {etapasStatus.map((etapa, index) => {
                              const Icone = etapa.icon;
                              const concluida = index < indiceStatusAtual;
                              const ativa = index === indiceStatusAtual;

                              return (
                                <div key={`${pedido.id}-${etapa.label}`} className="flex-1 flex items-center gap-2">
                                  <div
                                    className={`h-8 w-8 rounded-full border inline-flex items-center justify-center shrink-0 ${
                                      concluida || ativa
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border bg-muted/30 text-muted-foreground"
                                    }`}
                                  >
                                    <Icone className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className={`text-xs font-semibold ${
                                        ativa ? "text-foreground" : "text-muted-foreground"
                                      }`}
                                    >
                                      {etapa.label}
                                    </p>
                                    <div className="mt-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          concluida || ativa ? "bg-primary" : "bg-transparent"
                                        }`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border border-border/80 p-3">
                      <p className="text-xs text-muted-foreground mb-2">Produtos encomendados</p>
                      <ul className="space-y-1">
                        {itensPedido.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-foreground">{item.produto?.nome ?? "Produto"}</span>
                            <span className="text-muted-foreground">
                              {item.quantidade} {item.unidade ?? pedido.unidade}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isRetirada(pedido) && isProntoParaRetirada(pedido) && !isConcluido(pedido) && (
                      <div className="mt-3 rounded-md border-2 border-primary/40 bg-muted/30 p-3">
                        <p className="text-sm font-semibold text-foreground">
                          Pedido pronto para retirada.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sua encomenda já está disponível. Dirija-se ao local de retirada para buscar o pedido.
                        </p>
                      </div>
                    )}

                    {isRetirada(pedido) && (
                      <div className="mt-3 rounded-md border-2 border-primary/40 bg-muted/30 p-3">
                        <p className="text-sm font-semibold text-foreground">Local de retirada.</p>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{ENDERECO_LOJA_RETIRADA}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4 shrink-0 text-primary" />
                          <span>Horário para retirada: {HORARIO_RETIRADA}</span>
                        </p>
                      </div>
                    )}

                    {!isRetirada(pedido) && (
                      <div className="mt-3 rounded-md bg-muted/70 p-3">
                        <p className="text-xs text-muted-foreground">Endereço de entrega</p>
                        <p className="text-sm text-foreground">{formatarEnderecoEntrega(pedido)}</p>
                      </div>
                    )}

                    {isSaiuParaEntrega(pedido) && !isConcluido(pedido) && (
                      <div className="mt-3 rounded-md border-2 border-primary/40 bg-muted/30 p-3">
                        <p className="text-sm font-semibold text-foreground">
                          Pedido saiu para entrega.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sua encomenda está a caminho. Aguarde no endereço informado para recebimento.
                        </p>
                      </div>
                    )}

                    {pedido.status !== "COMPLETADO" && pedido.status !== "CANCELADO" && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setPedidoParaCancelar(pedido.id)}
                          disabled={cancelandoPedidoId === pedido.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                        >
                          {cancelandoPedidoId === pedido.id
                            ? "Cancelando..."
                            : "Cancelar pedido"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void carregarPedidos(paginaAtual - 1)}
                disabled={paginaAtual <= 1}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => void carregarPedidos(paginaAtual + 1)}
                disabled={paginaAtual >= totalPaginas}
                className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>

        <AlertDialog
          open={pedidoParaCancelar !== null}
          onOpenChange={(open) => {
            if (!open && cancelandoPedidoId === null) {
              setPedidoParaCancelar(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja cancelar este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita e o pedido será marcado como cancelado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelandoPedidoId !== null}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pedidoParaCancelar !== null) {
                    void cancelarPedido(pedidoParaCancelar);
                  }
                }}
                disabled={cancelandoPedidoId !== null}
              >
                {cancelandoPedidoId !== null ? "Cancelando..." : "Confirmar cancelamento"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageShell>
    </div>
  );
};

export default MinhasEncomendas;
