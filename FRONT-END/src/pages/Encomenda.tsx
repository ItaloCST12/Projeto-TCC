import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import abacaxiImg from "@/assets/abacaxi.jpg";
import laranjaImg from "@/assets/laranja.jpg";
import tangerinaImg from "@/assets/tangerina.jpg";
import limaoImg from "@/assets/limao.jpg";
import { apiRequest } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { getAuthUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

type TipoVendaProduto = "KILO" | "SACA" | "UNIDADE";

type Produto = {
  id: number;
  nome: string;
  tipoVenda?: TipoVendaProduto | string | null;
  preco: number;
  precoAbacaxiGrande?: number | null;
  precoAbacaxiMedio?: number | null;
  precoAbacaxiPequeno?: number | null;
  estoque: number;
  estoqueAbacaxiGrande?: number;
  estoqueAbacaxiMedio?: number;
  estoqueAbacaxiPequeno?: number;
  disponivel: boolean;
  imagemUrl?: string | null;
};

type ProdutoVisual = {
  image: string;
  description: string;
  opcoesVenda: {
    value: string;
    label: string;
    price: string;
    unit: string;
  }[];
};

const MAX_QUANTIDADE_POR_ITEM = 1000;

const PRECO_PADRAO_PRODUTO: Record<string, number> = {
  laranja: 50,
  tangerina: 5,
  limao: 60,
  "limão": 60,
  abacaxi: 5,
};

const PRODUTOS_VISUAIS = new Map<string, ProdutoVisual>([
  [
    "abacaxi",
    {
      image: abacaxiImg,
      description: "Doce e suculento, perfeito para sucos e sobremesas.",
      opcoesVenda: [
        { value: "unidade (grande)", label: "Grande", price: "R$ 7,00", unit: "unidade" },
        { value: "unidade (médio)", label: "Médio", price: "R$ 5,00", unit: "unidade" },
        { value: "unidade (pequeno)", label: "Pequeno", price: "R$ 3,00", unit: "unidade" },
      ],
    },
  ],
  [
    "laranja",
    {
      image: laranjaImg,
      description: "Rica em vitamina C, ideal para suco natural e refrescante no dia a dia.",
      opcoesVenda: [
        { value: "saca", label: "Saca", price: "R$ 50,00", unit: "saca" },
      ],
    },
  ],
  [
    "tangerina",
    {
      image: tangerinaImg,
      description: "Fácil de descascar, sabor adocicado e refrescante.",
      opcoesVenda: [
        { value: "kilo", label: "Kilo", price: "R$ 5,00", unit: "kilo" },
      ],
    },
  ],
  [
    "limão",
    {
      image: limaoImg,
      description: "Versátil na cozinha, aroma intenso e muito suco.",
      opcoesVenda: [
        { value: "saca", label: "Saca", price: "R$ 60,00", unit: "saca" },
      ],
    },
  ],
  [
    "limao",
    {
      image: limaoImg,
      description: "Versátil na cozinha, aroma intenso e muito suco.",
      opcoesVenda: [
        { value: "saca", label: "Saca", price: "R$ 60,00", unit: "saca" },
      ],
    },
  ],
]);

const clampQuantidade = (quantidade: number) =>
  Math.min(MAX_QUANTIDADE_POR_ITEM, Math.max(1, Math.floor(quantidade)));

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parsePreco = (valor: number | string | null | undefined, fallback = 0) => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : fallback;
  }

  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto) {
      return fallback;
    }

    const temVirgula = texto.includes(",");
    const normalizado = temVirgula
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto;
    const convertido = Number(normalizado);
    return Number.isFinite(convertido) ? convertido : fallback;
  }

  return fallback;
};

const parsePrecoPositivo = (
  valor: number | string | null | undefined,
  fallback: number,
) => {
  const preco = parsePreco(valor, fallback);
  return preco > 0 ? preco : fallback;
};

const produtoTemTamanhos = (produto: Produto) => {
  const possuiPrecoTamanhoConfigurado = [
    produto.precoAbacaxiGrande,
    produto.precoAbacaxiMedio,
    produto.precoAbacaxiPequeno,
  ].some((value) => value !== null && value !== undefined && String(value).trim() !== "");

  return (
    possuiPrecoTamanhoConfigurado ||
    Number(produto.estoqueAbacaxiGrande ?? 0) > 0 ||
    Number(produto.estoqueAbacaxiMedio ?? 0) > 0 ||
    Number(produto.estoqueAbacaxiPequeno ?? 0) > 0
  );
};

const resolverChaveVisualProduto = (nomeProduto: string) => {
  const nome = normalizarTexto(nomeProduto);

  if (nome.includes("abacaxi")) return "abacaxi";
  if (nome.includes("laranja")) return "laranja";
  if (nome.includes("tangerina")) return "tangerina";
  if (nome.includes("limao")) return "limao";

  return nome;
};

const resolverPrecoFallbackPorNome = (nomeProduto: string) => {
  const nomeNormalizado = normalizarTexto(nomeProduto);
  return PRECO_PADRAO_PRODUTO[nomeNormalizado] ?? 0;
};

const resolverTipoVendaFallbackPorNome = (nomeProduto: string): TipoVendaProduto => {
  const nomeNormalizado = normalizarTexto(nomeProduto);

  if (nomeNormalizado.includes("laranja") || nomeNormalizado.includes("limao")) {
    return "SACA";
  }

  if (nomeNormalizado.includes("tangerina")) {
    return "KILO";
  }

  return "UNIDADE";
};

const resolverTipoVendaProduto = (produto: Produto): TipoVendaProduto => {
  const tipoVendaNormalizado = String(produto.tipoVenda ?? "").trim().toUpperCase();

  if (
    tipoVendaNormalizado === "KILO" ||
    tipoVendaNormalizado === "SACA" ||
    tipoVendaNormalizado === "UNIDADE"
  ) {
    return tipoVendaNormalizado as TipoVendaProduto;
  }

  return resolverTipoVendaFallbackPorNome(produto.nome);
};

const construirOpcaoVendaPorTipo = (tipoVenda: TipoVendaProduto) => {
  if (tipoVenda === "KILO") {
    return { value: "kilo", label: "Kilo", price: "", unit: "kilo" };
  }

  if (tipoVenda === "SACA") {
    return { value: "saca", label: "Saca", price: "", unit: "saca" };
  }

  return { value: "unidade", label: "Unidade", price: "", unit: "unidade" };
};

const construirOpcoesVendaPorTipoComTamanhos = (tipoVenda: TipoVendaProduto) => {
  const opcaoBase = construirOpcaoVendaPorTipo(tipoVenda);

  return [
    { value: `${opcaoBase.value} (grande)`, label: "Grande", price: "", unit: opcaoBase.unit },
    { value: `${opcaoBase.value} (médio)`, label: "Médio", price: "", unit: opcaoBase.unit },
    { value: `${opcaoBase.value} (pequeno)`, label: "Pequeno", price: "", unit: opcaoBase.unit },
  ];
};

const resolverImagemProduto = (imagemUrl: string | null | undefined, fallback: string) => {
  if (!imagemUrl?.trim()) {
    return fallback;
  }

  if (imagemUrl.startsWith("http://") || imagemUrl.startsWith("https://")) {
    return imagemUrl;
  }

  const normalizedPath = imagemUrl.startsWith("/") ? imagemUrl : `/${imagemUrl}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  const normalizedBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  return `${normalizedBase}${normalizedPath}`;
};

const Encomenda = () => {
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animandoAdicaoPorProduto, setAnimandoAdicaoPorProduto] = useState<Record<number, boolean>>({});
  const [quantidadePorProduto, setQuantidadePorProduto] = useState<Record<number, number>>({});
  const [quantidadeEditandoPorProduto, setQuantidadeEditandoPorProduto] = useState<Record<number, string>>({});
  const [unidadePorProduto, setUnidadePorProduto] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const produtosResponse = await apiRequest<Produto[]>("/produtos");
        setProdutos(produtosResponse);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os dados da encomenda.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const hasProdutos = produtos.length > 0;

  const getProdutoVisual = (nomeProduto: string): ProdutoVisual => {
    const normalizedName = resolverChaveVisualProduto(nomeProduto);
    return (
      PRODUTOS_VISUAIS.get(normalizedName) ?? {
        image: abacaxiImg,
        description: "Produto fresco vendido na fazenda.",
        opcoesVenda: [{ value: "unidade", label: "Unidade", price: "Consulte", unit: "unidade" }],
      }
    );
  };

  const getOpcoesVendaProduto = (produto: Produto) => {
    if (produtoTemTamanhos(produto)) {
      return construirOpcoesVendaPorTipoComTamanhos(resolverTipoVendaProduto(produto));
    }

    return [construirOpcaoVendaPorTipo(resolverTipoVendaProduto(produto))];
  };

  const getQuantidadeSelecionada = (produtoId: number) => {
    return clampQuantidade(quantidadePorProduto[produtoId] ?? 1);
  };

  const getQuantidadeExibidaNoInput = (produtoId: number) => {
    const valorEditando = quantidadeEditandoPorProduto[produtoId];
    if (valorEditando !== undefined) {
      return valorEditando;
    }

    return String(getQuantidadeSelecionada(produtoId));
  };

  const getUnidadeSelecionada = (produtoId: number, defaultUnit: string) => {
    return unidadePorProduto[produtoId] ?? defaultUnit;
  };

  const getEstoquePorOpcao = (produto: Produto, opcaoValue: string) => {
    const opcaoNormalizada = normalizarTexto(opcaoValue);

    if (produtoTemTamanhos(produto)) {
      if (opcaoNormalizada.includes("grande")) {
        return produto.estoqueAbacaxiGrande ?? 0;
      }
      if (opcaoNormalizada.includes("medio") || opcaoNormalizada.includes("médio")) {
        return produto.estoqueAbacaxiMedio ?? 0;
      }
      if (opcaoNormalizada.includes("pequeno")) {
        return produto.estoqueAbacaxiPequeno ?? 0;
      }

      return produto.estoqueAbacaxiMedio ?? 0;
    }

    return produto.estoque ?? 0;
  };

  const isOpcaoDisponivel = (produto: Produto, opcaoValue: string) =>
    produto.disponivel && getEstoquePorOpcao(produto, opcaoValue) > 0;

  const getOpcaoSelecionada = (produto: Produto, produtoId: number) => {
    const opcoesVenda = getOpcoesVendaProduto(produto);
    const opcaoPadrao = opcoesVenda[0];
    if (!opcaoPadrao) {
      return { value: "unidade", label: "Unidade", price: "Consulte", unit: "unidade" };
    }

    const unidadeSelecionada = getUnidadeSelecionada(produtoId, opcaoPadrao.value);
    const opcaoSelecionada =
      opcoesVenda.find((opcao) => opcao.value === unidadeSelecionada) ?? opcaoPadrao;

    if (isOpcaoDisponivel(produto, opcaoSelecionada.value)) {
      return opcaoSelecionada;
    }

    const primeiraOpcaoDisponivel = opcoesVenda.find((opcao) =>
      isOpcaoDisponivel(produto, opcao.value),
    );

    return primeiraOpcaoDisponivel ?? opcaoSelecionada;
  };

  const getPrecoPorOpcao = (produto: Produto, opcaoValue: string) => {
    const opcaoNormalizada = normalizarTexto(opcaoValue);

    if (produtoTemTamanhos(produto)) {
      if (opcaoNormalizada.includes("grande")) {
        return parsePrecoPositivo(produto.precoAbacaxiGrande, parsePrecoPositivo(produto.preco, 0));
      }
      if (opcaoNormalizada.includes("medio") || opcaoNormalizada.includes("médio")) {
        return parsePrecoPositivo(produto.precoAbacaxiMedio, parsePrecoPositivo(produto.preco, 0));
      }
      if (opcaoNormalizada.includes("pequeno")) {
        return parsePrecoPositivo(produto.precoAbacaxiPequeno, parsePrecoPositivo(produto.preco, 0));
      }

      return parsePrecoPositivo(produto.preco, 0);
    }

    const precoBanco = parsePreco(produto.preco, 0);
    if (precoBanco > 0) {
      return precoBanco;
    }

    return resolverPrecoFallbackPorNome(produto.nome);
  };

  const limparEdicaoQuantidade = (produtoId: number) => {
    setQuantidadeEditandoPorProduto((current) => {
      const next = { ...current };
      delete next[produtoId];
      return next;
    });
  };

  const adicionarProdutoViaCard = (produto: Produto) => {
    if (isAdmin) {
      setError("Perfil administrador possui acesso somente para visualização de produtos.");
      return;
    }

    if (!produto.disponivel) {
      setError(`${produto.nome} está indisponível no momento.`);
      return;
    }

    const quantidadeSelecionada = getQuantidadeSelecionada(produto.id);
    const opcaoSelecionada = getOpcaoSelecionada(produto, produto.id);
    const estoqueOpcaoSelecionada = getEstoquePorOpcao(produto, opcaoSelecionada.value);

    if (estoqueOpcaoSelecionada <= 0) {
      setError(`Sem estoque disponível para ${produto.nome} (${opcaoSelecionada.label}).`);
      return;
    }

    if (quantidadeSelecionada > estoqueOpcaoSelecionada) {
      setError(
        `Quantidade maior que o estoque disponível para ${produto.nome} (${opcaoSelecionada.label}). Disponível: ${estoqueOpcaoSelecionada}.`,
      );
      return;
    }

    addToCart(produto.id, produto.nome, quantidadeSelecionada, opcaoSelecionada.value);

    setAnimandoAdicaoPorProduto((current) => ({
      ...current,
      [produto.id]: true,
    }));

    window.setTimeout(() => {
      setAnimandoAdicaoPorProduto((current) => ({
        ...current,
        [produto.id]: false,
      }));
    }, 550);

    toast.success("Produto adicionado ao carrinho", {
      description: `${produto.nome} foi adicionado com sucesso.`,
      action: {
        label: "Ver Carrinho",
        onClick: () => navigate("/carrinho"),
      },
    });
    setError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Produtos"
        titleIcon={<Package className="h-5 w-5" />}
        subtitle={
          isAdmin
            ? "Você está em modo de visualização de catálogo."
            : `${user?.nome ? `Olá, ${user.nome}. ` : ""}Escolha os produtos nos cards e adicione ao carrinho.`
        }
        containerClassName="max-w-6xl"
      >
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-produto-${index}`} className="rounded-xl border border-border p-4 space-y-3">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-foreground">Produtos</h2>
              </div>

              {isAdmin && (
                <p className="text-sm rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
                  Perfil administrador: visualização habilitada. A criação de encomendas está disponível apenas para clientes.
                </p>
              )}

              {!hasProdutos ? (
                <p className="text-sm text-muted-foreground">
                  Cadastre produtos no back-end para habilitar encomendas.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {produtos.map((produto) => {
                    const visual = getProdutoVisual(produto.nome);
                    const opcoesVenda = getOpcoesVendaProduto(produto);
                    const imagemCard = resolverImagemProduto(produto.imagemUrl, visual.image);
                    const produtoComTamanhos = produtoTemTamanhos(produto);
                    const quantidadeSelecionada = getQuantidadeSelecionada(produto.id);
                    const opcaoPadrao = opcoesVenda[0];
                    const opcaoSelecionada = getOpcaoSelecionada(produto, produto.id);
                    const unidadeSelecionada = opcaoSelecionada.value ?? opcaoPadrao?.value ?? "unidade";
                    const precoOpcaoSelecionada = getPrecoPorOpcao(
                      produto,
                      opcaoSelecionada.value,
                    );
                    const estoqueOpcaoSelecionada = getEstoquePorOpcao(
                      produto,
                      opcaoSelecionada.value,
                    );
                    const opcaoSelecionadaDisponivel =
                      produto.disponivel && estoqueOpcaoSelecionada > 0;

                    return (
                      <div
                        key={produto.id}
                        className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 group border border-border flex h-full flex-col"
                      >
                        <div className="aspect-square overflow-hidden bg-background">
                          <img
                            src={imagemCard}
                            alt={produto.nome}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(event) => {
                              const target = event.currentTarget;
                              if (target.dataset.fallbackApplied === "true") {
                                return;
                              }

                              target.dataset.fallbackApplied = "true";
                              target.src = visual.image;
                            }}
                          />
                        </div>

                        <div className="p-4 flex flex-1 flex-col gap-3">
                          <div>
                            <h3 className="font-display text-lg font-semibold text-foreground">
                              {produto.nome}
                            </h3>
                            <p className="text-muted-foreground text-base">{visual.description}</p>
                            {!produto.disponivel && (
                              <p className="text-sm font-semibold text-destructive mt-1">Indisponível</p>
                            )}
                            {produto.disponivel && !opcaoSelecionadaDisponivel && (
                              <p className="text-sm font-semibold text-destructive mt-1">
                                Sem estoque para {opcaoSelecionada.label.toLowerCase()}
                              </p>
                            )}
                            <p className="text-primary font-bold mt-1">
                              {formatarMoeda(precoOpcaoSelecionada)}
                              <span className="text-sm text-muted-foreground font-medium"> / {opcaoSelecionada.unit}</span>
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              {produtoComTamanhos ? "Tamanho" : opcoesVenda.length > 1 ? "Categoria" : "Forma de venda"}
                            </label>
                            {produtoComTamanhos ? (
                              <div className="grid grid-cols-3 gap-2">
                                {opcoesVenda.map((opcao) => {
                                  const ativa = unidadeSelecionada === opcao.value;
                                  const estoqueOpcao = getEstoquePorOpcao(produto, opcao.value);
                                  const opcaoDisponivel = produto.disponivel && estoqueOpcao > 0;
                                  return (
                                    <button
                                      key={`${produto.id}-${opcao.value}`}
                                      type="button"
                                      disabled={!opcaoDisponivel || isAdmin}
                                      onClick={() =>
                                        setUnidadePorProduto((current) => ({
                                          ...current,
                                          [produto.id]: opcao.value,
                                        }))
                                      }
                                      className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                                        ativa
                                          ? "border-primary bg-primary/10 text-primary font-semibold"
                                          : opcaoDisponivel
                                            ? "border-border text-foreground hover:bg-muted"
                                            : "border-border text-muted-foreground"
                                      } disabled:opacity-50`}
                                    >
                                      <span className="block">{opcao.label}</span>
                                      <span className="block text-[11px] leading-tight opacity-80">
                                        {opcaoDisponivel ? `${estoqueOpcao} disponível` : "Sem estoque"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : opcoesVenda.length > 1 ? (
                              <select
                                value={unidadeSelecionada}
                                disabled={!produto.disponivel || isAdmin}
                                onChange={(event) =>
                                  setUnidadePorProduto((current) => ({
                                    ...current,
                                    [produto.id]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground disabled:opacity-50"
                              >
                                {opcoesVenda.map((opcao) => (
                                  <option key={`${produto.id}-${opcao.value}`} value={opcao.value}>
                                    {opcao.label} — {formatarMoeda(getPrecoPorOpcao(produto, opcao.value))} / {opcao.unit}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-foreground text-sm">
                                {opcaoSelecionada.label} — {formatarMoeda(precoOpcaoSelecionada)} / {opcaoSelecionada.unit}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Selecionado: {opcaoSelecionada.label} ({formatarMoeda(precoOpcaoSelecionada)} por {opcaoSelecionada.unit})
                            </p>
                            <p className={`text-xs mt-1 ${opcaoSelecionadaDisponivel ? "text-muted-foreground" : "text-destructive"}`}>
                              Estoque do tamanho selecionado: {opcaoSelecionadaDisponivel ? `${estoqueOpcaoSelecionada} disponível` : "Indisponível"}
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Quantidade
                            </label>
                            <p className="text-xs text-muted-foreground mb-1">
                              {produtoComTamanhos
                                ? "Depois de escolher o tamanho, ajuste a quantidade desejada."
                                : `Informe em ${opcaoSelecionada.unit}.`}
                            </p>
                            <div className="flex items-center rounded-lg border border-border overflow-hidden">
                              <button
                                type="button"
                                disabled={!opcaoSelecionadaDisponivel || isAdmin}
                                onClick={() => {
                                  limparEdicaoQuantidade(produto.id);
                                  setQuantidadePorProduto((current) => ({
                                    ...current,
                                    [produto.id]: clampQuantidade(quantidadeSelecionada - 1),
                                  }));
                                }}
                                className="px-3 py-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={!opcaoSelecionadaDisponivel || isAdmin}
                                value={getQuantidadeExibidaNoInput(produto.id)}
                                onChange={(event) => {
                                  const valorSomenteNumeros = event.target.value.replace(/\D/g, "");
                                  const valorDigitado =
                                    valorSomenteNumeros === ""
                                      ? ""
                                      : String(clampQuantidade(Number(valorSomenteNumeros)));

                                  setQuantidadeEditandoPorProduto((current) => ({
                                    ...current,
                                    [produto.id]: valorDigitado,
                                  }));

                                  if (valorDigitado === "") {
                                    return;
                                  }

                                  const novoValor = Number(valorDigitado);
                                  if (!Number.isFinite(novoValor) || novoValor < 1) {
                                    return;
                                  }

                                  setQuantidadePorProduto((current) => ({
                                    ...current,
                                    [produto.id]: clampQuantidade(novoValor),
                                  }));
                                }}
                                onBlur={(event) => {
                                  const valorDigitado = event.target.value;
                                  const novoValor = Number(valorDigitado);
                                  const valorFinal =
                                    valorDigitado === "" || !Number.isFinite(novoValor) || novoValor < 1
                                      ? 1
                                      : clampQuantidade(novoValor);

                                  setQuantidadePorProduto((current) => ({
                                    ...current,
                                    [produto.id]: valorFinal,
                                  }));

                                  limparEdicaoQuantidade(produto.id);
                                }}
                                className="w-full bg-background px-3 py-2 text-center text-foreground disabled:opacity-50"
                              />
                              <button
                                type="button"
                                disabled={!opcaoSelecionadaDisponivel || isAdmin}
                                onClick={() => {
                                  limparEdicaoQuantidade(produto.id);
                                  setQuantidadePorProduto((current) => ({
                                    ...current,
                                    [produto.id]: clampQuantidade(quantidadeSelecionada + 1),
                                  }));
                                }}
                                className="px-3 py-2 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!opcaoSelecionadaDisponivel || isAdmin}
                            onClick={() => adicionarProdutoViaCard(produto)}
                            className={`mt-auto w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                              !opcaoSelecionadaDisponivel
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : isAdmin
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : `bg-primary text-primary-foreground hover:bg-primary/90 ${animandoAdicaoPorProduto[produto.id] ? "animate-pulse scale-[0.98]" : ""}`
                            }`}
                          >
                            {!opcaoSelecionadaDisponivel
                              ? "Sem estoque"
                              : isAdmin
                                ? "Visualização apenas"
                                : animandoAdicaoPorProduto[produto.id]
                                  ? "Adicionado ✓"
                                  : "Adicionar ao carrinho"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
};

export default Encomenda;
