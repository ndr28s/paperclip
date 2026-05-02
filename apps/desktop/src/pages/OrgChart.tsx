import React, { useState, useMemo, useRef, useEffect } from "react";
import { AGENTS, Agent } from "../data";
import { Icon } from "../components/Icon";

// ── Status Icon ──
function StatusIcon({ status, size = 9 }: { status: string; size?: number }) {
  const s = size;
  switch (status) {
    case "active": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>;
    case "thinking": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" fill="currentColor"/><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="13" cy="8" r="2" fill="currentColor"/></svg>;
    case "idle": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2"/></svg>;
    case "paused": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="4" y="3" width="3" height="10" rx="0.5" fill="currentColor"/><rect x="9" y="3" width="3" height="10" rx="0.5" fill="currentColor"/></svg>;
    case "blocked": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5Z" fill="currentColor"/></svg>;
    default: return null;
  }
}

const STATUS_BG: Record<string, string> = { active: "#34C98A", thinking: "#4A90E2", idle: "#5C667A", paused: "#F5A623", blocked: "#E8524A" };
const STATUS_LABELS: Record<string, string> = { active: "Active", thinking: "Thinking", idle: "Idle", paused: "Paused", blocked: "Blocked" };

const HEAD_ROLE_OVERRIDE: Record<string, string> = {
  "ag-aria": "Head of Engineering",
  "ag-mira": "Head of Design & Growth",
  "ag-rex": "Head of Operations",
};

interface OrgNode extends Agent {
  parentId: string | null;
  x: number;
  y: number;
  depth: number;
  isHuman?: boolean;
  children?: OrgNode[];
  reports?: string[];
}

// ── Build hierarchy ──
function buildOrg(): { id: string; name: string; initials: string; role: string; isHuman: boolean; status: Agent["status"]; color: string; children: (Agent & { children: Agent[] })[] } {
  const aria = AGENTS.find(a => a.id === "ag-aria")!;
  const mira = AGENTS.find(a => a.id === "ag-mira")!;
  const rex = AGENTS.find(a => a.id === "ag-rex")!;
  return {
    id: "human-sam", name: "Sam Aoki", initials: "SA", role: "CEO · Operator",
    isHuman: true, status: "active", color: "#FFFFFF",
    children: [
      { ...aria, children: ["ag-juno", "ag-otto", "ag-kai", "ag-nyx"].map(rid => AGENTS.find(a => a.id === rid)!).filter(Boolean) },
      { ...mira, children: ["ag-lyra", "ag-velo"].map(rid => AGENTS.find(a => a.id === rid)!).filter(Boolean) },
      { ...rex, children: ["ag-tess", "ag-finn", "ag-iris"].map(rid => AGENTS.find(a => a.id === rid)!).filter(Boolean) },
    ],
  };
}

const NODE_W = 220, NODE_H = 72, H_GAP = 28, V_GAP = 72, LEAF_V_GAP = 12, LEAF_INDENT = 28;

function layout(root: ReturnType<typeof buildOrg>) {
  const positions: Record<string, { x: number; y: number; depth: number }> = {};
  const heads = root.children;
  const subtreeW = NODE_W;
  const totalW = heads.length * subtreeW + (heads.length - 1) * H_GAP;
  let cursorX = 0;
  heads.forEach((head) => {
    const headX = cursorX, headY = NODE_H + V_GAP;
    positions[head.id] = { x: headX, y: headY, depth: 1 };
    const leafYStart = headY + NODE_H + LEAF_V_GAP * 1.5;
    (head.children || []).forEach((leaf, li) => {
      positions[leaf.id] = { x: headX + LEAF_INDENT, y: leafYStart + li * (NODE_H + LEAF_V_GAP), depth: 2 };
    });
    cursorX += subtreeW + H_GAP;
  });
  positions[root.id] = { x: (totalW - NODE_W) / 2, y: 0, depth: 0 };

  const flat: (OrgNode & { parentId: string | null })[] = [];
  const walk = (n: any, parentId: string | null) => {
    flat.push({ ...n, parentId, ...positions[n.id] });
    (n.children || []).forEach((c: any) => walk(c, n.id));
  };
  walk(root, null);
  return flat;
}

// ── Org Node ──
function OrgNodeCard({ node, selected, onSelect, matched, dimmed }: { node: OrgNode; selected: boolean; onSelect: (id: string) => void; matched: boolean; dimmed: boolean }) {
  const role = HEAD_ROLE_OVERRIDE[node.id] || node.role;
  const reportCount = node.children ? node.children.length : 0;
  return (
    <div
      className={`org-node ${node.isHuman ? "is-human" : ""} ${selected ? "selected" : ""} ${matched ? "search-match" : ""} ${dimmed ? "dim" : ""}`}
      style={{ left: node.x, top: node.y, width: NODE_W }}
      data-depth={node.depth}
      onClick={() => onSelect(node.id)}
    >
      <span className="depth-bar" />
      <div className="avatar" style={{ background: node.isHuman ? "linear-gradient(135deg, #4A90E2, #6BA5EA)" : node.color, color: node.isHuman ? "#fff" : "rgba(0,0,0,0.7)" }}>
        {node.initials}
        <span className="status-dot" style={{ background: STATUS_BG[node.status], color: "#fff" }} title={STATUS_LABELS[node.status]}>
          <StatusIcon status={node.status} size={6} />
        </span>
      </div>
      <div className="meta">
        <div className="name">
          {node.name}
          {node.isHuman && <span className="you-tag">You</span>}
        </div>
        <div className="role">{role}</div>
        {reportCount > 0 && <div className="reports">{reportCount} direct {reportCount === 1 ? "report" : "reports"}</div>}
      </div>
    </div>
  );
}

// ── Connectors ──
function Connectors({ nodes, width, height }: { nodes: OrgNode[]; width: number; height: number }) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const paths: string[] = [];
  for (const n of nodes) {
    if (!n.parentId) continue;
    const p = byId[n.parentId];
    if (n.depth === 1) {
      const fromX = p.x + NODE_W / 2, fromY = p.y + NODE_H;
      const toX = n.x + NODE_W / 2, toY = n.y;
      const midY = (fromY + toY) / 2;
      paths.push(`M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`);
    } else if (n.depth === 2) {
      const spineX = p.x + 14, fromY = p.y + NODE_H;
      const toX = n.x, toY = n.y + NODE_H / 2;
      paths.push(`M ${spineX} ${fromY} L ${spineX} ${toY} L ${toX} ${toY}`);
    }
  }
  return (
    <svg className="org-connectors" width={width} height={height}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// ── OrgChart Page ──
export function OrgChart({ embedded }: { embedded?: boolean }) {
  const nodes = useMemo(() => layout(buildOrg()), []);
  const bounds = useMemo(() => {
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W;
    const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H;
    const offset = 32 - minX;
    nodes.forEach(n => { n.x += offset; });
    return { width: (maxX - minX) + 64, height: maxY + 40 };
  }, [nodes]);

  const [selected, setSelected] = useState("ag-aria");
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = Math.min(rect.width / bounds.width, rect.height / bounds.height, 1);
    const z = Math.max(0.75, raw * 0.96);
    setZoom(z);
    setPan({ x: Math.max(24, (rect.width - bounds.width * z) / 2), y: 24 });
  }, [bounds.width, bounds.height]);

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(nodes.filter(n => n.name.toLowerCase().includes(q) || (HEAD_ROLE_OVERRIDE[n.id] || n.role || "").toLowerCase().includes(q)).map(n => n.id));
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

  const headcount = nodes.filter(n => !n.isHuman).length;
  const activeCount = nodes.filter(n => !n.isHuman && (n.status === "active" || n.status === "working")).length;

  const inner = (
    <div className="org-page" style={embedded ? { padding: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
      {!embedded && (
        <div className="org-header">
          <div>
            <h1>OrgChart</h1>
            <div className="subhead">{headcount} agents in 3 departments · {activeCount} working right now · reporting to you</div>
          </div>
          <div className="org-header-actions">
            <button className="btn">Export</button>
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
            <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.active }} /> Active</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.thinking }} /> Thinking</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.idle }} /> Idle</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.paused }} /> Paused</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: STATUS_BG.blocked }} /> Blocked</span>
          </div>
        </div>

        <div ref={wrapRef} className={`org-canvas-wrap ${panning ? "panning" : ""}`} onMouseDown={startPan}>
          <div className="org-hint">
            <span>Drag to pan</span>
            <span>·</span>
            <span><span className="kbd-inline">+</span> / <span className="kbd-inline">−</span> to zoom</span>
          </div>

          <div className="org-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: bounds.width, height: bounds.height }}>
            <Connectors nodes={nodes as unknown as OrgNode[]} width={bounds.width} height={bounds.height} />
            {nodes.map(n => (
              <OrgNodeCard
                key={n.id}
                node={n as unknown as OrgNode}
                selected={selected === n.id}
                onSelect={setSelected}
                matched={matched ? matched.has(n.id) : false}
                dimmed={matched ? !matched.has(n.id) : false}
              />
            ))}
          </div>

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
