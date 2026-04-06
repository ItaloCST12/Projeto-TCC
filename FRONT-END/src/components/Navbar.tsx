import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  ShoppingCart,
  UserCircle2,
  X,
} from "lucide-react";
import { clearAuthSession, getAuthUser, isAuthenticated } from "@/lib/auth";
import { getCartTotalItems, subscribeToCartUpdates } from "@/lib/cart";
import logoAbacaxi from "@/assets/abacaxi-logo.svg";
import AccessibilityControls from "@/components/AccessibilityControls";
import NotificationBell from "@/components/NotificationBell";

const storeLinks = [
  { label: "Início", href: "/#inicio", icon: Home },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartTotalItems, setCartTotalItems] = useState(0);
  const location = useLocation();
  const loggedIn = isAuthenticated();
  const user = getAuthUser();
  const userId = user?.id ?? null;
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!loggedIn || isAdmin) {
      setCartTotalItems(0);
      return;
    }

    const syncCartCount = () => {
      setCartTotalItems(getCartTotalItems());
    };

    syncCartCount();
    return subscribeToCartUpdates(syncCartCount);
  }, [loggedIn, userId, isAdmin]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };

    mediaQuery.addEventListener("change", onDesktop);
    return () => {
      mediaQuery.removeEventListener("change", onDesktop);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const appLinks = loggedIn
    ? [
        { label: "Produtos", to: "/encomenda", icon: Package },
        ...(!isAdmin
          ? [{ label: "Minhas encomendas", to: "/minhas-encomendas", icon: CalendarDays }]
          : []),
        { label: "Atendimento", to: "/chat", icon: MessageCircle },
        ...(isAdmin ? [{ label: "Painel", to: "/painel-entregas", icon: BarChart3 }] : []),
      ]
    : [{ label: "Entrar", to: "/login", icon: LogIn }];

  const ctaTo = loggedIn ? "/encomenda" : "/login?redirect=/encomenda";
  const profileLink = isAdmin ? "/painel-entregas" : "/perfil";
  const mobileCartTo = "/carrinho";
  const cartBadgeCount = cartTotalItems > 99 ? "99+" : String(cartTotalItems);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  const mobileDrawer = (
    <div
      className={`lg:hidden fixed inset-0 z-[120] transition-opacity duration-300 ${
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!mobileOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Fechar menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className="absolute left-0 top-0 h-full w-[88vw] max-w-sm bg-background border-r border-border/80 shadow-2xl transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu lateral"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
            <a
              href="/#inicio"
              className="inline-flex items-center gap-2"
              onClick={() => setMobileOpen(false)}
            >
              <img src={logoAbacaxi} alt="Logo Fazenda Bispo" className="h-10 w-10 object-contain" />
              <span className="font-display text-lg font-bold text-foreground leading-none">
                Fazenda <span className="text-primary">Bispo</span>
              </span>
            </a>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-foreground"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-2">
              Navegação
            </p>

            <ul className="flex flex-col gap-1">
              {storeLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex w-full items-center gap-2 py-2.5 px-3 rounded-lg border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/20 hover:bg-muted transition-colors"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </a>
                </li>
              ))}

              {appLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-flex w-full items-center gap-2 py-2.5 px-3 rounded-lg border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/20 hover:bg-muted transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-border/70 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-2">
                Acessibilidade
              </p>
              <AccessibilityControls mobile />
            </div>

            {loggedIn ? (
              <div className="mt-4 border-t border-border/70 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-2">
                  Conta
                </p>
                <div className={`grid gap-2 ${isAdmin ? "grid-cols-1" : "grid-cols-2"}`}>
                  {!isAdmin && (
                    <Link
                      to="/carrinho"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-primary/25 bg-primary/5 text-foreground text-sm font-semibold"
                      onClick={() => setMobileOpen(false)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {cartTotalItems}
                    </Link>
                  )}
                  <Link
                    to={profileLink}
                    aria-label="Abrir perfil"
                    title="Perfil"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/80 bg-card text-foreground text-sm font-semibold hover:bg-muted transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserCircle2 className="h-4 w-4" />
                    Perfil
                  </Link>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <NotificationBell mobile />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t border-border/70 pt-4">
                <Link
                  to={ctaTo}
                  className="inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30"
                  onClick={() => setMobileOpen(false)}
                >
                  <Package className="h-4 w-4" />
                  Ver Produtos
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl shadow-sm">
      <div className="w-full h-20 px-4 lg:px-8">
        <div className="lg:hidden h-full flex items-center justify-between relative">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-foreground"
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

          <div className="flex items-center gap-2">
            {loggedIn && <NotificationBell mobile />}
            {!isAdmin && (
              <Link
                to={mobileCartTo}
                className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Carrinho"
                title="Carrinho"
                onClick={() => setMobileOpen(false)}
              >
                <ShoppingCart className="h-5 w-5" />
                {loggedIn && cartTotalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold leading-none shadow-sm">
                    {cartBadgeCount}
                  </span>
                )}
              </Link>
            )}
          </div>
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
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/95 px-2 py-1.5 shadow-sm">
              {storeLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/20 hover:bg-muted transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </a>
              ))}

              <span className="h-5 w-px bg-border mx-1" />

              {appLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent text-muted-foreground font-semibold hover:text-primary hover:border-primary/20 hover:bg-muted transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}

              {loggedIn && !isAdmin && (
                <Link
                  to="/carrinho"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/25 bg-primary/5 text-foreground text-sm font-semibold hover:bg-primary/10 transition-colors"
                >
                  <span className="relative inline-flex">
                    <ShoppingCart className="h-4 w-4" />
                    {cartTotalItems > 0 && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold leading-none">
                        {cartBadgeCount}
                      </span>
                    )}
                  </span>
                  Carrinho
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 justify-end">
            <AccessibilityControls />

            {loggedIn ? (
              <>
                <NotificationBell />
                <Link
                  to={profileLink}
                  aria-label="Abrir perfil"
                  title="Perfil"
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted transition-colors"
                >
                  <UserCircle2 className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/35 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/35 transition-all"
              >
                <Package className="h-4 w-4" />
                Ver Produtos
              </Link>
            )}
          </div>
        </div>
      </div>

    </nav>
      {mounted ? createPortal(mobileDrawer, document.body) : null}
    </>
  );
};

export default Navbar;
