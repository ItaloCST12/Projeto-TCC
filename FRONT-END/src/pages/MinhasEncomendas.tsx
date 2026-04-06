import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getAuthUser, isAuthenticated } from "@/lib/auth";
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

const ENDERECO_LOJA_RETIRADA = "R. Pastor Sozinho, 3071 - Provedor, Santana - AP, 68927-078";

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

const MinhasEncomendas = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoPedidoId, setCancelandoPedidoId] = useState<number | null>(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [dataFiltro, setDataFiltro] = useState("");

  const carregarPedidos = async (page = paginaAtual) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page) });

      if (dataFiltro) {
        params.set("dataInicio", dataFiltro);
        params.set("dataFim", dataFiltro);
      }

      const response = await apiRequest<RespostaPaginada<Pedido>>(
        `/pedidos/minhas-encomendas?${params.toString()}`,
      );

      setPedidos(response.data);
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
  };

  useEffect(() => {
    void carregarPedidos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltroData = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaginaAtual(1);
    await carregarPedidos(1);
  };

  const limparFiltroData = async () => {
    setDataFiltro("");
    setPaginaAtual(1);
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<RespostaPaginada<Pedido>>(
        "/pedidos/minhas-encomendas?page=1",
      );
      setPedidos(response.data);
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

          <form
            onSubmit={(event) => {
              void aplicarFiltroData(event);
            }}
            className="grid sm:grid-cols-[1fr_auto_auto] gap-2 mb-4"
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
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              Filtrar
            </button>
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
              <p className="text-sm text-muted-foreground">
                Você ainda não possui encomendas.
              </p>
              <Link
                to="/encomenda"
                className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Ver produtos
              </Link>
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
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        Pedido #{pedido.id}
                      </p>
                      {pedido.status === "CANCELADO" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                          Cancelado
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatarStatusPedido(pedido.status)}
                        </span>
                      )}
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

                    {isRetirada(pedido) && (
                      <div className="mt-3 rounded-md bg-muted/70 p-3">
                        <p className="text-xs text-muted-foreground">Local de retirada</p>
                        <p className="text-sm text-foreground">{ENDERECO_LOJA_RETIRADA}</p>
                      </div>
                    )}

                    {isRetirada(pedido) && isProntoParaRetirada(pedido) && !isConcluido(pedido) && (
                      <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          Pedido pronto para retirada.
                        </p>
                        <p className="text-sm text-emerald-900 mt-1">
                          Sua encomenda já está disponível. Dirija-se ao local de retirada para buscar o pedido.
                        </p>
                      </div>
                    )}

                    {isSaiuParaEntrega(pedido) && !isConcluido(pedido) && (
                      <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          Pedido saiu para entrega.
                        </p>
                        <p className="text-sm text-emerald-900 mt-1">
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
