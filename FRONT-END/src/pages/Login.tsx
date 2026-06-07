import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, UserCircle2, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import { mergeGuestCartIntoCurrentUser } from "@/lib/cart";
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

const PASSWORD_LENGTH = 8;

const PASSWORD_POLICY_MESSAGE =
  "A senha deve ter exatamente 8 caracteres e incluir letra maiúscula, minúscula, número e caractere especial.";

const requisitosSenha = (valor: string) => [
  { label: `Exatamente ${PASSWORD_LENGTH} caracteres`, ok: valor.length === PASSWORD_LENGTH },
  { label: "Uma letra maiúscula", ok: /[A-Z]/.test(valor) },
  { label: "Uma letra minúscula", ok: /[a-z]/.test(valor) },
  { label: "Um número", ok: /[0-9]/.test(valor) },
  { label: "Um caractere especial", ok: /[^A-Za-z0-9]/.test(valor) },
];

const senhaAtendePolitica = (valor: string) =>
  requisitosSenha(valor).every((item) => item.ok);

const ChecklistSenha = ({ valor }: { valor: string }) => (
  <ul className="mt-2 space-y-1">
    {requisitosSenha(valor).map((requisito) => (
      <li
        key={requisito.label}
        className={`flex items-center gap-1.5 text-xs ${
          requisito.ok ? "text-emerald-600" : "text-muted-foreground"
        }`}
      >
        {requisito.ok ? (
          <Check className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <X className="h-3.5 w-3.5 shrink-0" />
        )}
        {requisito.label}
      </li>
    ))}
  </ul>
);

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
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          setError("Informe um e-mail válido.");
          return;
        }

        if (mode === "forgot") {
          if (forgotStep === "request") {
            const response = await apiRequest<ForgotPasswordRequestResponse>("/auth/forgot-password/request", {
              method: "POST",
              body: { email: normalizedEmail },
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

          if (codigoRedefinicao.trim().length !== 8) {
            setError("Informe um código de redefinição com 8 dígitos.");
            return;
          }

          if (!novaSenha || !confirmarNovaSenha) {
            setError("Preencha a nova senha e a confirmação.");
            return;
          }

          if (!senhaAtendePolitica(novaSenha)) {
            setError(PASSWORD_POLICY_MESSAGE);
            return;
          }

          if (novaSenha !== confirmarNovaSenha) {
            setError("A confirmação de senha não confere.");
            return;
          }

          await apiRequest("/auth/forgot-password", {
            method: "POST",
            body: {
              email: normalizedEmail,
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
          if (!senhaAtendePolitica(senha)) {
            setError(PASSWORD_POLICY_MESSAGE);
            return;
          }

          await apiRequest("/auth/register", {
            method: "POST",
            body: {
              nome,
              telefone,
              email: normalizedEmail,
              senha,
            },
          });
        }

        const loginResponse = await apiRequest<LoginResponse>("/auth/login", {
          method: "POST",
          body: {
            email: normalizedEmail,
            senha,
          },
        });

        setAuthSession(loginResponse.token, loginResponse.usuario);
        if (loginResponse.usuario.role === "ADMIN") {
          navigate("/painel-entregas", { replace: true });
          return;
        }

        // Cliente: traz para a conta os itens adicionados como visitante.
        mergeGuestCartIntoCurrentUser();
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
    setSenha(valor.slice(0, PASSWORD_LENGTH));
  };

  const handleNovaSenhaChange = (valor: string) => {
    setNovaSenha(valor.slice(0, PASSWORD_LENGTH));
  };

  const handleConfirmarNovaSenhaChange = (valor: string) => {
    setConfirmarNovaSenha(valor.slice(0, PASSWORD_LENGTH));
  };

  const handleCodigoRedefinicaoChange = (valor: string) => {
    setCodigoRedefinicao(valor.replace(/\D/g, "").slice(0, 8));
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
        titleIcon={<UserCircle2 className="h-5 w-5" />}
        subtitle="Acesse sua conta ou crie um cadastro em poucos passos."
        containerClassName="max-w-3xl"
      >
        <div className="flex items-center justify-center">
          <div className="w-full rounded-2xl bg-card border border-border/80 shadow-sm p-6 sm:p-8">
            <div className="mb-5">
              <h3 className="font-display text-xl font-semibold text-foreground">
                {mode === "register" ? "Criar conta" : mode === "forgot" ? "Recuperar acesso" : "Entrar"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "register"
                  ? "Cadastre-se e continue sua experiência na plataforma."
                  : mode === "forgot"
                    ? "Solicite um código e redefina sua senha com segurança."
                    : "Use suas credenciais para acessar sua conta."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/80 bg-muted/55 p-1.5 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                  mode === "login" || mode === "forgot"
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                  mode === "register"
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
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
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
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
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
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
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
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
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 pr-10 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder={mode === "register" ? "Crie uma senha forte" : "Digite sua senha"}
                    inputMode="text"
                    maxLength={PASSWORD_LENGTH}
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
                {mode === "register" && <ChecklistSenha valor={senha} />}
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
                      className="text-xs font-semibold text-primary hover:opacity-80"
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
                    <p className="text-sm text-muted-foreground rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                      Informe seu e-mail para solicitar um código temporário de 8 dígitos.
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
                          onChange={(event) => handleCodigoRedefinicaoChange(event.target.value)}
                          className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                          placeholder="Digite o código de 8 dígitos"
                          inputMode="numeric"
                          maxLength={8}
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
                            className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 pr-10 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                            placeholder="Crie uma senha forte"
                            inputMode="text"
                            maxLength={PASSWORD_LENGTH}
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
                        <ChecklistSenha valor={novaSenha} />
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
                          className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
                          placeholder="Repita a nova senha"
                          inputMode="text"
                          maxLength={PASSWORD_LENGTH}
                          required
                        />
                        {confirmarNovaSenha.length > 0 && confirmarNovaSenha !== novaSenha && (
                          <p className="text-xs text-destructive mt-1">As senhas não conferem.</p>
                        )}
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
                className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
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