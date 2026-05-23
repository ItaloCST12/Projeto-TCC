export type AuthUser = {
  id: number;
  nome?: string | null;
  email: string;
  telefone?: string | null;
  role?: string;
};

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
const AUTH_SESSION_CHANGE_EVENT = "auth-session-change";

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

const notifyAuthSessionChange = () => {
  try {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
  } catch {
    // Silencia erro para evitar quebra em ambientes sem window.
  }
};

export const getAuthToken = () => readStorage(TOKEN_KEY);

export const setAuthSession = (token: string, user: AuthUser) => {
  writeStorage(TOKEN_KEY, token);
  writeStorage(USER_KEY, JSON.stringify(user));
  notifyAuthSessionChange();
};

export const clearAuthSession = () => {
  removeStorage(TOKEN_KEY);
  removeStorage(USER_KEY);
  notifyAuthSessionChange();
};

export const subscribeAuthSessionChange = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TOKEN_KEY || event.key === USER_KEY) {
      listener();
    }
  };

  const onSessionChange = () => {
    listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_SESSION_CHANGE_EVENT, onSessionChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, onSessionChange);
  };
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