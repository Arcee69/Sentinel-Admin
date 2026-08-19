/**
 * 2027 Election Master Matrix — races, candidates, parties, statutory
 * milestones and the provenance ledger behind them.
 *
 * People and figures here are illustrative demo data, not real declarations.
 */

export type RaceStatus =
  | "planned"
  | "scheduled"
  | "primaries"
  | "campaign"
  | "polling"
  | "counting"
  | "declared"
  | "disputed"
  | "concluded"
  | "postponed"
  | "cancelled";

export type Tier = "federal" | "state" | "local";

export const RACE_STATUSES: RaceStatus[] = [
  "planned",
  "scheduled",
  "primaries",
  "campaign",
  "polling",
  "counting",
  "declared",
  "disputed",
  "concluded",
  "postponed",
  "cancelled",
];

export interface ElectionType {
  name: string;
  tier: Tier;
}

export interface Race {
  id: string;
  title: string;
  type: ElectionType;
  /** `null` for nationwide races. */
  state: string | null;
  lga?: string;
  date: string;
  status: RaceStatus;
  registeredVoters: number;
  isKeyRace: boolean;
  incumbent?: string;
}

export const RACES: Race[] = [
  {
    id: "e1",
    title: "Presidential Election",
    type: { name: "Presidential", tier: "federal" },
    state: null,
    date: "2027-02-20",
    status: "campaign",
    registeredVoters: 93_469_008,
    isKeyRace: true,
    incumbent: "Dr. Bello Danjuma",
  },
  {
    id: "e2",
    title: "Senate — Lagos West",
    type: { name: "Senatorial", tier: "federal" },
    state: "Lagos",
    date: "2027-02-20",
    status: "campaign",
    registeredVoters: 2_241_090,
    isKeyRace: true,
    incumbent: "Sen. Adewale Ogunbiyi",
  },
  {
    id: "e3",
    title: "Senate — Kano Central",
    type: { name: "Senatorial", tier: "federal" },
    state: "Kano",
    date: "2027-02-20",
    status: "primaries",
    registeredVoters: 1_982_340,
    isKeyRace: true,
    incumbent: "Sen. Ibrahim Sanusi",
  },
  {
    id: "e4",
    title: "Senate — Rivers South-East",
    type: { name: "Senatorial", tier: "federal" },
    state: "Rivers",
    date: "2027-02-20",
    status: "scheduled",
    registeredVoters: 1_104_552,
    isKeyRace: false,
    incumbent: "Sen. Boma Wokoma",
  },
  {
    id: "e5",
    title: "Senate — Kaduna North",
    type: { name: "Senatorial", tier: "federal" },
    state: "Kaduna",
    date: "2027-02-20",
    status: "primaries",
    registeredVoters: 1_318_770,
    isKeyRace: false,
  },
  {
    id: "e6",
    title: "House of Reps — Ikeja Federal Constituency",
    type: { name: "House of Representatives", tier: "federal" },
    state: "Lagos",
    lga: "Ikeja",
    date: "2027-02-20",
    status: "campaign",
    registeredVoters: 412_880,
    isKeyRace: false,
    incumbent: "Hon. Folake Adeyemi",
  },
  {
    id: "e7",
    title: "House of Reps — Nassarawa Federal Constituency",
    type: { name: "House of Representatives", tier: "federal" },
    state: "Kano",
    lga: "Nassarawa",
    date: "2027-02-20",
    status: "primaries",
    registeredVoters: 388_140,
    isKeyRace: false,
  },
  {
    id: "e8",
    title: "House of Reps — Port Harcourt II",
    type: { name: "House of Representatives", tier: "federal" },
    state: "Rivers",
    lga: "Port Harcourt",
    date: "2027-02-20",
    status: "scheduled",
    registeredVoters: 296_410,
    isKeyRace: false,
  },
  {
    id: "e9",
    title: "House of Reps — Onitsha North/South",
    type: { name: "House of Representatives", tier: "federal" },
    state: "Anambra",
    lga: "Onitsha North",
    date: "2027-02-20",
    status: "scheduled",
    registeredVoters: 271_004,
    isKeyRace: false,
  },
  {
    id: "e10",
    title: "Lagos State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Lagos",
    date: "2027-03-06",
    status: "campaign",
    registeredVoters: 7_060_195,
    isKeyRace: true,
    incumbent: "Gov. Segun Alabi",
  },
  {
    id: "e11",
    title: "Kano State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Kano",
    date: "2027-03-06",
    status: "primaries",
    registeredVoters: 5_921_774,
    isKeyRace: true,
    incumbent: "Gov. Aminu Garba",
  },
  {
    id: "e12",
    title: "Rivers State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Rivers",
    date: "2027-03-06",
    status: "disputed",
    registeredVoters: 3_537_190,
    isKeyRace: true,
    incumbent: "Gov. Tamuno Briggs",
  },
  {
    id: "e13",
    title: "Kaduna State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Kaduna",
    date: "2027-03-06",
    status: "scheduled",
    registeredVoters: 4_335_208,
    isKeyRace: true,
  },
  {
    id: "e14",
    title: "Oyo State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Oyo",
    date: "2027-03-06",
    status: "scheduled",
    registeredVoters: 3_248_617,
    isKeyRace: false,
    incumbent: "Gov. Kayode Ilesanmi",
  },
  {
    id: "e15",
    title: "Anambra State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Anambra",
    date: "2026-11-07",
    status: "declared",
    registeredVoters: 2_655_111,
    isKeyRace: false,
    incumbent: "Gov. Chukwuma Obiora",
  },
  {
    id: "e16",
    title: "Enugu State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Enugu",
    date: "2027-03-06",
    status: "scheduled",
    registeredVoters: 1_935_442,
    isKeyRace: false,
  },
  {
    id: "e17",
    title: "Plateau State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Plateau",
    date: "2027-03-06",
    status: "postponed",
    registeredVoters: 2_130_808,
    isKeyRace: false,
  },
  {
    id: "e18",
    title: "Borno State Governorship",
    type: { name: "Governorship", tier: "state" },
    state: "Borno",
    date: "2027-03-06",
    status: "planned",
    registeredVoters: 2_315_956,
    isKeyRace: false,
  },
  {
    id: "e19",
    title: "Lagos State Assembly — Surulere I",
    type: { name: "State House of Assembly", tier: "state" },
    state: "Lagos",
    lga: "Surulere",
    date: "2027-03-06",
    status: "campaign",
    registeredVoters: 188_402,
    isKeyRace: false,
  },
  {
    id: "e20",
    title: "Kano State Assembly — Dala",
    type: { name: "State House of Assembly", tier: "state" },
    state: "Kano",
    lga: "Dala",
    date: "2027-03-06",
    status: "primaries",
    registeredVoters: 164_770,
    isKeyRace: false,
  },
  {
    id: "e21",
    title: "Kaduna State Assembly — Chikun",
    type: { name: "State House of Assembly", tier: "state" },
    state: "Kaduna",
    lga: "Chikun",
    date: "2027-03-06",
    status: "scheduled",
    registeredVoters: 142_318,
    isKeyRace: false,
  },
  {
    id: "e22",
    title: "Ikeja LGA Chairmanship",
    type: { name: "LGA Chairmanship", tier: "local" },
    state: "Lagos",
    lga: "Ikeja",
    date: "2026-07-25",
    status: "concluded",
    registeredVoters: 313_664,
    isKeyRace: false,
    incumbent: "Hon. Musa Balogun",
  },
  {
    id: "e23",
    title: "Surulere LGA Chairmanship",
    type: { name: "LGA Chairmanship", tier: "local" },
    state: "Lagos",
    lga: "Surulere",
    date: "2026-07-25",
    status: "concluded",
    registeredVoters: 288_119,
    isKeyRace: false,
  },
  {
    id: "e24",
    title: "Port Harcourt LGA Chairmanship",
    type: { name: "LGA Chairmanship", tier: "local" },
    state: "Rivers",
    lga: "Port Harcourt",
    date: "2026-10-17",
    status: "scheduled",
    registeredVoters: 402_887,
    isKeyRace: false,
  },
  {
    id: "e25",
    title: "Nassarawa Ward 3 Councillorship",
    type: { name: "Councillorship", tier: "local" },
    state: "Kano",
    lga: "Nassarawa",
    date: "2026-10-17",
    status: "planned",
    registeredVoters: 41_206,
    isKeyRace: false,
  },
  {
    id: "e26",
    title: "Owerri Municipal Councillorship",
    type: { name: "Councillorship", tier: "local" },
    state: "Imo",
    lga: "Owerri",
    date: "2026-10-17",
    status: "cancelled",
    registeredVoters: 38_940,
    isKeyRace: false,
  },
];

/* ------------------------------------------------------------------ */
/* Parties                                                             */
/* ------------------------------------------------------------------ */

export interface Party {
  id: string;
  name: string;
  acronym: string;
  color: string;
  ideology?: string;
  foundedYear?: number;
  isNational: boolean;
}

export const PARTIES: Party[] = [
  {
    id: "p1",
    name: "Social Mandate Heritage Party",
    acronym: "SMHP",
    color: "#2f9bf0",
    ideology: "Social democracy",
    foundedYear: 2014,
    isNational: true,
  },
  {
    id: "p2",
    name: "National Unity Congress",
    acronym: "NUC",
    color: "#28b485",
    ideology: "Centre-right",
    foundedYear: 2009,
    isNational: true,
  },
  {
    id: "p3",
    name: "Peoples Democratic Alliance",
    acronym: "PDA",
    color: "#e0574f",
    ideology: "Big tent",
    foundedYear: 1998,
    isNational: true,
  },
  {
    id: "p4",
    name: "Labour & Workers Front",
    acronym: "LWF",
    color: "#c084fc",
    ideology: "Labourism",
    foundedYear: 2002,
    isNational: true,
  },
  {
    id: "p5",
    name: "New Nigeria Peoples Movement",
    acronym: "NNPM",
    color: "#f0a93b",
    ideology: "Populist",
    foundedYear: 2019,
    isNational: false,
  },
  {
    id: "p6",
    name: "Accord Development Coalition",
    acronym: "ADC",
    color: "#4ec9d4",
    ideology: "Progressive",
    foundedYear: 2006,
    isNational: false,
  },
];

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

export interface Candidate {
  id: string;
  fullName: string;
  office?: string;
  homeState?: string;
  age?: number;
  partyAcronym?: string;
}

export const CANDIDATES: Candidate[] = [
  { id: "cd1", fullName: "Dr. Bello Danjuma", office: "President", homeState: "Bauchi", age: 61, partyAcronym: "SMHP" },
  { id: "cd2", fullName: "Amaka Nwachukwu", office: "President", homeState: "Anambra", age: 54, partyAcronym: "NUC" },
  { id: "cd3", fullName: "Hassan Yakubu", office: "President", homeState: "Katsina", age: 58, partyAcronym: "PDA" },
  { id: "cd4", fullName: "Comfort Ekpo", office: "President", homeState: "Akwa Ibom", age: 49, partyAcronym: "LWF" },
  { id: "cd5", fullName: "Gov. Segun Alabi", office: "Governor — Lagos", homeState: "Lagos", age: 57, partyAcronym: "SMHP" },
  { id: "cd6", fullName: "Bimbo Ogunleye", office: "Governor — Lagos", homeState: "Lagos", age: 46, partyAcronym: "NUC" },
  { id: "cd7", fullName: "Gov. Aminu Garba", office: "Governor — Kano", homeState: "Kano", age: 63, partyAcronym: "PDA" },
  { id: "cd8", fullName: "Zainab Rufai", office: "Governor — Kano", homeState: "Kano", age: 44, partyAcronym: "SMHP" },
  { id: "cd9", fullName: "Gov. Tamuno Briggs", office: "Governor — Rivers", homeState: "Rivers", age: 55, partyAcronym: "PDA" },
  { id: "cd10", fullName: "Sen. Adewale Ogunbiyi", office: "Senator — Lagos West", homeState: "Lagos", age: 60, partyAcronym: "SMHP" },
  { id: "cd11", fullName: "Sen. Ibrahim Sanusi", office: "Senator — Kano Central", homeState: "Kano", age: 52, partyAcronym: "NNPM" },
  { id: "cd12", fullName: "Hon. Folake Adeyemi", office: "Rep — Ikeja", homeState: "Lagos", age: 41, partyAcronym: "SMHP" },
  { id: "cd13", fullName: "Emeka Obiefuna", office: "Rep — Onitsha North/South", homeState: "Anambra", age: 47, partyAcronym: "LWF" },
  { id: "cd14", fullName: "Halima Suleiman", homeState: "Kaduna", age: 39, partyAcronym: "ADC" },
];

/* ------------------------------------------------------------------ */
/* Statutory lifecycle                                                 */
/* ------------------------------------------------------------------ */

export interface Milestone {
  id: string;
  label: string;
  date: string;
  phase: RaceStatus;
  completed: boolean;
  notes?: string;
}

export const MILESTONES: Milestone[] = [
  {
    id: "m1",
    label: "Notice of Election published",
    date: "2026-02-26",
    phase: "scheduled",
    completed: true,
    notes: "Issued 360 days before the presidential poll, per the Electoral Act.",
  },
  {
    id: "m2",
    label: "Party primaries window opens",
    date: "2026-04-06",
    phase: "primaries",
    completed: true,
  },
  {
    id: "m3",
    label: "Submission of candidate lists",
    date: "2026-06-15",
    phase: "primaries",
    completed: true,
    notes: "All platforms filed within the statutory window.",
  },
  {
    id: "m4",
    label: "Publication of nominated candidates",
    date: "2026-07-03",
    phase: "scheduled",
    completed: true,
  },
  {
    id: "m5",
    label: "Campaign season begins",
    date: "2026-09-23",
    phase: "campaign",
    completed: false,
    notes: "Public campaigning permitted from 150 days to the poll.",
  },
  {
    id: "m6",
    label: "Final voter register published",
    date: "2027-01-11",
    phase: "scheduled",
    completed: false,
  },
  {
    id: "m7",
    label: "Presidential & National Assembly polls",
    date: "2027-02-20",
    phase: "polling",
    completed: false,
  },
  {
    id: "m8",
    label: "Collation and declaration of results",
    date: "2027-02-23",
    phase: "counting",
    completed: false,
  },
  {
    id: "m9",
    label: "Governorship & State Assembly polls",
    date: "2027-03-06",
    phase: "polling",
    completed: false,
  },
];

/* ------------------------------------------------------------------ */
/* Provenance ledger                                                   */
/* ------------------------------------------------------------------ */

export type Reliability = "official" | "verified_media" | "field" | "unverified";

export interface Source {
  id: string;
  title: string;
  publisher?: string;
  url?: string;
  reliability: Reliability;
  verified: boolean;
  entityType?: string;
}

export const SOURCES: Source[] = [
  {
    id: "s1",
    title: "2027 General Election timetable and schedule of activities",
    publisher: "Independent National Electoral Commission",
    url: "https://www.inecnigeria.org",
    reliability: "official",
    verified: true,
    entityType: "election",
  },
  {
    id: "s2",
    title: "National voter register — Q2 2026 revision",
    publisher: "Independent National Electoral Commission",
    url: "https://www.inecnigeria.org",
    reliability: "official",
    verified: true,
    entityType: "election",
  },
  {
    id: "s3",
    title: "Register of political parties",
    publisher: "Independent National Electoral Commission",
    url: "https://www.inecnigeria.org",
    reliability: "official",
    verified: true,
    entityType: "party",
  },
  {
    id: "s4",
    title: "Party primaries results roundup",
    publisher: "National Broadcasting Desk",
    reliability: "verified_media",
    verified: true,
    entityType: "candidate",
  },
  {
    id: "s5",
    title: "Governorship aspirant declarations tracker",
    publisher: "Civic Data Collective",
    reliability: "verified_media",
    verified: true,
    entityType: "candidate",
  },
  {
    id: "s6",
    title: "Ward-level accreditation returns — Ikeja",
    publisher: "SMHP field desk",
    reliability: "field",
    verified: true,
    entityType: "election",
  },
  {
    id: "s7",
    title: "Rivers governorship litigation status",
    publisher: "Court reporting pool",
    reliability: "field",
    verified: false,
    entityType: "election",
  },
  {
    id: "s8",
    title: "Plateau poll postponement notice",
    reliability: "unverified",
    verified: false,
    entityType: "election",
  },
];
