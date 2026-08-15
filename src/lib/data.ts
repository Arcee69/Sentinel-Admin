/**
 * Static demo dataset for SMHP Sentinel.
 * There is no API yet — every page reads from here.
 *
 * Records carry a `state` so the topbar campaign/scope filters can narrow them;
 * geography and per-state metrics live in `states.ts`.
 */

export { LGAS_BY_STATE, STATE_ACTIVITY } from "./states";
export type { StateActivity, Zone } from "./states";

export const CURRENT_USER = {
  name: "A. Olamide",
  initials: "AO",
  role: "National Admin",
  email: "a.olamide@smhp.ng",
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export type Trend = "up" | "down";

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  caption: string;
  tone: "primary" | "accent" | "warning" | "info";
}

export const DASHBOARD_KPIS: Kpi[] = [
  {
    label: "Total Reach",
    value: "20.8M",
    delta: "6.4%",
    trend: "up",
    caption: "Across all channels",
    tone: "primary",
  },
  {
    label: "Active Agents",
    value: "5,337",
    delta: "2.1%",
    trend: "up",
    caption: "12 online now",
    tone: "accent",
  },
  {
    label: "Sentiment Score",
    value: "60",
    delta: "1.2%",
    trend: "up",
    caption: "Net positive · 14d window",
    tone: "info",
  },
  {
    label: "Reports Today",
    value: "2,455",
    delta: "12.8%",
    trend: "up",
    caption: "+24 in last hour",
    tone: "warning",
  },
];

export interface CriticalAlert {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: "critical" | "high" | "medium" | "low";
  /** `null` = platform-wide, so it survives every geographic filter. */
  state: string | null;
}

export const CRITICAL_ALERTS: CriticalAlert[] = [
  {
    id: "a1",
    state: "Rivers",
    title: "Violence flagged: PU RV/PH/02/015",
    detail: "Port Harcourt — Rivers. Escalated to security desk.",
    time: "2m",
    severity: "critical",
  },
  {
    id: "a2",
    state: "Kano",
    title: "Sentiment dip in Kano (-6 pts)",
    detail: "Triggered by fuel price story in local press.",
    time: "12m",
    severity: "high",
  },
  {
    id: "a3",
    state: null,
    title: "Message gone viral",
    detail: '"Renewed Mandate — Youth Jobs Plan" hit 18.4k shares.',
    time: "34m",
    severity: "low",
  },
  {
    id: "a4",
    state: "FCT - Abuja",
    title: "Agent idle > 4h: Y. Danjuma",
    detail: "FCT - Abuja, Bwari Ward 2.",
    time: "1h",
    severity: "medium",
  },
];

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  meta: string;
  tone: "primary" | "accent" | "warning" | "destructive" | "info";
  /** `null` = platform-wide. */
  state: string | null;
}

export const ACTIVITY_STREAM: ActivityItem[] = [
  {
    id: "s1",
    state: "Lagos",
    actor: "Adekunle O.",
    action: "submitted a Rally report",
    meta: "Lagos · Ikeja · just now",
    tone: "primary",
  },
  {
    id: "s2",
    state: "Rivers",
    actor: "Emeka N.",
    action: "flagged a Violence incident",
    meta: "Rivers · PH/02/015 · 2m ago",
    tone: "destructive",
  },
  {
    id: "s3",
    state: "Kano",
    actor: "System",
    action: "auto-flagged sentiment dip",
    meta: "Kano · 12m ago",
    tone: "warning",
  },
  {
    id: "s4",
    state: "Kano",
    actor: "Hadiza M.",
    action: "completed task #t2 partially",
    meta: "Kano · Nassarawa · 18m ago",
    tone: "accent",
  },
  {
    id: "s5",
    state: null,
    actor: "Distribution Engine",
    action: "delivered to 412k recipients",
    meta: "All states · 1h ago",
    tone: "info",
  },
  {
    id: "s6",
    state: "Anambra",
    actor: "Chinedu E.",
    action: "uploaded Town Hall photos",
    meta: "Anambra · Onitsha North · 1h ago",
    tone: "primary",
  },
];

/* ------------------------------------------------------------------ */
/* Intelligence — SMHP Pulse                                           */
/* ------------------------------------------------------------------ */

export const VOTER_SEGMENTS = [
  { label: "Youth (18-35)", share: 38, delta: 4.2 },
  { label: "Traders & SMEs", share: 24, delta: 1.8 },
  { label: "Swing Voters", share: 20, delta: 2.4 },
  { label: "Civil Servants", share: 18, delta: 0.6 },
];

export const SENTIMENT = {
  net: 62,
  positive: 58,
  neutral: 27,
  negative: 15,
};

export const KEY_ISSUES = [
  { label: "Economy", score: 92 },
  { label: "Security", score: 88 },
  { label: "Fuel Prices", score: 81 },
  { label: "Power Supply", score: 71 },
  { label: "Youth Jobs", score: 66 },
  { label: "Education", score: 54 },
  { label: "Healthcare", score: 49 },
  { label: "Infrastructure", score: 47 },
];

export interface Influencer {
  initials: string;
  name: string;
  role: string;
  state: string;
  ward: string;
  strength: number;
}

export const INFLUENCERS: Influencer[] = [
  {
    initials: "MB",
    state: "Kano",
    name: "Alhaji Musa Bello",
    role: "Ward Leader",
    ward: "Nassarawa 03",
    strength: 94,
  },
  {
    initials: "IY",
    state: "Katsina",
    name: "Sarki Idris Yusuf",
    role: "Traditional Council",
    ward: "Katsina 01",
    strength: 90,
  },
  {
    initials: "IO",
    state: "Anambra",
    name: "Hon. Ifeoma Okeke",
    role: "Youth Mobilizer",
    ward: "Onitsha North 01",
    strength: 88,
  },
  {
    initials: "TA",
    state: "Lagos",
    name: "Pastor Tunde Adebayo",
    role: "Faith Network",
    ward: "Ikeja 04",
    strength: 86,
  },
  {
    initials: "AL",
    state: "FCT - Abuja",
    name: "Dr. Aisha Lawal",
    role: "Women's Caucus",
    ward: "Wuse 02",
    strength: 82,
  },
  {
    initials: "EN",
    state: "Abia",
    name: "Comrade Eze Nwankwo",
    role: "Trade Union",
    ward: "Aba South 05",
    strength: 79,
  },
];

/* ------------------------------------------------------------------ */
/* Campaign Ops                                                        */
/* ------------------------------------------------------------------ */

export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type Priority = "High" | "Medium" | "Low";

/** The three kinds of work a field agent is dispatched to do. */
export type TaskCategory = "Opinion Poll" | "Election Report" | "Incident Report";

export interface TaskCategoryDef {
  id: TaskCategory;
  blurb: string;
  /** What the agent is asked to collect or report on. */
  subjects: string[];
}

export const TASK_CATEGORIES: TaskCategoryDef[] = [
  {
    id: "Opinion Poll",
    blurb: "Gather voter feedback on the candidates and why they rate them best.",
    subjects: [
      "Candidate preference & reasons",
      "Why voters rate our candidate best",
      "Perception of rival candidates",
      "Top issues driving the choice",
      "Undecided voter sentiment",
    ],
  },
  {
    id: "Election Report",
    blurb: "Report ward-level accreditation, turnout and collation.",
    subjects: [
      "Ward voter accreditation",
      "Votes cast at the ward",
      "Polling unit opening status",
      "Result collation at ward",
      "BVAS & materials status",
    ],
  },
  {
    id: "Incident Report",
    blurb: "Flag violence, intimidation, vote buying and other malpractice.",
    subjects: [
      "Election violence",
      "Voter intimidation",
      "Vote buying",
      "Ballot box snatching",
      "Underage voting",
      "Late or missing materials",
    ],
  },
];

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  /** The specific focus within the category. */
  subject: string;
  priority: Priority;
  assignee: string;
  assigneeId: string;
  state: string;
  lga: string;
  due: string;
  status: TaskStatus;
  /** Campaign this task belongs to. */
  campaignId: string;
  notes?: string;
}

export const TASKS: Task[] = [
  {
    id: "t1",
    title: "Poll 200 voters in Ikeja on candidate preference",
    category: "Opinion Poll",
    subject: "Candidate preference & reasons",
    priority: "High",
    assignee: "Adekunle Omotayo",
    assigneeId: "ag1",
    state: "Lagos",
    lga: "Ikeja",
    due: "Today 6pm",
    status: "In Progress",
    campaignId: "c2",
  },
  {
    id: "t2",
    title: "Report Ward 3 accreditation figures",
    category: "Election Report",
    subject: "Ward voter accreditation",
    priority: "Medium",
    assignee: "Hadiza Muhammad",
    assigneeId: "ag2",
    state: "Kano",
    lga: "Nassarawa",
    due: "Tomorrow",
    status: "Pending",
    campaignId: "c3",
  },
  {
    id: "t3",
    title: "Investigate vote-buying allegation at Chikun",
    category: "Incident Report",
    subject: "Vote buying",
    priority: "High",
    assignee: "Bilkisu Abdullahi",
    assigneeId: "ag4",
    state: "Kaduna",
    lga: "Chikun",
    due: "Fri",
    status: "In Progress",
    campaignId: "c3",
  },
  {
    id: "t4",
    title: "Submit votes-cast tally for Onitsha North",
    category: "Election Report",
    subject: "Votes cast at the ward",
    priority: "Medium",
    assignee: "Chinedu Eze",
    assigneeId: "ag3",
    state: "Anambra",
    lga: "Onitsha North",
    due: "Wed",
    status: "Pending",
    campaignId: "c1",
  },
  {
    id: "t5",
    title: "Survey Ibadan North on top voter issues",
    category: "Opinion Poll",
    subject: "Top issues driving the choice",
    priority: "Low",
    assignee: "Tope Fashola",
    assigneeId: "ag5",
    state: "Oyo",
    lga: "Ibadan North",
    due: "Thu",
    status: "In Progress",
    campaignId: "c1",
  },
  {
    id: "t6",
    title: "Log intimidation reports at PH Ward 2",
    category: "Incident Report",
    subject: "Voter intimidation",
    priority: "High",
    assignee: "Emeka Nwosu",
    assigneeId: "ag6",
    state: "Rivers",
    lga: "Port Harcourt",
    due: "Mon",
    status: "Completed",
    campaignId: "c1",
  },
];

export const REPORT_TYPES = [
  "Rally",
  "Door-to-Door",
  "Town Hall",
  "Media",
  "Distribution",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export interface FieldReport {
  id: string;
  type: ReportType;
  /** Agent who filed it — joins to AGENTS.id. */
  agentId: string;
  agent: string;
  state: string;
  location: string;
  time: string;
  body: string;
}

export const FIELD_REPORTS: FieldReport[] = [
  {
    id: "r1",
    agentId: "ag1",
    state: "Lagos",
    type: "Rally",
    agent: "Adekunle O.",
    location: "Lagos/Ikeja",
    time: "2m ago",
    body: "Rally at Allen Roundabout drew ~2,400 attendees. Strong youth turnout.",
  },
  {
    id: "r2",
    agentId: "ag2",
    state: "Kano",
    type: "Door-to-Door",
    agent: "Hadiza M.",
    location: "Kano/Nassarawa",
    time: "8m ago",
    body: "Canvassed 312 households. 68% receptive, 14% undecided.",
  },
  {
    id: "r3",
    agentId: "ag3",
    state: "Anambra",
    type: "Town Hall",
    agent: "Chinedu E.",
    location: "Anambra/Onitsha North",
    time: "21m ago",
    body: "Town hall with traders. Top concern: bridge tolls and security.",
  },
  {
    id: "r4",
    agentId: "ag4",
    state: "Kaduna",
    type: "Distribution",
    agent: "Bilkisu A.",
    location: "Kaduna/Chikun",
    time: "44m ago",
    body: "Distributed 1,200 leaflets and 400 branded caps.",
  },
  {
    id: "r5",
    agentId: "ag5",
    state: "Oyo",
    type: "Media",
    agent: "Tope F.",
    location: "Oyo/Ibadan North",
    time: "1h ago",
    body: "Radio interview on Splash FM, 45 min, positive call-ins.",
  },
  {
    id: "r6",
    agentId: "ag6",
    state: "Rivers",
    type: "Rally",
    agent: "Emeka N.",
    location: "Rivers/Port Harcourt",
    time: "1h ago",
    body: "Waterfront rally — 1,800 attendees, peaceful.",
  },
  {
    id: "r7",
    agentId: "ag7",
    state: "FCT - Abuja",
    type: "Door-to-Door",
    agent: "Yusuf D.",
    location: "FCT - Abuja/Bwari",
    time: "2h ago",
    body: "180 doors. Concerns about water supply dominant.",
  },
  {
    id: "r8",
    agentId: "ag1",
    state: "Lagos",
    type: "Door-to-Door",
    agent: "Adekunle O.",
    location: "Lagos/Ikeja",
    time: "3h ago",
    body: "Canvassed Opebi axis — 210 doors, 71% receptive to the jobs plan.",
  },
  {
    id: "r9",
    agentId: "ag1",
    state: "Lagos",
    type: "Media",
    agent: "Adekunle O.",
    location: "Lagos/Ikeja",
    time: "yesterday",
    body: "Placed campaign spot on Wazobia FM drive-time slot.",
  },
  {
    id: "r10",
    agentId: "ag2",
    state: "Kano",
    type: "Town Hall",
    agent: "Hadiza M.",
    location: "Kano/Nassarawa",
    time: "5h ago",
    body: "Women's caucus town hall, 340 attendees. Fuel price dominated Q&A.",
  },
  {
    id: "r11",
    agentId: "ag3",
    state: "Anambra",
    type: "Distribution",
    agent: "Chinedu E.",
    location: "Anambra/Onitsha North",
    time: "yesterday",
    body: "Handed out 800 flyers at Onitsha Main Market.",
  },
  {
    id: "r12",
    agentId: "ag4",
    state: "Kaduna",
    type: "Rally",
    agent: "Bilkisu A.",
    location: "Kaduna/Chikun",
    time: "6h ago",
    body: "Ward rally at Sabon Tasha — 950 attendees, no incidents.",
  },
  {
    id: "r13",
    agentId: "ag5",
    state: "Oyo",
    type: "Door-to-Door",
    agent: "Tope F.",
    location: "Oyo/Ibadan North",
    time: "yesterday",
    body: "148 households in Bodija. Power supply the top complaint.",
  },
  {
    id: "r14",
    agentId: "ag6",
    state: "Rivers",
    type: "Town Hall",
    agent: "Emeka N.",
    location: "Rivers/Port Harcourt",
    time: "4h ago",
    body: "Youth town hall at Diobu — 520 attendees, jobs plan well received.",
  },
  {
    id: "r15",
    agentId: "ag6",
    state: "Rivers",
    type: "Distribution",
    agent: "Emeka N.",
    location: "Rivers/Port Harcourt",
    time: "yesterday",
    body: "Distributed 600 posters across Ward 2 polling units.",
  },
  {
    id: "r16",
    agentId: "ag8",
    state: "Imo",
    type: "Rally",
    agent: "Ngozi O.",
    location: "Imo/Owerri",
    time: "8h ago",
    body: "Owerri municipal rally — 1,100 attendees, strong trader turnout.",
  },
];

/* ------------------------------------------------------------------ */
/* Distribution                                                        */
/* ------------------------------------------------------------------ */

export const CHANNELS = [
  { name: "WhatsApp Groups", active: 1842, reach: "612k", tone: "accent" as const },
  { name: "Telegram Channels", active: 248, reach: "284k", tone: "info" as const },
  { name: "SMS Broadcasts", active: 36, reach: "1.4M", tone: "warning" as const },
];

export const AUDIENCES = ["All", "Youth", "Traders", "Civil", "Swing"] as const;

export const DISTRIBUTION_STATES = [
  "All",
  "Lagos",
  "FCT - Abuja",
  "Kano",
  "Rivers",
  "Kaduna",
  "Oyo",
  "Anambra",
  "Enugu",
  "Plateau",
  "Borno",
  "Delta",
  "Edo",
];

export type CampaignStatus = "Viral" | "Delivered" | "Sent" | "Draft";

export interface LiveCampaign {
  id: string;
  title: string;
  channel: string;
  audience: string;
  state: string;
  sent: string;
  status: CampaignStatus;
  preview: string;
  reach: number;
  engagement: number;
  shares: number;
}

export const LIVE_CAMPAIGNS: LiveCampaign[] = [
  {
    id: "c1",
    title: "Renewed Mandate — Youth Jobs Plan",
    channel: "WhatsApp",
    audience: "Youth",
    state: "All",
    sent: "2h ago",
    status: "Viral",
    preview: "Our 5-point plan delivers 2M jobs in 24 months...",
    reach: 412_000,
    engagement: 38,
    shares: 18_400,
  },
  {
    id: "c2",
    title: "Northern Outreach — Kano Visit",
    channel: "Telegram",
    audience: "All",
    state: "Kano",
    sent: "1d ago",
    status: "Sent",
    preview: "His Excellency arrives Kano Monday...",
    reach: 142_000,
    engagement: 31,
    shares: 6_100,
  },
  {
    id: "c3",
    title: "Lagos Traders Town Hall — Sat 10AM",
    channel: "WhatsApp",
    audience: "Traders",
    state: "Lagos",
    sent: "5h ago",
    status: "Delivered",
    preview: "Join us at Tafawa Balewa Square...",
    reach: 86_000,
    engagement: 24,
    shares: 3_200,
  },
  {
    id: "c4",
    title: "Power Supply Position Paper",
    channel: "WhatsApp",
    audience: "All",
    state: "All",
    sent: "—",
    status: "Draft",
    preview: "How we will deliver 24/7 power...",
    reach: 0,
    engagement: 0,
    shares: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Command Center                                                      */
/* ------------------------------------------------------------------ */

export type PuStatus = "Open" | "Delayed" | "Issue" | "Closed";

export interface PollingUnit {
  id: string;
  code: string;
  name: string;
  state: string;
  lga: string;
  ward: string;
  status: PuStatus;
  time: string;
  accredited: number;
  registered: number;
}

export const POLLING_UNITS: PollingUnit[] = [
  {
    id: "p1",
    code: "LA/IK/04/012",
    name: "Allen Avenue Primary School",
    state: "Lagos",
    lga: "Ikeja",
    ward: "Ward 4",
    status: "Open",
    time: "1m ago",
    accredited: 612,
    registered: 842,
  },
  {
    id: "p2",
    code: "KN/NS/03/008",
    name: "Nassarawa Town Hall",
    state: "Kano",
    lga: "Nassarawa",
    ward: "Ward 3",
    status: "Delayed",
    time: "3m ago",
    accredited: 280,
    registered: 1_120,
  },
  {
    id: "p3",
    code: "RV/PH/02/015",
    name: "Port Harcourt City Hall",
    state: "Rivers",
    lga: "Port Harcourt",
    ward: "Ward 2",
    status: "Issue",
    time: "just now",
    accredited: 410,
    registered: 980,
  },
  {
    id: "p4",
    code: "AN/ON/01/004",
    name: "Onitsha Main Market",
    state: "Anambra",
    lga: "Onitsha North",
    ward: "Ward 1",
    status: "Open",
    time: "5m ago",
    accredited: 540,
    registered: 760,
  },
  {
    id: "p5",
    code: "KD/CK/05/021",
    name: "Chikun Community Centre",
    state: "Kaduna",
    lga: "Chikun",
    ward: "Ward 5",
    status: "Open",
    time: "8m ago",
    accredited: 420,
    registered: 690,
  },
  {
    id: "p6",
    code: "FC/BW/02/003",
    name: "Bwari Area Council Hall",
    state: "FCT - Abuja",
    lga: "Bwari",
    ward: "Ward 2",
    status: "Open",
    time: "11m ago",
    accredited: 330,
    registered: 540,
  },
  {
    id: "p7",
    code: "OY/IN/06/017",
    name: "Ibadan North Secretariat",
    state: "Oyo",
    lga: "Ibadan North",
    ward: "Ward 6",
    status: "Closed",
    time: "21m ago",
    accredited: 580,
    registered: 612,
  },
];

export type IncidentSeverity = "Critical" | "High" | "Medium" | "Low";
export type IncidentStatus = "Open" | "Escalated" | "Resolved";

export interface Incident {
  id: string;
  type: string;
  unit: string;
  state: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
}

export const INCIDENTS: Incident[] = [
  {
    id: "i1",
    type: "Violence",
    unit: "RV/PH/02/015",
    state: "Rivers",
    severity: "Critical",
    status: "Escalated",
  },
  {
    id: "i2",
    type: "Delay",
    unit: "KN/NS/03/008",
    state: "Kano",
    severity: "Medium",
    status: "Open",
  },
  {
    id: "i3",
    type: "Malpractice",
    unit: "KD/CK/05/021",
    state: "Kaduna",
    severity: "High",
    status: "Open",
  },
  {
    id: "i4",
    type: "Logistics",
    unit: "AD/YN/01/006",
    state: "Adamawa",
    severity: "Low",
    status: "Resolved",
  },
];

export const PRIORITY_ALERTS = [
  {
    id: "pa1",
    title: "Violence — RV/PH/02/015",
    time: "2m ago",
    body: "Skirmish reported between rival supporters. Security on scene.",
    state: "Rivers",
    severity: "Critical" as IncidentSeverity,
  },
  {
    id: "pa2",
    title: "Delay — KN/NS/03/008",
    time: "8m ago",
    body: "BVAS device malfunction. Backup en route.",
    state: "Kano",
    severity: "Medium" as IncidentSeverity,
  },
  {
    id: "pa3",
    title: "Malpractice — KD/CK/05/021",
    time: "14m ago",
    body: "Allegation of vote-buying. Observer dispatched.",
    state: "Kaduna",
    severity: "High" as IncidentSeverity,
  },
];

/* ------------------------------------------------------------------ */
/* Reports & Analytics                                                 */
/* ------------------------------------------------------------------ */

/** 12 weeks of engagement. reach/shares in thousands, engagement in %. */
export const ENGAGEMENT_TRENDS = [
  { week: "W1", reach: 4_200, engagement: 18, shares: 620 },
  { week: "W2", reach: 5_100, engagement: 21, shares: 780 },
  { week: "W3", reach: 4_800, engagement: 19, shares: 700 },
  { week: "W4", reach: 6_400, engagement: 24, shares: 980 },
  { week: "W5", reach: 7_200, engagement: 26, shares: 1_140 },
  { week: "W6", reach: 6_900, engagement: 25, shares: 1_060 },
  { week: "W7", reach: 8_600, engagement: 29, shares: 1_420 },
  { week: "W8", reach: 9_800, engagement: 31, shares: 1_680 },
  { week: "W9", reach: 11_400, engagement: 33, shares: 2_050 },
  { week: "W10", reach: 13_900, engagement: 35, shares: 2_480 },
  { week: "W11", reach: 17_200, engagement: 37, shares: 3_120 },
  { week: "W12", reach: 20_800, engagement: 39, shares: 3_640 },
];

/** 14-day net sentiment score. */
export const SENTIMENT_TREND = [
  { day: "D1", score: 51 },
  { day: "D2", score: 53 },
  { day: "D3", score: 52 },
  { day: "D4", score: 55 },
  { day: "D5", score: 57 },
  { day: "D6", score: 54 },
  { day: "D7", score: 56 },
  { day: "D8", score: 58 },
  { day: "D9", score: 61 },
  { day: "D10", score: 59 },
  { day: "D11", score: 60 },
  { day: "D12", score: 63 },
  { day: "D13", score: 61 },
  { day: "D14", score: 62 },
];

/* ------------------------------------------------------------------ */
/* Agents & Structure                                                  */
/* ------------------------------------------------------------------ */

export type AgentStatus = "active" | "idle" | "offline";

export const AGENT_ROLES = [
  "LGA Supervisor",
  "Ward Coordinator",
  "Field Agent",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export interface Agent {
  id: string;
  initials: string;
  name: string;
  role: AgentRole;
  state: string;
  lga: string;
  reports: number;
  taskPct: number;
  status: AgentStatus;
  /** Present on agents provisioned through the app. */
  email?: string;
  phone?: string;
}

export const AGENTS: Agent[] = [
  {
    id: "ag1",
    email: "a.omotayo@smhp.ng",
    phone: "08031240918",
    initials: "AO",
    name: "Adekunle Omotayo",
    role: "LGA Supervisor",
    state: "Lagos",
    lga: "Ikeja",
    reports: 47,
    taskPct: 92,
    status: "active",
  },
  {
    id: "ag2",
    email: "h.muhammad@smhp.ng",
    phone: "08065512044",
    initials: "HM",
    name: "Hadiza Muhammad",
    role: "Ward Coordinator",
    state: "Kano",
    lga: "Nassarawa",
    reports: 38,
    taskPct: 88,
    status: "active",
  },
  {
    id: "ag3",
    email: "c.eze@smhp.ng",
    phone: "07039884120",
    initials: "CE",
    name: "Chinedu Eze",
    role: "Field Agent",
    state: "Anambra",
    lga: "Onitsha North",
    reports: 29,
    taskPct: 76,
    status: "idle",
  },
  {
    id: "ag4",
    email: "b.abdullahi@smhp.ng",
    phone: "08122076611",
    initials: "BA",
    name: "Bilkisu Abdullahi",
    role: "Ward Coordinator",
    state: "Kaduna",
    lga: "Chikun",
    reports: 41,
    taskPct: 90,
    status: "active",
  },
  {
    id: "ag5",
    email: "t.fashola@smhp.ng",
    phone: "08094431205",
    initials: "TF",
    name: "Tope Fashola",
    role: "Field Agent",
    state: "Oyo",
    lga: "Ibadan North",
    reports: 22,
    taskPct: 68,
    status: "active",
  },
  {
    id: "ag6",
    email: "e.nwosu@smhp.ng",
    phone: "08037719260",
    initials: "EN",
    name: "Emeka Nwosu",
    role: "LGA Supervisor",
    state: "Rivers",
    lga: "Port Harcourt",
    reports: 52,
    taskPct: 94,
    status: "active",
  },
  {
    id: "ag7",
    email: "y.danjuma@smhp.ng",
    phone: "09022648015",
    initials: "YD",
    name: "Yusuf Danjuma",
    role: "Field Agent",
    state: "FCT - Abuja",
    lga: "Bwari",
    reports: 18,
    taskPct: 71,
    status: "offline",
  },
  {
    id: "ag8",
    email: "n.okafor@smhp.ng",
    phone: "08156390477",
    initials: "NO",
    name: "Ngozi Okafor",
    role: "Ward Coordinator",
    state: "Imo",
    lga: "Owerri",
    reports: 33,
    taskPct: 84,
    status: "active",
  },
];


/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */


export const PERMISSIONS = [
  { capability: "View all states", admin: true, state: false, agent: false },
  { capability: "Create campaigns", admin: true, state: false, agent: false },
  { capability: "Manage agents", admin: true, state: true, agent: false },
  { capability: "Submit field reports", admin: true, state: true, agent: true },
  { capability: "Flag incidents", admin: true, state: true, agent: true },
  { capability: "Send distribution", admin: true, state: true, agent: false },
];

export const NOTIFICATION_PREFS = [
  { id: "n1", label: "Critical incident alerts", detail: "Push + SMS to the security desk", on: true },
  { id: "n2", label: "Sentiment dip warnings", detail: "When net sentiment drops 5+ pts", on: true },
  { id: "n3", label: "Agent idle alerts", detail: "No activity for over 4 hours", on: true },
  { id: "n4", label: "Daily executive summary", detail: "Delivered 07:00 WAT", on: false },
  { id: "n5", label: "Viral content alerts", detail: "Message passes 10k shares", on: true },
  { id: "n6", label: "Polling unit status changes", detail: "Open · delayed · issue · closed", on: false },
];
