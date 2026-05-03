import React, { useState } from "react";
import { NAV } from "../data";
import { Icon } from "./Icon";
import { useCompany } from "../context/CompanyContext";
import { useSession } from "../context/SessionContext";
import { useSidebarBadges, useDashboard, useAgents, useProjects, useActiveSession } from "../api/hooks";
import { transformAgent } from "../api/transforms";

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
  onCreateOrgRequest?: () => void;
  onCompanyCreated?: () => void;
}

export function Sidebar({ active, onNavigate, onCreateOrgRequest, onCompanyCreated: _onCompanyCreated }: SidebarProps) {
  const { company, companies, companyId, switchCompany, reload } = useCompany();
  const { user } = useSession();
  const { data: badges } = useSidebarBadges(companyId);
  const { data: dashboard } = useDashboard(companyId);
  const { data: rawAgents } = useAgents(companyId);
  const { data: rawProjects } = useProjects(companyId);
  const { data: session } = useActiveSession(companyId);

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [serverUrlOpen, setServerUrlOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(
    () => localStorage.getItem("paperclip_server_url") || "http://localhost:3100"
  );

  const isPackaged = typeof window !== "undefined" && (window as Window & { paperclip?: { isPackaged?: boolean } }).paperclip?.isPackaged === true;

  async function handleDeleteCompany(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`"${name}" 조직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const { api } = await import("../api/client");
      await api.delete(`/companies/${id}`);
      reload();
    } catch (err) {
      console.error("Failed to delete company:", err);
    }
  }

  const workspace = NAV.filter(n => n.group === "workspace");
  const operations = NAV.filter(n => n.group === "operations");

  const companyName = company?.name ?? "Loading...";
  const companyMark = company?.mark ?? company?.name?.slice(0, 2).toUpperCase() ?? "..";
  const companyMarkBg = (company as { markBg?: string })?.markBg ?? "#4A90E2";
  const companyPlan = (company as { plan?: string })?.plan ?? "";

  // Live counts
  const agentCount = rawAgents ? rawAgents.map(r => transformAgent(r)).length : null;
  const projectCount = rawProjects ? rawProjects.length : null;
  const issueCount = dashboard ? (dashboard.tasks.open + dashboard.tasks.inProgress) : null;
  const meetingCount = session && !session.endedAt ? 1 : null;
  const approvalCount = badges && badges.approvals > 0 ? badges.approvals : (dashboard?.pendingApprovals ?? 0) > 0 ? dashboard!.pendingApprovals : null;

  function badgeForNav(navId: string): string | null {
    switch (navId) {
      case "agents": return agentCount !== null ? String(agentCount) : null;
      case "projects": return projectCount !== null ? String(projectCount) : null;
      case "issues": return issueCount !== null && issueCount > 0 ? String(issueCount) : null;
      case "meetings": return meetingCount !== null ? String(meetingCount) : null;
      case "approvals": return approvalCount !== null ? String(approvalCount) : null;
      default: return null;
    }
  }

  const avatarText = user?.name ? user.name.slice(0, 2).toUpperCase() : "?";

  return (
    <aside className="sidebar">
      <div className="company-switch" style={{ position: "relative" }}>
        <button onClick={() => setCompanyMenuOpen(o => !o)}>
          <div className="company-mark" style={{ background: companyMarkBg }}>{companyMark}</div>
          <div className="company-meta">
            <div className="company-name">{companyName}</div>
            <div className="company-plan">{companyPlan}</div>
          </div>
          <span className="chev"><Icon name="chev" size={14} /></span>
        </button>

        {companyMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "var(--bg-1)", border: "1px solid var(--border-1)", borderRadius: 8,
              padding: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginTop: 4,
            }}>
            {companies.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => { switchCompany(c); setCompanyMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, flex: 1,
                    padding: "7px 10px", borderRadius: 6, border: "none",
                    background: c.id === companyId ? "var(--bg-3)" : "transparent",
                    color: "var(--fg-0)", fontSize: 13, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: "#4A90E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 700 }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    {c.status !== "active" && <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{c.status}</div>}
                  </div>
                  {c.id === companyId && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 11 }}>✓</span>}
                </button>
                {c.id !== companyId && (
                  <button
                    onClick={(e) => handleDeleteCompany(e, c.id, c.name)}
                    title="조직 삭제"
                    style={{
                      marginRight: 4, padding: "2px 6px", border: "none", borderRadius: 4,
                      background: "transparent", color: "var(--fg-3)", fontSize: 13,
                      cursor: "pointer", lineHeight: 1, flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--danger, #e55)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--fg-3)")}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border-1)", margin: "6px 0" }} />
            <button
              onClick={() => {
                setCompanyMenuOpen(false);
                onCreateOrgRequest?.();
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "7px 10px", borderRadius: 6, border: "none",
                background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer",
              }}
            >
              + 조직 만들기
            </button>
          </div>
        )}
      </div>

      <div className="nav-group">
        <div className="nav-label">Workspace</div>
        {workspace.map(n => {
          const badge = badgeForNav(n.id);
          return (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? "active" : ""}`}
              onClick={() => onNavigate(n.id)}
            >
              <span className="ic"><Icon name={n.icon} size={14} /></span>
              <span>{n.label}</span>
              {badge && <span className={`badge ${n.accent ? "accent" : ""}`}>{badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="nav-group">
        <div className="nav-label">Operations</div>
        {operations.map(n => {
          const badge = badgeForNav(n.id);
          return (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? "active" : ""}`}
              onClick={() => onNavigate(n.id)}
            >
              <span className="ic"><Icon name={n.icon} size={14} /></span>
              <span>{n.label}</span>
              {badge && <span className={`badge ${n.accent ? "accent" : ""}`}>{badge}</span>}
            </button>
          );
        })}
      </div>

      <button
        className={`nav-item ${active === "settings" ? "active" : ""}`}
        onClick={() => onNavigate("settings")}
        style={{ marginBottom: 4 }}
      >
        <span className="ic">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 2v1M8 13v1M2 8h1M13 8h1M3.5 3.5l.7.7M11.8 11.8l.7.7M3.5 12.5l.7-.7M11.8 4.2l.7-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span>Settings</span>
      </button>

      <div className="sidebar-foot">
        <div className="avatar">{avatarText}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{user?.name ?? "Loading..."}</div>
          <div className="user-role" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email ?? ""}
          </div>
        </div>
        {isPackaged && (
          <button
            className="tb-btn"
            style={{ padding: "0 6px" }}
            title="서버 주소 변경"
            onClick={() => {
              setServerUrlInput(localStorage.getItem("paperclip_server_url") || "http://localhost:3100");
              setServerUrlOpen(true);
            }}
          >
            <Icon name="more" size={12} />
          </button>
        )}
      </div>

      {/* 서버 주소 변경 모달 */}
      {serverUrlOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={() => setServerUrlOpen(false)} />
          <div style={{
            position: "relative", zIndex: 1, background: "var(--bg-1)",
            border: "1px solid var(--border-1)", borderRadius: 12,
            padding: "24px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--fg-0)" }}>서버 주소 변경</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
              Paperclip 서버의 주소를 변경합니다. 변경 후 앱이 재연결됩니다.
            </p>
            <label style={{ display: "block", fontSize: 12, color: "var(--fg-2)", marginBottom: 12 }}>
              서버 주소
              <input
                type="text"
                autoFocus
                value={serverUrlInput}
                onChange={e => setServerUrlInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const url = serverUrlInput.trim().replace(/\/$/, "");
                    if (url) { localStorage.setItem("paperclip_server_url", url); window.location.reload(); }
                  }
                  if (e.key === "Escape") setServerUrlOpen(false);
                }}
                placeholder="http://192.168.0.x:3100"
                style={{
                  display: "block", width: "100%", marginTop: 6,
                  background: "var(--bg-2)", border: "1px solid var(--border-1)",
                  borderRadius: 7, padding: "9px 12px", color: "var(--fg-0)",
                  fontSize: 13, boxSizing: "border-box", outline: "none",
                }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setServerUrlOpen(false)}
                style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid var(--border-1)", background: "transparent", color: "var(--fg-2)", fontSize: 13, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  const url = serverUrlInput.trim().replace(/\/$/, "");
                  if (!url) return;
                  localStorage.setItem("paperclip_server_url", url);
                  window.location.reload();
                }}
                disabled={!serverUrlInput.trim()}
                style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                저장 후 재연결
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
