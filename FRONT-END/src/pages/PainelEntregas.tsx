import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { getAuthUser, isAuthenticated } from "@/lib/auth";

type PedidoAdmin = {
  id: number;
  createdAt?: string;
  created_at?: string;
  status: string;
  quantidade: number;
  unidade: string;
  tipoEntrega: string;
  formaPagamento: string;
  produto?: { nome: string };
  items?: {
    id: number;
    quantidade: number;
    unidade: string;
    produto?: { nome: string };
  }[];
  usuario?: { nome?: string | null; email: string };
};

type ProdutoAdmin = {
  id: number;
  nome: string;
  preco: number;
  precoAbacaxiGrande?: number | null;
  precoAbacaxiMedio?: number | null;
  precoAbacaxiPequeno?: number | null;
  disponivel: boolean;
  imagemUrl?: string | null;
};

type UsuarioAdmin = {
  id: number;
  nome?: string | null;
  email: string;
  telefone?: string | null;
  role: string;
};

type PerfilUsuarioAdmin = UsuarioAdmin & {
  enderecos: {
    id: number;
    rua: string;
    numero?: string | null;
    cidade: string;
    cep: string;
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

type VendaControle = {
  id: number;
  createdAt?: string;
  created_at?: string;
  valorTotal: number | string;
  formaPagamento: string;
  usuario?: { nome?: string | null; email: string };
  produto?: { nome: string; preco?: number | string };
  items?: {
    id: number;
    quantidade: number;
    unidade: string;
    valorUnitario: number | string;
    valorTotalItem: number | string;
    produto?: { nome: string };
  }[];
};

type RespostaControleVendas = {
  data: VendaControle[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  resumo: {
    totalVendas: number;
    valorTotalArrecadado: number;
  };
};

const formatarData = (valor?: string) => {
  if (!valor) {
    return "-";
  }

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
};

const resolverDataPedido = (pedido: PedidoAdmin) => pedido.createdAt ?? pedido.created_at;
const resolverDataVenda = (venda: VendaControle) => venda.createdAt ?? venda.created_at;
const formatarMoeda = (valor: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor) || 0,
  );

const obterItensPedido = (pedido: PedidoAdmin) => {
  if (pedido.items && pedido.items.length > 0) {
    return pedido.items;
  }

  if (pedido.produto?.nome) {
    return [
      {
        id: -pedido.id,
        quantidade: pedido.quantidade,
        unidade: pedido.unidade,
        produto: { nome: pedido.produto.nome },
      },
    ];
  }

  return [];
};

const resumirItensPedido = (pedido: PedidoAdmin) => {
  const itens = obterItensPedido(pedido);
  if (itens.length === 0) {
    return "-";
  }

  const primeiroItem = itens[0];
  const nomePrimeiroItem = primeiroItem?.produto?.nome ?? "Produto";

  if (itens.length === 1) {
    return nomePrimeiroItem;
  }

  return `${nomePrimeiroItem} +${itens.length - 1}`;
};

const totalQuantidadePedido = (pedido: PedidoAdmin) =>
  obterItensPedido(pedido).reduce((total, item) => total + (Number(item.quantidade) || 0), 0);

const formatarPeriodoVendas = (
  periodo: "last_month" | "last_3_months" | "last_6_months" | "last_year" | "custom",
  dataInicio: string,
  dataFim: string,
) => {
  if (periodo === "last_month") {
    return "Último mês";
  }
  if (periodo === "last_3_months") {
    return "Últimos 3 meses";
  }
  if (periodo === "last_6_months") {
    return "Últimos 6 meses";
  }
  if (periodo === "last_year") {
    return "Último 1 ano";
  }

  if (dataInicio && dataFim) {
    return `Período personalizado (${dataInicio} até ${dataFim})`;
  }

  return "Período personalizado";
};

const PainelEntregas = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";

  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [perfilUsuarioSelecionado, setPerfilUsuarioSelecionado] = useState<PerfilUsuarioAdmin | null>(null);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState<number | null>(null);

  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingPerfilUsuario, setLoadingPerfilUsuario] = useState(false);

  const [errorPedidos, setErrorPedidos] = useState("");
  const [errorProdutos, setErrorProdutos] = useState("");
  const [errorUsuarios, setErrorUsuarios] = useState("");

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingProdutoId, setUpdatingProdutoId] = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"entregas" | "produtos" | "usuarios" | "vendas">("produtos");

  const [novoProdutoNome, setNovoProdutoNome] = useState("");
  const [novoProdutoPreco, setNovoProdutoPreco] = useState(0);
  const [novoProdutoDisponivel, setNovoProdutoDisponivel] = useState(true);
  const [novoProdutoImagem, setNovoProdutoImagem] = useState<File | null>(null);
  const [precoEditadoPorProduto, setPrecoEditadoPorProduto] = useState<Record<number, string>>({});
  const [precoAbacaxiEditadoPorProduto, setPrecoAbacaxiEditadoPorProduto] = useState<
    Record<number, { grande: string; medio: string; pequeno: string }>
  >({});
  const [savingProduto, setSavingProduto] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState<
    "todos" | "disponiveis" | "indisponiveis"
  >("todos");
  const [feedbackProduto, setFeedbackProduto] = useState("");
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [totalPaginasPedidos, setTotalPaginasPedidos] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [dataFiltroPedidos, setDataFiltroPedidos] = useState("");
  const [buscaFrutaEntrega, setBuscaFrutaEntrega] = useState("");
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [errorVendas, setErrorVendas] = useState("");
  const [vendas, setVendas] = useState<VendaControle[]>([]);
  const [resumoVendas, setResumoVendas] = useState({ totalVendas: 0, valorTotalArrecadado: 0 });
  const [paginaVendas, setPaginaVendas] = useState(1);
  const [totalPaginasVendas, setTotalPaginasVendas] = useState(1);
  const [exportandoVendasPdf, setExportandoVendasPdf] = useState(false);
  const [periodoVendas, setPeriodoVendas] = useState<
    "last_month" | "last_3_months" | "last_6_months" | "last_year" | "custom"
  >("last_month");
  const [dataInicioVendas, setDataInicioVendas] = useState("");
  const [dataFimVendas, setDataFimVendas] = useState("");
  const inputImagemRef = useRef<HTMLInputElement | null>(null);

  const loadPedidos = async (page = paginaPedidos) => {
    setLoadingPedidos(true);
    setErrorPedidos("");
    try {
      const params = new URLSearchParams({ page: String(page) });

      if (dataFiltroPedidos) {
        params.set("dataInicio", dataFiltroPedidos);
        params.set("dataFim", dataFiltroPedidos);
      }

      const response = await apiRequest<RespostaPaginada<PedidoAdmin>>(
        `/pedidos?${params.toString()}`,
      );
      setPedidos(response.data);
      setPaginaPedidos(response.pagination.page);
      setTotalPaginasPedidos(response.pagination.totalPages);
      setTotalPedidos(response.pagination.total);
    } catch (loadError) {
      setErrorPedidos(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os pedidos.",
      );
    } finally {
      setLoadingPedidos(false);
    }
  };

  const loadProdutos = async () => {
    setLoadingProdutos(true);
    setErrorProdutos("");
    try {
      const response = await apiRequest<ProdutoAdmin[]>("/produtos");
      setProdutos(response);
    } catch (loadError) {
      setErrorProdutos(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os produtos.",
      );
    } finally {
      setLoadingProdutos(false);
    }
  };

  const montarParamsControleVendas = (page: number) => {
    const params = new URLSearchParams({ periodo: periodoVendas, page: String(page) });

    if (periodoVendas === "custom") {
      if (!dataInicioVendas || !dataFimVendas) {
        throw new Error("Informe data inicial e final para o período personalizado");
      }

      params.set("dataInicio", dataInicioVendas);
      params.set("dataFim", dataFimVendas);
    }

    return params;
  };

  const loadControleVendas = async (page = paginaVendas) => {
    setLoadingVendas(true);
    setErrorVendas("");

    try {
      const params = montarParamsControleVendas(page);

      const response = await apiRequest<RespostaControleVendas>(
        `/pedidos/controle-vendas?${params.toString()}`,
      );

      setVendas(response.data);
      setResumoVendas(response.resumo);
      setPaginaVendas(response.pagination.page);
      setTotalPaginasVendas(response.pagination.totalPages);
    } catch (loadError) {
      setErrorVendas(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o controle de vendas.",
      );
    } finally {
      setLoadingVendas(false);
    }
  };

  const loadPerfilUsuario = async (usuarioId: number) => {
    setLoadingPerfilUsuario(true);
    setErrorUsuarios("");
    try {
      const response = await apiRequest<PerfilUsuarioAdmin>(`/usuarios/${usuarioId}/perfil`);
      setPerfilUsuarioSelecionado(response);
    } catch (loadError) {
      setErrorUsuarios(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o perfil do usuário.",
      );
    } finally {
      setLoadingPerfilUsuario(false);
    }
  };

  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    setErrorUsuarios("");
    try {
      const response = await apiRequest<UsuarioAdmin[]>("/usuarios");
      setUsuarios(response);

      if (response.length > 0) {
        const primeiro = response[0];
        if (primeiro) {
          setUsuarioSelecionadoId(primeiro.id);
          await loadPerfilUsuario(primeiro.id);
        }
      } else {
        setPerfilUsuarioSelecionado(null);
      }
    } catch (loadError) {
      setErrorUsuarios(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar usuários.",
      );
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    void loadPedidos(1);
    void loadProdutos();
    void loadUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltroPedidos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaginaPedidos(1);
    await loadPedidos(1);
  };

  const limparFiltroPedidos = async () => {
    setDataFiltroPedidos("");
    setPaginaPedidos(1);
    setLoadingPedidos(true);
    setErrorPedidos("");

    try {
      const response = await apiRequest<RespostaPaginada<PedidoAdmin>>(
        "/pedidos?page=1",
      );
      setPedidos(response.data);
      setPaginaPedidos(response.pagination.page);
      setTotalPaginasPedidos(response.pagination.totalPages);
      setTotalPedidos(response.pagination.total);
    } catch (loadError) {
      setErrorPedidos(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os pedidos.",
      );
    } finally {
      setLoadingPedidos(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLowerCase();

    return produtos
      .filter((produto) => {
        if (filtroDisponibilidade === "disponiveis" && !produto.disponivel) {
          return false;
        }
        if (filtroDisponibilidade === "indisponiveis" && produto.disponivel) {
          return false;
        }
        if (termo && !produto.nome.toLowerCase().includes(termo)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtos, buscaProduto, filtroDisponibilidade]);

  const totalDisponiveis = useMemo(
    () => produtos.filter((produto) => produto.disponivel).length,
    [produtos],
  );

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();

    if (!termo) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const nome = (usuario.nome ?? "").toLowerCase();
      const idConta = String(usuario.id);

      return nome.includes(termo) || idConta.includes(termo);
    });
  }, [usuarios, buscaUsuario]);

  const opcoesFrutaEntrega = useMemo(() => {
    const nomes = new Set<string>();

    pedidos.forEach((pedido) => {
      obterItensPedido(pedido).forEach((item) => {
        const nome = (item.produto?.nome ?? "").trim();
        if (nome && nome.toLowerCase() !== "abacate") {
          nomes.add(nome);
        }
      });
    });

    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [pedidos]);

  const pedidosFiltradosPorFruta = useMemo(() => {
    const termo = buscaFrutaEntrega.trim().toLowerCase();

    if (!termo) {
      return pedidos;
    }

    return pedidos.filter((pedido) =>
      obterItensPedido(pedido).some((item) =>
        (item.produto?.nome ?? "").trim().toLowerCase() === termo,
      ),
    );
  }, [pedidos, buscaFrutaEntrega]);

  const finalizarPedido = async (id: number) => {
    setUpdatingId(id);
    setErrorPedidos("");
    try {
      await apiRequest(`/pedidos/${id}/finalizar`, { method: "PATCH" });
      await loadPedidos(paginaPedidos);
    } catch (updateError) {
      setErrorPedidos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const cadastrarProduto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!novoProdutoNome.trim()) {
      return;
    }

    setSavingProduto(true);
    setErrorProdutos("");
    setFeedbackProduto("");
    try {
      const formData = new FormData();
      formData.append("nome", novoProdutoNome.trim());
      formData.append("preco", String(novoProdutoPreco));
      formData.append("disponivel", String(novoProdutoDisponivel));
      if (novoProdutoImagem) {
        formData.append("imagem", novoProdutoImagem);
      }

      await apiRequest("/produtos/cadastrarProduto", {
        method: "POST",
        body: formData,
      });

      setNovoProdutoNome("");
      setNovoProdutoPreco(0);
      setNovoProdutoDisponivel(true);
      setNovoProdutoImagem(null);
      if (inputImagemRef.current) {
        inputImagemRef.current.value = "";
      }
      await loadProdutos();
      setFeedbackProduto("Produto cadastrado com sucesso.");
    } catch (saveError) {
      setErrorProdutos(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível cadastrar o produto.",
      );
    } finally {
      setSavingProduto(false);
    }
  };

  const getPrecoEditado = (produto: ProdutoAdmin) => {
    return precoEditadoPorProduto[produto.id] ?? String(Number(produto.preco).toFixed(2));
  };

  const atualizarPrecoProduto = async (produto: ProdutoAdmin) => {
    const valorDigitado = getPrecoEditado(produto).replace(",", ".").trim();
    const preco = Number(valorDigitado);

    if (!Number.isFinite(preco) || preco < 0) {
      setErrorProdutos("Preço inválido. Informe um valor numérico maior ou igual a zero.");
      return;
    }

    setUpdatingProdutoId(produto.id);
    setErrorProdutos("");
    setFeedbackProduto("");

    try {
      await apiRequest(`/produtos/${produto.id}`, {
        method: "PATCH",
        body: { preco },
      });

      await loadProdutos();
      setPrecoEditadoPorProduto((current) => {
        const next = { ...current };
        delete next[produto.id];
        return next;
      });
      setFeedbackProduto("Preço atualizado com sucesso.");
    } catch (updateError) {
      setErrorProdutos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o preço.",
      );
    } finally {
      setUpdatingProdutoId(null);
    }
  };

  const getPrecosAbacaxiEditados = (produto: ProdutoAdmin) => {
    const fallback = {
      grande: String(Number(produto.precoAbacaxiGrande ?? 7).toFixed(2)),
      medio: String(Number(produto.precoAbacaxiMedio ?? 5).toFixed(2)),
      pequeno: String(Number(produto.precoAbacaxiPequeno ?? 3).toFixed(2)),
    };

    return precoAbacaxiEditadoPorProduto[produto.id] ?? fallback;
  };

  const atualizarPrecoAbacaxiProduto = async (produto: ProdutoAdmin) => {
    const precos = getPrecosAbacaxiEditados(produto);

    const grande = Number(precos.grande.replace(",", ".").trim());
    const medio = Number(precos.medio.replace(",", ".").trim());
    const pequeno = Number(precos.pequeno.replace(",", ".").trim());

    if (
      !Number.isFinite(grande) ||
      !Number.isFinite(medio) ||
      !Number.isFinite(pequeno) ||
      grande < 0 ||
      medio < 0 ||
      pequeno < 0
    ) {
      setErrorProdutos("Valores de abacaxi inválidos. Informe números maiores ou iguais a zero.");
      return;
    }

    setUpdatingProdutoId(produto.id);
    setErrorProdutos("");
    setFeedbackProduto("");

    try {
      await apiRequest(`/produtos/${produto.id}`, {
        method: "PATCH",
        body: {
          precoAbacaxiGrande: grande,
          precoAbacaxiMedio: medio,
          precoAbacaxiPequeno: pequeno,
        },
      });

      await loadProdutos();
      setPrecoAbacaxiEditadoPorProduto((current) => {
        const next = { ...current };
        delete next[produto.id];
        return next;
      });
      setFeedbackProduto("Preços do abacaxi atualizados com sucesso.");
    } catch (updateError) {
      setErrorProdutos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar os preços do abacaxi.",
      );
    } finally {
      setUpdatingProdutoId(null);
    }
  };

  const atualizarDisponibilidadeProduto = async (id: number, disponivel: boolean) => {
    setUpdatingProdutoId(id);
    setErrorProdutos("");
    setFeedbackProduto("");
    try {
      await apiRequest(`/produtos/${id}/disponibilidade`, {
        method: "PATCH",
        body: { disponivel },
      });
      await loadProdutos();
      setFeedbackProduto("Disponibilidade atualizada.");
    } catch (updateError) {
      setErrorProdutos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar disponibilidade.",
      );
    } finally {
      setUpdatingProdutoId(null);
    }
  };

  const excluirProduto = async (produto: ProdutoAdmin) => {
    const confirmou = window.confirm(
      `Deseja excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmou) {
      return;
    }

    setUpdatingProdutoId(produto.id);
    setErrorProdutos("");
    setFeedbackProduto("");

    try {
      await apiRequest(`/produtos/${produto.id}`, {
        method: "DELETE",
      });
      await loadProdutos();
      setFeedbackProduto("Produto excluído com sucesso.");
    } catch (deleteError) {
      setErrorProdutos(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir o produto.",
      );
    } finally {
      setUpdatingProdutoId(null);
    }
  };

  const exportarVendasPdf = async () => {
    setExportandoVendasPdf(true);
    setErrorVendas("");

    try {
      const primeiraResposta = await apiRequest<RespostaControleVendas>(
        `/pedidos/controle-vendas?${montarParamsControleVendas(1).toString()}`,
      );

      const todasAsVendas: VendaControle[] = [...primeiraResposta.data];

      for (let pagina = 2; pagina <= primeiraResposta.pagination.totalPages; pagina += 1) {
        const respostaPagina = await apiRequest<RespostaControleVendas>(
          `/pedidos/controle-vendas?${montarParamsControleVendas(pagina).toString()}`,
        );
        todasAsVendas.push(...respostaPagina.data);
      }

      const doc = new jsPDF();
      const periodoLabel = formatarPeriodoVendas(
        periodoVendas,
        dataInicioVendas,
        dataFimVendas,
      );
      const dataGeracao = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date());

      doc.setFontSize(16);
      doc.text("Relatório de Controle de Vendas", 14, 16);

      doc.setFontSize(11);
      doc.text(`Período: ${periodoLabel}`, 14, 24);
      doc.text(`Total de vendas: ${primeiraResposta.resumo.totalVendas}`, 14, 30);
      doc.text(
        `Valor total arrecadado: ${formatarMoeda(primeiraResposta.resumo.valorTotalArrecadado)}`,
        14,
        36,
      );
      doc.text(`Gerado em: ${dataGeracao}`, 14, 42);

      autoTable(doc, {
        startY: 48,
        head: [["Pedido", "Data", "Cliente", "Produtos", "Forma de pagamento", "Valor total"]],
        body: todasAsVendas.map((venda) => {
          const produtosTexto =
            venda.items && venda.items.length > 0
              ? venda.items
                  .map(
                    (item) =>
                      `${item.produto?.nome ?? "Produto"} (${item.quantidade} ${item.unidade}) - ${formatarMoeda(item.valorTotalItem)}`,
                  )
                  .join("; ")
              : `${venda.produto?.nome ?? "Produto"} - ${formatarMoeda(venda.valorTotal)}`;

          return [
            `#${venda.id}`,
            formatarData(resolverDataVenda(venda)),
            venda.usuario?.nome || venda.usuario?.email || "-",
            produtosTexto,
            venda.formaPagamento,
            formatarMoeda(venda.valorTotal),
          ];
        }),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [46, 125, 50] },
      });

      doc.save("controle-vendas.pdf");
    } catch (exportError) {
      setErrorVendas(
        exportError instanceof Error
          ? exportError.message
          : "Não foi possível exportar o PDF de vendas.",
      );
    } finally {
      setExportandoVendasPdf(false);
    }
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/painel-entregas" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-3xl px-4 pt-24 pb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Acesso permitido apenas para administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Painel Administrativo"
        subtitle="Gerencie entregas e produtos em um único lugar."
      >
        <div className="bg-card border border-border rounded-xl p-2 mb-4 flex flex-wrap gap-2 w-full">
          <button
            type="button"
            onClick={() => setAbaAtiva("produtos")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 min-w-[160px] ${
              abaAtiva === "produtos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Gestão de Produtos
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("entregas")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 min-w-[160px] ${
              abaAtiva === "entregas"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Gestão de Entregas
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaAtiva("vendas");
              setPaginaVendas(1);
              void loadControleVendas(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 min-w-[160px] ${
              abaAtiva === "vendas"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Controle de Vendas
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("usuarios")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 min-w-[160px] ${
              abaAtiva === "usuarios"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Perfis de Usuários
          </button>
        </div>

        {abaAtiva === "entregas" ? (
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              Gestão de Entregas ({totalPedidos})
            </h2>

            <form
              onSubmit={(event) => {
                void aplicarFiltroPedidos(event);
              }}
              className="grid sm:grid-cols-[1fr_auto_auto] gap-2 mb-4"
            >
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={dataFiltroPedidos}
                  onChange={(event) => setDataFiltroPedidos(event.target.value)}
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
                onClick={() => void limparFiltroPedidos()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted"
              >
                Limpar
              </button>
            </form>

            <div className="mb-4">
              <select
                value={buscaFrutaEntrega}
                onChange={(event) => setBuscaFrutaEntrega(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">Todas as frutas</option>
                {opcoesFrutaEntrega.map((fruta) => (
                  <option key={fruta} value={fruta}>
                    {fruta}
                  </option>
                ))}
              </select>
            </div>

            {loadingPedidos ? (
              <p className="text-muted-foreground">Carregando pedidos...</p>
            ) : (
              <>
                {errorPedidos && <p className="text-sm text-destructive mb-4">{errorPedidos}</p>}
                {pedidosFiltradosPorFruta.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-2 pr-2">Pedido</th>
                          <th className="py-2 pr-2">Cliente</th>
                          <th className="py-2 pr-2">Produto</th>
                          <th className="py-2 pr-2">Qtd total</th>
                          <th className="py-2 pr-2">Entrega</th>
                          <th className="py-2 pr-2">Pagamento</th>
                          <th className="py-2 pr-2">Data</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosFiltradosPorFruta.map((pedido) => (
                          <tr key={pedido.id} className="border-b border-border/70">
                            <td className="py-2 pr-2">#{pedido.id}</td>
                            <td className="py-2 pr-2">{pedido.usuario?.nome || pedido.usuario?.email || "-"}</td>
                            <td className="py-2 pr-2">
                              <details>
                                <summary className="cursor-pointer select-none text-foreground">
                                  {resumirItensPedido(pedido)}
                                </summary>
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  {obterItensPedido(pedido).map((item) => (
                                    <li key={item.id}>
                                      {(item.produto?.nome ?? "Produto")} — {item.quantidade} {item.unidade}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </td>
                            <td className="py-2 pr-2">{totalQuantidadePedido(pedido)}</td>
                            <td className="py-2 pr-2">{pedido.tipoEntrega}</td>
                            <td className="py-2 pr-2">{pedido.formaPagamento}</td>
                            <td className="py-2 pr-2">{formatarData(resolverDataPedido(pedido))}</td>
                            <td className="py-2 pr-2">{pedido.status}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                disabled={pedido.status === "COMPLETADO" || updatingId === pedido.id}
                                onClick={() => finalizarPedido(pedido.id)}
                                className="inline-flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                              >
                                {updatingId === pedido.id ? "Finalizando..." : "Finalizar"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loadingPedidos && totalPaginasPedidos > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void loadPedidos(paginaPedidos - 1)}
                      disabled={paginaPedidos <= 1}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Página {paginaPedidos} de {totalPaginasPedidos}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadPedidos(paginaPedidos + 1)}
                      disabled={paginaPedidos >= totalPaginasPedidos}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : abaAtiva === "vendas" ? (
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              Controle de Vendas
            </h2>

            <div className="grid md:grid-cols-[220px_1fr_auto] gap-2 mb-4">
              <select
                value={periodoVendas}
                onChange={(event) => {
                  setPeriodoVendas(event.target.value as typeof periodoVendas);
                  setPaginaVendas(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="last_month">Último mês</option>
                <option value="last_3_months">Últimos 3 meses</option>
                <option value="last_6_months">Últimos 6 meses</option>
                <option value="last_year">Último 1 ano</option>
                <option value="custom">Período personalizado</option>
              </select>

              {periodoVendas === "custom" ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={dataInicioVendas}
                      onChange={(event) => {
                        setDataInicioVendas(event.target.value);
                        setPaginaVendas(1);
                      }}
                      className="w-full bg-transparent text-sm text-foreground outline-none"
                      aria-label="Data inicial"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={dataFimVendas}
                      onChange={(event) => {
                        setDataFimVendas(event.target.value);
                        setPaginaVendas(1);
                      }}
                      className="w-full bg-transparent text-sm text-foreground outline-none"
                      aria-label="Data final"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Período automático selecionado
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadControleVendas(1)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 w-full md:w-auto"
              >
                Atualizar
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total de vendas</p>
                <p className="text-xl font-bold text-foreground">{resumoVendas.totalVendas}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Valor arrecadado</p>
                <p className="text-xl font-bold text-foreground">{formatarMoeda(resumoVendas.valorTotalArrecadado)}</p>
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  void exportarVendasPdf();
                }}
                disabled={loadingVendas || exportandoVendasPdf || resumoVendas.totalVendas === 0}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50 w-full sm:w-auto"
              >
                {exportandoVendasPdf ? "Exportando..." : "Exportar PDF"}
              </button>
            </div>

            {loadingVendas ? (
              <p className="text-muted-foreground">Carregando vendas...</p>
            ) : errorVendas ? (
              <p className="text-destructive text-sm">{errorVendas}</p>
            ) : vendas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma venda concluída no período selecionado.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-2">Pedido</th>
                        <th className="py-2 pr-2">Data</th>
                        <th className="py-2 pr-2">Cliente</th>
                        <th className="py-2 pr-2">Produtos</th>
                        <th className="py-2 pr-2">Valor dos produtos</th>
                        <th className="py-2 pr-2">Pagamento</th>
                        <th className="py-2 pr-2">Total do pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendas.map((venda) => (
                        <tr key={venda.id} className="border-b border-border/70">
                          <td className="py-2 pr-2">#{venda.id}</td>
                          <td className="py-2 pr-2">{formatarData(resolverDataVenda(venda))}</td>
                          <td className="py-2 pr-2">{venda.usuario?.nome || venda.usuario?.email || "-"}</td>
                          <td className="py-2 pr-2">
                            {venda.items && venda.items.length > 0
                              ? venda.items
                                  .map(
                                    (item) =>
                                      `${item.produto?.nome ?? "Produto"} (${item.quantidade} ${item.unidade})`,
                                  )
                                  .join(", ")
                              : venda.produto?.nome || "-"}
                          </td>
                          <td className="py-2 pr-2">
                            {venda.items && venda.items.length > 0
                              ? venda.items
                                  .map((item) => `${item.produto?.nome ?? "Produto"}: ${formatarMoeda(item.valorTotalItem)}`)
                                  .join(" • ")
                              : formatarMoeda(venda.valorTotal)}
                          </td>
                          <td className="py-2 pr-2">{venda.formaPagamento}</td>
                          <td className="py-2 pr-2">{formatarMoeda(venda.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginasVendas > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between sm:justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void loadControleVendas(paginaVendas - 1)}
                      disabled={paginaVendas <= 1}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Página {paginaVendas} de {totalPaginasVendas}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadControleVendas(paginaVendas + 1)}
                      disabled={paginaVendas >= totalPaginasVendas}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : abaAtiva === "produtos" ? (
          <div className="grid xl:grid-cols-[360px_1fr] gap-4">
            <section className="bg-card border border-border rounded-xl p-4 sm:p-6 h-fit">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">
                Cadastrar Produto
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Cadastre novos itens e deixe-os prontos para encomenda.
              </p>

              <form onSubmit={cadastrarProduto} className="space-y-3">
                <div>
                  <label htmlFor="novo-produto" className="block text-sm font-medium text-foreground mb-1">
                    Nome do produto
                  </label>
                  <input
                    id="novo-produto"
                    type="text"
                    value={novoProdutoNome}
                    onChange={(event) => setNovoProdutoNome(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Ex.: Manga Palmer"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="novo-produto-preco" className="block text-sm font-medium text-foreground mb-1">
                    Preço (R$)
                  </label>
                  <input
                    id="novo-produto-preco"
                    type="number"
                    min="0"
                    step="0.01"
                    value={novoProdutoPreco}
                    onChange={(event) => setNovoProdutoPreco(Number(event.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    placeholder="Ex.: 12.50"
                    required
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={novoProdutoDisponivel}
                    onChange={(event) => setNovoProdutoDisponivel(event.target.checked)}
                  />
                  Disponível para encomenda
                </label>

                <div>
                  <label htmlFor="novo-produto-imagem" className="block text-sm font-medium text-foreground mb-1">
                    Foto do produto
                  </label>
                  <input
                    ref={inputImagemRef}
                    id="novo-produto-imagem"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setNovoProdutoImagem(event.target.files?.[0] ?? null)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG ou WEBP.</p>
                </div>

                <button
                  type="submit"
                  disabled={savingProduto}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {savingProduto ? "Cadastrando..." : "Cadastrar produto"}
                </button>
              </form>
            </section>

            <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                Catálogo Administrativo
              </h2>

              <div className="grid sm:grid-cols-3 gap-2 mb-4">
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-foreground">{produtos.length}</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Disponíveis</p>
                  <p className="text-xl font-bold text-foreground">{totalDisponiveis}</p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Indisponíveis</p>
                  <p className="text-xl font-bold text-foreground">{produtos.length - totalDisponiveis}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-2 mb-3">
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(event) => setBuscaProduto(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  placeholder="Buscar produto por nome"
                />
                <select
                  value={filtroDisponibilidade}
                  onChange={(event) =>
                    setFiltroDisponibilidade(
                      event.target.value as "todos" | "disponiveis" | "indisponiveis",
                    )
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  <option value="todos">Todos</option>
                  <option value="disponiveis">Só disponíveis</option>
                  <option value="indisponiveis">Só indisponíveis</option>
                </select>
              </div>

              {errorProdutos && <p className="text-sm text-destructive mb-3">{errorProdutos}</p>}
              {feedbackProduto && <p className="text-sm text-primary mb-3">{feedbackProduto}</p>}

              {loadingProdutos ? (
                <p className="text-muted-foreground">Carregando produtos...</p>
              ) : produtosFiltrados.length === 0 ? (
                <p className="text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</p>
              ) : (
                <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {produtosFiltrados.map((produto) => (
                    <li key={produto.id} className="border border-border rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{produto.nome}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">ID: {produto.id}</span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                produto.disponivel
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {produto.disponivel ? "Disponível" : "Indisponível"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <label className="text-xs text-muted-foreground">Preço (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={getPrecoEditado(produto)}
                              onChange={(event) =>
                                setPrecoEditadoPorProduto((current) => ({
                                  ...current,
                                  [produto.id]: event.target.value,
                                }))
                              }
                              className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                            />
                            <button
                              type="button"
                              disabled={updatingProdutoId === produto.id}
                              onClick={() => {
                                void atualizarPrecoProduto(produto);
                              }}
                              className="inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
                            >
                              {updatingProdutoId === produto.id ? "Salvando..." : "Salvar preço"}
                            </button>
                          </div>

                          {produto.nome.trim().toLowerCase() === "abacaxi" && (
                            <div className="mt-3 rounded-lg border border-border p-3 bg-muted/30">
                              <p className="text-xs font-semibold text-foreground mb-2">
                                Preços por tamanho (abacaxi)
                              </p>
                              <div className="grid sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Grande</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={getPrecosAbacaxiEditados(produto).grande}
                                    onChange={(event) =>
                                      setPrecoAbacaxiEditadoPorProduto((current) => ({
                                        ...current,
                                        [produto.id]: {
                                          ...getPrecosAbacaxiEditados(produto),
                                          grande: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Médio</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={getPrecosAbacaxiEditados(produto).medio}
                                    onChange={(event) =>
                                      setPrecoAbacaxiEditadoPorProduto((current) => ({
                                        ...current,
                                        [produto.id]: {
                                          ...getPrecosAbacaxiEditados(produto),
                                          medio: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Pequeno</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={getPrecosAbacaxiEditados(produto).pequeno}
                                    onChange={(event) =>
                                      setPrecoAbacaxiEditadoPorProduto((current) => ({
                                        ...current,
                                        [produto.id]: {
                                          ...getPrecosAbacaxiEditados(produto),
                                          pequeno: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={updatingProdutoId === produto.id}
                                onClick={() => {
                                  void atualizarPrecoAbacaxiProduto(produto);
                                }}
                                className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
                              >
                                {updatingProdutoId === produto.id
                                  ? "Salvando tamanhos..."
                                  : "Salvar tamanhos"}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex w-full sm:w-auto flex-row sm:flex-col items-stretch sm:items-end gap-2">
                          <button
                            type="button"
                            disabled={updatingProdutoId === produto.id}
                            onClick={() =>
                              atualizarDisponibilidadeProduto(produto.id, !produto.disponivel)
                            }
                            className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
                          >
                            {updatingProdutoId === produto.id
                              ? "Atualizando..."
                              : produto.disponivel
                                ? "Desativar"
                                : "Ativar"}
                          </button>
                          <button
                            type="button"
                            disabled={updatingProdutoId === produto.id}
                            onClick={() => {
                              void excluirProduto(produto);
                            }}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-destructive/50 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {updatingProdutoId === produto.id ? "Processando..." : "Excluir"}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              Perfis de Usuários
            </h2>

            <div className="mb-4">
              <input
                type="text"
                value={buscaUsuario}
                onChange={(event) => setBuscaUsuario(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                placeholder="Buscar usuário por nome ou ID da conta"
              />
            </div>

            {loadingUsuarios ? (
              <p className="text-muted-foreground">Carregando usuários...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
            ) : usuariosFiltrados.length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário encontrado com essa busca.</p>
            ) : (
              <div className="grid lg:grid-cols-[280px_1fr] gap-4">
                <div className="border border-border rounded-lg p-3 max-h-[520px] overflow-y-auto">
                  <ul className="space-y-2">
                    {usuariosFiltrados.map((usuario) => (
                      <li key={usuario.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioSelecionadoId(usuario.id);
                            void loadPerfilUsuario(usuario.id);
                          }}
                          className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                            usuarioSelecionadoId === usuario.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <p className="font-semibold text-foreground truncate">
                            {usuario.nome || "Sem nome"}
                          </p>
                          <p className="text-muted-foreground truncate">{usuario.email}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-border rounded-lg p-4">
                  {errorUsuarios && <p className="text-sm text-destructive mb-3">{errorUsuarios}</p>}

                  {loadingPerfilUsuario ? (
                    <p className="text-muted-foreground">Carregando perfil...</p>
                  ) : !perfilUsuarioSelecionado ? (
                    <p className="text-muted-foreground">Selecione um usuário para visualizar o perfil.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground"><strong>ID da conta:</strong> {perfilUsuarioSelecionado.id}</p>
                      <p className="text-sm text-foreground"><strong>Nome:</strong> {perfilUsuarioSelecionado.nome || "Não informado"}</p>
                      <p className="text-sm text-foreground"><strong>E-mail:</strong> {perfilUsuarioSelecionado.email}</p>
                      <p className="text-sm text-foreground"><strong>Número para contato:</strong> {perfilUsuarioSelecionado.telefone || "Não informado"}</p>

                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">Endereços</p>
                        {perfilUsuarioSelecionado.enderecos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                        ) : (
                          <ul className="space-y-2">
                            {perfilUsuarioSelecionado.enderecos.map((endereco) => (
                              <li key={endereco.id} className="text-sm border border-border rounded-lg p-2">
                                <p className="text-foreground">
                                  {endereco.rua}
                                  {endereco.numero ? `, ${endereco.numero}` : ""}
                                </p>
                                <p className="text-muted-foreground">
                                  {endereco.cidade}
                                  {endereco.cep?.trim() ? ` - ${endereco.cep}` : ""}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </PageShell>
    </div>
  );
};

export default PainelEntregas;