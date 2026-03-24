import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, CalendarDays, Receipt, TrendingUp, Wallet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { getAuthUser, isAuthenticated } from "@/lib/auth";
import logoAbacaxi from "@/assets/abacaxi-logo.svg";

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
  usuario?: { nome?: string | null; email: string; telefone?: string | null };
  endereco?: {
    rua: string;
    numero?: string | null;
    cidade: string;
    cep: string;
  } | null;
};

type ProdutoAdmin = {
  id: number;
  nome: string;
  preco: number | string | null;
  precoAbacaxiGrande?: number | string | null;
  precoAbacaxiMedio?: number | string | null;
  precoAbacaxiPequeno?: number | string | null;
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

const ENDERECO_LOJA_RETIRADA = "R. Pastor Sozinho, 3071 - Provedor, Santana - AP, 68927-078";

const resolverDataPedido = (pedido: PedidoAdmin) => pedido.createdAt ?? pedido.created_at;
const resolverDataVenda = (venda: VendaControle) => venda.createdAt ?? venda.created_at;
const normalizarTipoEntrega = (tipoEntrega?: string) => (tipoEntrega ?? "").trim().toLowerCase();
const isRetirada = (pedido: PedidoAdmin) => normalizarTipoEntrega(pedido.tipoEntrega) === "retirada";
const isEntregaDomicilio = (pedido: PedidoAdmin) => normalizarTipoEntrega(pedido.tipoEntrega) === "entrega";

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

const formatarEnderecoEntrega = (pedido: PedidoAdmin) => {
  const endereco = pedido.endereco;

  if (!endereco) {
    return "Endereço não informado";
  }

  const numero = endereco.numero?.trim() ? `, ${endereco.numero.trim()}` : "";
  return `${endereco.rua}${numero} - ${endereco.cidade} - CEP ${endereco.cep}`;
};

const formatarMoeda = (valor: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor) || 0,
  );

const parsePrecoParaExibicao = (valor: number | string | null | undefined, fallback = 0) => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : fallback;
  }

  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto) {
      return fallback;
    }

    const normalizado = texto.replace(/\./g, "").replace(",", ".");
    const convertido = Number(normalizado);
    return Number.isFinite(convertido) ? convertido : fallback;
  }

  return fallback;
};

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

const totalQuantidadePedido = (pedido: PedidoAdmin) =>
  obterItensPedido(pedido).reduce((total, item) => total + (Number(item.quantidade) || 0), 0);

const obterItensVenda = (venda: VendaControle) => {
  if (venda.items && venda.items.length > 0) {
    return venda.items;
  }

  if (venda.produto?.nome) {
    return [
      {
        id: -venda.id,
        quantidade: 1,
        unidade: "un",
        valorUnitario: venda.valorTotal,
        valorTotalItem: venda.valorTotal,
        produto: { nome: venda.produto.nome },
      },
    ];
  }

  return [];
};

const totalQuantidadeVenda = (venda: VendaControle) =>
  obterItensVenda(venda).reduce((total, item) => total + (Number(item.quantidade) || 0), 0);

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

const carregarImagemComoDataUrl = (src: string) =>
  new Promise<string>((resolve, reject) => {
    const imagem = new Image();

    imagem.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imagem.naturalWidth;
      canvas.height = imagem.naturalHeight;

      const contexto = canvas.getContext("2d");
      if (!contexto) {
        reject(new Error("Não foi possível preparar a imagem para o PDF."));
        return;
      }

      contexto.drawImage(imagem, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };

    imagem.onerror = () => {
      reject(new Error("Não foi possível carregar o logo para o PDF."));
    };

    imagem.src = src;
  });

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
  const [updatingRetiradaId, setUpdatingRetiradaId] = useState<number | null>(null);
  const [updatingSaidaEntregaId, setUpdatingSaidaEntregaId] = useState<number | null>(null);
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
  const [filtroTipoEntrega, setFiltroTipoEntrega] = useState<"todos" | "entrega" | "retirada">("todos");
  const [loadingVendas, setLoadingVendas] = useState(false);
  const [errorVendas, setErrorVendas] = useState("");
  const [vendas, setVendas] = useState<VendaControle[]>([]);
  const [vendasPeriodoSelecionado, setVendasPeriodoSelecionado] = useState<VendaControle[]>([]);
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

      const vendasPeriodo: VendaControle[] = [...response.data];
      if (response.pagination.totalPages > 1) {
        for (let pagina = 1; pagina <= response.pagination.totalPages; pagina += 1) {
          if (pagina === response.pagination.page) {
            continue;
          }

          const respostaPagina = await apiRequest<RespostaControleVendas>(
            `/pedidos/controle-vendas?${montarParamsControleVendas(pagina).toString()}`,
          );
          vendasPeriodo.push(...respostaPagina.data);
        }
      }

      setVendasPeriodoSelecionado(vendasPeriodo);
    } catch (loadError) {
      setErrorVendas(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o controle de vendas.",
      );
      setVendasPeriodoSelecionado([]);
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

  const pedidosFiltradosPorTipo = useMemo(() => {
    if (filtroTipoEntrega === "entrega") {
      return pedidos.filter((pedido) => isEntregaDomicilio(pedido));
    }

    if (filtroTipoEntrega === "retirada") {
      return pedidos.filter((pedido) => isRetirada(pedido));
    }

    return pedidos;
  }, [pedidos, filtroTipoEntrega]);

  const pedidosEntregaDomicilio = useMemo(
    () => pedidosFiltradosPorTipo.filter((pedido) => isEntregaDomicilio(pedido)),
    [pedidosFiltradosPorTipo],
  );

  const pedidosRetirada = useMemo(
    () => pedidosFiltradosPorTipo.filter((pedido) => isRetirada(pedido)),
    [pedidosFiltradosPorTipo],
  );

  const resumoVendasPorPagamento = useMemo(() => {
    const acumulado: Record<string, { quantidade: number; valor: number }> = {};

    vendasPeriodoSelecionado.forEach((venda) => {
      const chave = venda.formaPagamento?.trim() || "Não informado";

      if (!acumulado[chave]) {
        acumulado[chave] = { quantidade: 0, valor: 0 };
      }

      acumulado[chave].quantidade += 1;
      acumulado[chave].valor += Number(venda.valorTotal) || 0;
    });

    return Object.entries(acumulado)
      .map(([formaPagamento, dados]) => ({ formaPagamento, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [vendasPeriodoSelecionado]);

  const valorTotalPeriodoSelecionado = useMemo(
    () => vendasPeriodoSelecionado.reduce((total, venda) => total + (Number(venda.valorTotal) || 0), 0),
    [vendasPeriodoSelecionado],
  );

  const ticketMedioPeriodo = useMemo(() => {
    if (resumoVendas.totalVendas <= 0) {
      return 0;
    }

    return resumoVendas.valorTotalArrecadado / resumoVendas.totalVendas;
  }, [resumoVendas]);

  const maiorVendaPeriodo = useMemo(() => {
    if (vendasPeriodoSelecionado.length === 0) {
      return 0;
    }

    return vendasPeriodoSelecionado.reduce(
      (maior, venda) => Math.max(maior, Number(venda.valorTotal) || 0),
      0,
    );
  }, [vendasPeriodoSelecionado]);

  const rankingProdutosVendas = useMemo(() => {
    const acumulado: Record<string, { quantidade: number; valor: number }> = {};

    vendasPeriodoSelecionado.forEach((venda) => {
      const itens = obterItensVenda(venda);

      itens.forEach((item) => {
        const nomeProduto = item.produto?.nome?.trim() || "Produto";

        if (!acumulado[nomeProduto]) {
          acumulado[nomeProduto] = { quantidade: 0, valor: 0 };
        }

        acumulado[nomeProduto].quantidade += Number(item.quantidade) || 0;
        acumulado[nomeProduto].valor += Number(item.valorTotalItem) || 0;
      });
    });

    return Object.entries(acumulado)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [vendasPeriodoSelecionado]);

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

  const marcarPedidoProntoParaRetirada = async (id: number) => {
    setUpdatingRetiradaId(id);
    setErrorPedidos("");
    try {
      await apiRequest(`/pedidos/${id}/pronto-retirada`, { method: "PATCH" });
      await loadPedidos(paginaPedidos);
    } catch (updateError) {
      setErrorPedidos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível marcar o pedido como pronto para retirada.",
      );
    } finally {
      setUpdatingRetiradaId(null);
    }
  };

  const marcarPedidoSaiuParaEntrega = async (id: number) => {
    setUpdatingSaidaEntregaId(id);
    setErrorPedidos("");
    try {
      await apiRequest(`/pedidos/${id}/saiu-entrega`, { method: "PATCH" });
      await loadPedidos(paginaPedidos);
    } catch (updateError) {
      setErrorPedidos(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível marcar o pedido como saiu para entrega.",
      );
    } finally {
      setUpdatingSaidaEntregaId(null);
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
    return (
      precoEditadoPorProduto[produto.id] ??
      String(parsePrecoParaExibicao(produto.preco, 0).toFixed(2))
    );
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
      grande: String(parsePrecoParaExibicao(produto.precoAbacaxiGrande, 7).toFixed(2)),
      medio: String(parsePrecoParaExibicao(produto.precoAbacaxiMedio, 5).toFixed(2)),
      pequeno: String(parsePrecoParaExibicao(produto.precoAbacaxiPequeno, 3).toFixed(2)),
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
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await carregarImagemComoDataUrl(logoAbacaxi);
      } catch {
        logoDataUrl = null;
      }

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

      const resumoPorPagamento = todasAsVendas.reduce<Record<string, { quantidade: number; valor: number }>>(
        (acumulado, venda) => {
          const chave = venda.formaPagamento?.trim() || "Não informado";

          if (!acumulado[chave]) {
            acumulado[chave] = { quantidade: 0, valor: 0 };
          }

          acumulado[chave].quantidade += 1;
          acumulado[chave].valor += Number(venda.valorTotal) || 0;

          return acumulado;
        },
        {},
      );

      const cabecalhoY = 12;
      doc.setFillColor(245, 248, 243);
      doc.roundedRect(12, cabecalhoY, 186, 34, 3, 3, "F");

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", 16, cabecalhoY + 6, 14, 14);
      }

      const tituloX = logoDataUrl ? 34 : 16;

      doc.setFontSize(16);
      doc.text("Relatório de Controle de Vendas", tituloX, cabecalhoY + 11);

      doc.setFontSize(11);
      doc.text("Fazenda Bispo", tituloX, cabecalhoY + 18);

      doc.setFontSize(10);
      doc.text(`Período: ${periodoLabel}`, 16, 54);
      doc.text(`Total de vendas: ${primeiraResposta.resumo.totalVendas}`, 16, 60);
      doc.text(
        `Valor total arrecadado: ${formatarMoeda(primeiraResposta.resumo.valorTotalArrecadado)}`,
        16,
        66,
      );
      doc.text(`Gerado em: ${dataGeracao}`, 16, 72);

      autoTable(doc, {
        startY: 78,
        head: [["Forma de pagamento", "Quantidade", "Valor"]],
        body: Object.entries(resumoPorPagamento)
          .sort((a, b) => b[1].quantidade - a[1].quantidade)
          .map(([formaPagamento, dados]) => [
            formaPagamento,
            String(dados.quantidade),
            formatarMoeda(dados.valor),
          ]),
        styles: { fontSize: 9, cellPadding: 2.5, textColor: [40, 40, 40] },
        headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 55, halign: "right" },
        },
      });

      const ultimoYResumo = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 78;

      autoTable(doc, {
        startY: ultimoYResumo + 6,
        head: [["Pedido", "Data", "Cliente", "Pagamento", "Itens", "Total"]],
        body: todasAsVendas.map((venda) => {
          const produtosTexto =
            venda.items && venda.items.length > 0
              ? venda.items
                  .map(
                    (item) =>
                      `${item.produto?.nome ?? "Produto"} - ${item.quantidade} ${item.unidade} - ${formatarMoeda(item.valorTotalItem)}`,
                  )
                  .join("\n")
              : `${venda.produto?.nome ?? "Produto"} - ${formatarMoeda(venda.valorTotal)}`;

          return [
            `#${venda.id}`,
            formatarData(resolverDataVenda(venda)),
            venda.usuario?.nome || venda.usuario?.email || "-",
            venda.formaPagamento,
            produtosTexto,
            formatarMoeda(venda.valorTotal),
          ];
        }),
        styles: {
          fontSize: 8.5,
          cellPadding: 2.2,
          textColor: [35, 35, 35],
          valign: "top",
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 62 },
          5: { cellWidth: 22, halign: "right" },
        },
        didDrawPage: (data) => {
          const paginaAtual = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`Página ${paginaAtual}`, data.settings.margin.left, 290);
        },
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
                value={filtroTipoEntrega}
                onChange={(event) =>
                  setFiltroTipoEntrega(event.target.value as "todos" | "entrega" | "retirada")
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="todos">Todos os pedidos</option>
                <option value="entrega">Apenas entrega em domicílio</option>
                <option value="retirada">Apenas retirada no local</option>
              </select>
            </div>

            {loadingPedidos ? (
              <p className="text-muted-foreground">Carregando pedidos...</p>
            ) : (
              <>
                {errorPedidos && <p className="text-sm text-destructive mb-4">{errorPedidos}</p>}
                {pedidosFiltradosPorTipo.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                ) : (
                  <div className="space-y-4">
                    {(filtroTipoEntrega === "todos" || filtroTipoEntrega === "entrega") && (
                    <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">Entrega em domicílio</h3>
                        <span className="text-xs rounded-full border border-border px-2 py-1 text-muted-foreground">
                          {pedidosEntregaDomicilio.length} pedidos
                        </span>
                      </div>

                      {pedidosEntregaDomicilio.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum pedido de entrega em domicílio.</p>
                      ) : (
                        <div className="space-y-3">
                          {pedidosEntregaDomicilio.map((pedido) => (
                            <article key={pedido.id} className="rounded-lg border border-border/80 p-3 sm:p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-foreground">Pedido #{pedido.id}</p>
                                <span className="text-xs rounded-full bg-muted px-2 py-1 text-foreground">
                                  {formatarStatusPedido(pedido.status)}
                                </span>
                              </div>

                              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Cliente</p>
                                  <p className="text-foreground font-medium">
                                    {pedido.usuario?.nome || pedido.usuario?.email || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Telefone</p>
                                  <p className="text-foreground">{pedido.usuario?.telefone || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                                  <p className="text-foreground">{pedido.formaPagamento}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Data do pedido</p>
                                  <p className="text-foreground">{formatarData(resolverDataPedido(pedido))}</p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-1">Produtos encomendados</p>
                                <ul className="space-y-1">
                                  {obterItensPedido(pedido).map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                                      <span className="text-foreground">{item.produto?.nome ?? "Produto"}</span>
                                      <span className="text-muted-foreground">
                                        {item.quantidade} {item.unidade}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mt-3 rounded-md bg-muted/70 p-2">
                                <p className="text-xs text-muted-foreground">Endereço de entrega</p>
                                <p className="text-sm text-foreground">{formatarEnderecoEntrega(pedido)}</p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {formatarTipoEntrega(pedido.tipoEntrega)} • {totalQuantidadePedido(pedido)} item(ns)
                                </p>
                                <div className="flex w-full sm:w-auto gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      pedido.status === "SAIU_PARA_ENTREGA" ||
                                      pedido.status === "COMPLETADO" ||
                                      pedido.status === "CANCELADO" ||
                                      updatingSaidaEntregaId === pedido.id
                                    }
                                    onClick={() => marcarPedidoSaiuParaEntrega(pedido.id)}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-border text-foreground text-sm font-semibold disabled:opacity-50"
                                  >
                                    {updatingSaidaEntregaId === pedido.id
                                      ? "Atualizando..."
                                      : "Saiu para entrega"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      pedido.status !== "SAIU_PARA_ENTREGA" ||
                                      pedido.status === "COMPLETADO" ||
                                      pedido.status === "CANCELADO" ||
                                      updatingId === pedido.id
                                    }
                                    onClick={() => finalizarPedido(pedido.id)}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                                  >
                                    {updatingId === pedido.id ? "Finalizando..." : "Finalizar entrega"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                    )}

                    {(filtroTipoEntrega === "todos" || filtroTipoEntrega === "retirada") && (
                    <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">Retirada no local</h3>
                        <span className="text-xs rounded-full border border-border px-2 py-1 text-muted-foreground">
                          {pedidosRetirada.length} pedidos
                        </span>
                      </div>

                      {pedidosRetirada.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum pedido para retirada.</p>
                      ) : (
                        <div className="space-y-3">
                          {pedidosRetirada.map((pedido) => (
                            <article key={pedido.id} className="rounded-lg border border-border/80 p-3 sm:p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-foreground">Pedido #{pedido.id}</p>
                                <span className="text-xs rounded-full bg-muted px-2 py-1 text-foreground">
                                  {formatarStatusPedido(pedido.status)}
                                </span>
                              </div>

                              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Cliente</p>
                                  <p className="text-foreground font-medium">
                                    {pedido.usuario?.nome || pedido.usuario?.email || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Telefone</p>
                                  <p className="text-foreground">{pedido.usuario?.telefone || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                                  <p className="text-foreground">{pedido.formaPagamento}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Data do pedido</p>
                                  <p className="text-foreground">{formatarData(resolverDataPedido(pedido))}</p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-1">Produtos encomendados</p>
                                <ul className="space-y-1">
                                  {obterItensPedido(pedido).map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                                      <span className="text-foreground">{item.produto?.nome ?? "Produto"}</span>
                                      <span className="text-muted-foreground">
                                        {item.quantidade} {item.unidade}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mt-3 rounded-md bg-muted/70 p-2">
                                <p className="text-xs text-muted-foreground">Local de retirada</p>
                                <p className="text-sm text-foreground">{ENDERECO_LOJA_RETIRADA}</p>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {formatarTipoEntrega(pedido.tipoEntrega)} • {totalQuantidadePedido(pedido)} item(ns)
                                </p>
                                <div className="flex w-full sm:w-auto gap-2">
                                  <button
                                    type="button"
                                    disabled={
                                      pedido.status === "PRONTO_PARA_RETIRADA" ||
                                      pedido.status === "COMPLETADO" ||
                                      pedido.status === "CANCELADO" ||
                                      updatingRetiradaId === pedido.id
                                    }
                                    onClick={() => marcarPedidoProntoParaRetirada(pedido.id)}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                                  >
                                    {updatingRetiradaId === pedido.id
                                      ? "Atualizando..."
                                      : "Pronto para retirada"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      pedido.status !== "PRONTO_PARA_RETIRADA" ||
                                      pedido.status === "COMPLETADO" ||
                                      pedido.status === "CANCELADO" ||
                                      updatingId === pedido.id
                                    }
                                    onClick={() => finalizarPedido(pedido.id)}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-border text-foreground text-sm font-semibold disabled:opacity-50"
                                  >
                                    {updatingId === pedido.id ? "Finalizando..." : "Finalizar retirada"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                    )}
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

            <div className="mb-4 rounded-xl border border-border bg-muted/25 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Dashboard de Vendas</h3>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Vendas no período</p>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{resumoVendas.totalVendas}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatarMoeda(resumoVendas.valorTotalArrecadado)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Ticket médio</p>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{formatarMoeda(ticketMedioPeriodo)}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Maior venda do período</p>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground mt-1">{formatarMoeda(maiorVendaPeriodo)}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Formas de pagamento (período selecionado)
                  </p>
                  {resumoVendasPorPagamento.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados de pagamento na página atual.</p>
                  ) : (
                    <ul className="space-y-2">
                      {resumoVendasPorPagamento.map((item) => {
                        const percentual = valorTotalPeriodoSelecionado > 0
                          ? (item.valor / valorTotalPeriodoSelecionado) * 100
                          : 0;

                        return (
                          <li key={item.formaPagamento}>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-foreground">{item.formaPagamento}</span>
                              <span className="text-muted-foreground">
                                {item.quantidade} venda(s) • {formatarMoeda(item.valor)}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Top produtos por faturamento (período selecionado)
                  </p>
                  {rankingProdutosVendas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem itens para gerar ranking.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rankingProdutosVendas.map((produto, index) => (
                        <li key={produto.nome} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-foreground">
                            {index + 1}. {produto.nome}
                          </span>
                          <span className="text-muted-foreground">
                            {produto.quantidade} un • {formatarMoeda(produto.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {resumoVendasPorPagamento.length > 0 && (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Resumo por forma de pagamento
                </p>
                <div className="flex flex-wrap gap-2">
                  {resumoVendasPorPagamento.map((item) => (
                    <div
                      key={item.formaPagamento}
                      className="rounded-md border border-border bg-background px-2.5 py-1.5"
                    >
                      <p className="text-xs font-semibold text-foreground">{item.formaPagamento}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantidade} venda(s) • {formatarMoeda(item.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <div className="space-y-3">
                  {vendas.map((venda) => {
                    const itens = obterItensVenda(venda);

                    return (
                      <article key={venda.id} className="rounded-xl border border-border/80 bg-background p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-foreground">Pedido #{venda.id}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatarData(resolverDataVenda(venda))}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground bg-muted/60">
                              {venda.formaPagamento || "Não informado"}
                            </span>
                            <p className="text-lg font-bold text-foreground mt-1">
                              {formatarMoeda(venda.valorTotal)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
                          <div className="rounded-md border border-border/70 bg-muted/25 px-2.5 py-2">
                            <p className="text-xs text-muted-foreground">Cliente</p>
                            <p className="text-foreground font-medium truncate">
                              {venda.usuario?.nome || venda.usuario?.email || "-"}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/25 px-2.5 py-2">
                            <p className="text-xs text-muted-foreground">Itens no pedido</p>
                            <p className="text-foreground font-medium">{totalQuantidadeVenda(venda)}</p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/25 px-2.5 py-2">
                            <p className="text-xs text-muted-foreground">Valor dos produtos</p>
                            <p className="text-foreground font-medium">{formatarMoeda(venda.valorTotal)}</p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-border/70 overflow-hidden">
                          <div className="grid grid-cols-[1.5fr_auto_auto] gap-2 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <span>Produto</span>
                            <span>Qtd.</span>
                            <span>Subtotal</span>
                          </div>
                          <ul className="divide-y divide-border/70">
                            {itens.map((item) => (
                              <li
                                key={item.id}
                                className="grid grid-cols-[1.5fr_auto_auto] gap-2 px-3 py-2 text-sm"
                              >
                                <span className="text-foreground truncate">{item.produto?.nome ?? "Produto"}</span>
                                <span className="text-muted-foreground text-right">
                                  {item.quantidade} {item.unidade}
                                </span>
                                <span className="text-foreground font-medium text-right">
                                  {formatarMoeda(item.valorTotalItem)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    );
                  })}
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
                          <p className="text-sm text-muted-foreground mt-1">
                            Preço atual: {formatarMoeda(parsePrecoParaExibicao(produto.preco, 0))}
                          </p>
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