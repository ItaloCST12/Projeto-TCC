import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import logoAbacaxi from "@/assets/abacaxi-logo.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHashLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault();

    const [targetPath, targetHashSegment] = target.split("#");
    const finalPath = targetPath || "/";
    const elementId = targetHashSegment ?? "";

    const scrollToSection = (id: string) => {
      const targetElement = document.getElementById(id);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `${finalPath}#${id}`);
      }
    };

    // Já está na página de destino: apenas rola até a seção.
    if (location.pathname === finalPath) {
      if (elementId) {
        scrollToSection(elementId);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Navega via SPA; a página de destino rola até a seção ao montar (ver Index.tsx).
    navigate(`${finalPath}${elementId ? `#${elementId}` : ""}`);
  };

  return (
    <footer className="site-footer bg-foreground text-white dark:bg-background pt-12 pb-7">
      <div className="container mx-auto px-4">
        <div className="site-footer-panel rounded-3xl border border-white/20 bg-white/5 p-6 sm:p-8 dark:border-white/15 dark:bg-white/[0.04]">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <img
                  src={logoAbacaxi}
                  alt="Logo Fazenda Bispo"
                  className="h-9 w-9 object-contain"
                />
                <span className="font-display text-xl font-bold text-white">
                  Fazenda Bispo
                </span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
                Produção local de frutas com qualidade e cuidado em cada etapa. Faça sua encomenda
                com praticidade e receba atendimento rápido pelo WhatsApp.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Fazer pedido agora
                </Link>
                <Link
                  to="/politicas"
                  className="inline-flex items-center rounded-xl border border-primary/70 bg-primary/20 px-4 py-2 text-sm font-semibold text-white hover:bg-primary/30 transition-colors"
                >
                  Políticas de pagamento e entrega
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.18em] text-white/70">Navegação</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Início", to: "/#inicio" },
                  { label: "Nossa História", to: "/#historia" },
                  { label: "Produtos", to: "/#produtos" },
                  { label: "Contato", to: "/#contato" },
                ].map((item) => (
                  <li key={item.to}>
                    <a
                      href={item.to}
                      onClick={(event) => handleHashLinkClick(event, item.to)}
                      className="text-sm text-white/85 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.18em] text-white/70">Contato</h3>
              <ul className="mt-3 space-y-3 text-sm text-white/90">
                <li className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <a
                    href="https://wa.me/5596991583439?text=Ol%C3%A1%21%20Gostaria%20de%20fazer%20um%20pedido."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    WhatsApp: (96) 99158-3439
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <a
                    href="mailto:contato@fazendabispo.com"
                    className="hover:text-white transition-colors"
                  >
                    contato@fazendabispo.com
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>R. Pastor Sozinho, 3071 - Provedor, Santana - AP, 68927-078</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock3 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>Atendimento: seg a sáb, das 8h às 18h</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/15 pt-5">
          <p className="text-white/65 text-xs sm:text-sm">
            © 2026 Fazenda Bispo. Todos os direitos reservados.
          </p>
          <a
            href="/#inicio"
            onClick={(event) => handleHashLinkClick(event, "/#inicio")}
            className="text-white/80 text-xs sm:text-sm hover:text-white transition-colors"
          >
            Voltar ao topo
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
