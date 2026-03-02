import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";

type LoginResponse = {
  token: string;
  usuario: {
    id: number;
    nome?: string | null;
    email: string;
    telefone?: string | null;
    role?: string;
  };
};

type ForgotPasswordRequestResponse = {
  message: string;
  resetToken?: string;
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [codigoRedefinicao, setCodigoRedefinicao] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect") || "/encomenda";
  }, [location.search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const submit = async () => {
      try {
        if (mode === "forgot") {
          if (forgotStep === "request") {
            const response = await apiRequest<ForgotPasswordRequestResponse>("/auth/forgot-password/request", {
              method: "POST",
              body: { email },
            });

            setForgotStep("reset");
            if (response.resetToken) {
              setSuccess(
                `${response.message} Código de teste (ambiente de desenvolvimento): ${response.resetToken}`,
              );
            } else {
              setSuccess(response.message);
            }
            return;
          }

          if (!codigoRedefinicao.trim()) {
            setError("Informe o código de redefinição.");
            return;
          }

          if (!novaSenha || !confirmarNovaSenha) {
            setError("Preencha a nova senha e a confirmação.");
            return;
          }

          if (novaSenha !== confirmarNovaSenha) {
            setError("A confirmação de senha não confere.");
            return;
          }

          await apiRequest("/auth/forgot-password", {
            method: "POST",
            body: {
              email,
              codigo: codigoRedefinicao,
              novaSenha,
            },
          });

          setNovaSenha("");
          setConfirmarNovaSenha("");
          setCodigoRedefinicao("");
          setForgotStep("request");
          setMode("login");
          setSuccess("Senha redefinida com sucesso. Faça login com a nova senha.");
          return;
        }

        if (mode === "register") {
          await apiRequest("/auth/register", {
            method: "POST",
            body: {
              nome,
              telefone,
              email,
              senha,
            },
          });
        }

        const loginResponse = await apiRequest<LoginResponse>("/auth/login", {
          method: "POST",
          body: {
            email,
            senha,
          },
        });

        setAuthSession(loginResponse.token, loginResponse.usuario);
        if (loginResponse.usuario.role === "ADMIN") {
          navigate("/painel-entregas", { replace: true });
          return;
        }

        navigate(redirectTo, { replace: true });
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Não foi possível autenticar agora.",
        );
      } finally {
        setLoading(false);
      }
    };

    void submit();
  };

  const handleSenhaChange = (valor: string) => {
    const senhaAlfanumerica = valor.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    setSenha(senhaAlfanumerica);
  };

  const handleNovaSenhaChange = (valor: string) => {
    const senhaAlfanumerica = valor.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    setNovaSenha(senhaAlfanumerica);
  };

  const handleConfirmarNovaSenhaChange = (valor: string) => {
    const senhaAlfanumerica = valor.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    setConfirmarNovaSenha(senhaAlfanumerica);
  };

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

  const handleTelefoneChange = (valor: string) => {
    setTelefone(formatarTelefone(valor));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageShell
        title="Entrar"
        subtitle="Faça login para continuar sua experiência na plataforma."
        containerClassName="max-w-3xl"
      >
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 sm:p-8">

            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === "login" || mode === "forgot"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === "register"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Cadastro
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-foreground mb-1">
                    Nome
                  </label>
                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              )}

              {mode === "register" && (
                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-foreground mb-1">
                    Telefone para contato
                  </label>
                  <input
                    id="telefone"
                    type="tel"
                    value={telefone}
                    onChange={(event) => handleTelefoneChange(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={15}
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  placeholder="seuemail@exemplo.com"
                  required
                />
              </div>

              {(mode === "login" || mode === "register") && (
              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-foreground mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(event) => handleSenhaChange(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-foreground outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Até 8 caracteres"
                    inputMode="text"
                    pattern="[A-Za-z0-9]*"
                    maxLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">A senha deve ter até 8 caracteres.</p>
                {mode === "login" && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotStep("request");
                        setError("");
                        setSuccess("");
                        setCodigoRedefinicao("");
                        setNovaSenha("");
                        setConfirmarNovaSenha("");
                      }}
                      className="text-xs font-medium text-primary hover:opacity-80"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>
              )}

              {mode === "forgot" && (
                <>
                  {forgotStep === "request" ? (
                    <p className="text-sm text-muted-foreground">
                      Informe seu e-mail para solicitar um código temporário de redefinição.
                    </p>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="codigoRedefinicao" className="block text-sm font-medium text-foreground mb-1">
                          Código de redefinição
                        </label>
                        <input
                          id="codigoRedefinicao"
                          type="text"
                          value={codigoRedefinicao}
                          onChange={(event) => setCodigoRedefinicao(event.target.value.trim())}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Cole o código recebido"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="novaSenha" className="block text-sm font-medium text-foreground mb-1">
                          Nova senha
                        </label>
                        <div className="relative">
                          <input
                            id="novaSenha"
                            type={mostrarNovaSenha ? "text" : "password"}
                            value={novaSenha}
                            onChange={(event) => handleNovaSenhaChange(event.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-foreground outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Até 8 caracteres"
                            inputMode="text"
                            pattern="[A-Za-z0-9]*"
                            maxLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarNovaSenha((current) => !current)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                            title={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirmarNovaSenha" className="block text-sm font-medium text-foreground mb-1">
                          Confirmar nova senha
                        </label>
                        <input
                          id="confirmarNovaSenha"
                          type={mostrarNovaSenha ? "text" : "password"}
                          value={confirmarNovaSenha}
                          onChange={(event) => handleConfirmarNovaSenhaChange(event.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Repita a nova senha"
                          inputMode="text"
                          pattern="[A-Za-z0-9]*"
                          maxLength={8}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">A senha deve ter até 8 caracteres.</p>
                      </div>
                    </>
                  )}

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotStep("request");
                        setCodigoRedefinicao("");
                        setNovaSenha("");
                        setConfirmarNovaSenha("");
                        setError("");
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Voltar para login
                    </button>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {loading
                  ? "Enviando..."
                  : mode === "forgot"
                    ? forgotStep === "request"
                      ? "Solicitar código"
                      : "Redefinir senha"
                    : mode === "login"
                    ? "Entrar e continuar"
                    : "Cadastrar, entrar e continuar"}
              </button>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
            </form>
          </div>
        </div>
      </PageShell>
    </div>
  );
};

export default Login;