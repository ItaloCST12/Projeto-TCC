import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
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

type PerfilResponse = {
  id: number;
  nome?: string | null;
  email: string;
  telefone?: string | null;
  role: string;
};

type Pedido = {
  id: number;
  status: string;
  quantidade: number;
  unidade: string;
  produto?: {
    nome: string;
  };
};

type Endereco = {
  id: number;
  rua: string;
  numero?: string | null;
  cidade: string;
  cep: string;
};

type Mensagem = {
  id: number;
};

type RespostaPaginada<T> = {
  data: T[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type ViaCepResponse = {
  cep: string;
  rua: string;
  cidade: string;
};

const normalizarLista = <T,>(valor: unknown): T[] => {
  if (Array.isArray(valor)) {
    return valor as T[];
  }

  if (
    typeof valor === "object" &&
    valor !== null &&
    "data" in valor &&
    Array.isArray((valor as { data?: unknown }).data)
  ) {
    return (valor as { data: T[] }).data;
  }

  return [];
};

const Perfil = () => {
  const authenticated = isAuthenticated();
  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [enderecoExpandidoId, setEnderecoExpandidoId] = useState<number | null>(null);
  const [enderecoRua, setEnderecoRua] = useState("");
  const [enderecoNumero, setEnderecoNumero] = useState("");
  const [enderecoCidade, setEnderecoCidade] = useState("");
  const [enderecoCep, setEnderecoCep] = useState("");
  const [enderecoEdicaoId, setEnderecoEdicaoId] = useState<number | null>(null);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [excluindoEnderecoId, setExcluindoEnderecoId] = useState<number | null>(null);
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<Endereco | null>(null);
  const [feedbackEndereco, setFeedbackEndereco] = useState("");
  const [erroEndereco, setErroEndereco] = useState("");
  const [loadingCepEndereco, setLoadingCepEndereco] = useState(false);
  const [erroCepEndereco, setErroCepEndereco] = useState("");
  const [loading, setLoading] = useState(true);
  const [telefoneEdicao, setTelefoneEdicao] = useState("");
  const [salvandoTelefone, setSalvandoTelefone] = useState(false);
  const [feedbackTelefone, setFeedbackTelefone] = useState("");
  const [error, setError] = useState("");
  const ultimoCepBuscadoRef = useRef("");
  const cepLookupTimeoutRef = useRef<number | null>(null);

  const formatarTelefone = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 11);

    if (apenasNumeros.length <= 2) {
      return apenasNumeros.length > 0 ? `(${apenasNumeros}` : "";
    }

    const ddd = apenasNumeros.slice(0, 2);
    const restante = apenasNumeros.slice(2);

    if (restante.length <= 4) {
      return `(${ddd}) ${restante}`;
    }

    if (restante.length <= 8) {
      return `(${ddd}) ${restante.slice(0, 4)}-${restante.slice(4)}`;
    }

    return `(${ddd}) ${restante.slice(0, 5)}-${restante.slice(5, 9)}`;
  };

  const handleTelefoneEdicaoChange = (valor: string) => {
    setTelefoneEdicao(formatarTelefone(valor));
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

  const formatarCep = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "").slice(0, 8);

    if (apenasNumeros.length <= 5) {
      return apenasNumeros;
    }

    return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5)}`;
  };

  const cancelarBuscaCepPendente = () => {
    if (cepLookupTimeoutRef.current !== null) {
      window.clearTimeout(cepLookupTimeoutRef.current);
      cepLookupTimeoutRef.current = null;
    }
  };

  const buscarEnderecoPorCep = async (cepDigitado: string) => {
    const apenasNumeros = cepDigitado.replace(/\D/g, "");

    if (apenasNumeros.length !== 8) {
      setErroCepEndereco("Informe um CEP válido com 8 números.");
      return;
    }

    cancelarBuscaCepPendente();
    setLoadingCepEndereco(true);
    setErroCepEndereco("");
    ultimoCepBuscadoRef.current = apenasNumeros;

    try {
      const dataViaCep = await apiRequest<ViaCepResponse>(`/enderecos/cep/${apenasNumeros}`);

      if (ultimoCepBuscadoRef.current !== apenasNumeros) {
        return;
      }

      const ruaEncontrada = dataViaCep.rua?.trim() ?? "";
      const cidadeEncontrada = dataViaCep.cidade?.trim() ?? "";

      if (!ruaEncontrada && !cidadeEncontrada) {
        setErroCepEndereco("CEP não encontrado. Verifique e tente novamente.");
        return;
      }

      if (ruaEncontrada) {
        setEnderecoRua(ruaEncontrada);
      }

      if (cidadeEncontrada) {
        setEnderecoCidade(cidadeEncontrada);
      }
    } catch (lookupError) {
      setErroCepEndereco(
        lookupError instanceof Error
          ? lookupError.message
          : "Falha ao buscar CEP. Tente novamente.",
      );
    } finally {
      setLoadingCepEndereco(false);
    }
  };

  const atualizarCepEConsultar = (valorCep: string) => {
    const cepFormatado = formatarCep(valorCep);
    setEnderecoCep(cepFormatado);

    if (erroCepEndereco) {
      setErroCepEndereco("");
    }

    const apenasNumeros = cepFormatado.replace(/\D/g, "");
    if (apenasNumeros.length < 8) {
      ultimoCepBuscadoRef.current = "";
      cancelarBuscaCepPendente();
      return;
    }

    if (apenasNumeros.length === 8 && ultimoCepBuscadoRef.current !== apenasNumeros) {
      cancelarBuscaCepPendente();
      cepLookupTimeoutRef.current = window.setTimeout(() => {
        void buscarEnderecoPorCep(cepFormatado);
      }, 350);
    }
  };

  useEffect(() => {
    return () => {
      cancelarBuscaCepPendente();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [perfilResponse, pedidosResponse, enderecosResponse, mensagensResponse] =
          await Promise.all([
            apiRequest<PerfilResponse>("/usuarios/perfil"),
            apiRequest<Pedido[] | RespostaPaginada<Pedido>>("/pedidos/minhas-encomendas"),
            apiRequest<Endereco[] | RespostaPaginada<Endereco>>("/enderecos/me"),
            apiRequest<Mensagem[] | RespostaPaginada<Mensagem>>("/atendimentos/me"),
          ]);

        setPerfil(perfilResponse);
        setTelefoneEdicao(formatarTelefone(perfilResponse.telefone ?? ""));
        setPedidos(normalizarLista<Pedido>(pedidosResponse));
        setEnderecos(normalizarLista<Endereco>(enderecosResponse));
        setMensagens(normalizarLista<Mensagem>(mensagensResponse));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar seu perfil.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const pedidosPendentes = useMemo(
    () => pedidos.filter((pedido) => pedido.status !== "COMPLETADO").length,
    [pedidos],
  );

  const tipoUsuarioLabel = useMemo(() => {
    if (!perfil?.role) {
      return "Não informado";
    }

    const roleNormalizada = perfil.role.trim().toUpperCase();

    if (roleNormalizada === "ADMIN") {
      return "Administrador";
    }

    return "Cliente";
  }, [perfil?.role]);

  const previsualizarEndereco = (endereco: Endereco) => {
    const numeroFormatado = endereco.numero?.trim() ? `, ${endereco.numero}` : "";
    return `${endereco.rua}${numeroFormatado} - ${endereco.cidade}`;
  };

  const formatarEnderecoCompleto = (endereco: Endereco) => {
    const numeroFormatado = endereco.numero?.trim() ? `, ${endereco.numero}` : "";
    const cepFormatado = endereco.cep?.trim() ? ` (${endereco.cep})` : "";
    return `${endereco.rua}${numeroFormatado} - ${endereco.cidade}${cepFormatado}`;
  };

  const limparCamposEndereco = () => {
    cancelarBuscaCepPendente();
    setEnderecoRua("");
    setEnderecoNumero("");
    setEnderecoCidade("");
    setEnderecoCep("");
    setErroCepEndereco("");
    setEnderecoEdicaoId(null);
  };

  const limparFormularioEndereco = () => {
    limparCamposEndereco();
    setErroEndereco("");
    setFeedbackEndereco("");
  };

  const iniciarEdicaoEndereco = (endereco: Endereco) => {
    cancelarBuscaCepPendente();
    setErroCepEndereco("");
    setEnderecoEdicaoId(endereco.id);
    setEnderecoRua(endereco.rua);
    setEnderecoNumero(endereco.numero ?? "");
    setEnderecoCidade(endereco.cidade);
    setEnderecoCep(formatarCep(endereco.cep ?? ""));
    setErroEndereco("");
    setFeedbackEndereco("");
    setEnderecoExpandidoId(endereco.id);
  };

  const salvarEndereco = async () => {
    setErroEndereco("");
    setFeedbackEndereco("");

    if (!enderecoRua.trim() || !enderecoCidade.trim()) {
      setErroEndereco("Preencha rua e cidade para salvar o endereço.");
      return;
    }

    setSalvandoEndereco(true);

    try {
      if (enderecoEdicaoId !== null) {
        const atualizado = await apiRequest<Endereco>(`/enderecos/${enderecoEdicaoId}`, {
          method: "PATCH",
          body: {
            rua: enderecoRua.trim(),
            numero: enderecoNumero.trim(),
            cidade: enderecoCidade.trim(),
            cep: enderecoCep.trim(),
          },
        });

        setEnderecos((current) =>
          current.map((endereco) =>
            endereco.id === atualizado.id ? atualizado : endereco,
          ),
        );
        setFeedbackEndereco("Endereço atualizado com sucesso.");
        setEnderecoExpandidoId(atualizado.id);
      } else {
        const criado = await apiRequest<Endereco>("/enderecos", {
          method: "POST",
          body: {
            rua: enderecoRua.trim(),
            numero: enderecoNumero.trim(),
            cidade: enderecoCidade.trim(),
            cep: enderecoCep.trim(),
          },
        });

        setEnderecos((current) => [criado, ...current]);
        setFeedbackEndereco("Endereço cadastrado com sucesso.");
        setEnderecoExpandidoId(criado.id);
      }

      limparCamposEndereco();
    } catch (enderecoError) {
      setErroEndereco(
        enderecoError instanceof Error
          ? enderecoError.message
          : "Não foi possível salvar o endereço.",
      );
    } finally {
      setSalvandoEndereco(false);
    }
  };

  const excluirEndereco = async (endereco: Endereco) => {
    setExcluindoEnderecoId(endereco.id);
    setErroEndereco("");
    setFeedbackEndereco("");

    try {
      await apiRequest(`/enderecos/${endereco.id}`, {
        method: "DELETE",
      });

      setEnderecos((current) => current.filter((item) => item.id !== endereco.id));

      if (enderecoExpandidoId === endereco.id) {
        setEnderecoExpandidoId(null);
      }

      if (enderecoEdicaoId === endereco.id) {
        limparCamposEndereco();
      }

      setFeedbackEndereco("Endereço excluído com sucesso.");
    } catch (enderecoError) {
      setErroEndereco(
        enderecoError instanceof Error
          ? enderecoError.message
          : "Não foi possível excluir o endereço.",
      );
    } finally {
      setExcluindoEnderecoId(null);
      setEnderecoParaExcluir(null);
    }
  };

  const salvarTelefone = async (telefone: string | null) => {
    setSalvandoTelefone(true);
    setFeedbackTelefone("");
    setError("");

    try {
      const atualizado = await apiRequest<PerfilResponse>("/usuarios/perfil", {
        method: "PATCH",
        body: { telefone },
      });

      setPerfil(atualizado);
      setTelefoneEdicao(formatarTelefone(atualizado.telefone ?? ""));
      setFeedbackTelefone(
        telefone ? "Telefone atualizado com sucesso." : "Telefone removido com sucesso.",
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível atualizar o telefone.",
      );
    } finally {
      setSalvandoTelefone(false);
    }
  };

  if (!authenticated) {
    return <Navigate to="/login?redirect=/perfil" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Meu Perfil"
        titleIcon={<UserCircle2 className="h-5 w-5" />}
        subtitle="Acompanhe seus dados, pedidos e atividade na plataforma."
        containerClassName="max-w-5xl"
      >

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <p className="text-destructive">{error}</p>
          </div>
        ) : perfil ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Pedidos totais</p>
                <p className="text-2xl font-bold text-foreground">{pedidos.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Pedidos pendentes</p>
                <p className="text-2xl font-bold text-foreground">{pedidosPendentes}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Endereços cadastrados</p>
                <p className="text-2xl font-bold text-foreground">{enderecos.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Mensagens no atendimento</p>
                <p className="text-2xl font-bold text-foreground">{mensagens.length}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 self-start bg-card border border-border rounded-xl p-4 sm:p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">Dados da conta</h2>
                <div className="space-y-2">
                  <p className="text-foreground break-words"><strong>Nome:</strong> {perfil.nome || "Não informado"}</p>
                  <p className="text-foreground break-all"><strong>E-mail:</strong> {perfil.email}</p>
                  <p className="text-foreground break-words"><strong>Telefone:</strong> {perfil.telefone || "Não informado"}</p>
                  <p className="text-foreground"><strong>Tipo de usuário:</strong> {tipoUsuarioLabel}</p>
                  <p className="text-muted-foreground text-sm">ID: {perfil.id}</p>
                </div>

                <div className="mt-5 border border-border rounded-lg p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">Contato</p>
                  <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="tel"
                      value={telefoneEdicao}
                      onChange={(event) => handleTelefoneEdicaoChange(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="(00) 00000-0000"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={15}
                    />
                    <button
                      type="button"
                      onClick={() => void salvarTelefone(telefoneEdicao)}
                      disabled={salvandoTelefone}
                      className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                    >
                      {salvandoTelefone ? "Salvando..." : "Atualizar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void salvarTelefone(null)}
                      disabled={salvandoTelefone || !perfil.telefone}
                      className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted disabled:opacity-60"
                    >
                      Excluir número
                    </button>
                  </div>
                  {feedbackTelefone && <p className="text-sm text-primary mt-2">{feedbackTelefone}</p>}
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                  <Link
                    to="/encomenda"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Nova encomenda
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted"
                  >
                    Abrir atendimento
                  </Link>
                </div>

                <div className="mt-6 border border-border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Últimas encomendas</h3>
                    <Link
                      to="/minhas-encomendas"
                      className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                    >
                      Ver todas
                    </Link>
                  </div>

                  {pedidos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Você ainda não possui pedidos.</p>
                  ) : (
                    <ul className="space-y-2">
                      {pedidos.slice(0, 3).map((pedido) => (
                        <li key={pedido.id} className="border border-border rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              Pedido #{pedido.id}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                              {formatarStatusPedido(pedido.status).toLocaleUpperCase("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-2">
                            {pedido.produto?.nome || "Produto"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Quantidade: {pedido.quantidade} {pedido.unidade}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="self-start bg-card border border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-2">Gerenciar endereços</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Cadastre, edite e exclua seus endereços para usar na entrega.
                </p>

                {enderecos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {enderecos.map((endereco) => (
                      <li key={endereco.id} className="rounded-lg border border-border p-3">
                        <div className="space-y-1">
                          <p
                            className="text-sm text-foreground break-words"
                            title={previsualizarEndereco(endereco)}
                          >
                            {previsualizarEndereco(endereco)}
                          </p>
                          {enderecoExpandidoId === endereco.id && (
                            <p className="text-xs text-muted-foreground break-words">
                              {formatarEnderecoCompleto(endereco)}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEnderecoExpandidoId((current) =>
                                current === endereco.id ? null : endereco.id,
                              )
                            }
                            className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-border text-foreground text-xs font-semibold hover:bg-muted"
                          >
                            {enderecoExpandidoId === endereco.id ? "Ocultar" : "Detalhes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoEndereco(endereco)}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEnderecoParaExcluir(endereco)}
                            disabled={excluindoEnderecoId === endereco.id}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-border text-foreground text-xs font-semibold hover:bg-muted disabled:opacity-60"
                          >
                            {excluindoEnderecoId === endereco.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 border border-border rounded-lg p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    {enderecoEdicaoId !== null ? "Editar endereço" : "Novo endereço"}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={enderecoCep}
                      onChange={(event) => atualizarCepEConsultar(event.target.value)}
                      onBlur={(event) => {
                        const cepDigitado = event.currentTarget.value;
                        if (cepDigitado.replace(/\D/g, "").length === 8) {
                          void buscarEnderecoPorCep(cepDigitado);
                        }
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground sm:col-span-2"
                      placeholder="CEP"
                      inputMode="numeric"
                      maxLength={9}
                    />
                    <input
                      type="text"
                      value={enderecoRua}
                      onChange={(event) => setEnderecoRua(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground sm:col-span-2"
                      placeholder="Rua"
                    />
                    <input
                      type="text"
                      value={enderecoNumero}
                      onChange={(event) => setEnderecoNumero(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Número"
                    />
                    <input
                      type="text"
                      value={enderecoCidade}
                      onChange={(event) => setEnderecoCidade(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void salvarEndereco()}
                      disabled={salvandoEndereco}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                    >
                      {salvandoEndereco
                        ? "Salvando..."
                        : enderecoEdicaoId !== null
                          ? "Salvar alterações"
                          : "Cadastrar endereço"}
                    </button>
                    <button
                      type="button"
                      onClick={limparFormularioEndereco}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted"
                    >
                      {enderecoEdicaoId !== null ? "Cancelar edição" : "Limpar"}
                    </button>
                  </div>

                  {erroEndereco && <p className="text-sm text-destructive mt-3">{erroEndereco}</p>}
                  {loadingCepEndereco && (
                    <p className="text-sm text-muted-foreground mt-3">Buscando CEP...</p>
                  )}
                  {erroCepEndereco && (
                    <p className="text-sm text-destructive mt-3">{erroCepEndereco}</p>
                  )}
                  {feedbackEndereco && <p className="text-sm text-primary mt-3">{feedbackEndereco}</p>}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <p className="text-muted-foreground">Nenhum dado encontrado.</p>
          </div>
        )}

        <AlertDialog
          open={enderecoParaExcluir !== null}
          onOpenChange={(open) => {
            if (!open && excluindoEnderecoId === null) {
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
              <AlertDialogCancel disabled={excluindoEnderecoId !== null}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                disabled={excluindoEnderecoId !== null || enderecoParaExcluir === null}
                onClick={() => {
                  if (enderecoParaExcluir) {
                    void excluirEndereco(enderecoParaExcluir);
                  }
                }}
              >
                {excluindoEnderecoId !== null ? "Excluindo..." : "Confirmar exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageShell>
    </div>
  );
};

export default Perfil;