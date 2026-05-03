export interface Agent {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  status: "active" | "working" | "idle" | "paused" | "blocked" | "error" | "pending";
  task: { tag: string; text: string };
  spent: number;
  budget: number;
  model: string;
  tasks24h: number;
}

export interface Issue {
  id: string;
  title: string;
  priority: "high" | "med" | "low";
  status: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked" | "cancelled";
  assignee: string;
  project: string;
  due: string;
  commentCount: number;
  openedBy: string;
  blocked?: boolean;
}

export interface Approval {
  id: string;
  type: "deploy" | "spend" | "hire" | "access";
  urgent: boolean;
  agent: string;
  title: string;
  summary: string;
  impact: { label: string; value: string; tone: "warn" | "ok" | "info" };
  meta: { k: string; v: string }[];
  rationale: string[];
  age: string;
  ageMinutes: number;
  from?: string;
  detail?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge: string | null;
  accent?: boolean;
  group?: string;
}

export interface KPI {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaDir: "up" | "down" | "flat";
  spark: number[];
}

export interface Company {
  name: string;
  mark: string;
  markBg: string;
  plan: string;
}

export const COMPANY: Company & { plan: string } = {
  name: "Northwind Labs",
  plan: "Scale · 24 seats",
  mark: "NL",
  markBg: "#4A90E2",
};

export const COMPANIES: Company[] = [
  { name: "Northwind Labs", mark: "NL", markBg: "#4A90E2", plan: "Scale" },
  { name: "Pier 14 Studio", mark: "P14", markBg: "#A06CD5", plan: "Team" },
  { name: "Halcyon GmbH", mark: "HC", markBg: "#34C98A", plan: "Enterprise" },
];

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", badge: null, group: "workspace" },
  { id: "meetings", label: "Meetings", icon: "calendar", badge: "2", group: "workspace" },
  { id: "agents", label: "Agents", icon: "user", badge: "24", group: "workspace" },
  { id: "projects", label: "Projects", icon: "folder", badge: "8", group: "workspace" },
  { id: "issues", label: "Issues", icon: "issue", badge: "37", group: "workspace" },
  { id: "inbox", label: "Inbox", icon: "bell", badge: null, group: "workspace" },
  { id: "approvals", label: "Approvals", icon: "check", badge: "6", accent: true, group: "operations" },
  { id: "usage", label: "Usage", icon: "wave", badge: null, group: "operations" },
  { id: "activity", label: "Activity", icon: "pulse", badge: null, group: "operations" },
  { id: "goals", label: "Goals", icon: "target", badge: null, group: "operations" },
  { id: "routines", label: "Routines", icon: "repeat", badge: null, group: "operations" },
];

export const KPIS: KPI[] = [
  { label: "Active agents", value: "18", sub: "of 24", delta: "+2 this week", deltaDir: "up", spark: [4,5,6,5,7,7,8,7,9,8,10,11,10,12] },
  { label: "Issues in flight", value: "37", sub: "12 blocked", delta: "−4 vs yest.", deltaDir: "up", spark: [22,28,30,32,40,38,42,40,44,42,40,38,38,37] },
  { label: "Spend MTD", value: "$8,412", sub: "of $14k cap", delta: "59% of budget", deltaDir: "flat", spark: [0,200,420,800,1100,1400,1900,2400,3100,4000,5200,6400,7400,8412] },
  { label: "Approvals waiting", value: "6", sub: "2 urgent", delta: "Avg 1h 12m", deltaDir: "down", spark: [3,4,5,4,3,4,5,5,6,6,7,6,6,6] },
];

export const AGENTS: Agent[] = [
  { id: "ag-aria", name: "Aria", role: "Head of Engineering", initials: "AR", color: "#4A90E2", status: "active", task: { tag: "ENG-412", text: "Refactoring the billing event pipeline; split the writer into a queued worker." }, spent: 482.40, budget: 800, model: "claude-sonnet-4.5", tasks24h: 14 },
  { id: "ag-juno", name: "Juno", role: "Backend Engineer", initials: "JN", color: "#7AB7E8", status: "working", task: { tag: "ENG-418", text: "Drafting a migration plan for moving job_runs to a partitioned table." }, spent: 312.10, budget: 500, model: "gpt-5", tasks24h: 22 },
  { id: "ag-mira", name: "Mira", role: "Product Designer", initials: "MR", color: "#A06CD5", status: "active", task: { tag: "DSN-31", text: "Iterating on the empty state for OrgChart — three options ready for review." }, spent: 198.55, budget: 400, model: "claude-sonnet-4.5", tasks24h: 9 },
  { id: "ag-rex", name: "Rex", role: "Data Analyst", initials: "RX", color: "#34C98A", status: "active", task: { tag: "OPS-09", text: "Compiling the weekly retention report; waiting on warehouse refresh at 14:00." }, spent: 91.20, budget: 250, model: "haiku-4.5", tasks24h: 31 },
  { id: "ag-tess", name: "Tess", role: "Customer Success", initials: "TS", color: "#E8856A", status: "active", task: { tag: "CS-128", text: "Drafting a follow-up to Acme on the SAML rollout; flagged a contract clause." }, spent: 64.05, budget: 200, model: "haiku-4.5", tasks24h: 47 },
  { id: "ag-otto", name: "Otto", role: "DevOps", initials: "OT", color: "#3A6BB5", status: "blocked", task: { tag: "INF-77", text: "Blocked: needs prod-deploy approval to roll out new Postgres node pool." }, spent: 153.80, budget: 300, model: "claude-sonnet-4.5", tasks24h: 6 },
  { id: "ag-finn", name: "Finn", role: "Finance Ops", initials: "FN", color: "#F5A623", status: "idle", task: { tag: "FIN-04", text: "Idle — no scheduled tasks until month-end close on the 30th." }, spent: 28.40, budget: 150, model: "haiku-4.5", tasks24h: 2 },
  { id: "ag-lyra", name: "Lyra", role: "Growth Marketer", initials: "LY", color: "#C078E0", status: "working", task: { tag: "GRO-21", text: "Synthesizing competitor pricing pages for the Q3 narrative deck." }, spent: 224.90, budget: 350, model: "claude-sonnet-4.5", tasks24h: 11 },
  { id: "ag-kai", name: "Kai", role: "QA Engineer", initials: "KA", color: "#2BA774", status: "active", task: { tag: "QA-203", text: "Running full regression on PR #2841; 142/147 passing — 5 flake retries." }, spent: 119.20, budget: 250, model: "haiku-4.5", tasks24h: 38 },
  { id: "ag-velo", name: "Velo", role: "Sales Engineer", initials: "VL", color: "#5BA0E8", status: "paused", task: { tag: "SE-08", text: "Paused by Sam — awaiting fresh demo data from the Halcyon eval." }, spent: 71.60, budget: 200, model: "haiku-4.5", tasks24h: 0 },
  { id: "ag-nyx", name: "Nyx", role: "Security", initials: "NX", color: "#E8524A", status: "active", task: { tag: "SEC-12", text: "Reviewing IAM diff for the new analytics warehouse role; one over-broad policy." }, spent: 88.30, budget: 200, model: "claude-sonnet-4.5", tasks24h: 5 },
  { id: "ag-iris", name: "Iris", role: "Recruiter", initials: "IR", color: "#D08F3F", status: "idle", task: { tag: "HR-02", text: "Idle — pipeline on hold pending headcount approval from Sam." }, spent: 12.50, budget: 100, model: "haiku-4.5", tasks24h: 0 },
];

export interface ActivityItem {
  who: string;
  initials: string;
  color: string;
  textParts: { type: "text" | "pill" | "bold"; content: string }[];
  time: string;
}

export const ACTIVITY: ActivityItem[] = [
  { who: "Aria", initials: "AR", color: "#4A90E2", textParts: [{ type: "text", content: "shipped " }, { type: "pill", content: "ENG-410" }, { type: "text", content: " " }, { type: "bold", content: "Stripe webhook idempotency" }, { type: "text", content: " to staging." }], time: "2m" },
  { who: "Juno", initials: "JN", color: "#7AB7E8", textParts: [{ type: "text", content: "opened PR " }, { type: "pill", content: "#2841" }, { type: "text", content: " — " }, { type: "bold", content: "Partition job_runs by month" }, { type: "text", content: "." }], time: "6m" },
  { who: "Otto", initials: "OT", color: "#3A6BB5", textParts: [{ type: "text", content: "requested approval: " }, { type: "bold", content: "scale prod node pool to 6" }, { type: "text", content: "." }], time: "11m" },
  { who: "Mira", initials: "MR", color: "#A06CD5", textParts: [{ type: "text", content: "uploaded 3 design options for " }, { type: "pill", content: "DSN-31" }, { type: "text", content: "." }], time: "18m" },
  { who: "Kai", initials: "KA", color: "#2BA774", textParts: [{ type: "text", content: "flagged 2 flaky tests in " }, { type: "pill", content: "checkout/e2e" }, { type: "text", content: "." }], time: "24m" },
  { who: "Tess", initials: "TS", color: "#E8856A", textParts: [{ type: "text", content: "replied to " }, { type: "bold", content: "Acme Corp" }, { type: "text", content: " on the SAML rollout thread." }], time: "31m" },
  { who: "Rex", initials: "RX", color: "#34C98A", textParts: [{ type: "text", content: "scheduled " }, { type: "bold", content: "weekly retention report" }, { type: "text", content: " for 14:00." }], time: "42m" },
  { who: "Lyra", initials: "LY", color: "#C078E0", textParts: [{ type: "text", content: "drafted " }, { type: "bold", content: "Q3 narrative deck v3" }, { type: "text", content: " — 22 slides." }], time: "1h" },
  { who: "Aria", initials: "AR", color: "#4A90E2", textParts: [{ type: "text", content: "merged PR " }, { type: "pill", content: "#2839" }, { type: "text", content: " into " }, { type: "pill", content: "main" }, { type: "text", content: "." }], time: "1h" },
  { who: "Nyx", initials: "NX", color: "#E8524A", textParts: [{ type: "text", content: "completed " }, { type: "bold", content: "weekly IAM audit" }, { type: "text", content: " — 1 finding." }], time: "2h" },
];

export const DASHBOARD_APPROVALS = [
  { type: "deploy", from: "Otto · DevOps", title: "Scale prod-pg node pool 4 → 6", detail: "+$320/mo · region: us-east-1 · justification: queue depth >40 for 6h", age: "11m" },
  { type: "spend", from: "Lyra · Growth", title: "Increase model budget for narrative deck", detail: "$350 → $600 · ETA 2 days · est. tokens: 4.2M", age: "34m" },
  { type: "hire", from: "Iris · Recruiter", title: "Open headcount: Backend Engineer (agent role)", detail: "model: sonnet-4.5 · budget: $600/mo · reports to: Aria", age: "1h" },
  { type: "access", from: "Rex · Analyst", title: "Read access to warehouse.events_raw", detail: "scope: read-only · expires: 30d · reason: retention report", age: "2h" },
  { type: "spend", from: "Aria · Eng", title: "One-time: $200 for refactor research", detail: "purpose: search prior art · model: sonnet-4.5", age: "3h" },
  { type: "deploy", from: "Otto · DevOps", title: "Rotate analytics warehouse credentials", detail: "downtime: ~30s · window: tonight 02:00 UTC", age: "5h" },
];

export const ISSUES: Issue[] = [
  { id: "ENG-432", title: "Move webhook deduplication to a separate worker pool", priority: "med", status: "backlog", assignee: "ag-juno", project: "Billing platform", due: "May 6", commentCount: 2, openedBy: "Aria" },
  { id: "DSN-44", title: "New empty state for Approvals when nothing's pending", priority: "low", status: "backlog", assignee: "ag-mira", project: "Design", due: "May 8", commentCount: 0, openedBy: "Sam" },
  { id: "OPS-14", title: "Build a churn-risk score from support ticket sentiment", priority: "med", status: "backlog", assignee: "ag-rex", project: "Analytics", due: "May 12", commentCount: 4, openedBy: "Tess" },
  { id: "GRO-28", title: "Q3 narrative deck — consolidate competitor pricing tables", priority: "low", status: "backlog", assignee: "ag-lyra", project: "Marketing", due: "May 14", commentCount: 1, openedBy: "Sam" },
  { id: "SE-12", title: "Build interactive demo for the Halcyon eval", priority: "high", status: "backlog", assignee: "ag-velo", project: "Sales", due: "May 4", commentCount: 3, openedBy: "Sam" },
  { id: "HR-08", title: "Source 5 candidates for senior backend agent role", priority: "low", status: "backlog", assignee: "ag-iris", project: "People", due: "May 20", commentCount: 0, openedBy: "Sam" },
  { id: "ENG-412", title: "Refactor billing event pipeline — split writer into queued worker", priority: "high", status: "in_progress", assignee: "ag-aria", project: "Billing platform", due: "Apr 30", commentCount: 8, openedBy: "Aria" },
  { id: "ENG-418", title: "Migration plan: partition job_runs to monthly chunks", priority: "high", status: "in_progress", assignee: "ag-juno", project: "Infrastructure", due: "May 2", commentCount: 5, openedBy: "Aria" },
  { id: "DSN-31", title: "Iterate on OrgChart empty state — three options ready", priority: "med", status: "in_progress", assignee: "ag-mira", project: "Design", due: "Apr 29", commentCount: 6, openedBy: "Sam" },
  { id: "CS-128", title: "Follow up with Acme on SAML rollout — flag contract clause", priority: "high", status: "in_progress", assignee: "ag-tess", project: "Customer success", due: "Apr 28", commentCount: 4, openedBy: "Tess" },
  { id: "QA-203", title: "Full regression on PR #2841 — 5 flake retries to investigate", priority: "med", status: "in_progress", assignee: "ag-kai", project: "Quality", due: "Apr 28", commentCount: 2, openedBy: "Aria" },
  { id: "GRO-21", title: "Synthesize competitor pricing pages for Q3 narrative", priority: "med", status: "in_progress", assignee: "ag-lyra", project: "Marketing", due: "May 1", commentCount: 1, openedBy: "Sam" },
  { id: "ENG-410", title: "Stripe webhook idempotency — guard against duplicate charges", priority: "high", status: "in_review", assignee: "ag-aria", project: "Billing platform", due: "Today", commentCount: 11, openedBy: "Aria" },
  { id: "SEC-12", title: "IAM policy diff for new analytics warehouse role", priority: "high", status: "in_review", assignee: "ag-nyx", project: "Security", due: "Today", commentCount: 3, openedBy: "Nyx" },
  { id: "CS-125", title: "Acme follow-up email — drafted, awaiting your review", priority: "med", status: "in_review", assignee: "ag-tess", project: "Customer success", due: "Today", commentCount: 2, openedBy: "Tess" },
  { id: "INF-77", title: "Roll out new Postgres node pool — needs prod-deploy approval", priority: "high", status: "in_review", assignee: "ag-otto", project: "Infrastructure", due: "Apr 28", commentCount: 7, openedBy: "Otto", blocked: true },
  { id: "ENG-409", title: "Migrated billing event writer to queue", priority: "high", status: "done", assignee: "ag-aria", project: "Billing platform", due: "Apr 26", commentCount: 9, openedBy: "Aria" },
  { id: "ENG-415", title: "Indexes on telemetry_events for the dashboard query", priority: "med", status: "done", assignee: "ag-juno", project: "Infrastructure", due: "Apr 26", commentCount: 3, openedBy: "Aria" },
  { id: "DSN-29", title: "Three options for OrgChart empty state — shipped to review", priority: "med", status: "done", assignee: "ag-mira", project: "Design", due: "Apr 26", commentCount: 4, openedBy: "Sam" },
  { id: "OPS-08", title: "Weekly retention report (W16)", priority: "low", status: "done", assignee: "ag-rex", project: "Analytics", due: "Apr 25", commentCount: 1, openedBy: "Rex" },
  { id: "QA-202", title: "Regression on PR #2840 — all green", priority: "med", status: "done", assignee: "ag-kai", project: "Quality", due: "Apr 25", commentCount: 0, openedBy: "Aria" },
];

export const APPROVALS: Approval[] = [
  {
    id: "AP-118", type: "deploy", urgent: true, agent: "ag-otto",
    title: "Scale prod-pg node pool 4 → 6",
    summary: "Queue depth has been >40 for the last 6 hours. Adding 2 nodes will absorb the backlog and give us headroom for tomorrow's billing run.",
    impact: { label: "Cost impact", value: "+$320/mo", tone: "warn" },
    meta: [{ k: "Region", v: "us-east-1" }, { k: "Window", v: "Now (rolling)" }, { k: "Reversible", v: "Yes — scale down" }, { k: "Risk", v: "Low" }],
    rationale: ["Queue depth alarm fired at 06:12 UTC and hasn't recovered.", "Tonight's billing batch is ~2× normal volume — current pool will saturate.", "Cost rolls back automatically when load drops below threshold for 24h."],
    age: "11m", ageMinutes: 11,
  },
  {
    id: "AP-117", type: "spend", urgent: true, agent: "ag-lyra",
    title: "Raise model budget for Q3 narrative deck",
    summary: "Drafting 22 slides with citation grounding pushes me past the current cap. Asking for a one-time bump for the next 2 days.",
    impact: { label: "Budget change", value: "$350 → $600", tone: "warn" },
    meta: [{ k: "Duration", v: "2 days" }, { k: "Est. tokens", v: "4.2M" }, { k: "Model", v: "sonnet-4.5" }, { k: "Reverts", v: "Auto, Apr 30" }],
    rationale: ["Competitor pricing pages need full-page synthesis, not extraction.", "Citation grounding doubles the read-cost per slide.", "Without the bump I'll have to ship a thinner v1 by EOD Tuesday."],
    age: "34m", ageMinutes: 34,
  },
  {
    id: "AP-116", type: "hire", urgent: false, agent: "ag-iris",
    title: "Open headcount: Backend Engineer (agent role)",
    summary: "Aria's queue is consistently 2 weeks long. Adding a sonnet-class backend agent reporting to her would unblock the migration backlog.",
    impact: { label: "Run rate", value: "+$600/mo", tone: "info" },
    meta: [{ k: "Reports to", v: "Aria" }, { k: "Model", v: "sonnet-4.5" }, { k: "Start", v: "Within 48h of approval" }, { k: "Trial", v: "30 days" }],
    rationale: ["Aria has 11 in-flight backend issues; throughput is the bottleneck.", "Sourced 5 candidate configurations; ready to onboard the top one.", "30-day trial: auto-terminates if completion velocity stays flat."],
    age: "1h", ageMinutes: 60,
  },
  {
    id: "AP-115", type: "access", urgent: false, agent: "ag-rex",
    title: "Read access to warehouse.events_raw",
    summary: "Need raw event access to compute the new retention scoring without going through the aggregated views (which dropped a key dimension).",
    impact: { label: "Risk", value: "Read-only · 30d", tone: "info" },
    meta: [{ k: "Scope", v: "Read-only" }, { k: "Expires", v: "30 days" }, { k: "PII", v: "Not in this table" }, { k: "Reason", v: "Retention report" }],
    rationale: ["Aggregated retention view drops the cohort dimension we need.", "Read-only, time-boxed, and the table contains no PII.", "Auto-revokes in 30 days — no cleanup needed."],
    age: "2h", ageMinutes: 120,
  },
  {
    id: "AP-114", type: "spend", urgent: false, agent: "ag-aria",
    title: "One-time $200 for refactor research",
    summary: "Want to spend a few hours surveying prior art on event-pipeline refactors before committing to a design.",
    impact: { label: "One-time spend", value: "$200", tone: "info" },
    meta: [{ k: "Purpose", v: "Research only" }, { k: "Model", v: "sonnet-4.5" }, { k: "Output", v: "Decision memo" }],
    rationale: ["We've never done a partitioning migration of this size — worth surveying first.", "Output is a decision memo you can review before I touch any code."],
    age: "3h", ageMinutes: 180,
  },
  {
    id: "AP-113", type: "deploy", urgent: false, agent: "ag-otto",
    title: "Rotate analytics warehouse credentials",
    summary: "Quarterly rotation. Brief connection blip during the swap; everything else is automated.",
    impact: { label: "Downtime", value: "~30s", tone: "ok" },
    meta: [{ k: "Window", v: "Tonight 02:00 UTC" }, { k: "Affected", v: "Analytics only" }, { k: "Rollback", v: "Old creds kept 24h" }],
    rationale: ["On the quarterly rotation cadence; no surprises.", "Old credentials kept active for 24h in case anything missed the rotation."],
    age: "5h", ageMinutes: 300,
  },
];

export interface Project {
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

export interface Goal {
  id: string;
  project: string;
  title: string;
  level: "Strategic" | "Tactical" | "Task";
  status: "achieved" | "active" | "planned";
  owner: string;
  description: string;
  achieved?: string;
  parent: string | null;
  precursor: string | null;
}

export interface Meeting {
  id: string;
  agent: string;
  started: string;
  status: "active" | "ended";
  topic: string;
  messages: MeetingMessage[];
}

export interface MeetingMessage {
  type: "system" | "user" | "agent";
  text: string;
  from?: string;
}

export interface UsageItem {
  agent: string;
  tasks: number;
  issues: number;
  meetings: number;
  avgResponse: string;
  efficiency: number;
}

export interface AuditItem {
  kind: "issue" | "meeting" | "approval" | "agent" | "project";
  actor: string;
  action: string;
  subject: string;
  subjectKind: string;
  at: "today" | "yesterday" | "this_week" | "older";
  time: string;
}

export const PROJECTS: Project[] = [
  { id: "prj-billing", name: "Billing platform", color: "#4A90E2", status: "active", lead: "ag-aria", description: "Rebuild the billing event pipeline on event sourcing. Unblocks 4 downstream initiatives across analytics and finance.", target: "Jun 12", goalsCount: 6, agents: 4 },
  { id: "prj-infra", name: "Infrastructure", color: "#7AB7E8", status: "active", lead: "ag-otto", description: "Capacity and reliability work — Postgres partitioning, queue worker pools, and the new analytics warehouse.", target: "May 30", goalsCount: 4, agents: 3 },
  { id: "prj-design", name: "Design system", color: "#A06CD5", status: "active", lead: "ag-mira", description: "Empty-state pass, component library cleanup, and a fresh take on the OrgChart and Approvals views.", target: "May 15", goalsCount: 3, agents: 2 },
  { id: "prj-analytics", name: "Analytics", color: "#34C98A", status: "active", lead: "ag-rex", description: "Cohort retention, churn-risk score from support sentiment, and the warehouse refresh schedule.", target: "Jun 1", goalsCount: 5, agents: 2 },
  { id: "prj-cs", name: "Customer success", color: "#E8856A", status: "active", lead: "ag-tess", description: "Acme rollout, onboarding sequence rewrite, and a new churn-risk surface integrated with Analytics.", target: "May 22", goalsCount: 4, agents: 2 },
  { id: "prj-marketing", name: "Marketing", color: "#C078E0", status: "paused", lead: "ag-lyra", description: "Q3 narrative deck and competitor pricing study. Paused while sales focus shifts to inbound.", target: "—", goalsCount: 3, agents: 1 },
  { id: "prj-security", name: "Security", color: "#E8524A", status: "active", lead: "ag-nyx", description: "Quarterly IAM audit, service account key rotation, and a tightened policy review for the warehouse role.", target: "May 10", goalsCount: 2, agents: 1 },
  { id: "prj-sales", name: "Sales engineering", color: "#5BA0E8", status: "backlog", lead: "ag-velo", description: "Halcyon eval and a reusable interactive demo harness. Waiting on fresh eval data before kicking off.", target: "Jun 6", goalsCount: 2, agents: 1 },
];

export const PROJECT_NAME_FROM_ID: Record<string, string> = {
  "prj-billing": "Billing platform",
  "prj-infra": "Infrastructure",
  "prj-design": "Design",
  "prj-analytics": "Analytics",
  "prj-cs": "Customer success",
  "prj-marketing": "Marketing",
  "prj-security": "Security",
  "prj-sales": "Sales engineering",
};

export const GOALS: Goal[] = [
  { id: "g-1", project: "prj-billing", title: "Move billing pipeline off direct DB writes", level: "Strategic", status: "achieved", owner: "ag-aria", description: "Decouple billing writes from request path; absorb spikes via queue.", achieved: "Apr 26", parent: null, precursor: null },
  { id: "g-1b", project: "prj-billing", title: "Adopt event sourcing for billing — full read-model rebuild capability", level: "Strategic", status: "active", owner: "ag-aria", description: "Follow-up to v1: build on the queue work to restore replayability.", parent: null, precursor: "g-1" },
  { id: "g-2", project: "prj-billing", title: "Cut p99 webhook handler latency below 200ms", level: "Tactical", status: "active", owner: "ag-aria", description: "Currently 480ms p99; profiling points to dedup queries.", parent: "g-1b", precursor: null },
  { id: "g-3", project: "prj-billing", title: "Move webhook dedup to a dedicated worker pool", level: "Task", status: "planned", owner: "ag-juno", description: "Tracked by ENG-432.", parent: "g-2", precursor: null },
  { id: "g-4", project: "prj-billing", title: "Stripe webhook idempotency — production-safe", level: "Tactical", status: "active", owner: "ag-aria", description: "Guarantee no double-charges under retry storms.", parent: null, precursor: null },
  { id: "g-5", project: "prj-billing", title: "Eliminate the legacy direct-write code path", level: "Tactical", status: "planned", owner: "ag-aria", description: "Once the queued worker is stable, remove the fallback writer.", parent: null, precursor: null },
  { id: "g-6", project: "prj-infra", title: "Cut warehouse query cost by 40% this quarter", level: "Strategic", status: "active", owner: "ag-otto", description: "Driven by partition strategy and indexes.", parent: null, precursor: null },
  { id: "g-7", project: "prj-infra", title: "Partition job_runs to monthly chunks", level: "Tactical", status: "active", owner: "ag-juno", description: "ENG-418.", parent: "g-6", precursor: null },
  { id: "g-8", project: "prj-infra", title: "Roll out new Postgres node pool", level: "Task", status: "active", owner: "ag-otto", description: "Blocked on capacity quota.", parent: null, precursor: null },
  { id: "g-9", project: "prj-design", title: "Establish a clear empty-state pattern across the app", level: "Strategic", status: "active", owner: "ag-mira", description: "Three options shipped for OrgChart; rolling out the pattern next.", parent: null, precursor: null },
  { id: "g-10", project: "prj-design", title: "Audit empty states across all top-level pages", level: "Tactical", status: "planned", owner: "ag-mira", description: "DSN-38.", parent: "g-9", precursor: null },
  { id: "g-11", project: "prj-analytics", title: "Ship a churn-risk score CS can act on weekly", level: "Strategic", status: "active", owner: "ag-rex", description: "Sentiment signal from support tickets, plus usage decay.", parent: null, precursor: null },
  { id: "g-12", project: "prj-analytics", title: "Cohort-retention dashboard for product team", level: "Tactical", status: "planned", owner: "ag-rex", description: "OPS-11.", parent: null, precursor: null },
  { id: "g-13", project: "prj-cs", title: "Land Acme on SAML rollout this sprint", level: "Tactical", status: "active", owner: "ag-tess", description: "Contract clause flagged; legal review in progress.", parent: null, precursor: null },
  { id: "g-14", project: "prj-cs", title: "Rewrite the onboarding welcome sequence", level: "Tactical", status: "planned", owner: "ag-tess", description: "CS-130.", parent: null, precursor: null },
  { id: "g-15", project: "prj-security", title: "Pass quarterly IAM audit with zero broad-scope policies", level: "Strategic", status: "achieved", owner: "ag-nyx", description: "All warehouse roles now follow least-privilege.", achieved: "Apr 24", parent: null, precursor: null },
  { id: "g-15b", project: "prj-security", title: "Continuous IAM diff review on every warehouse role change", level: "Strategic", status: "active", owner: "ag-nyx", description: "Follow-up to v1: keep the bar permanently.", parent: null, precursor: "g-15" },
];

export const MEETINGS: Meeting[] = [
  {
    id: "mtg-aria", agent: "ag-aria", started: "2:14 PM", status: "active", topic: "Billing event pipeline plan",
    messages: [
      { type: "system", text: "Meeting started · 2:14 PM" },
      { type: "agent", from: "ag-aria", text: "I've sketched two paths for the billing rebuild — full event sourcing, or a lighter CQRS layer over the existing writer. Which lens are you most worried about: cost, time-to-ship, or downstream blast radius?" },
      { type: "user", text: "Time to ship matters most. We need to unblock analytics by end of May." },
      { type: "agent", from: "ag-aria", text: "Then CQRS is the better wager — it's roughly 3 weeks vs 6, and we can graduate to full event sourcing later without throwing the work away. I'll write it up as ENG-412's parent goal and link the dependent issues." },
      { type: "user", text: "Do that. Loop Juno in on the partition piece — it's a hard prereq, right?" },
      { type: "agent", from: "ag-aria", text: "Correct. ENG-418 has to land first or the read models will time out under backfill. I'll mark the dependency and ping Juno with a working draft." },
    ],
  },
  {
    id: "mtg-mira", agent: "ag-mira", started: "1:48 PM", status: "active", topic: "Empty states audit",
    messages: [
      { type: "system", text: "Meeting started · 1:48 PM" },
      { type: "agent", from: "ag-mira", text: "OrgChart empty state is in review. I'd like to use what we learned there as the template for an audit pass — Approvals, Issues, Activity. Want me to ship that as DSN-38?" },
      { type: "user", text: "Yes, but show me the OrgChart options first before we generalize." },
      { type: "agent", from: "ag-mira", text: "Posting the three side-by-side now — illustration-led, copy-led, and a hybrid with quick CTAs." },
    ],
  },
  {
    id: "mtg-rex", agent: "ag-rex", started: "Apr 27 · 4:02 PM", status: "ended", topic: "Churn-risk model framing",
    messages: [
      { type: "system", text: "Meeting started · Apr 27 · 4:02 PM" },
      { type: "agent", from: "ag-rex", text: "I want to validate the framing for the churn-risk score before I write code: weekly bucket, 0–100, blended from sentiment, usage decay, and ticket volume. Sound right?" },
      { type: "user", text: "Yes. CS should be able to act on it without tuning anything." },
      { type: "agent", from: "ag-rex", text: "Got it. I'll build a v1 that maps cleanly to a CS playbook with three tiers — watch / engage / escalate." },
      { type: "system", text: "Meeting ended · Apr 27 · 4:31 PM" },
    ],
  },
  {
    id: "mtg-otto", agent: "ag-otto", started: "Apr 27 · 11:10 AM", status: "ended", topic: "Capacity quota request",
    messages: [
      { type: "system", text: "Meeting started · Apr 27 · 11:10 AM" },
      { type: "agent", from: "ag-otto", text: "We're going to bump the prod-pg node pool from 4 to 6. I've filed the approval — can you sign off?" },
      { type: "user", text: "Approved. Mind the maintenance window." },
      { type: "system", text: "Meeting ended · Apr 27 · 11:14 AM" },
    ],
  },
];

export const USAGE_DATA: UsageItem[] = [
  { agent: "ag-aria", tasks: 142, issues: 38, meetings: 14, avgResponse: "2.1s", efficiency: 0.94 },
  { agent: "ag-juno", tasks: 118, issues: 31, meetings: 9, avgResponse: "2.4s", efficiency: 0.86 },
  { agent: "ag-mira", tasks: 87, issues: 22, meetings: 11, avgResponse: "1.8s", efficiency: 0.81 },
  { agent: "ag-rex", tasks: 134, issues: 29, meetings: 7, avgResponse: "1.6s", efficiency: 0.91 },
  { agent: "ag-tess", tasks: 196, issues: 44, meetings: 23, avgResponse: "1.2s", efficiency: 0.97 },
  { agent: "ag-otto", tasks: 64, issues: 18, meetings: 6, avgResponse: "2.9s", efficiency: 0.62 },
  { agent: "ag-finn", tasks: 18, issues: 4, meetings: 2, avgResponse: "3.4s", efficiency: 0.41 },
  { agent: "ag-lyra", tasks: 76, issues: 14, meetings: 5, avgResponse: "2.7s", efficiency: 0.73 },
  { agent: "ag-kai", tasks: 154, issues: 41, meetings: 8, avgResponse: "1.4s", efficiency: 0.92 },
  { agent: "ag-velo", tasks: 22, issues: 5, meetings: 3, avgResponse: "2.6s", efficiency: 0.48 },
  { agent: "ag-nyx", tasks: 71, issues: 19, meetings: 6, avgResponse: "2.0s", efficiency: 0.79 },
  { agent: "ag-iris", tasks: 11, issues: 2, meetings: 1, avgResponse: "3.1s", efficiency: 0.34 },
];

export const AUDIT: AuditItem[] = [
  { kind: "approval", actor: "ag-iris", action: "submitted approval", subject: "Hire Backend Engineer agent", subjectKind: "approval", at: "today", time: "2:48 PM" },
  { kind: "issue", actor: "ag-aria", action: "moved issue to In Review", subject: "ENG-410 — Stripe webhook idempotency", subjectKind: "issue", at: "today", time: "2:31 PM" },
  { kind: "meeting", actor: "ag-aria", action: "started meeting", subject: "Billing event pipeline plan", subjectKind: "meeting", at: "today", time: "2:14 PM" },
  { kind: "agent", actor: "ag-mira", action: "completed task", subject: "DSN-31 — three options for OrgChart empty state", subjectKind: "issue", at: "today", time: "2:02 PM" },
  { kind: "project", actor: "user", action: "updated target date on", subject: "Customer success", subjectKind: "project", at: "today", time: "1:50 PM" },
  { kind: "meeting", actor: "ag-mira", action: "started meeting", subject: "Empty states audit", subjectKind: "meeting", at: "today", time: "1:48 PM" },
  { kind: "issue", actor: "ag-juno", action: "opened issue", subject: "ENG-432 — webhook dedup worker pool", subjectKind: "issue", at: "today", time: "1:22 PM" },
  { kind: "approval", actor: "ag-lyra", action: "submitted approval", subject: "Budget override for Q3 narrative deck", subjectKind: "approval", at: "today", time: "12:54 PM" },
  { kind: "issue", actor: "ag-aria", action: "closed issue", subject: "ENG-409 — migrated billing event writer to queue", subjectKind: "issue", at: "yesterday", time: "5:18 PM" },
  { kind: "agent", actor: "user", action: "paused agent", subject: "Velo · Sales Engineer", subjectKind: "agent", at: "yesterday", time: "4:40 PM" },
  { kind: "approval", actor: "user", action: "approved", subject: "Capacity quota for prod-pg node pool", subjectKind: "approval", at: "yesterday", time: "11:14 AM" },
  { kind: "meeting", actor: "ag-otto", action: "started meeting", subject: "Capacity quota request", subjectKind: "meeting", at: "yesterday", time: "11:10 AM" },
  { kind: "project", actor: "user", action: "created project", subject: "Sales engineering", subjectKind: "project", at: "yesterday", time: "10:30 AM" },
  { kind: "issue", actor: "ag-mira", action: "closed issue", subject: "DSN-29 — three options for OrgChart shipped", subjectKind: "issue", at: "this_week", time: "Apr 26 · 4:55 PM" },
  { kind: "project", actor: "ag-aria", action: "achieved goal in", subject: "Billing platform — Move pipeline off direct DB writes", subjectKind: "project", at: "this_week", time: "Apr 26 · 3:12 PM" },
  { kind: "agent", actor: "user", action: "hired agent", subject: "Kai · QA Engineer", subjectKind: "agent", at: "this_week", time: "Apr 25 · 9:48 AM" },
  { kind: "issue", actor: "ag-rex", action: "closed issue", subject: "OPS-08 — Weekly retention report (W16)", subjectKind: "issue", at: "this_week", time: "Apr 25 · 8:20 AM" },
  { kind: "approval", actor: "user", action: "approved", subject: "IAM audit scope for warehouse roles", subjectKind: "approval", at: "this_week", time: "Apr 24 · 5:30 PM" },
  { kind: "project", actor: "ag-nyx", action: "achieved goal in", subject: "Security — Quarterly IAM audit clean", subjectKind: "project", at: "this_week", time: "Apr 24 · 4:02 PM" },
  { kind: "project", actor: "user", action: "created project", subject: "Billing platform", subjectKind: "project", at: "older", time: "Apr 18" },
  { kind: "agent", actor: "user", action: "hired agent", subject: "Aria · Head of Engineering", subjectKind: "agent", at: "older", time: "Apr 14" },
  { kind: "project", actor: "user", action: "created project", subject: "Infrastructure", subjectKind: "project", at: "older", time: "Apr 10" },
];
