import React, { useState, useMemo } from "react";
import { Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useActivity as useActivityApi, useAgents as useAgentsApi, useIssues as useIssuesApi, RawActivity } from "../api/hooks";
import { transformActivity, transformAgent, actionLabel } from "../api/transforms";

const KIND_LABEL: Record<string, string> = {
  issue: "Issue", meeting: "Meeting", approval: "Approval", agent: "Agent", project: "Project",
};
const SECTION_LABELS: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", this_week: "This week", older: "Earlier",
};
const SECTION_ORDER = ["today", "yesterday", "this_week", "older"] as const;

function KindIcon({ kind }: { kind: string }) {
  const s = 13;
  switch (kind) {
    case "issue": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>;
    case "meeting": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6.5h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "approval": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5L7 12l5.5-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "agent": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 13c1.2-2 3-3 5-3s3.8 1 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "project": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 4.5a1 1 0 011-1h3l1.5 1.5h5.5a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    default: return null;
  }
}

// Module-level dynamic agents
let _activityAgents: Agent[] = [];

function ActivityRow({ entry }: { entry: RawActivity }) {
  const actor = entry.actor === "user" ? null : _activityAgents.find(a => a.id === entry.actor);
  return (
    <div className="act-row">
      {actor ? (
        <span className="act-icon-avatar" style={{ background: actor.color }}>{actor.initials}</span>
      ) : entry.actor === "user" ? (
        <span className="act-icon-avatar" style={{ background: "#4A90E2" }}>SA</span>
      ) : (
        <span className={`act-icon k-${entry.kind}`}><KindIcon kind={entry.kind} /></span>
      )}
      <div className="act-text">
        <span className="actor">{actor ? actor.name : "You"}</span>{" "}
        {entry.action}{" "}
        <span className="subject">{entry.subject}</span>
        <span className="kind-tag">
          <KindIcon kind={entry.kind} />
          {KIND_LABEL[entry.kind] || entry.kind}
        </span>
      </div>
      <span className="act-time">{entry.time}</span>
    </div>
  );
}

export function ActivityPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { companyId, fetched } = useCompany();
  const { data: rawActivity, loading } = useActivityApi(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: rawIssues } = useIssuesApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  // Keep module-level reference in sync
  _activityAgents = AGENTS;

  const AUDIT = useMemo(() => {
    if (!rawActivity) return [];
    return rawActivity.map(r => {
      const t = transformActivity(r);
      // Map entityType to kind values matching the UI
      const kindMap: Record<string, string> = {
        issue: "issue",
        meeting_session: "meeting",
        approval: "approval",
        agent: "agent",
        project: "project",
      };
      const kind = (kindMap[t.kind] || t.kind) as "issue" | "meeting" | "approval" | "agent" | "project";
      // Resolve subject to readable text
      let subject = t.subject;
      if (kind === "issue") {
        const issue = rawIssues?.find(i => i.id === t.subject);
        subject = issue ? (issue.identifier || issue.title.slice(0, 30)) : t.subject.slice(0, 8);
      } else if (kind === "agent") {
        const ag = rawAgents?.find(x => x.id === t.subject);
        subject = ag ? ag.name : t.subject.slice(0, 8);
      } else if (kind === "project") {
        subject = "Project";
      } else {
        subject = t.subject.slice(0, 8);
      }
      return {
        ...t,
        kind,
        action: actionLabel(t.action),
        subject,
      };
    });
  }, [rawActivity, rawAgents, rawIssues]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: AUDIT.length };
    Object.keys(KIND_LABEL).forEach(k => { c[k] = AUDIT.filter(a => a.kind === k).length; });
    return c;
  }, [AUDIT]);

  const filtered = useMemo(() => {
    let list = AUDIT;
    if (filter !== "all") list = list.filter(a => a.kind === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const ag = AGENTS.find(x => x.id === a.actor);
        return a.subject.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || (ag && ag.name.toLowerCase().includes(q));
      });
    }
    return list;
  }, [AUDIT, AGENTS, filter, search]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof AUDIT> = { today: [], yesterday: [], this_week: [], older: [] };
    filtered.forEach(a => {
      if (g[a.at]) g[a.at].push(a);
      else g.older.push(a);
    });
    return g;
  }, [filtered]);

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "issue", label: "Issues" },
    { id: "meeting", label: "Meetings" },
    { id: "approval", label: "Approvals" },
    { id: "agent", label: "Agents" },
    { id: "project", label: "Projects" },
  ];

  if (loading) return <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--fg-3)" }}>Loading...</div></main>;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="act-page">
        <div className="act-header">
          <div>
            <h1>Activity</h1>
            <div className="subhead">Everything that happened across your workspace · {AUDIT.length} events</div>
          </div>
          <div>
            <button className="btn">Export</button>
          </div>
        </div>
        <div className="act-toolbar">
          <div className="act-search">
            <span className="search-icon"><Icon name="search" size={14}/></span>
            <input type="text" placeholder="Search activity…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="act-pill-row">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`act-pill ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.id !== "all" && <KindIcon kind={f.id} />}
                {f.label}
                <span className="count">{counts[f.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="act-empty">
            <h4>No activity matches those filters</h4>
            <p>Try clearing the search or selecting "All".</p>
          </div>
        ) : SECTION_ORDER.map(sec => {
          const items = grouped[sec];
          if (!items || items.length === 0) return null;
          return (
            <div key={sec} className="act-section">
              <div className="act-section-label">
                {SECTION_LABELS[sec]}
                <span className="count">{items.length}</span>
              </div>
              {items.map((entry, i) => (
                <ActivityRow key={`${sec}-${i}`} entry={entry} />
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
