import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import logoAbacaxi from "@/assets/abacaxi-logo.svg";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground pt-12 pb-7">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl border border-primary-foreground/15 bg-primary-foreground/5 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <img
                  src={logoAbacaxi}
                  alt="Logo Fazenda Bispo"
                  className="h-9 w-9 object-contain"
                />
                <span className="font-display text-xl font-bold text-primary-foreground">
                  Fazenda Bispo
                </span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
                Produção local de frutas com qualidade e cuidado em cada etapa. Faça sua encomenda
                com praticidade e receba atendimento rápido pelo WhatsApp.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center mt-4 rounded-xl border border-primary-foreground/25 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                Fazer pedido agora
              </Link>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.18em] text-primary-foreground/60">Navegação</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Início", href: "#inicio" },
                  { label: "Nossa História", href: "#historia" },
                  { label: "Produtos", href: "#produtos" },
                  { label: "Contato", href: "#contato" },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.18em] text-primary-foreground/60">Contato</h3>
              <ul className="mt-3 space-y-3 text-sm text-primary-foreground/85">
                <li className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <a
                    href="https://wa.me/5596991583439?text=Ol%C3%A1%21%20Gostaria%20de%20fazer%20um%20pedido."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-foreground transition-colors"
                  >
                    WhatsApp: (96) 99158-3439
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <a
                    href="mailto:contato@fazendabispo.com"
                    className="hover:text-primary-foreground transition-colors"
                  >
                    contato@fazendabispo.com
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>Zona Rural, Cidade - Estado</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock3 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>Atendimento: seg a sab, das 8h às 18h</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-primary-foreground/15 pt-5">
          <p className="text-primary-foreground/50 text-xs sm:text-sm">
            © 2026 Fazenda Bispo. Todos os direitos reservados.
          </p>
          <a
            href="#inicio"
            className="text-primary-foreground/70 text-xs sm:text-sm hover:text-primary-foreground transition-colors"
          >
            Voltar ao topo
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
