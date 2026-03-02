export type CartItem = {
  produtoId: number;
  nome: string;
  quantidade: number;
  unidade: string;
};

const CART_STORAGE_KEY = "fazenda-verde:cart";
const CART_UPDATED_EVENT = "fazenda-verde:cart-updated";
const MAX_QUANTIDADE_POR_ITEM = 1000;

const isBrowser = () => typeof window !== "undefined";

const normalizeQuantidade = (quantidade: number) => {
  if (!Number.isFinite(quantidade)) {
    return 1;
  }

  return Math.min(MAX_QUANTIDADE_POR_ITEM, Math.max(1, Math.floor(quantidade)));
};

const normalizeUnidade = (unidade: unknown) => {
  if (typeof unidade !== "string") {
    return "unidade";
  }

  const unidadeNormalizada = unidade.trim();
  return unidadeNormalizada.length > 0 ? unidadeNormalizada : "unidade";
};

const normalizeCart = (items: unknown): CartItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is CartItem => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const typedItem = item as CartItem;
      return (
        Number.isInteger(typedItem.produtoId) &&
        typedItem.produtoId > 0 &&
        typeof typedItem.nome === "string" &&
        typedItem.nome.trim().length > 0 &&
        Number.isFinite(typedItem.quantidade) &&
        typedItem.quantidade > 0
      );
    })
    .map((item) => ({
      produtoId: item.produtoId,
      nome: item.nome.trim(),
      quantidade: normalizeQuantidade(item.quantidade),
      unidade: normalizeUnidade((item as Partial<CartItem>).unidade),
    }));
};

const notifyCartUpdated = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

const writeCart = (items: CartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  notifyCartUpdated();
};

export const getCartItems = (): CartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return normalizeCart(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveCartItems = (items: CartItem[]) => {
  writeCart(normalizeCart(items));
};

export const addToCart = (
  produtoId: number,
  nome: string,
  quantidade = 1,
  unidade = "unidade",
) => {
  if (!Number.isInteger(produtoId) || produtoId <= 0 || !nome.trim()) {
    return;
  }

  const cart = getCartItems();
  const normalizedQtd = normalizeQuantidade(quantidade);
  const normalizedUnidade = normalizeUnidade(unidade);
  const existingIndex = cart.findIndex(
    (item) => item.produtoId === produtoId && item.unidade === normalizedUnidade,
  );

  if (existingIndex >= 0) {
    const existing = cart[existingIndex];
    cart[existingIndex] = {
      ...existing,
      quantidade: normalizeQuantidade(existing.quantidade + normalizedQtd),
    };
  } else {
    cart.push({
      produtoId,
      nome: nome.trim(),
      quantidade: normalizedQtd,
      unidade: normalizedUnidade,
    });
  }

  writeCart(cart);
};

export const removeFromCart = (produtoId: number, unidade?: string) => {
  const normalizedUnidade = unidade ? normalizeUnidade(unidade) : null;
  const cart = getCartItems().filter(
    (item) =>
      item.produtoId !== produtoId ||
      (normalizedUnidade !== null && item.unidade !== normalizedUnidade),
  );
  writeCart(cart);
};

export const updateCartItemQuantidade = (
  produtoId: number,
  unidade: string,
  quantidade: number,
) => {
  const normalizedQtd = normalizeQuantidade(quantidade);
  const normalizedUnidade = normalizeUnidade(unidade);
  const cart = getCartItems().map((item) =>
    item.produtoId === produtoId && item.unidade === normalizedUnidade
      ? {
          ...item,
          quantidade: normalizedQtd,
        }
      : item,
  );

  writeCart(cart);
};

export const clearCart = () => {
  writeCart([]);
};

export const getCartTotalItems = () => {
  return getCartItems().length;
};

export const subscribeToCartUpdates = (callback: () => void) => {
  if (!isBrowser()) {
    return () => undefined;
  }

  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};