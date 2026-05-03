import React, { useState, useMemo } from "react";
import { AGENTS as STATIC_AGENTS, Agent } from "../data";
import { Icon } from "../components/Icon";
import { useCompany } from "../context/CompanyContext";
import { useCostsByAgent, useCostsSummary, useDashboard, useAgents as useAgentsApi, useProjects as useProjectsApi } from "../api/hooks";
import { transformAgent, centsToDisplay } from "../api/transforms";

function effColor(v: number): string {
  if (v >= 0.85) return "#34C98A";
  if (v >= 0.65) return "#4A90E2";
  if (v >= 0.45) return "#F5A623";
  return "#E8524A";
}

export function UsagePage() {
  const [period, setPeriod] = useState(30);

  const { companyId } = useCompany();
  const { data: rawCostsByAgent, loading: costsLoading } = useCostsByAgent(companyId, period);
  const { data: rawCostSummary } = useCostsSummary(companyId, period);
  const { data: dashboard } = useDashboard(companyId);
  const { data: rawAgents } = useAgentsApi(companyId);
  const { data: rawProjects } = useProjectsApi(companyId);

  const AGENTS: Agent[] = useMemo(() => {
    if (!rawAgents) return [];
    return rawAgents.map(r => transformAgent(r));
  }, [rawAgents]);

  // Top metrics — driven by live API data
  const totalTasks = (dashboard?.tasks.done || 0) + (dashboard?.tasks.open || 0) + (dashboard?.tasks.inProgress || 0);
  const totalProjects = rawProjects?.length || 0;
  const totalTokens = useMemo(() => {
    if (!rawCostsByAgent) return 0;
    return rawCostsByAgent.reduce((s, c) => s + (c.inputTokens || 0) + (c.outputTokens || 0) + (c.cachedInputTokens || 0), 0);
  }, [rawCostsByAgent]);
  const totalAgents = rawAgents?.length || 0;

  // Per-agent rows — join cost-by-agent with agent metadata
  type UsageRow = { agentId: string; name: string; role: string; color: string; initials: string; status: string; tokens: number; costCents: number };
  const rows: UsageRow[] = useMemo(() => {
    if (!rawCostsByAgent) return [];
    return rawCostsByAgent.map(c => {
      const ag = AGENTS.find(a => a.id === c.agentId);
      const tokens = (c.inputTokens || 0) + (c.outputTokens || 0) + (c.cachedInputTokens || 0);
      return {
        agentId: c.agentId,
        name: ag?.name || c.agentName || "—",
        role: ag?.role || "",
        color: ag?.color || "#5C667A",
        initials: ag?.initials || (c.agentName || "?").slice(0, 2).toUpperCase(),
        status: c.agentStatus,
        tokens,
        costCents: c.costCents || 0,
      };
    }).sort((a, b) => b.tokens - a.tokens);
  }, [rawCostsByAgent, AGENTS]);

  const isUnlocked = (rawCostSummary?.spendCents || 0) > 0;

  return (
    <main className="main" style={{ overflow: "hidden" }}>
      <div className="usage-page">
        <div className="usage-header">
          <div>
            <h1>Usage</h1>
            <div className="subhead">Activity across {AGENTS.length} agents · last {period} days</div>
          </div>
          <div className="usage-period" role="tablist">
            {([7, 30, 90] as const).map(p => (
              <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>{p}d</button>
            ))}
          </div>
        </div>
        <div className="usage-metrics">
          <div className="usage-metric">
            <div className="usage-metric-label">Tasks</div>
            <div className="usage-metric-value">{totalTasks.toLocaleString()}</div>
            <div className="usage-metric-sub">across {totalProjects} project{totalProjects === 1 ? "" : "s"}</div>
          </div>
          <div className="usage-metric">
            <div className="usage-metric-label">Total tokens</div>
            <div className="usage-metric-value">{totalTokens.toLocaleString()}</div>
            <div className="usage-metric-sub">input + output + cached</div>
          </div>
          <div className="usage-metric">
            <div className="usage-metric-label">Agents</div>
            <div className="usage-metric-value">{totalAgents}</div>
            <div className="usage-metric-sub">configured in workspace</div>
          </div>
          <div className="usage-metric">
            <div className="usage-metric-label">Spend MTD</div>
            <div className="usage-metric-value">{centsToDisplay(rawCostSummary?.spendCents || 0)}</div>
            <div className="usage-metric-sub">of {centsToDisplay(rawCostSummary?.budgetCents || 0)} cap</div>
            <div className="usage-metric-bar">
              <div className="usage-metric-bar-fill" style={{ width: `${Math.min(100, rawCostSummary?.utilizationPercent || 0)}%`, background: effColor((rawCostSummary?.utilizationPercent || 0) / 100) }} />
            </div>
          </div>
        </div>
        {isUnlocked ? (
          <div className="cost-locked" style={{ position: "relative" }}>
            <div className="cost-locked-row">
              <div className="cost-locked-icon">
                <Icon name="wave" size={20} />
              </div>
              <div className="cost-locked-text">
                <div className="cost-locked-title">Cost analytics</div>
                <div className="cost-locked-desc">
                  Live spend across the workspace. Budget caps, per-agent burn, and forecast.
                </div>
              </div>
            </div>
            <div className="cost-preview">
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Spend MTD</span>
                <span className="cost-preview-cell-value">{centsToDisplay(rawCostSummary?.spendCents || 0)}</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Top agent</span>
                <span className="cost-preview-cell-value">{rows[0] ? `${rows[0].name} · $${(rows[0].costCents / 100).toFixed(2)}` : "—"}</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Budget</span>
                <span className="cost-preview-cell-value">{centsToDisplay(rawCostSummary?.budgetCents || 0)}</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Utilization</span>
                <span className="cost-preview-cell-value">{rawCostSummary?.utilizationPercent || 0}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="cost-locked">
            <div className="cost-locked-row">
              <div className="cost-locked-icon">
                <Icon name="lock" size={20} />
              </div>
              <div className="cost-locked-text">
                <div className="cost-locked-title">
                  Cost analytics
                  <span className="cost-locked-tag">
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.5 4.7H14l-3.6 2.6L11.8 13 8 10.1 4.2 13l1.4-4.7L2 5.7h4.5L8 1z" fill="currentColor"/></svg>
                    Pro
                  </span>
                </div>
                <div className="cost-locked-desc">
                  Track per-agent and per-project spend, set budget caps, and forecast monthly burn. Available on the Scale plan and above — your workspace is on Scale, but cost analytics is locked while billing reconciles your last invoice.
                </div>
              </div>
              <div className="cost-locked-actions">
                <button className="btn">Learn more</button>
                <button className="btn primary"><Icon name="plus" size={12}/> Unlock now</button>
              </div>
            </div>
            <div className="cost-preview">
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Spend MTD</span>
                <span className="cost-preview-cell-value">{dashboard ? centsToDisplay(dashboard.costs.monthSpendCents) : "$8,412"}</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Top agent</span>
                <span className="cost-preview-cell-value">Tess · $1,840</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Forecast</span>
                <span className="cost-preview-cell-value">$11.2k</span>
              </div>
              <div className="cost-preview-cell">
                <span className="cost-preview-cell-label">Cap left</span>
                <span className="cost-preview-cell-value">$5,588</span>
              </div>
              <div className="cost-preview-overlay">
                <Icon name="lock" size={11} />
                Locked — preview only
              </div>
            </div>
          </div>
        )}
        <div className="usage-section-h">
          <h2>Per-agent activity</h2>
          <span className="usage-section-h-sub">Sorted by total tokens · last 30 days</span>
        </div>
        <div className="usage-table">
          <div className="usage-table-head">
            <span>Agent</span>
            <span style={{ textAlign: "right" }}>Total tokens</span>
            <span style={{ textAlign: "right" }}>Cost</span>
            <span style={{ textAlign: "right" }}>Runs</span>
            <span>Status</span>
          </div>
          {costsLoading && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              Loading per-agent usage…
            </div>
          )}
          {!costsLoading && rows.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No agent usage data for this period.
            </div>
          )}
          {rows.map(r => {
            const cost = r.costCents / 100;
            return (
              <div key={r.agentId} className="usage-table-row">
                <div className="usage-agent">
                  <span className="usage-agent-avatar" style={{ background: r.color }}>{r.initials}</span>
                  <div className="usage-agent-text">
                    <div className="usage-agent-name">{r.name}</div>
                    <div className="usage-agent-role">{r.role || "—"}</div>
                  </div>
                </div>
                <span className="usage-num">{r.tokens > 0 ? r.tokens.toLocaleString() : "—"}</span>
                <span className="usage-num">${cost.toFixed(2)}</span>
                <span className="usage-num">{(rawCostsByAgent?.find(c => c.agentId === r.agentId)?.subscriptionRunCount) ?? 0}</span>
                <span style={{ fontSize: 12, color: "var(--fg-2)", textTransform: "capitalize" }}>{r.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
