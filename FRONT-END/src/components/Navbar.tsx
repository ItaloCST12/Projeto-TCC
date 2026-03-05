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
      <div className="container mx-auto h-20 px-4">
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
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
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

        <div className="hidden lg:flex h-full items-center justify-between">
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

          <div className="flex items-center gap-6">
          <ul className="flex items-center gap-5">
            {storeLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-muted-foreground font-medium hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <span className="h-5 w-px bg-border" />

          <ul className="flex items-center gap-5">
            {appLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-muted-foreground font-medium hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {loggedIn && (
            <Link
              to="/carrinho"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Carrinho
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-full bg-primary text-primary-foreground text-xs">
                {cartTotalItems}
              </span>
            </Link>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <AccessibilityControls />

          {loggedIn ? (
            <>
              <Link
                to={profileLink}
                aria-label="Abrir perfil"
                title="Perfil"
                className="inline-flex items-center justify-center h-8 w-9 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
              >
                <UserCircle2 className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </>
          ) : (
            <Link
              to={ctaTo}
              className="inline-flex items-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
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

          <ul className="flex flex-col gap-2">
            {storeLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-muted-foreground font-medium hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <ul className="flex flex-col gap-2">
            {appLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="block py-2 text-muted-foreground font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {loggedIn ? (
              <>
                <li>
                  <Link
                    to="/carrinho"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold"
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
                  className="inline-flex items-center justify-center h-8 w-9 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
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
                  className="inline-flex items-center px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
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
