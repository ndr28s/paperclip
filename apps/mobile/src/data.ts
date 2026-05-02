import { AGENT_PALETTE } from './tokens';

export type AgentStatus = 'active' | 'thinking' | 'idle' | 'paused' | 'blocked' | 'error';

export interface WorkItem {
  state: 'shipped' | 'review' | 'failed';
  title: string;
  when: string;
}

export interface ThreadMessage {
  actorId: string; // agent id or 'user'
  text: string;
  age: string;
}

export interface User {
  name: string;
  initials: string;
  color: string;
  role: string;
  org: string;
  plan: string;
  seats: number;
}

export interface Agent {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  status: AgentStatus;
  task: string;
  spent: number;
  budget: number;
  tools: string[];
  tasks24: number;
  tokens24: string;
  workHistory: WorkItem[];
}

export interface Approval {
  id: string;
  type: 'Deploy' | 'Spend' | 'Access' | 'Hire';
  urgent: boolean;
  agentId: string;
  impact: string;
  summary: string;
  rationale: string[];
  meta: [string, string][];
  age: string;
  thread: ThreadMessage[];
}

export interface Project {
  id: string;
  name: string;
  mark: string;
  color: string;
  status: 'active' | 'paused' | 'backlog';
  progress: number;
  leadId: string;
  issues: number;
}

export interface Issue {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'med' | 'low';
  status: 'backlog' | 'progress' | 'review' | 'done';
  assigneeId: string;
  due: string;
  projectId: string;
}

export interface ActivityItem {
  kind: 'ship' | 'ask' | 'note' | 'spend' | 'pause';
  actorId: string;
  text: string;
  t: string;
  at: 'today' | 'yesterday' | 'this_week' | 'older';
}

export interface KPI {
  label: string;
  value: string;
  sub: string;
  kind: 'active' | 'issues' | 'spend' | 'approvals';
}

export const CURRENT_USER: User = {
  name: 'Sasha Kumar',
  initials: 'SK',
  color: '#3A6BB5',
  role: 'Owner',
  org: 'Northwind Labs',
  plan: 'Scale plan',
  seats: 24,
};

export const AGENTS: Agent[] = [
  {
    id: 'aria', name: 'Aria', initials: 'AR', color: AGENT_PALETTE[2],
    role: 'Lead Product Engineer', status: 'active',
    task: 'Refactoring checkout module to support multi-currency',
    spent: 412.30, budget: 1500,
    tools: ['GitHub', 'Linear', 'Slack', 'PostgreSQL', 'Sentry', 'Vercel'],
    tasks24: 14, tokens24: '1.2M',
    workHistory: [
      { state: 'shipped', title: 'Refunds: idempotency keys for double-charge guard', when: 'Apr 27' },
      { state: 'review',  title: 'Multi-currency price formatting (US, EU, JP)', when: 'Apr 26' },
      { state: 'shipped', title: 'Cart reducer: extract promo logic', when: 'Apr 25' },
      { state: 'failed',  title: 'Webhook retry — 3rd-party signature mismatch', when: 'Apr 24' },
      { state: 'shipped', title: 'Sentry DSN restructure', when: 'Apr 23' },
    ],
  },
  {
    id: 'juno', name: 'Juno', initials: 'JU', color: AGENT_PALETTE[0],
    role: 'Growth Analyst', status: 'thinking',
    task: 'Analyzing Q1 funnel drop-off in onboarding step 3',
    spent: 188.40, budget: 800,
    tools: ['Mixpanel', 'BigQuery', 'Notion', 'Looker'],
    tasks24: 7, tokens24: '640K',
    workHistory: [
      { state: 'shipped', title: 'Funnel: step-3 drop-off root cause report', when: 'Apr 27' },
      { state: 'shipped', title: 'Onboarding cohort analysis Q1 export', when: 'Apr 25' },
      { state: 'review',  title: 'BigQuery pipeline: daily active users', when: 'Apr 24' },
      { state: 'shipped', title: 'Mixpanel event taxonomy cleanup', when: 'Apr 22' },
      { state: 'failed',  title: 'Looker dashboard — segment filter bug', when: 'Apr 21' },
    ],
  },
  {
    id: 'mira', name: 'Mira', initials: 'MI', color: AGENT_PALETTE[3],
    role: 'Customer Success', status: 'active',
    task: 'Drafting renewal outreach for 12 enterprise accounts',
    spent: 96.10, budget: 600,
    tools: ['Zendesk', 'HubSpot', 'Gmail', 'Notion'],
    tasks24: 21, tokens24: '430K',
    workHistory: [
      { state: 'shipped', title: 'Renewal outreach — Acme Corp personalized sequence', when: 'Apr 27' },
      { state: 'shipped', title: 'NPS follow-up batch — 34 respondents', when: 'Apr 26' },
      { state: 'review',  title: 'Renewal risk score model v2', when: 'Apr 25' },
      { state: 'shipped', title: 'HubSpot deal stage automation for renewals', when: 'Apr 23' },
      { state: 'shipped', title: 'Zendesk macro: enterprise escalation template', when: 'Apr 22' },
    ],
  },
  {
    id: 'rex', name: 'Rex', initials: 'RX', color: AGENT_PALETTE[10],
    role: 'Site Reliability', status: 'blocked',
    task: 'Waiting on approval to roll out cache layer hotfix',
    spent: 740.20, budget: 2000,
    tools: ['PagerDuty', 'Datadog', 'AWS', 'Terraform', 'Slack'],
    tasks24: 4, tokens24: '210K',
    workHistory: [
      { state: 'review',  title: 'Cache hotfix: LRU with TTL refresh', when: 'Apr 27' },
      { state: 'shipped', title: 'Datadog alert tuning — reduce false positives', when: 'Apr 25' },
      { state: 'shipped', title: 'Terraform: autoscaling policy update', when: 'Apr 24' },
      { state: 'failed',  title: 'AWS Lambda timeout on batch job — needs retune', when: 'Apr 23' },
      { state: 'shipped', title: 'PagerDuty runbook for cache degradation', when: 'Apr 21' },
    ],
  },
  {
    id: 'tess', name: 'Tess', initials: 'TS', color: AGENT_PALETTE[6],
    role: 'Brand & Content', status: 'idle',
    task: 'Idle — awaiting next brief from marketing lead',
    spent: 54.80, budget: 400,
    tools: ['Figma', 'Notion', 'Webflow'],
    tasks24: 2, tokens24: '88K',
    workHistory: [
      { state: 'shipped', title: 'Brand v3 typography scale — final spec', when: 'Apr 26' },
      { state: 'shipped', title: 'Homepage hero copy refresh', when: 'Apr 24' },
      { state: 'review',  title: 'Illustration brief for Studio Ono set 1', when: 'Apr 23' },
      { state: 'shipped', title: 'Social templates — LinkedIn announcement kit', when: 'Apr 21' },
    ],
  },
  {
    id: 'kit', name: 'Kit', initials: 'KT', color: AGENT_PALETTE[7],
    role: 'Data Engineer', status: 'paused',
    task: 'Paused by Sasha — pending schema review',
    spent: 320.00, budget: 1200,
    tools: ['dbt', 'Snowflake', 'Airflow'],
    tasks24: 0, tokens24: '0',
    workHistory: [
      { state: 'review',  title: 'Warehouse: orders incremental dbt model', when: 'Apr 26' },
      { state: 'shipped', title: 'Snowflake clustering keys — orders table', when: 'Apr 24' },
      { state: 'shipped', title: 'Airflow DAG: nightly warehouse sync', when: 'Apr 22' },
      { state: 'failed',  title: 'Schema migration v4 — column rename conflict', when: 'Apr 21' },
      { state: 'shipped', title: 'dbt tests: not-null + unique for dim_users', when: 'Apr 20' },
    ],
  },
];

export const findAgent = (id: string): Agent => AGENTS.find(a => a.id === id) ?? AGENTS[0];

export const APPROVALS: Approval[] = [
  {
    id: 'ap1', type: 'Deploy', urgent: true, agentId: 'aria',
    impact: 'Production · all customers',
    summary: 'Deploy checkout v2.4 — adds multi-currency support and refactors the cart reducer.',
    rationale: [
      'Passes 312/312 tests including new currency edge cases',
      'Staging soak ran 26 hours with no incidents',
      'Rollback plan documented in runbook RB-118',
    ],
    meta: [['Requested', '14m ago'], ['Impact', 'High'], ['Budget', '$0'], ['Timeline', 'Now']],
    age: '14m',
    thread: [
      { actorId: 'aria', text: "I've finished staging soak. All metrics nominal. Requesting your sign-off to proceed.", age: '14m' },
    ],
  },
  {
    id: 'ap2', type: 'Spend', urgent: false, agentId: 'juno',
    impact: 'Tooling · $480/mo',
    summary: 'Upgrade Mixpanel to Enterprise tier to unlock cohort export to BigQuery.',
    rationale: [
      'Current plan blocks the funnel investigation',
      'Saves ~6h/wk of manual CSV work',
      'Within Q2 analytics tooling budget',
    ],
    meta: [['Requested', '1h ago'], ['Impact', 'Medium'], ['Budget', '+$480/mo'], ['Timeline', 'This week']],
    age: '1h',
    thread: [
      { actorId: 'juno', text: 'Mixpanel Enterprise unlocks direct BigQuery export. Without it I have to manually pull CSVs — about 6h/wk overhead. Fits Q2 budget.', age: '1h' },
    ],
  },
  {
    id: 'ap3', type: 'Access', urgent: true, agentId: 'rex',
    impact: 'Production · IAM',
    summary: 'Grant temporary write access to prod-cache cluster to ship cache hotfix.',
    rationale: [
      'Prod cache hit-rate degraded to 64%',
      'Hotfix tested in staging, verified by Aria',
      'Access auto-revokes after 4 hours',
    ],
    meta: [['Requested', '22m ago'], ['Impact', 'High'], ['Budget', '$0'], ['Timeline', 'Now']],
    age: '22m',
    thread: [
      { actorId: 'rex', text: 'Cache hit-rate is at 64% and falling. Hotfix is ready and staging-verified. Need write access to prod-cache to deploy — auto-revokes in 4h.', age: '22m' },
    ],
  },
  {
    id: 'ap4', type: 'Hire', urgent: false, agentId: 'mira',
    impact: 'Team · 1 contractor',
    summary: 'Engage Lila Park as 6-week contractor for renewal-season CS overflow.',
    rationale: [
      '12 enterprise renewals in May–Jun',
      'Mira is at 87% utilization sustained',
      'Vetted contractor, prior engagement scored 4.8/5',
    ],
    meta: [['Requested', '3h ago'], ['Impact', 'Medium'], ['Budget', '$8,400'], ['Timeline', 'May 6 start']],
    age: '3h',
    thread: [
      { actorId: 'mira', text: "I'm at 87% utilization with 12 enterprise renewals coming in May–Jun. Lila Park is available and previously scored 4.8/5 with us.", age: '3h' },
      { actorId: 'mira', text: 'Total cost $8,400 for 6 weeks. She can start May 6.', age: '3h' },
    ],
  },
  {
    id: 'ap5', type: 'Spend', urgent: false, agentId: 'tess',
    impact: 'Vendors · $1,200',
    summary: 'Commission three illustrations from Studio Ono for the Q2 brand refresh.',
    rationale: [
      'Studio Ono delivered Q4 set on time and under budget',
      'Aligns with brand system v3 rollout',
    ],
    meta: [['Requested', '5h ago'], ['Impact', 'Low'], ['Budget', '$1,200'], ['Timeline', 'May 12']],
    age: '5h',
    thread: [
      { actorId: 'tess', text: "Studio Ono is our best fit for brand v3 illustrations — they delivered the Q4 set ahead of schedule. Three pieces at $400 each, delivery by May 12.", age: '5h' },
    ],
  },
];

export const PROJECTS: Project[] = [
  { id: 'p1', name: 'Checkout v2', mark: 'CO', color: '#4A90E2', status: 'active', progress: 0.68, leadId: 'aria', issues: 14 },
  { id: 'p2', name: 'Onboarding lift', mark: 'OB', color: '#A06CD5', status: 'active', progress: 0.41, leadId: 'juno', issues: 9 },
  { id: 'p3', name: 'Renewals Q2', mark: 'RN', color: '#34C98A', status: 'active', progress: 0.82, leadId: 'mira', issues: 6 },
  { id: 'p4', name: 'Cache rebuild', mark: 'CR', color: '#E8524A', status: 'paused', progress: 0.55, leadId: 'rex', issues: 3 },
  { id: 'p5', name: 'Brand v3', mark: 'BR', color: '#F5A623', status: 'active', progress: 0.30, leadId: 'tess', issues: 11 },
  { id: 'p6', name: 'Warehouse migration', mark: 'WM', color: '#C078E0', status: 'backlog', progress: 0.05, leadId: 'kit', issues: 4 },
];

export const findProject = (id: string): Project => PROJECTS.find(p => p.id === id) ?? PROJECTS[0];

export const ISSUES: Issue[] = [
  { id: 'NWL-318', title: 'Multi-currency price display drifts on iOS Safari', priority: 'high', status: 'progress', assigneeId: 'aria', due: 'Apr 30', projectId: 'p1' },
  { id: 'NWL-319', title: 'Cart reducer leaks promo code on session restore', priority: 'high', status: 'review', assigneeId: 'aria', due: 'Apr 29', projectId: 'p1' },
  { id: 'NWL-310', title: 'Funnel: instrument step-3 abandon event', priority: 'med', status: 'progress', assigneeId: 'juno', due: 'May 02', projectId: 'p2' },
  { id: 'NWL-322', title: 'Renewal email — A/B subject line "Save your seat"', priority: 'med', status: 'progress', assigneeId: 'mira', due: 'May 06', projectId: 'p3' },
  { id: 'NWL-301', title: 'Cache: switch to LRU with TTL refresh', priority: 'urgent', status: 'review', assigneeId: 'rex', due: 'Apr 28', projectId: 'p4' },
  { id: 'NWL-280', title: 'Brand v3 — illustration set 1 (3 pieces)', priority: 'low', status: 'backlog', assigneeId: 'tess', due: 'May 12', projectId: 'p5' },
  { id: 'NWL-291', title: 'Warehouse: incremental dbt models for orders', priority: 'med', status: 'backlog', assigneeId: 'kit', due: 'May 20', projectId: 'p6' },
  { id: 'NWL-265', title: 'Move Sentry to project-level DSNs', priority: 'low', status: 'done', assigneeId: 'aria', due: 'Apr 24', projectId: 'p1' },
  { id: 'NWL-258', title: 'Onboarding step copy review', priority: 'low', status: 'done', assigneeId: 'juno', due: 'Apr 22', projectId: 'p2' },
];

export const ACTIVITY: ActivityItem[] = [
  { kind: 'ship', actorId: 'aria', text: 'shipped checkout-v2.3.1 to prod', t: '12m', at: 'today' },
  { kind: 'ask', actorId: 'rex', text: 'requested IAM access — cache hotfix', t: '22m', at: 'today' },
  { kind: 'note', actorId: 'mira', text: 'noted renewal risk on Acme Corp', t: '48m', at: 'today' },
  { kind: 'spend', actorId: 'juno', text: 'used $42 on BigQuery analysis', t: '1h', at: 'today' },
  { kind: 'pause', actorId: 'kit', text: 'paused by Sasha — schema review', t: '2h', at: 'today' },
];

export const KPIS: KPI[] = [
  { label: 'Active agents', value: '5', sub: 'of 6', kind: 'active' },
  { label: 'Issues in flight', value: '23', sub: '+4 today', kind: 'issues' },
  { label: 'Spend MTD', value: '$1.81k', sub: 'of $6.5k', kind: 'spend' },
  { label: 'Approvals', value: '5', sub: '2 urgent', kind: 'approvals' },
];
