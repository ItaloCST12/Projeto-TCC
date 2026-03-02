export type AuthUser = {
  id: number;
  nome?: string | null;
  email: string;
  telefone?: string | null;
  role?: string;
};

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const setAuthSession = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getAuthUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
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