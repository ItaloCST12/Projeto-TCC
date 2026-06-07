import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITULO_BASE = "Fazenda Bispo";

const TITULOS_POR_ROTA: Record<string, string> = {
  "/": "Fazenda Bispo · Frutas frescas com entrega",
  "/login": "Entrar · Fazenda Bispo",
  "/encomenda": "Produtos · Fazenda Bispo",
  "/carrinho": "Carrinho · Fazenda Bispo",
  "/minhas-encomendas": "Minhas encomendas · Fazenda Bispo",
  "/perfil": "Meu perfil · Fazenda Bispo",
  "/chat": "Atendimento · Fazenda Bispo",
  "/painel-entregas": "Painel · Fazenda Bispo",
  "/politicas": "Políticas · Fazenda Bispo",
};

/**
 * Efeitos globais por rota:
 * - Rola a página para o topo ao trocar de rota (exceto quando há âncora/hash).
 * - Atualiza o título da aba do navegador conforme a página atual.
 */
const RouteMeta = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname, hash]);

  useEffect(() => {
    document.title = TITULOS_POR_ROTA[pathname] ?? TITULO_BASE;
  }, [pathname]);

  return null;
};

export default RouteMeta;
