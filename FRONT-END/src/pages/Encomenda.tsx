import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import abacaxiImg from "@/assets/abacaxi.jpg";
import laranjaImg from "@/assets/laranja.jpg";
import tangerinaImg from "@/assets/tangerina.jpg";
import limaoImg from "@/assets/limao.jpg";
import { apiRequest } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { getAuthUser, isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Produto = {
  id: number;
  nome: string;
  preco: number;
  precoAbacaxiGrande?: number | null;
  precoAbacaxiMedio?: number | null;
  precoAbacaxiPequeno?: number | null;
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
  const authenticated = isAuthenticated();
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

  if (!authenticated) {
    return <Navigate to="/login?redirect=/encomenda" replace />;
  }

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

  const getOpcaoSelecionada = (produtoId: number, visual: ProdutoVisual) => {
    const opcaoPadrao = visual.opcoesVenda[0];
    if (!opcaoPadrao) {
      return { value: "unidade", label: "Unidade", price: "Consulte", unit: "unidade" };
    }

    const unidadeSelecionada = getUnidadeSelecionada(produtoId, opcaoPadrao.value);
    return (
      visual.opcoesVenda.find((opcao) => opcao.value === unidadeSelecionada) ?? opcaoPadrao
    );
  };

  const getPrecoPorOpcao = (produto: Produto, opcaoValue: string) => {
    const nomeNormalizado = normalizarTexto(produto.nome);
    const opcaoNormalizada = normalizarTexto(opcaoValue);

    if (nomeNormalizado.includes("abacaxi")) {
      if (opcaoNormalizada.includes("grande")) {
        return parsePrecoPositivo(produto.precoAbacaxiGrande, 7);
      }
      if (opcaoNormalizada.includes("medio") || opcaoNormalizada.includes("médio")) {
        return parsePrecoPositivo(produto.precoAbacaxiMedio, 5);
      }
      if (opcaoNormalizada.includes("pequeno")) {
        return parsePrecoPositivo(produto.precoAbacaxiPequeno, 3);
      }

      return parsePrecoPositivo(produto.preco, 5);
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
    const visual = getProdutoVisual(produto.nome);
    const opcaoSelecionada = getOpcaoSelecionada(produto.id, visual);
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
        subtitle={`${user?.nome ? `Olá, ${user.nome}.` : "Você está logado."} ${isAdmin ? "Você está em modo de visualização de catálogo." : "Escolha os produtos nos cards e adicione ao carrinho."}`}
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
                    const imagemCard = resolverImagemProduto(produto.imagemUrl, visual.image);
                    const isAbacaxi = normalizarTexto(produto.nome).includes("abacaxi");
                    const quantidadeSelecionada = getQuantidadeSelecionada(produto.id);
                    const opcaoPadrao = visual.opcoesVenda[0];
                    const unidadeSelecionada = getUnidadeSelecionada(
                      produto.id,
                      opcaoPadrao?.value ?? "unidade",
                    );
                    const opcaoSelecionada = getOpcaoSelecionada(produto.id, visual);
                    const precoOpcaoSelecionada = getPrecoPorOpcao(
                      produto,
                      opcaoSelecionada.value,
                    );

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
                            <p className="text-primary font-bold mt-1">
                              {formatarMoeda(precoOpcaoSelecionada)}
                              <span className="text-sm text-muted-foreground font-medium"> / {opcaoSelecionada.unit}</span>
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              {isAbacaxi ? "Tamanho do abacaxi" : visual.opcoesVenda.length > 1 ? "Categoria" : "Forma de venda"}
                            </label>
                            {isAbacaxi ? (
                              <div className="grid grid-cols-3 gap-2">
                                {visual.opcoesVenda.map((opcao) => {
                                  const ativa = unidadeSelecionada === opcao.value;
                                  return (
                                    <button
                                      key={`${produto.id}-${opcao.value}`}
                                      type="button"
                                      disabled={!produto.disponivel || isAdmin}
                                      onClick={() =>
                                        setUnidadePorProduto((current) => ({
                                          ...current,
                                          [produto.id]: opcao.value,
                                        }))
                                      }
                                      className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                                        ativa
                                          ? "border-primary bg-primary/10 text-primary font-semibold"
                                          : "border-border text-foreground hover:bg-muted"
                                      } disabled:opacity-50`}
                                    >
                                      {opcao.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : visual.opcoesVenda.length > 1 ? (
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
                                {visual.opcoesVenda.map((opcao) => (
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
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              {isAbacaxi ? "Quantidade de abacaxis" : "Quantidade"}
                            </label>
                            <p className="text-xs text-muted-foreground mb-1">
                              {isAbacaxi
                                ? "Depois de escolher o tamanho, ajuste quantos abacaxis você quer."
                                : `Informe em ${opcaoSelecionada.unit}.`}
                            </p>
                            <div className="flex items-center rounded-lg border border-border overflow-hidden">
                              <button
                                type="button"
                                disabled={!produto.disponivel || isAdmin}
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
                                disabled={!produto.disponivel || isAdmin}
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
                                disabled={!produto.disponivel || isAdmin}
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
                            disabled={!produto.disponivel || isAdmin}
                            onClick={() => adicionarProdutoViaCard(produto)}
                            className={`mt-auto w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                              !produto.disponivel
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : isAdmin
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : `bg-primary text-primary-foreground hover:bg-primary/90 ${animandoAdicaoPorProduto[produto.id] ? "animate-pulse scale-[0.98]" : ""}`
                            }`}
                          >
                            {!produto.disponivel
                              ? "Indisponível"
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
