import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getAuthUser, isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
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

const MinhasEncomendas = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Minhas Encomendas"
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
            <p className="text-muted-foreground text-sm">Carregando encomendas...</p>
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
                const descricaoItens =
                  pedido.items && pedido.items.length > 0
                    ? pedido.items
                        .map(
                          (item) =>
                            `${item.produto?.nome ?? "Produto"} (${item.quantidade} ${item.unidade ?? pedido.unidade})`,
                        )
                        .join(", ")
                    : `${pedido.produto?.nome ?? "Produto"} (${pedido.quantidade} ${pedido.unidade})`;

                return (
                  <li
                    key={pedido.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        Pedido #{pedido.id}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                        {pedido.status}
                      </span>
                    </div>

                    <p className="text-sm text-foreground">{descricaoItens}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Entrega: {pedido.tipoEntrega} • Pagamento: {pedido.formaPagamento}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Data: {dataFormatada ?? "-"}
                    </p>

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
