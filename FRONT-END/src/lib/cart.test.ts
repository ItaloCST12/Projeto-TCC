import { beforeEach, describe, expect, it } from "vitest";
import { clearAuthSession, setAuthSession } from "@/lib/auth";
import { addToCart, getCartItems, getCartTotalItems } from "@/lib/cart";

const USER_A = {
  id: 101,
  nome: "Usuario A",
  email: "usuario.a@teste.com",
  role: "USER",
};

const USER_B = {
  id: 202,
  nome: "Usuario B",
  email: "usuario.b@teste.com",
  role: "USER",
};

describe("cart storage by user", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAuthSession();
  });

  it("mantem itens isolados entre usuarios", () => {
    setAuthSession("token-a", USER_A);
    addToCart(1, "Laranja", 2, "caixa");
    expect(getCartTotalItems()).toBe(1);

    setAuthSession("token-b", USER_B);
    expect(getCartItems()).toEqual([]);

    addToCart(2, "Abacaxi", 1, "unidade");
    expect(getCartTotalItems()).toBe(1);

    setAuthSession("token-a", USER_A);
    const cartA = getCartItems();
    expect(cartA).toHaveLength(1);
    expect(cartA[0]?.produtoId).toBe(1);
  });

  it("limpa a chave legada compartilhada para evitar vazamento", () => {
    window.localStorage.setItem(
      "fazenda-verde:cart",
      JSON.stringify([{ produtoId: 7, nome: "Item antigo", quantidade: 1, unidade: "unidade" }]),
    );

    setAuthSession("token-a", USER_A);

    expect(getCartItems()).toEqual([]);
    expect(window.localStorage.getItem("fazenda-verde:cart")).toBeNull();
  });
});