import logoAbacaxi from "@/assets/abacaxi-logo.svg";

const Footer = () => {
  return (
    <footer className="bg-foreground py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img
              src={logoAbacaxi}
              alt="Logo Fazenda Bispo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-display text-lg font-bold text-primary-foreground">
              Fazenda Bispo
            </span>
          </div>

          <ul className="flex gap-6">
            {[
              { label: "Início", href: "#inicio" },
              { label: "Nossa História", href: "#historia" },
              { label: "Produtos", href: "#produtos" },
              { label: "Contato", href: "#contato" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-primary-foreground/70 text-sm hover:text-primary-foreground transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-primary-foreground/50 text-sm">
            © 2026 Fazenda Bispo. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
