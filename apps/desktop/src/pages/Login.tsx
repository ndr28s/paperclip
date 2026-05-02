import React, { useState } from "react";
import { getBaseUrl } from "../api/client";

interface LoginProps {
  onLogin: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--border-1)",
  borderRadius: 7,
  padding: "9px 12px",
  color: "var(--fg-0)",
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
};

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem("paperclip_server_url") || "http://localhost:3100"
  );

  // 로그인 상태
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 상태
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPackaged = typeof window !== "undefined" && window.paperclip?.isPackaged === true;

  function saveServerUrl() {
    if (isPackaged && serverUrl.trim()) {
      localStorage.setItem("paperclip_server_url", serverUrl.trim().replace(/\/$/, ""));
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) return;
    setLoading(true);
    setError(null);
    try {
      saveServerUrl();
      const baseUrl = getBaseUrl();

      let email = loginUsername.trim();
      if (!email.includes("@")) {
        const res = await fetch(`${baseUrl}/auth/lookup-by-username`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "아이디를 찾을 수 없습니다.");
        }
        email = (await res.json()).email;
      }

      const res = await fetch(`${baseUrl}/auth/sign-in/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginPassword }),
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!signupName.trim() || !signupUsername.trim() || !signupPassword) return;
    if (signupPassword !== signupPasswordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (signupPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      saveServerUrl();
      const baseUrl = getBaseUrl();

      const generatedEmail = signupUsername.includes("@") ? signupUsername : `${signupUsername}@paperclip.local`;

      const res = await fetch(`${baseUrl}/auth/sign-up/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: generatedEmail,
          password: signupPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "회원가입에 실패했습니다.");
      }
      // 가입 후 자동 로그인 시도
      const loginRes = await fetch(`${baseUrl}/auth/sign-in/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: generatedEmail, password: signupPassword }),
      });
      if (loginRes.ok) {
        onLogin();
      } else {
        setSuccess("가입 완료! 로그인해주세요.");
        setMode("login");
        setLoginUsername(signupUsername.trim());
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", width: "100vw", background: "var(--bg-0)",
    }}>
      <div style={{
        width: 360,
        background: "var(--bg-1)",
        border: "1px solid var(--border-1)",
        borderRadius: 12,
        padding: "32px 28px",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "var(--accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-0)", marginBottom: 4 }}>Paperclip</div>
        </div>

        {/* 탭 */}
        <div style={{
          display: "flex", background: "var(--bg-2)", borderRadius: 8,
          padding: 3, marginBottom: 22, gap: 2,
        }}>
          {(["login", "signup"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null); }}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 6, border: "none",
                background: mode === m ? "var(--bg-1)" : "transparent",
                color: mode === m ? "var(--fg-0)" : "var(--fg-3)",
                fontSize: 13, fontWeight: mode === m ? 600 : 400,
                cursor: "pointer",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        {/* 서버 주소 (packaged only) */}
        {isPackaged && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>
              서버 주소
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="http://192.168.0.x:3100"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div style={{
            fontSize: 12, color: "var(--ok)",
            background: "rgba(52,201,138,0.08)",
            border: "1px solid rgba(52,201,138,0.2)",
            borderRadius: 6, padding: "8px 12px", marginBottom: 12,
          }}>
            {success}
          </div>
        )}

        {/* 로그인 폼 */}
        {mode === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>아이디 / 이메일</label>
              <input
                type="text" autoFocus autoComplete="username"
                placeholder="아이디 또는 이메일"
                value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>비밀번호</label>
              <input
                type="password" autoComplete="current-password"
                placeholder="••••••••"
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button
              type="submit"
              disabled={loading || !loginUsername.trim() || !loginPassword}
              style={submitStyle(loading || !loginUsername.trim() || !loginPassword)}
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>이름</label>
              <input
                type="text" autoFocus autoComplete="name"
                placeholder="홍길동"
                value={signupName} onChange={e => setSignupName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>아이디</label>
              <input
                type="text" autoComplete="username"
                placeholder="my_username"
                value={signupUsername} onChange={e => setSignupUsername(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>비밀번호 <span style={{ color: "var(--fg-3)" }}>(8자 이상)</span></label>
              <input
                type="password" autoComplete="new-password"
                placeholder="••••••••"
                value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 5 }}>비밀번호 확인</label>
              <input
                type="password" autoComplete="new-password"
                placeholder="••••••••"
                value={signupPasswordConfirm} onChange={e => setSignupPasswordConfirm(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: signupPasswordConfirm && signupPassword !== signupPasswordConfirm
                    ? "var(--err)" : "var(--border-1)",
                }}
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button
              type="submit"
              disabled={loading || !signupName.trim() || !signupUsername.trim() || !signupPassword || !signupPasswordConfirm}
              style={submitStyle(loading || !signupName.trim() || !signupUsername.trim() || !signupPassword || !signupPasswordConfirm)}
            >
              {loading ? "가입 중…" : "가입하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      fontSize: 12, color: "var(--err)",
      background: "rgba(232,82,74,0.08)",
      border: "1px solid rgba(232,82,74,0.2)",
      borderRadius: 6, padding: "8px 12px",
    }}>
      {msg}
    </div>
  );
}

function submitStyle(disabled: boolean): React.CSSProperties {
  return {
    marginTop: 4, width: "100%",
    background: "var(--accent)", border: "none", borderRadius: 7,
    padding: "10px 0", color: "#fff", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "opacity 0.15s",
  };
}
