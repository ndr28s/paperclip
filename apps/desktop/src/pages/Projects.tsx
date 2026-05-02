import React, { useState, useMemo } from "react";
import { AGENTS as STATIC_AGENTS, PROJECTS as STATIC_PROJECTS, ISSUES as STATIC_ISSUES, PROJECT_NAME_FROM_ID, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useProjects as useProjectsApi, useIssues as useIssuesApi, useGoals as useGoalsApi, useAgents as useAgentsApi } from "../api/hooks";
import { transformProject, transformIssue, transformAgent } from "../api/transforms";
import { api } from "../api/client";

const STATUS_LABEL: Record<string, string> = { active: "Active", paused: "Paused", backlog: "Backlog" };

interface ProjectType {
  id: string;
  name: string;
  color: string;
  status: "active" | "paused" | "backlog";
  lead: string;
  description: string;
  target: string;
  goalsCount: number;
  agents: number;
}

interface ProjectCardProps {
  p: ProjectType;
  onOpen: (id: string) => void;
  agents: Agent[];
  progressData: { pct: number; done: number; total: number };
}

function ProjectCard({ p, onOpen, agents, progressData }: ProjectCardProps) {
  const lead = agents.find(a => a.id === p.lead);
  const { pct, done, total } = progressData;
  const initials = p.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="proj-card" role="link" tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(p.id); }}>
      <div className="proj-card-head">
        <div className="proj-mark" style={{ background: p.color }}>{initials}</div>
        <div className="proj-card-title">
          <div className="proj-card-name">{p.name}</div>
          <div className="proj-card-meta">{p.goalsCount} goals · {p.agents} agents</div>
        </div>
        <span className={`proj-status-pill proj-status-${p.status}`}>
          <span className="dot" />
          {STATUS_LABEL[p.status]}
        </span>
      </div>
      <div className="proj-desc">{p.description}</div>
      <div>
        <div className="proj-progress-row" style={{ marginBottom: 6 }}>
          <span>{pct}% complete</span>
          <span>{done} / {total} issues</span>
        </div>
        <div className="proj-bar">
          <div className="proj-bar-fill" style={{ width: `${pct}%`, background: p.color }} />
        </div>
      </div>
      <div className="proj-card-foot">
        <div className="proj-foot-left">
          <span className="proj-foot-stat">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5l2 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Target {p.target}
          </span>
        </div>
        {lead && (
          <span className="proj-lead">
            <span className="proj-lead-avatar" style={{ background: lead.color }}>{lead.initials}</span>
            {lead.name}
          </span>
        )}
      </div>
    </div>
  );
}

export function Projects({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjStatus, setNewProjStatus] = useState("active");
  const [newProjCreating, setNewProjCreating] = useState(false);
  const [newProjError, setNewProjError] = useState<string | null>(null);

  const { companyId } = useCompany();
  const { data: rawProjects, loading: projLoading, refetch: refetchProjects } = useProjectsApi(companyId);
  const { data: rawIssues } = useIssuesApi(companyId);
  const { data: rawGoals } = useGoalsApi(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return STATIC_AGENTS;
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawProjects) rawProjects.forEach(p => m.set(p.id, p.name));
    return m;
  }, [rawProjects]);

  const PROJECTS: ProjectType[] = useMemo(() => {
    if (!rawProjects) return STATIC_PROJECTS;
    return rawProjects.map(r => {
      const p = transformProject(r);
      // Compute goalsCount from live goals
      const goalsCount = rawGoals ? rawGoals.filter(g => g.ownerAgentId === r.leadAgentId).length : 0;
      // Compute agents count from issues assigned to this project
      const projectIssues = rawIssues ? rawIssues.filter(i => i.projectId === r.id) : [];
      const agentIds = new Set(projectIssues.map(i => i.assigneeAgentId).filter(Boolean));
      if (r.leadAgentId) agentIds.add(r.leadAgentId);
      return { ...p, goalsCount, agents: agentIds.size };
    });
  }, [rawProjects, rawIssues, rawGoals]);

  const issues = useMemo(() => {
    if (!rawIssues) return STATIC_ISSUES;
    return rawIssues.map(r => transformIssue(r, projectMap));
  }, [rawIssues, projectMap]);

  function projectProgress(projectId: string, projectName: string) {
    const items = rawIssues
      ? rawIssues.filter(i => i.projectId === projectId)
      : STATIC_ISSUES.filter(i => i.project === projectName);
    if (items.length === 0) return { pct: 0, done: 0, total: 0 };
    const done = items.filter(i => i.status === "done").length;
    return { pct: Math.round((done / items.length) * 100), done, total: items.length };
  }

  const filtered = useMemo(() => {
    let list = PROJECTS;
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }, [PROJECTS, search, statusFilter]);

  const counts = useMemo(() => ({
    all: PROJECTS.length,
    active: PROJECTS.filter(p => p.status === "active").length,
    paused: PROJECTS.filter(p => p.status === "paused").length,
    backlog: PROJECTS.filter(p => p.status === "backlog").length,
  }), [PROJECTS]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjName.trim() || !companyId) return;
    setNewProjCreating(true);
    setNewProjError(null);
    try {
      await api.post(`/companies/${companyId}/projects`, {
        name: newProjName.trim(),
        description: newProjDesc.trim(),
        status: newProjStatus,
      });
      setNewProjOpen(false);
      setNewProjName("");
      setNewProjDesc("");
      setNewProjStatus("active");
      refetchProjects();
    } catch (err: any) {
      setNewProjError(err?.message || "Failed to create project");
    } finally {
      setNewProjCreating(false);
    }
  }

  if (projLoading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="projects-page">
        <div className="projects-header">
          <div>
            <h1>Projects</h1>
            <div className="subhead">{counts.all} projects · {counts.active} active · {counts.paused} paused</div>
          </div>
          <div className="projects-header-actions">
            <button className="btn">Export</button>
            <button className="btn primary" onClick={() => setNewProjOpen(true)}><Icon name="plus" size={12} /> New project</button>
          </div>
        </div>
        <div className="proj-toolbar">
          <div className="proj-search">
            <span className="search-icon"><Icon name="search" size={14} /></span>
            <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-tabs" role="tablist" style={{ marginBottom: 0 }}>
            {(["all", "active", "paused", "backlog"] as const).map(f => (
              <button
                key={f}
                className={`filter-tab ${statusFilter === f ? "active" : ""}`}
                onClick={() => setStatusFilter(f)}
              >
                <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                <span className="count">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="proj-grid">
          {filtered.map(p => <ProjectCard key={p.id} p={p} onOpen={onOpenProject || (() => {})} agents={AGENTS} progressData={projectProgress(p.id, p.name)} />)}
        </div>
      </div>

      {newProjOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setNewProjOpen(false)}
        >
          <div
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border-1)",
              borderRadius: 10,
              padding: 24,
              width: 400,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "var(--fg-0)" }}>New project</h2>
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-1)", marginBottom: 5 }}>Name *</label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  placeholder="Project name"
                  required
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg-2)", border: "1px solid var(--border-1)",
                    borderRadius: 6, padding: "7px 10px", fontSize: 13,
                    color: "var(--fg-0)", outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-1)", marginBottom: 5 }}>Description</label>
                <textarea
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg-2)", border: "1px solid var(--border-1)",
                    borderRadius: 6, padding: "7px 10px", fontSize: 13,
                    color: "var(--fg-0)", outline: "none", resize: "vertical",
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-1)", marginBottom: 5 }}>Status</label>
                <select
                  value={newProjStatus}
                  onChange={e => setNewProjStatus(e.target.value)}
                  style={{
                    background: "var(--bg-2)", border: "1px solid var(--border-1)",
                    borderRadius: 6, padding: "7px 10px", fontSize: 13,
                    color: "var(--fg-0)", outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="backlog">Backlog</option>
                </select>
              </div>
              {newProjError && (
                <div style={{ marginBottom: 12, fontSize: 12, color: "var(--err)" }}>{newProjError}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setNewProjOpen(false)}
                  disabled={newProjCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={newProjCreating || !newProjName.trim()}
                >
                  {newProjCreating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
