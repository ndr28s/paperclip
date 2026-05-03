import React, { useState, useMemo } from "react";
import { AGENTS as STATIC_AGENTS, PROJECTS as STATIC_PROJECTS, ISSUES as STATIC_ISSUES, GOALS as STATIC_GOALS, AUDIT as STATIC_AUDIT, PROJECT_NAME_FROM_ID, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useProjects as useProjectsApi, useIssues as useIssuesApi, useGoals as useGoalsApi, useAgents as useAgentsApi, useActivity as useActivityApi } from "../api/hooks";
import { transformProject, transformIssue, transformGoal, transformAgent, transformActivity } from "../api/transforms";

const STATUS_LABEL: Record<string, string> = { active: "Active", paused: "Paused", backlog: "Backlog" };
const GOAL_STATUS_COLOR: Record<string, string> = { achieved: "#34C98A", active: "#4A90E2", planned: "#7B8696" };

function GoalIcon({ status }: { status: string }) {
  if (status === "achieved") return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill={GOAL_STATUS_COLOR.achieved} />
      <path d="M5 8.2l2 2 4-4" stroke="#0E1116" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (status === "active") return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={GOAL_STATUS_COLOR.active} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.5" fill={GOAL_STATUS_COLOR.active} />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={GOAL_STATUS_COLOR.planned} strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function PriorityIcon({ p }: { p: string }) {
  if (p === "critical") return <span style={{ color: "#FF6F66" }}><svg width="9" height="9" viewBox="0 0 10 10"><path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill="currentColor"/></svg></span>;
  if (p === "high") return <span style={{ color: "#F5A623" }}><svg width="9" height="9" viewBox="0 0 10 10"><path d="M5 1 L9 9 L1 9 Z" fill="currentColor"/></svg></span>;
  if (p === "medium" || p === "med") return <span style={{ color: "#E8C266" }}><svg width="9" height="9" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="currentColor"/></svg></span>;
  return <span style={{ color: "var(--fg-3)" }}><svg width="10" height="3" viewBox="0 0 10 3"><rect x="1" y="1" width="8" height="1" fill="currentColor"/></svg></span>;
}

interface ProjectDetailProps {
  projectId: string;
  onBack?: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [tab, setTab] = useState<"overview" | "issues" | "goals" | "activity">("overview");

  const { companyId } = useCompany();
  const { data: rawProjects } = useProjectsApi(companyId);
  const { data: rawIssues, loading: issuesLoading } = useIssuesApi(companyId);
  const { data: rawGoals } = useGoalsApi(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: rawActivity } = useActivityApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  const PROJECTS = useMemo(() => {
    if (!rawProjects) return [];
    return rawProjects.map(r => transformProject(r));
  }, [rawProjects]);

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    if (rawProjects) rawProjects.forEach(p => m.set(p.id, p.name));
    return m;
  }, [rawProjects]);

  // Build issues for this project (projectId scoped, no project object needed yet)
  const projectIssues = useMemo(() => {
    if (rawIssues) {
      return rawIssues
        .filter(i => i.projectId === projectId)
        .map(r => transformIssue(r, projectMap));
    }
    return [];
  }, [rawIssues, projectId, projectMap]);

  // Build goals for this project
  const projectGoals = useMemo(() => {
    if (rawGoals) {
      // Goals don't have projectId directly in the API, so filter by owner being in project agents
      // For now, show all goals (they'll be filtered better when API supports project-goal linking)
      return rawGoals.map(r => transformGoal(r));
    }
    return [];
  }, [rawGoals]);

  const projectAudit = useMemo(() => {
    if (rawActivity) {
      return rawActivity
        .filter(a => a.entityId === projectId || projectIssues.some(i => (i as { rawId?: string }).rawId === a.entityId))
        .map(r => transformActivity(r))
        .slice(0, 14);
    }
    return [];
  }, [rawActivity, projectId, projectIssues]);

  if (!rawProjects) {
    return (
      <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading...</div>
      </main>
    );
  }

  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) {
    return (
      <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "var(--fg-2)" }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>프로젝트를 찾을 수 없습니다.</div>
          {onBack && <button onClick={onBack} style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>← 돌아가기</button>}
        </div>
      </main>
    );
  }
  const lead = AGENTS.find(a => a.id === project.lead);

  const projectAgentIds = new Set(projectIssues.map(i => i.assignee).filter(Boolean));
  if (project.lead) projectAgentIds.add(project.lead);

  const doneCount = projectIssues.filter(i => i.status === "done").length;
  const blockedCount = projectIssues.filter(i => i.status === "blocked").length;
  const progressPct = projectIssues.length > 0 ? Math.round((doneCount / projectIssues.length) * 100) : 0;

  const initials = project.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const tabs = [
    { id: "overview" as const, label: "Overview", count: null },
    { id: "issues" as const, label: "Issues", count: projectIssues.length },
    { id: "goals" as const, label: "Goals", count: projectGoals.length },
    { id: "activity" as const, label: "Activity", count: projectAudit.length },
  ];

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="pd-page">
        <div className="pd-header">
          <div className="pd-crumbs">
            {onBack ? (
              <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--fg-2)", cursor: "pointer", font: "inherit", padding: 0 }}>Projects</button>
            ) : <span>Projects</span>}
            <span>/</span>
            <span style={{ color: "var(--fg-1)" }}>{project.name}</span>
          </div>
          <div className="pd-title-row">
            <div className="pd-mark" style={{ background: project.color }}>{initials}</div>
            <div className="pd-title-text">
              <h1>
                {project.name}
                <span className={`proj-status-pill proj-status-${project.status}`} style={{ fontSize: 10 }}>
                  <span className="dot"/>
                  {STATUS_LABEL[project.status]}
                </span>
              </h1>
              <div className="pd-subhead">{project.description}</div>
            </div>
            <div className="pd-actions">
              <button className="btn">Pause</button>
              <button className="btn primary"><Icon name="plus" size={12}/> New issue</button>
            </div>
          </div>
          <div className="pd-stats">
            <div className="pd-stat">
              <span className="pd-stat-label">Lead</span>
              <span className="pd-stat-value">
                {lead && <span className="lead-avatar" style={{ background: lead.color }}>{lead.initials}</span>}
                {lead ? lead.name : "—"}
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Agents</span>
              <span className="pd-stat-value">{projectAgentIds.size}</span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Goals</span>
              <span className="pd-stat-value">{projectGoals.length}</span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Issues</span>
              <span className="pd-stat-value">
                {projectIssues.length}
                {blockedCount > 0 && <span style={{ fontSize: 11, color: "var(--err)" }}>· {blockedCount} blocked</span>}
              </span>
            </div>
            <div className="pd-stat">
              <span className="pd-stat-label">Target</span>
              <span className="pd-stat-value">{project.target}</span>
            </div>
          </div>
          <div className="pd-tabs" role="tablist">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`pd-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span>{t.label}</span>
                {t.count !== null && <span className="count">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="pd-body">
          {tab === "overview" && (
            <div className="pd-overview">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="pd-section">
                  <h3>Progress</h3>
                  <div className="pd-progress-big">
                    <span className="pd-progress-num">{progressPct}%</span>
                    <span className="pd-progress-of">complete · {doneCount} of {projectIssues.length} issues</span>
                  </div>
                  <div className="pd-progress-bar">
                    <div className="pd-progress-bar-fill" style={{ width: `${progressPct}%`, background: project.color }} />
                  </div>
                </div>
                <div className="pd-section">
                  <h3>Active goals</h3>
                  {projectGoals.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "8px 0" }}>No goals tracked yet.</div>
                  ) : projectGoals.slice(0, 5).map(g => {
                    const owner = AGENTS.find(a => a.id === g.owner);
                    return (
                      <div key={g.id} className="pd-goal-row">
                        <div className="pd-goal-status"><GoalIcon status={g.status} /></div>
                        <div className="pd-goal-text">
                          <div className="pd-goal-title">{g.title}</div>
                          <div className="pd-goal-meta">
                            <span className="pd-goal-level">{g.level}</span>
                            {owner && <span>· {owner.name}</span>}
                            {(g as { achieved?: string }).achieved && <span>· achieved {(g as { achieved?: string }).achieved}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="pd-section">
                  <h3>Team</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Array.from(projectAgentIds).map(id => {
                      const a = AGENTS.find(x => x.id === id);
                      if (!a) return null;
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ background: a.color, width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>{a.initials}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500 }}>{a.name}</div>
                            <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{a.role}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pd-section">
                  <h3>Recent activity</h3>
                  {projectAudit.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "8px 0" }}>Nothing yet.</div>
                  ) : projectAudit.slice(0, 5).map((a, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-1)", fontSize: 12, color: "var(--fg-1)" }}>
                      <div>{a.action} <strong style={{ color: "var(--fg-0)", fontWeight: 500 }}>{a.subject}</strong></div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{a.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "issues" && (
            <div className="pd-issues-list">
              {projectIssues.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)" }}>No issues yet.</div>
              ) : projectIssues.map(i => {
                const a = AGENTS.find(x => x.id === i.assignee);
                return (
                  <div key={i.id} className="pd-issue-row">
                    <span className="pd-issue-id">{i.id}</span>
                    <span className="pd-issue-title">{i.title}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-2)", textTransform: "capitalize" }}>
                      <PriorityIcon p={i.priority} /> {i.priority}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--fg-2)", textTransform: "capitalize" }}>{(i.status || "").replace("_", " ")}</span>
                    {a ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-1)" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: a.color, color: "#fff", fontSize: 9, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{a.initials}</span>
                        {a.name}
                      </span>
                    ) : <span style={{ color: "var(--fg-3)" }}>—</span>}
                  </div>
                );
              })}
            </div>
          )}
          {tab === "goals" && (
            <div className="pd-section">
              {projectGoals.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "8px 0" }}>No goals yet.</div>
              ) : projectGoals.map(g => {
                const owner = AGENTS.find(a => a.id === g.owner);
                return (
                  <div key={g.id} className="pd-goal-row">
                    <div className="pd-goal-status"><GoalIcon status={g.status} /></div>
                    <div className="pd-goal-text">
                      <div className="pd-goal-title">{g.title}</div>
                      {g.description && <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 4 }}>{g.description}</div>}
                      <div className="pd-goal-meta">
                        <span className="pd-goal-level">{g.level}</span>
                        <span style={{ textTransform: "capitalize" }}>· {g.status}</span>
                        {owner && <span>· {owner.name}</span>}
                        {(g as { achieved?: string }).achieved && <span>· achieved {(g as { achieved?: string }).achieved}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab === "activity" && (
            <div className="pd-activity-list">
              {projectAudit.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>No recent activity for this project.</div>
              ) : projectAudit.map((a, i) => {
                const actor = AGENTS.find(x => x.id === a.actor);
                return (
                  <div key={i} className="pd-activity-row">
                    <span className="pd-activity-icon">
                      {actor ? (
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: actor.color, color: "#fff", fontSize: 9, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{actor.initials}</span>
                      ) : <Icon name="user" size={12}/>}
                    </span>
                    <span className="pd-activity-text">
                      <strong>{actor ? actor.name : "You"}</strong> {a.action} <strong>{a.subject}</strong>
                    </span>
                    <span className="pd-activity-time">{a.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
