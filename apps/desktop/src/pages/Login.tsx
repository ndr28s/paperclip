import React, { useState } from "react";
import { getBaseUrl } from "../api/client";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem("paperclip_server_url") || "http://localhost:3100"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPackaged = typeof window !== "undefined" && window.paperclip?.isPackaged === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);

    try {
      // Save server URL before login so getBaseUrl() picks it up
      if (isPackaged && serverUrl.trim()) {
        localStorage.setItem("paperclip_server_url", serverUrl.trim());
      }

      const baseUrl = getBaseUrl();

      // Resolve email from username (ID)
      let email = username.trim();
      if (!email.includes("@")) {
        const lookupRes = await fetch(`${baseUrl}/auth/lookup-by-username`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email }),
        });
        if (!lookupRes.ok) {
          const data = await lookupRes.json().catch(() => ({}));
          throw new Error(data.error || "아이디를 찾을 수 없습니다.");
        }
        const lookup = await lookupRes.json();
        email = lookup.email;
      }

      const res = await fetch(`${baseUrl}/auth/sign-in/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "로그인에 실패했습니다.");
      }

      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100vw",
      background: "var(--bg-0)",
    }}>
      <div style={{
        width: 360,
        background: "var(--bg-1)",
        border: "1px solid var(--border-1)",
        borderRadius: 12,
        padding: "32px 28px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-0)", marginBottom: 4 }}>Paperclip</div>
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>워크스페이스에 로그인하세요</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isPackaged && (
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>
                서버 주소
              </label>
              <input
                type="text"
                autoComplete="off"
                placeholder="http://192.168.0.x:3100"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: 7,
                  padding: "9px 12px",
                  color: "var(--fg-0)",
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>
              아이디
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              placeholder="아이디 입력"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: 7,
                padding: "9px 12px",
                color: "var(--fg-0)",
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>
              비밀번호
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: 7,
                padding: "9px 12px",
                color: "var(--fg-0)",
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12,
              color: "var(--err)",
              background: "rgba(232,82,74,0.08)",
              border: "1px solid rgba(232,82,74,0.2)",
              borderRadius: 6,
              padding: "8px 12px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              marginTop: 4,
              width: "100%",
              background: "var(--accent)",
              border: "none",
              borderRadius: 7,
              padding: "10px 0",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !username.trim() || !password ? "not-allowed" : "pointer",
              opacity: loading || !username.trim() || !password ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
