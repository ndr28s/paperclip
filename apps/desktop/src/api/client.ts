export function getBaseUrl(): string {
  // In dev (Vite proxy), use relative path
  if (typeof window !== "undefined" && window.paperclip?.isPackaged === false) {
    return "/api";
  }
  // In production Electron, read from localStorage or default
  if (typeof window !== "undefined" && window.paperclip?.isPackaged === true) {
    const stored = localStorage.getItem("paperclip_server_url");
    const cleaned = stored?.replace(/\/+$/, "") ?? "";
    return cleaned ? `${cleaned}/api` : "/api";
  }
  return "/api";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
