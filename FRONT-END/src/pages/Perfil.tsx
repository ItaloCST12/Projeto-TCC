import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { apiRequest } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

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
  const [loading, setLoading] = useState(true);
  const [telefoneEdicao, setTelefoneEdicao] = useState("");
  const [salvandoTelefone, setSalvandoTelefone] = useState(false);
  const [feedbackTelefone, setFeedbackTelefone] = useState("");
  const [error, setError] = useState("");

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
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-6">
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
              </div>

              <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-foreground mb-3">Meus endereços</h3>
                {enderecos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {enderecos.slice(0, 3).map((endereco) => (
                      <li key={endereco.id} className="rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() =>
                            setEnderecoExpandidoId((current) =>
                              current === endereco.id ? null : endereco.id,
                            )
                          }
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                        >
                          <p className="text-sm text-foreground break-words" title={previsualizarEndereco(endereco)}>
                            {previsualizarEndereco(endereco)}
                          </p>
                          {enderecoExpandidoId === endereco.id && (
                            <p className="mt-1 text-xs text-muted-foreground break-words">
                              {formatarEnderecoCompleto(endereco)}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h3 className="font-semibold text-foreground">Últimas encomendas</h3>
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
                <ul className="space-y-3">
                  {pedidos.slice(0, 5).map((pedido) => (
                    <li key={pedido.id} className="border border-border rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Pedido #{pedido.id}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                          {pedido.status}
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
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <p className="text-muted-foreground">Nenhum dado encontrado.</p>
          </div>
        )}
      </PageShell>
    </div>
  );
};

export default Perfil;