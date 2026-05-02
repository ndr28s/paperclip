// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, getServerUrl } from '../api/config';

interface SessionUser { id: string; name: string; email: string; }
interface SessionCtx {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string, serverUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing token on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const baseUrl = await getServerUrl();
        const res = await fetch(`${baseUrl}/api/auth/get-session`, {
          headers: { Cookie: `better-auth.session_token=${token}` },
        });
        const data = await res.json();
        if (data?.user?.id) {
          setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
        } else {
          // Token expired/invalid
          await setToken(null);
        }
      } catch {
        await setToken(null);
      }
      setLoading(false);
    })();
  }, []);

  async function login(username: string, password: string, serverUrl?: string) {
    const { setServerUrl, getServerUrl } = await import('../api/config');
    if (serverUrl?.trim()) await setServerUrl(serverUrl.trim());
    const baseUrl = await getServerUrl();

    // Resolve email from username if not an email address
    let email = username.trim();
    if (!email.includes('@')) {
      const lookupRes = await fetch(`${baseUrl}/api/auth/lookup-by-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email }),
      });
      if (!lookupRes.ok) {
        const d = await lookupRes.json().catch(() => ({}));
        throw new Error(d.error || '아이디를 찾을 수 없습니다.');
      }
      const lookup = await lookupRes.json();
      if (!lookup.email || !lookup.email.includes('@')) {
        throw new Error('아이디를 찾을 수 없습니다.');
      }
      email = lookup.email;
    }

    const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || d.error || '로그인에 실패했습니다.');
    }
    const data = await res.json();
    // Better Auth returns token in data.token (short form)
    // Extract full signed cookie value from Set-Cookie header if available
    const setCookie = res.headers.get('set-cookie');
    const cookieMatch = setCookie?.match(/better-auth\.session_token=([^;]+)/);
    const fullCookieValue = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const token = fullCookieValue || data.token || data.session?.token;
    if (!token) throw new Error('서버에서 토큰을 받지 못했습니다.');
    await setToken(token);
    setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
  }

  async function logout() {
    await setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
