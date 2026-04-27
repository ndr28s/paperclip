// Shared HTTP/WebSocket client used by web, desktop, and mobile.
// Keep this thin: just transport, auth, error normalization.
// Each platform passes its own fetch + storage adapters.

export type ApiClientOptions = {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null> | string | null;
  fetch?: typeof globalThis.fetch;
};

export class ApiClient {
  private baseUrl: string;
  private getAuthToken?: ApiClientOptions["getAuthToken"];
  private fetchImpl: typeof globalThis.fetch;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.getAuthToken = opts.getAuthToken;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = await this.getAuthToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(res.status, text || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
