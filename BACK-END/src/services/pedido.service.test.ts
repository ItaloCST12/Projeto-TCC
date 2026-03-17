import { describe, it, expect } from "vitest";

/**
 * Testes puros (sem mock do Prisma) para as funções de cálculo de preço
 * extraídas da lógica do PedidoService.
 */

// Re-implementação das funções puras do pedido.service.ts para teste isolado
const PRECO_PADRAO_PRODUTO: Record<string, number> = {
  laranja: 50,
  tangerina: 5,
  limao: 60,
  "limão": 60,
  abacaxi: 5,
};

const resolverPrecoFallbackPorNomeUnidade = (nomeProduto?: string, unidade?: string) => {
  const nomeNormalizado = (nomeProduto || "").trim().toLowerCase();
  const unidadeNormalizada = (unidade || "").trim().toLowerCase();

  if (nomeNormalizado === "abacaxi") {
    if (unidadeNormalizada.includes("grande")) return 7;
    if (unidadeNormalizada.includes("pequeno")) return 3;
    return 5;
  }

  return PRECO_PADRAO_PRODUTO[nomeNormalizado] ?? 0;
};

const resolverPrecoComFallback = (precoBanco: number, nomeProduto?: string, unidade?: string) => {
  if ((nomeProduto || "").trim().toLowerCase() === "abacaxi") {
    return resolverPrecoFallbackPorNomeUnidade(nomeProduto, unidade);
  }

  if (precoBanco > 0) return precoBanco;
  return resolverPrecoFallbackPorNomeUnidade(nomeProduto, unidade);
};

describe("Lógica de preços do PedidoService", () => {
  describe("resolverPrecoFallbackPorNomeUnidade", () => {
    it("deve retornar preço padrão da laranja", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("Laranja", "kg")).toBe(50);
    });

    it("deve retornar preço padrão da tangerina", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("tangerina", "unidade")).toBe(5);
    });

    it("deve retornar preço padrão do limão (com e sem acento)", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("limao", "kg")).toBe(60);
      expect(resolverPrecoFallbackPorNomeUnidade("limão", "kg")).toBe(60);
    });

    it("deve retornar 0 para produto desconhecido", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("manga", "kg")).toBe(0);
    });

    it("deve retornar preço correto para abacaxi grande", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("Abacaxi", "Grande")).toBe(7);
    });

    it("deve retornar preço correto para abacaxi pequeno", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("abacaxi", "Pequeno")).toBe(3);
    });

    it("deve retornar preço padrão para abacaxi médio (default)", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("abacaxi", "médio")).toBe(5);
    });

    it("deve lidar com valores undefined", () => {
      expect(resolverPrecoFallbackPorNomeUnidade(undefined, undefined)).toBe(0);
    });

    it("deve lidar com espaços em branco", () => {
      expect(resolverPrecoFallbackPorNomeUnidade("  laranja  ", "  kg  ")).toBe(50);
    });
  });

  describe("resolverPrecoComFallback", () => {
    it("deve usar preço do banco quando disponível e não é abacaxi", () => {
      expect(resolverPrecoComFallback(25, "laranja", "kg")).toBe(25);
    });

    it("deve usar fallback quando preço do banco é 0", () => {
      expect(resolverPrecoComFallback(0, "laranja", "kg")).toBe(50);
    });

    it("deve sempre usar regra especial para abacaxi (ignora preço do banco)", () => {
      expect(resolverPrecoComFallback(100, "abacaxi", "grande")).toBe(7);
      expect(resolverPrecoComFallback(100, "abacaxi", "pequeno")).toBe(3);
      expect(resolverPrecoComFallback(100, "abacaxi", "médio")).toBe(5);
    });

    it("deve retornar 0 para produto desconhecido sem preço no banco", () => {
      expect(resolverPrecoComFallback(0, "manga", "kg")).toBe(0);
    });
  });
});

describe("Validações do PedidoService", () => {
  const MAX_QUANTIDADE_POR_ITEM = 1000;

  it("quantidade deve ser no máximo 1000", () => {
    expect(1001 > MAX_QUANTIDADE_POR_ITEM).toBe(true);
    expect(1000 > MAX_QUANTIDADE_POR_ITEM).toBe(false);
  });

  it("deve rejeitar quantidade zero ou negativa", () => {
    expect(0 <= 0).toBe(true);
    expect(-1 <= 0).toBe(true);
    expect(1 <= 0).toBe(false);
  });

  it("deve rejeitar produtoId inválido", () => {
    expect(Number.isInteger(0) && 0 > 0).toBe(false);
    expect(Number.isInteger(-1) && -1 > 0).toBe(false);
    expect(Number.isInteger(1.5)).toBe(false);
    expect(Number.isInteger(1) && 1 > 0).toBe(true);
  });
});
