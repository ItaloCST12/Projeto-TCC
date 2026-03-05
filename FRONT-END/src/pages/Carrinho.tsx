import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { getAuthUser, isAuthenticated } from "@/lib/auth";
import {
  clearCart,
  getCartItems,
  removeFromCart,
  saveCartItems,
  type CartItem,
} from "@/lib/cart";
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

type Produto = {
  id: number;
  nome: string;
  disponivel: boolean;
  preco?: number | string;
  precoAbacaxiGrande?: number | string | null;
  precoAbacaxiMedio?: number | string | null;
  precoAbacaxiPequeno?: number | string | null;
};

type Endereco = {
  id: number;
  rua: string;
  numero?: string | null;
  cidade: string;
  cep: string;
};

type FormasPagamentoResponse = {
  formas: string[];
};

type PedidoCriadoResponse = {
  id: number;
  formaPagamento: string;
};

const MAX_QUANTIDADE_POR_ITEM = 1000;

const PRECO_PADRAO_PRODUTO: Record<string, number> = {
  laranja: 50,
  tangerina: 5,
  limao: 60,
  "limão": 60,
  abacaxi: 5,
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);


const resolverPrecoFallbackPorNomeUnidade = (nomeProduto?: string, unidade?: string) => {
  const nomeNormalizado = (nomeProduto || "").trim().toLowerCase();
  const unidadeNormalizada = (unidade || "").trim().toLowerCase();

  if (nomeNormalizado === "abacaxi") {
    if (unidadeNormalizada.includes("grande")) {
      return 7;
    }
    if (unidadeNormalizada.includes("pequeno")) {
      return 3;
    }
    return 5;
  }

  return PRECO_PADRAO_PRODUTO[nomeNormalizado] ?? 0;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  localidade?: string;
};

type BrasilApiCepResponse = {
  street?: string;
  city?: string;
};

const Carrinho = () => {
  const authenticated = isAuthenticated();
  const user = getAuthUser();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<string[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);

  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "entrega">("retirada");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [enderecoId, setEnderecoId] = useState<number | "">("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [cidade, setCidade] = useState("");
  const [cep, setCep] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [ajudaCepAtiva, setAjudaCepAtiva] = useState(false);
  const [savingEndereco, setSavingEndereco] = useState(false);
  const [deletingEnderecoId, setDeletingEnderecoId] = useState<number | null>(null);
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<Endereco | null>(null);
  const [enderecoFormError, setEnderecoFormError] = useState("");
  const [enderecoFormSuccess, setEnderecoFormSuccess] = useState("");
  const [editingEnderecoId, setEditingEnderecoId] = useState<number | null>(null);
  const ultimoCepBuscadoRef = useRef("");

  const totalItens = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantidade, 0),
    [cartItems],
  );

  const produtosPorId = useMemo(
    () => new Map(produtosCatalogo.map((produto) => [produto.id, produto])),
    [produtosCatalogo],
  );

  const resolverPrecoUnitarioItem = useCallback((item: CartItem) => {
    const produto = produtosPorId.get(item.produtoId);

    const nomeNormalizado = (produto?.nome || "").trim().toLowerCase();
    const unidadeNormalizada = (item.unidade || "").trim().toLowerCase();

    if (nomeNormalizado === "abacaxi") {
      if (unidadeNormalizada.includes("grande")) {
        const precoGrande = Number(produto?.precoAbacaxiGrande);
        if (Number.isFinite(precoGrande) && precoGrande >= 0) {
          return precoGrande;
        }
      }

      if (unidadeNormalizada.includes("medio") || unidadeNormalizada.includes("médio")) {
        const precoMedio = Number(produto?.precoAbacaxiMedio);
        if (Number.isFinite(precoMedio) && precoMedio >= 0) {
          return precoMedio;
        }
      }

      if (unidadeNormalizada.includes("pequeno")) {
        const precoPequeno = Number(produto?.precoAbacaxiPequeno);
        if (Number.isFinite(precoPequeno) && precoPequeno >= 0) {
          return precoPequeno;
        }
      }
    }

    const precoBanco = Number(produto?.preco) || 0;
    if (precoBanco > 0) {
      return precoBanco;
    }

    return resolverPrecoFallbackPorNomeUnidade(item.nome, item.unidade);
  }, [produtosPorId]);

  const valorTotalCarrinho = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + resolverPrecoUnitarioItem(item) * item.quantidade,
        0,
      ),
    [cartItems, resolverPrecoUnitarioItem],
  );

  const enderecoLabel = (endereco: Endereco) => {
    const numeroFormatado = endereco.numero?.trim() ? `, ${endereco.numero}` : "";
    const cepFormatado = endereco.cep?.trim() ? ` (${endereco.cep})` : "";
    return `${endereco.rua}${numeroFormatado} - ${endereco.cidade}${cepFormatado}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [produtosResponse, formasResponse, enderecosResponse] = await Promise.all([
          apiRequest<Produto[]>("/produtos"),
          apiRequest<FormasPagamentoResponse>("/pagamentos/formas"),
          apiRequest<Endereco[]>("/enderecos/me"),
        ]);

        setProdutosCatalogo(produtosResponse);

        const produtosDisponiveis = produtosResponse.filter((produto) => produto.disponivel);
        const produtosMap = new Map(produtosDisponiveis.map((produto) => [produto.id, produto.nome]));

        const carrinhoSanitizado = getCartItems()
          .map((item) => {
            const nomeAtual = produtosMap.get(item.produtoId);
            if (!nomeAtual) {
              return null;
            }

            return {
              produtoId: item.produtoId,
              nome: nomeAtual,
              quantidade: Math.min(MAX_QUANTIDADE_POR_ITEM, Math.max(1, Math.floor(item.quantidade))),
              unidade: item.unidade?.trim() ? item.unidade : "unidade",
            };
          })
          .filter((item): item is CartItem => item !== null);

        setCartItems(carrinhoSanitizado);
        saveCartItems(carrinhoSanitizado);

        setFormasPagamento(formasResponse.formas);
        if (formasResponse.formas.length > 0) {
          setFormaPagamento(formasResponse.formas[0]);
        }

        setEnderecos(enderecosResponse);
        if (enderecosResponse.length > 0) {
          setEnderecoId(enderecosResponse[0].id);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os dados do carrinho.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    saveCartItems(cartItems);
  }, [cartItems, loading]);

  const alterarQuantidade = (produtoId: number, unidade: string, delta: number) => {
    setCartItems((current) =>
      current.map((item) =>
        item.produtoId === produtoId && item.unidade === unidade
          ? {
              ...item,
              quantidade: Math.min(
                MAX_QUANTIDADE_POR_ITEM,
                Math.max(1, item.quantidade + delta),
              ),
            }
          : item,
      ),
    );
  };

  const removerItem = (produtoId: number, unidade: string) => {
    removeFromCart(produtoId, unidade);
    setCartItems((current) =>
      current.filter((item) => !(item.produtoId === produtoId && item.unidade === unidade)),
    );
  };

  const submitPedido = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (cartItems.length === 0) {
      setError("Adicione ao menos um produto ao carrinho para finalizar.");
      return;
    }

    const itemPrincipal = cartItems[0];
    if (!itemPrincipal) {
      setError("Adicione ao menos um produto ao carrinho para finalizar.");
      return;
    }

    if (tipoEntrega === "entrega" && typeof enderecoId !== "number") {
      setError("Selecione um endereço para entrega.");
      return;
    }

    setSubmitting(true);

    try {
      const pedidoCriado = await apiRequest<PedidoCriadoResponse>("/pedidos", {
        method: "POST",
        body: {
          produtoId: itemPrincipal.produtoId,
          enderecoId: tipoEntrega === "entrega" ? enderecoId : null,
          quantidade: itemPrincipal.quantidade,
          unidade: itemPrincipal.unidade,
          tipoEntrega,
          formaPagamento,
          items: cartItems.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            unidade: item.unidade,
          })),
        },
      });

      clearCart();
      setCartItems([]);
      setSuccess(
        `Encomenda finalizada com sucesso! Pedido #${pedidoCriado.id} criado com forma de pagamento ${pedidoCriado.formaPagamento}.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível finalizar a encomenda.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const buscarEnderecoPorCep = async (cepDigitado: string) => {
    setAjudaCepAtiva(false);
    const apenasNumeros = cepDigitado.replace(/\D/g, "");

    if (apenasNumeros.length !== 8) {
      setCepError("Informe um CEP válido com 8 números.");
      return;
    }

    setLoadingCep(true);
    setCepError("");
    ultimoCepBuscadoRef.current = apenasNumeros;

    try {
      let ruaEncontrada = "";
      let cidadeEncontrada = "";

      try {
        const responseViaCep = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
        if (responseViaCep.ok) {
          const dataViaCep = (await responseViaCep.json()) as ViaCepResponse;

          if (!dataViaCep.erro) {
            ruaEncontrada = dataViaCep.logradouro?.trim() ?? "";
            cidadeEncontrada = dataViaCep.localidade?.trim() ?? "";
          }
        }
      } catch {
        ruaEncontrada = "";
        cidadeEncontrada = "";
      }

      if (!ruaEncontrada && !cidadeEncontrada) {
        const responseBrasilApi = await fetch(`https://brasilapi.com.br/api/cep/v1/${apenasNumeros}`);
        if (responseBrasilApi.ok) {
          const dataBrasilApi = (await responseBrasilApi.json()) as BrasilApiCepResponse;
          ruaEncontrada = dataBrasilApi.street?.trim() ?? "";
          cidadeEncontrada = dataBrasilApi.city?.trim() ?? "";
        }
      }

      if (!ruaEncontrada && !cidadeEncontrada) {
        setCepError("CEP não encontrado. Verifique e tente novamente.");
        return;
      }

      if (ruaEncontrada) {
        setRua(ruaEncontrada);
      }

      if (cidadeEncontrada) {
        setCidade(cidadeEncontrada);
      }
    } catch {
      setCepError("Falha ao buscar CEP. Tente novamente.");
    } finally {
      setLoadingCep(false);
    }
  };

  const formatarCep = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8);
    if (apenasNumeros.length <= 5) {
      return apenasNumeros;
    }

    return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`;
  };

  const atualizarCepEConsultar = (valorCep: string) => {
    if (ajudaCepAtiva) {
      setAjudaCepAtiva(false);
    }

    const cepFormatado = formatarCep(valorCep);
    setCep(cepFormatado);

    if (cepError) {
      setCepError("");
    }

    const apenasNumeros = cepFormatado.replace(/\D/g, "");
    if (apenasNumeros.length < 8) {
      ultimoCepBuscadoRef.current = "";
    }

    if (apenasNumeros.length === 8 && ultimoCepBuscadoRef.current !== apenasNumeros) {
      void buscarEnderecoPorCep(cepFormatado);
    }
  };

  const limparFormularioEndereco = () => {
    setRua("");
    setNumero("");
    setCidade("");
    setCep("");
    setAjudaCepAtiva(false);
    setCepError("");
    setEnderecoFormError("");
    setEnderecoFormSuccess("");
    setEditingEnderecoId(null);
  };

  const iniciarEdicaoEndereco = (endereco: Endereco) => {
    setEditingEnderecoId(endereco.id);
    setRua(endereco.rua);
    setNumero(endereco.numero ?? "");
    setCidade(endereco.cidade);
    setCep(endereco.cep);
    setCepError("");
    setEnderecoFormError("");
    setEnderecoFormSuccess("");
  };

  const salvarEndereco = async () => {
    setEnderecoFormError("");
    setEnderecoFormSuccess("");

    if (!rua.trim() || !cidade.trim()) {
      setEnderecoFormError("Preencha rua e cidade para salvar o endereço.");
      return;
    }

    setSavingEndereco(true);

    try {
      if (editingEnderecoId) {
        const atualizado = await apiRequest<Endereco>(`/enderecos/${editingEnderecoId}`, {
          method: "PATCH",
          body: {
            rua: rua.trim(),
            numero: numero.trim(),
            cidade: cidade.trim(),
            cep: cep.trim(),
          },
        });

        setEnderecos((current) =>
          current.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );
        setEnderecoFormSuccess("Endereço atualizado com sucesso.");
      } else {
        const criado = await apiRequest<Endereco>("/enderecos", {
          method: "POST",
          body: {
            rua: rua.trim(),
            numero: numero.trim(),
            cidade: cidade.trim(),
            cep: cep.trim(),
          },
        });

        setEnderecos((current) => [criado, ...current]);
        setEnderecoId(criado.id);
        setEnderecoFormSuccess("Endereço cadastrado com sucesso.");
      }
    } catch (saveError) {
      setEnderecoFormError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o endereço.",
      );
    } finally {
      setSavingEndereco(false);
    }
  };

  const excluirEndereco = async (endereco: Endereco) => {
    setDeletingEnderecoId(endereco.id);
    setEnderecoFormError("");
    setEnderecoFormSuccess("");

    try {
      await apiRequest(`/enderecos/${endereco.id}`, {
        method: "DELETE",
      });

      setEnderecos((current) => {
        const atualizados = current.filter((item) => item.id !== endereco.id);

        setEnderecoId((valorAtual) => {
          if (valorAtual !== endereco.id) {
            return valorAtual;
          }

          const primeiro = atualizados[0];
          return primeiro ? primeiro.id : "";
        });

        return atualizados;
      });

      if (editingEnderecoId === endereco.id) {
        limparFormularioEndereco();
      }

      setEnderecoFormSuccess("Endereço excluído com sucesso.");
    } catch (deleteError) {
      setEnderecoFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir o endereço.",
      );
    } finally {
      setDeletingEnderecoId(null);
      setEnderecoParaExcluir(null);
    }
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/carrinho" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Carrinho"
        subtitle={`${user?.nome ? `Olá, ${user.nome}.` : "Você está logado."} Revise os itens e finalize a encomenda.`}
        containerClassName="max-w-4xl"
      >
        <div className="bg-card border border-border rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground">Carregando carrinho...</p>
          ) : (
            <form onSubmit={submitPedido} className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground">Itens do carrinho</h2>
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    setCartItems([]);
                  }}
                  className="inline-flex items-center px-3 py-1 rounded-md border border-border text-foreground text-sm font-semibold hover:bg-muted"
                >
                  Limpar carrinho
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
                  <Link
                    to="/encomenda"
                    className="inline-flex items-center mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Adicionar produtos
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cartItems.map((item) => (
                    <li
                      key={`${item.produtoId}-${item.unidade}`}
                      className="rounded-lg border border-border bg-background p-3 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-sm text-foreground font-medium">{item.nome} ({item.unidade})</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Subtotal: {formatarMoeda(resolverPrecoUnitarioItem(item) * item.quantidade)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produtoId, item.unidade, -1)}
                          className="px-2 py-1 rounded border border-border hover:bg-muted"
                        >
                          -
                        </button>
                        <span className="text-sm min-w-8 text-center">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produtoId, item.unidade, 1)}
                          className="px-2 py-1 rounded border border-border hover:bg-muted"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(item.produtoId, item.unidade)}
                          className="px-2 py-1 rounded border border-border hover:bg-muted text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm text-foreground">
                  Produtos no carrinho: <span className="font-semibold">{cartItems.length}</span>
                </p>
                <p className="text-sm text-foreground">
                  Quantidade total: <span className="font-semibold">{totalItens}</span>
                </p>
                <p className="text-sm text-foreground">
                  Valor total dos produtos: <span className="font-semibold">{formatarMoeda(valorTotalCarrinho)}</span>
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tipoEntrega" className="block text-sm font-medium text-foreground mb-1">
                    Tipo de entrega
                  </label>
                  <select
                    id="tipoEntrega"
                    value={tipoEntrega}
                    onChange={(event) => setTipoEntrega(event.target.value as "retirada" | "entrega")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  >
                    <option value="retirada">Retirada</option>
                    <option value="entrega">Entrega</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="formaPagamento" className="block text-sm font-medium text-foreground mb-1">
                    Forma de pagamento
                  </label>
                  <select
                    id="formaPagamento"
                    value={formaPagamento}
                    onChange={(event) => setFormaPagamento(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  >
                    {formasPagamento.map((forma) => (
                      <option key={forma} value={forma}>
                        {forma}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Endereço de entrega
                  </label>
                  <select
                    value={enderecoId}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value) {
                        setEnderecoId(Number(value));
                        return;
                      }
                      setEnderecoId("");
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    required={tipoEntrega === "entrega"}
                  >
                    {enderecos.length === 0 ? (
                      <option value="">Nenhum endereço cadastrado</option>
                    ) : (
                      enderecos.map((endereco) => (
                        <option key={endereco.id} value={endereco.id}>
                          {enderecoLabel(endereco)}
                        </option>
                      ))
                    )}
                  </select>
                  {enderecos.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre um endereço na seção “Meus endereços” abaixo.
                    </p>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Finalizando encomenda..." : "Finalizar Encomenda"}
              </button>
            </form>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Meus endereços
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre e atualize seus endereços. Você pode usar um deles para entrega no checkout.
          </p>

          {enderecos.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">Nenhum endereço cadastrado.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {enderecos.map((endereco) => (
                <li
                  key={endereco.id}
                  className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="text-sm text-foreground">
                    <p>
                      {endereco.rua}
                      {endereco.numero ? `, ${endereco.numero}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {endereco.cidade}
                      {endereco.cep?.trim() ? ` - ${endereco.cep}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoEndereco(endereco)}
                      className="inline-flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnderecoParaExcluir(endereco)}
                      disabled={deletingEnderecoId === endereco.id}
                      className="inline-flex items-center px-3 py-1 rounded-md border border-border text-foreground text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      {deletingEnderecoId === endereco.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <input
                type="text"
                value={cep}
                onChange={(event) => atualizarCepEConsultar(event.target.value)}
                onBlur={(event) => {
                  const cepDigitado = event.currentTarget.value;
                  if (cepDigitado.replace(/\D/g, "").length === 8) {
                    void buscarEnderecoPorCep(cepDigitado);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                placeholder="CEP"
                inputMode="numeric"
                maxLength={9}
              />
              <button
                type="button"
                onClick={() => {
                  setAjudaCepAtiva(true);
                  setCep("");
                  setCepError("");
                  setLoadingCep(false);
                  window.open(
                    "https://buscacepinter.correios.com.br/app/endereco/index.php",
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-semibold leading-none">
                  ?
                </span>
                Não sei meu CEP
              </button>
            </div>
            <input
              type="text"
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              placeholder="Número"
            />
            <input
              type="text"
              value={rua}
              onChange={(event) => setRua(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              placeholder="Rua"
            />
            <input
              type="text"
              value={cidade}
              onChange={(event) => setCidade(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              placeholder="Cidade"
            />
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => void buscarEnderecoPorCep(cep)}
              disabled={loadingCep || cep.replace(/\D/g, "").length !== 8}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              {loadingCep ? "Buscando CEP..." : "Buscar CEP"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => void salvarEndereco()}
              disabled={savingEndereco}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {savingEndereco
                ? "Salvando..."
                : editingEnderecoId
                  ? "Atualizar endereço"
                  : "Cadastrar endereço"}
            </button>
            <button
              type="button"
              onClick={limparFormularioEndereco}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted"
            >
              Limpar
            </button>
          </div>

          {loadingCep && <p className="text-sm text-muted-foreground mt-3">Buscando CEP...</p>}
          {ajudaCepAtiva && (
            <p className="text-sm text-muted-foreground mt-3">
              Sem problemas. Você pode preencher rua e cidade manualmente para cadastrar o endereço.
            </p>
          )}
          {cepError && <p className="text-sm text-destructive mt-3">{cepError}</p>}
          {enderecoFormError && <p className="text-sm text-destructive mt-2">{enderecoFormError}</p>}
          {enderecoFormSuccess && <p className="text-sm text-primary mt-2">{enderecoFormSuccess}</p>}
        </div>

        <AlertDialog
          open={enderecoParaExcluir !== null}
          onOpenChange={(open) => {
            if (!open && deletingEnderecoId === null) {
              setEnderecoParaExcluir(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja excluir este endereço?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação remove o endereço selecionado do seu cadastro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingEnderecoId !== null}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                disabled={deletingEnderecoId !== null || enderecoParaExcluir === null}
                onClick={() => {
                  if (enderecoParaExcluir) {
                    void excluirEndereco(enderecoParaExcluir);
                  }
                }}
              >
                {deletingEnderecoId !== null ? "Excluindo..." : "Confirmar exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageShell>
    </div>
  );
};

export default Carrinho;
