import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "http://100.79.84.66:3100";

const SESSION_COOKIE_KEY = "paperclip_session_cookie";

async function getStoredCookie(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_COOKIE_KEY);
}

export async function storeSessionCookie(cookie: string) {
  await AsyncStorage.setItem(SESSION_COOKIE_KEY, cookie);
}

export async function clearSessionCookie() {
  await AsyncStorage.removeItem(SESSION_COOKIE_KEY);
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cookie = await getStoredCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (cookie) headers["Cookie"] = cookie;

  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export const authApi = {
  signIn: async (usernameOrEmail: string, password: string): Promise<void> => {
    let email = usernameOrEmail.trim();
    if (!email.includes("@")) {
      const lookupRes = await fetch(`${BASE_URL}/api/auth/lookup-by-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email }),
      });
      if (!lookupRes.ok) {
        const body = await lookupRes.json().catch(() => ({}));
        throw new Error(body?.error || "아이디를 찾을 수 없습니다.");
      }
      const lookup = await lookupRes.json();
      if (!lookup.email?.includes("@")) throw new Error("아이디를 찾을 수 없습니다.");
      email = lookup.email;
    }

    const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || body?.error || `로그인에 실패했습니다. (${res.status})`);
    }
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const sessionPart = setCookie.split(";")[0];
      await storeSessionCookie(sessionPart);
    }
  },

  signUp: async (name: string, email: string, password: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || body?.error || `Sign-up failed (${res.status})`);
    }
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const sessionPart = setCookie.split(";")[0];
      await storeSessionCookie(sessionPart);
    }
  },

  signOut: async () => {
    await authFetch("/api/auth/sign-out", { method: "POST", body: JSON.stringify({}) });
    await clearSessionCookie();
  },

  getSession: async () => {
    const res = await authFetch("/api/auth/get-session");
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json();
  },

  getProfile: async () => {
    const res = await authFetch("/api/auth/profile");
    if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
    return res.json();
  },

  updateProfile: async (data: { name?: string }) => {
    const res = await authFetch("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update profile (${res.status})`);
    return res.json();
  },
};

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await authFetch(path);
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
    return res.json();
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await authFetch(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
    if (res.status === 204) return undefined as T;
    return res.json();
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await authFetch(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status})`);
    return res.json();
  },
};
