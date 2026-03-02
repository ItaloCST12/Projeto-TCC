import { getAuthToken } from "@/lib/auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

export const apiRequest = async <T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {},
): Promise<T> => {
  const finalToken = token ?? getAuthToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (finalToken) {
    headers.Authorization = `Bearer ${finalToken}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || `Erro HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
};