import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Home,
  LogIn,
  MessageCircle,
  Package,
  UserCircle2,
} from "lucide-react";
import { getAuthUser, isAuthenticated } from "@/lib/auth";

type BottomLink = {
  label: string;
  to: string;
  icon: typeof Home;
};

const isLinkActive = (pathname: string, to: string) => {
  if (to === "/") {
    return pathname === "/";
  }

  return pathname === to || pathname.startsWith(`${to}/`);
};

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const loggedIn = isAuthenticated();
  const user = getAuthUser();
  const isAdmin = user?.role === "ADMIN";

  const links: BottomLink[] = loggedIn
    ? [
        { label: "Início", to: "/", icon: Home },
        { label: "Produtos", to: "/encomenda", icon: Package },
        ...(isAdmin
          ? [{ label: "Painel", to: "/painel-entregas", icon: BarChart3 }]
          : [{ label: "Pedidos", to: "/minhas-encomendas", icon: CalendarDays }]),
        { label: "Chat", to: "/chat", icon: MessageCircle },
        ...(!isAdmin ? [{ label: "Perfil", to: "/perfil", icon: UserCircle2 }] : []),
      ]
    : [
        { label: "Início", to: "/", icon: Home },
        { label: "Produtos", to: "/encomenda", icon: Package },
        { label: "Entrar", to: "/login", icon: LogIn },
      ];

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 top-auto z-[80] border-t border-border/90 bg-background shadow-[0_-8px_22px_-16px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={{ bottom: 0 }}
      aria-label="Navegação inferior"
    >
      <ul
        className={`grid gap-1 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] ${
          links.length === 5 ? "grid-cols-5" : links.length === 4 ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {links.map((link) => {
          const isActive = isLinkActive(pathname, link.to);

          return (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`inline-flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;