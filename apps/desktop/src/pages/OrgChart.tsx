import React, { useState, useMemo, useRef, useEffect } from "react";
import { useOrg, OrgNode } from "../api/hooks";
import { useCompany } from "../context/CompanyContext";
import { Icon } from "../components/Icon";

// ── Status Icon ──
function StatusIcon({ status, size = 9 }: { status: string; size?: number }) {
  const s = size;
  switch (status) {
    case "active": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>;
    case "running": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="13" cy="8" r="2" fill="currentColor"/></svg>;
    case "idle": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2"/></svg>;
    case "paused": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="4" y="3" width="3" height="10" rx="0.5" fill="currentColor"/><rect x="9" y="3" width="3" height="10" rx="0.5" fill="currentColor"/></svg>;
    case "error": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5Z" fill="currentColor"/></svg>;
    default: return null;
  }
}

const STATUS_BG: Record<string, string> = {
  running: "#4A90E2",
  active: "#34C98A",
  idle: "#5C667A",
  paused: "#F5A623",
  error: "#E8524A",
  terminated: "#444",
};
const STATUS_LABELS: Record<string, string> = {
  running: "Running",
  active: "Active",
  idle: "Idle",
  paused: "Paused",
  error: "Error",
  terminated: "Terminated",
};

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function getColor(id: string): string {
  const COLORS = ["#4A90E2","#7AB7E8","#A06CD5","#34C98A","#E8856A","#3A6BB5","#F5A623","#C078E0","#2BA774","#5BA0E8","#E8524A","#D08F3F"];
  let hash = 0;
  for (const c of id) hash = ((hash * 33) + c.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

const NODE_W = 220, NODE_H = 72, H_GAP = 28, V_GAP = 72, LEAF_V_GAP = 12, LEAF_INDENT = 28;

interface LayoutNode {
  id: string;
  name: string;
  role: string;
  status: string;
  parentId: string | null;
  x: number;
  y: number;
  depth: number;
  childCount: number;
}

function flattenOrg(nodes: OrgNode[], parentId: string | null, depth: number): LayoutNode[] {
  const result: LayoutNode[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      name: node.name,
      role: node.role,
      status: node.status,
      parentId,
      x: 0,
      y: 0,
      depth,
      childCount: node.reports.length,
    });
    result.push(...flattenOrg(node.reports, node.id, depth + 1));
  }
  return result;
}

function layout(roots: OrgNode[]): LayoutNode[] {
  const flat = flattenOrg(roots, null, 0);
  const byId = Object.fromEntries(flat.map(n => [n.id, n]));

  // Simple left-to-right subtree layout
  function subtreeWidth(node: OrgNode): number {
    if (node.reports.length === 0) return NODE_W;
    const childW = node.reports.reduce((s, c) => s + subtreeWidth(c), 0);
    return Math.max(NODE_W, childW + (node.reports.length - 1) * H_GAP);
  }

  function position(node: OrgNode, x: number, y: number) {
    const n = byId[node.id];
    const tw = subtreeWidth(node);
    n.x = x + (tw - NODE_W) / 2;
    n.y = y;
    if (node.reports.length > 0) {
      const childrenW = node.reports.reduce((s, c) => s + subtreeWidth(c), 0);
      const gaps = (node.reports.length - 1) * H_GAP;
      let cx = x + (tw - childrenW - gaps) / 2;
      for (const child of node.reports) {
        position(child, cx, y + NODE_H + V_GAP);
        cx += subtreeWidth(child) + H_GAP;
      }
    }
  }

  let x = 32;
  for (const root of roots) {
    position(root, x, 32);
    x += subtreeWidth(root) + H_GAP;
  }

  return flat;
}

// ── Org Node Card ──
function OrgNodeCard({ node, selected, onSelect, matched, dimmed }: {
  node: LayoutNode; selected: boolean; onSelect: (id: string) => void; matched: boolean; dimmed: boolean;
}) {
  const color = getColor(node.id);
  const initials = getInitials(node.name);
  return (
    <div
      className={`org-node ${selected ? "selected" : ""} ${matched ? "search-match" : ""} ${dimmed ? "dim" : ""}`}
      style={{ left: node.x, top: node.y, width: NODE_W }}
      data-depth={node.depth}
      onClick={() => onSelect(node.id)}
    >
      <span className="depth-bar" />
      <div className="avatar" style={{ background: color, color: "rgba(0,0,0,0.7)" }}>
        {initials}
        <span className="status-dot" style={{ background: STATUS_BG[node.status] ?? "#888", color: "#fff" }} title={STATUS_LABELS[node.status] ?? node.status}>
          <StatusIcon status={node.status} size={6} />
        </span>
      </div>
      <div className="meta">
        <div className="name">{node.name}</div>
        <div className="role">{node.role}</div>
        {node.childCount > 0 && (
          <div className="reports">{node.childCount} direct {node.childCount === 1 ? "report" : "reports"}</div>
        )}
      </div>
    </div>
  );
}

// ── Connectors ──
function Connectors({ nodes, width, height }: { nodes: LayoutNode[]; width: number; height: number }) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const paths: string[] = [];
  for (const n of nodes) {
    if (!n.parentId) continue;
    const p = byId[n.parentId];
    if (!p) continue;
    const fromX = p.x + NODE_W / 2, fromY = p.y + NODE_H;
    const toX = n.x + NODE_W / 2, toY = n.y;
    const midY = (fromY + toY) / 2;
    paths.push(`M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`);
  }
  return (
    <svg className="org-connectors" width={width} height={height}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// ── OrgChart Page ──
export function OrgChart({ embedded }: { embedded?: boolean }) {
  const { companyId } = useCompany();
  const { data: orgTree, loading } = useOrg(companyId);

  const nodes = useMemo(() => {
    if (!orgTree || orgTree.length === 0) return [];
    return layout(orgTree);
  }, [orgTree]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { width: 800, height: 400 };
    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W + 32;
    const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H + 40;
    return { width: maxX, height: maxY };
  }, [nodes]);

  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nodes.length === 0) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = Math.min(rect.width / bounds.width, rect.height / bounds.height, 1);
    const z = Math.max(0.75, raw * 0.96);
    setZoom(z);
    setPan({ x: Math.max(24, (rect.width - bounds.width * z) / 2), y: 24 });
  }, [bounds.width, bounds.height, nodes.length]);

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(nodes.filter(n => n.name.toLowerCase().includes(q) || n.role.toLowerCase().includes(q)).map(n => n.id));
  }, [search, nodes]);

  const startPan = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(".org-node") || (e.target as Element).closest(".org-zoom")) return;
    setPanning(true);
    const sx = e.clientX, sy = e.clientY, px = pan.x, py = pan.y;
    const move = (ev: MouseEvent) => setPan({ x: px + (ev.clientX - sx), y: py + (ev.clientY - sy) });
    const up = () => { setPanning(false); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const zoomBy = (delta: number) => setZoom(z => Math.min(2, Math.max(0.4, +(z + delta).toFixed(2))));
  const fit = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = Math.min(rect.width / bounds.width, rect.height / bounds.height, 1);
    const f = Math.max(0.75, raw * 0.96);
    setZoom(f);
    setPan({ x: Math.max(24, (rect.width - bounds.width * f) / 2), y: 24 });
  };

  const activeCount = nodes.filter(n => n.status === "active" || n.status === "running").length;

  const inner = (
    <div className="org-page" style={embedded ? { padding: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
      {!embedded && (
        <div className="org-header">
          <div>
            <h1>OrgChart</h1>
            <div className="subhead">
              {loading ? "Loading…" : nodes.length === 0 ? "No agents yet" : `${nodes.length} agent${nodes.length !== 1 ? "s" : ""} · ${activeCount} active`}
            </div>
          </div>
          <div className="org-header-actions">
            <button className="btn primary"><Icon name="plus" size={12} /> Hire agent</button>
          </div>
        </div>
      )}

      <div className="org-toolbar">
        <div className="org-search">
          <span className="search-icon"><Icon name="search" size={14} /></span>
          <input type="text" placeholder="Search agents by name or role…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.running }} /> Running</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.active }} /> Active</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.idle }} /> Idle</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.paused }} /> Paused</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.error }} /> Error</span>
        </div>
      </div>

      <div ref={wrapRef} className={`org-canvas-wrap ${panning ? "panning" : ""}`} onMouseDown={startPan}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)", fontSize: 13 }}>
            Loading…
          </div>
        )}
        {!loading && nodes.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)", fontSize: 13 }}>
            에이전트가 없습니다. 첫 번째 에이전트를 만들어보세요.
          </div>
        )}
        {nodes.length > 0 && (
          <>
            <div className="org-hint">
              <span>Drag to pan</span>
              <span>·</span>
              <span><span className="kbd-inline">+</span> / <span className="kbd-inline">−</span> to zoom</span>
            </div>
            <div className="org-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: bounds.width, height: bounds.height }}>
              <Connectors nodes={nodes} width={bounds.width} height={bounds.height} />
              {nodes.map(n => (
                <OrgNodeCard
                  key={n.id}
                  node={n}
                  selected={selected === n.id}
                  onSelect={setSelected}
                  matched={matched ? matched.has(n.id) : false}
                  dimmed={matched ? !matched.has(n.id) : false}
                />
              ))}
            </div>
          </>
        )}

        <div className="org-zoom" onMouseDown={e => e.stopPropagation()}>
          <button title="Zoom in" onClick={() => zoomBy(0.1)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
          <div className="zoom-readout">{Math.round(zoom * 100)}%</div>
          <button title="Zoom out" onClick={() => zoomBy(-0.1)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
          <hr />
          <button title="Fit to screen" onClick={fit}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button title="Reset" onClick={() => { setZoom(1); setPan({ x: 40, y: 24 }); }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8a5 5 0 1 1 1.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) return inner;
  return <main className="main" style={{ overflow: "hidden" }}>{inner}</main>;
}
