export type AuthUser = {
  id: number;
  nome?: string | null;
  email: string;
  telefone?: string | null;
  role?: string;
};

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Silencia erro de storage indisponivel para nao quebrar o app.
  }
};

const removeStorage = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Silencia erro de storage indisponivel para nao quebrar o app.
  }
};

export const getAuthToken = () => readStorage(TOKEN_KEY);

export const setAuthSession = (token: string, user: AuthUser) => {
  writeStorage(TOKEN_KEY, token);
  writeStorage(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  removeStorage(TOKEN_KEY);
  removeStorage(USER_KEY);
};

export const getAuthUser = (): AuthUser | null => {
  const raw = readStorage(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
};

export const isAuthenticated = () => Boolean(getAuthToken());