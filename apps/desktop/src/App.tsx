import React, { useState, useEffect, useRef } from "react";
import { Titlebar } from "./components/Titlebar";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Agents } from "./pages/Agents";
import { Issues } from "./pages/Issues";
import { OrgChart } from "./pages/OrgChart";
import { ApprovalsPage } from "./pages/Approvals";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { MeetingsPage } from "./pages/Meetings";
import { UsagePage } from "./pages/Usage";
import { ActivityPage } from "./pages/Activity";
import { Login } from "./pages/Login";
import { getBaseUrl, api } from "./api/client";
import { SessionProvider } from "./context/SessionContext";
import { CompanyProvider, useCompany } from "./context/CompanyContext";

type Page = "dashboard" | "agents" | "issues" | "orgchart" | "approvals" | "projects" | "project-detail" | "meetings" | "usage" | "activity" | string;
type AuthState = "loading" | "authenticated" | "unauthenticated";

// ── 조직 생성 모달 (앱 최상위 레벨) ──
function CreateOrgModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      // position: fixed 모달은 Electron에서도 정상 포커스됨
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      await api.post("/companies", { name: trimmed });
      setName("");
      onCreated();
    } catch (err) {
      setError((err as Error).message || "조직 만들기 실패. 다시 시도해주세요.");
      setCreating(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />
      {/* modal */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "var(--bg-1)", border: "1px solid var(--border-1)",
        borderRadius: 12, padding: "28px 28px 24px", width: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--fg-0)" }}>
          조직 만들기
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
          새 조직을 만들고 에이전트를 고용해보세요.
        </p>

        <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 12 }}>
          조직 이름
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") onClose();
            }}
            placeholder="조직 이름을 입력하세요"
            style={{
              display: "block", width: "100%", marginTop: 6,
              background: "var(--bg-2)", border: "1px solid var(--border-1)",
              borderRadius: 7, padding: "9px 12px",
              color: "var(--fg-0)", fontSize: 14,
              boxSizing: "border-box", outline: "none",
            }}
          />
        </label>

        {error && (
          <div style={{ fontSize: 12, color: "var(--err, #e55)", marginBottom: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 7, border: "1px solid var(--border-1)",
              background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            style={{
              padding: "8px 20px", borderRadius: 7, border: "none",
              background: "var(--accent)", color: "white", fontSize: 13,
              fontWeight: 600, cursor: creating || !name.trim() ? "not-allowed" : "pointer",
              opacity: creating || !name.trim() ? 0.6 : 1,
            }}
          >
            {creating ? "만드는 중..." : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AppShell (CompanyProvider 내부에서 reload 접근) ──
function AppShell({ authState, onLogout }: { authState: AuthState; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [agentPageAction, setAgentPageAction] = useState<string | null>(null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const { reload } = useCompany();

  const pageTitles: Record<string, string> = {
    dashboard: "Dashboard", agents: "Agents", issues: "Issues",
    orgchart: "OrgChart", approvals: "Approvals", projects: "Projects",
    "project-detail": "Project", meetings: "Meetings", usage: "Usage", activity: "Activity",
  };

  const handleOpenProject = (id: string) => { setSelectedProjectId(id); setPage("project-detail"); };
  const handleBackToProjects = () => { setPage("projects"); setSelectedProjectId(null); };

  function handleOrgCreated() {
    setCreateOrgOpen(false);
    reload();
    setPage("agents");
    setAgentPageAction("hire-ceo");
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "agents":    return <Agents onNavigate={setPage} initialAction={agentPageAction} onActionHandled={() => setAgentPageAction(null)} />;
      case "issues":    return <Issues />;
      case "orgchart":  return <OrgChart />;
      case "approvals": return <ApprovalsPage />;
      case "projects":  return <Projects onOpenProject={handleOpenProject} />;
      case "project-detail": return selectedProjectId
        ? <ProjectDetail projectId={selectedProjectId} onBack={handleBackToProjects} />
        : <Projects onOpenProject={handleOpenProject} />;
      case "meetings":  return <MeetingsPage />;
      case "usage":     return <UsagePage />;
      case "activity":  return <ActivityPage />;
      default: return (
        <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--fg-2)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-0)", marginBottom: 6 }}>
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </div>
            <div style={{ fontSize: 13 }}>This page is coming soon.</div>
          </div>
        </main>
      );
    }
  };

  void onLogout; // reserved for future use
  const activeNav = page === "project-detail" ? "projects" : page;

  return (
    <div className="app-shell">
      <Titlebar page={pageTitles[page] || page} />
      <div className="app-body">
        <Sidebar
          active={activeNav}
          onNavigate={setPage}
          onCreateOrgRequest={() => setCreateOrgOpen(true)}
        />
        {renderPage()}
      </div>
      {/* 조직 생성 모달 — position:fixed로 app-shell overflow:hidden 영향 없음 */}
      <CreateOrgModal
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        onCreated={handleOrgCreated}
      />
    </div>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    let cancelled = false;
    function checkSession(attempt = 0) {
      fetch(`${getBaseUrl()}/auth/get-session`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (cancelled) return;
          const isReal = data?.user?.id && data.user.id !== "local-board";
          setAuthState(isReal ? "authenticated" : "unauthenticated");
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < 8) {
            const delay = Math.min(400 * Math.pow(1.5, attempt), 4000);
            setTimeout(() => checkSession(attempt + 1), delay);
          } else {
            setAuthState("unauthenticated");
          }
        });
    }
    checkSession();
    return () => { cancelled = true; };
  }, []);

  if (authState === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", width: "100vw", background: "var(--bg-0)",
        color: "var(--fg-3)", fontSize: 13,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: "var(--accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
            </svg>
          </div>
          <div style={{ color: "var(--fg-2)" }}>연결 중…</div>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <Login onLogin={() => setAuthState("authenticated")} />;
  }

  return (
    <CompanyProvider>
      <SessionProvider>
        <AppShell authState={authState} onLogout={() => setAuthState("unauthenticated")} />
      </SessionProvider>
    </CompanyProvider>
  );
}
