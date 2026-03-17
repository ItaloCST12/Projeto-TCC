import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Menu, ShoppingCart, UserCircle2, X } from "lucide-react";
import { clearAuthSession, getAuthUser, isAuthenticated } from "@/lib/auth";
import { getCartTotalItems, subscribeToCartUpdates } from "@/lib/cart";
import logoAbacaxi from "@/assets/abacaxi-logo.svg";
import AccessibilityControls from "@/components/AccessibilityControls";

const storeLinks = [
  { label: "Início", href: "/#inicio" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartTotalItems, setCartTotalItems] = useState(0);
  const loggedIn = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!loggedIn) {
      setCartTotalItems(0);
      return;
    }

    const syncCartCount = () => {
      setCartTotalItems(getCartTotalItems());
    };

    syncCartCount();
    return subscribeToCartUpdates(syncCartCount);
  }, [loggedIn]);

  const appLinks = loggedIn
    ? [
        { label: "Produtos", to: "/encomenda" },
        ...(!isAdmin ? [{ label: "Minhas encomendas", to: "/minhas-encomendas" }] : []),
        { label: "Atendimento", to: "/chat" },
        ...(isAdmin ? [{ label: "Painel", to: "/painel-entregas" }] : []),
      ]
    : [{ label: "Entrar", to: "/login" }];

  const ctaTo = loggedIn ? "/encomenda" : "/login?redirect=/encomenda";
  const profileLink = isAdmin ? "/painel-entregas" : "/perfil";
  const mobileCartTo = loggedIn ? "/carrinho" : "/login?redirect=/carrinho";

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="w-full h-20 px-4 lg:px-8">
        <div className="lg:hidden h-full flex items-center justify-between relative">
          <button
            className="text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <a
            href="/#inicio"
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
            onClick={() => setMobileOpen(false)}
          >
            <img
              src={logoAbacaxi}
              alt="Logo Fazenda Bispo"
              className="h-11 w-11 object-contain"
            />
          </a>

          <Link
            to={mobileCartTo}
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border-2 border-primary/30 bg-background text-foreground hover:bg-accent/15 transition-colors"
            aria-label="Carrinho"
            title="Carrinho"
            onClick={() => setMobileOpen(false)}
          >
            <ShoppingCart className="h-5 w-5" />
            {loggedIn && cartTotalItems > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none">
                {cartTotalItems}
              </span>
            )}
          </Link>
        </div>

        <div className="hidden lg:grid h-full grid-cols-[auto_1fr_auto] items-center gap-6">
          <a href="/#inicio" className="flex items-center gap-3 group">
            <img
              src={logoAbacaxi}
              alt="Logo Fazenda Bispo"
              className="h-12 w-12 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display text-xl font-bold text-foreground leading-none whitespace-nowrap">
              Fazenda <span className="text-primary">Bispo</span>
            </span>
          </a>

          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-2 py-1">
              {storeLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/25 hover:bg-accent/10 transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <span className="h-5 w-px bg-border mx-1" />

              {appLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/25 hover:bg-accent/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              {loggedIn && (
                <Link
                  to="/carrinho"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary/30 text-foreground text-sm font-semibold hover:bg-accent/15 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-full bg-primary text-primary-foreground text-xs">
                    {cartTotalItems}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 justify-end">
            <AccessibilityControls />

            {loggedIn ? (
              <>
                <Link
                  to={profileLink}
                  aria-label="Abrir perfil"
                  title="Perfil"
                  className="inline-flex items-center justify-center h-8 w-9 rounded-lg border-2 border-primary/25 bg-background text-foreground hover:bg-accent/15 transition-colors"
                >
                  <UserCircle2 className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/35 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <Link
                to={ctaTo}
                className="inline-flex items-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/35 transition-all"
              >
                Ver Produtos
              </Link>
            )}
          </div>
        </div>
      </div>

      <div
        className={`lg:hidden bg-background border-b border-border px-4 overflow-hidden transition-all duration-300 ease-out ${
          mobileOpen
            ? "max-h-[70vh] opacity-100 pb-4"
            : "max-h-0 opacity-0 pb-0 pointer-events-none"
        }`}
      >
        <div className="pt-2">
          <AccessibilityControls mobile />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 py-1">
            Navegação
          </p>

          <ul className="flex flex-col gap-1">
            {storeLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-3 rounded-md border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/25 hover:bg-accent/10 transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <ul className="flex flex-col gap-1 mt-2 pt-2 border-t border-border/70">
            {appLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block py-2 px-3 rounded-md border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/25 hover:bg-accent/10 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {loggedIn ? (
              <>
                <li className="pt-1">
                  <Link
                    to="/carrinho"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary/30 text-foreground text-sm font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Carrinho ({cartTotalItems})
                  </Link>
                </li>
                <li className="pt-1 flex items-center gap-2">
                <Link
                  to={profileLink}
                  aria-label="Abrir perfil"
                  title="Perfil"
                  className="inline-flex items-center justify-center h-8 w-9 rounded-lg border-2 border-primary/25 bg-background text-foreground hover:bg-accent/15 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserCircle2 className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  to={ctaTo}
                  className="inline-flex items-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30"
                  onClick={() => setMobileOpen(false)}
                >
                  Ver Produtos
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
