// Client-safe domain logic for the Societal Innovation Collaboration Portal.

export const DOMAINS = [
  "Education",
  "Healthcare",
  "Agriculture",
  "Water Resources",
  "Environment",
  "Energy",
  "Urban Development",
  "Accessibility",
  "Public Administration",
  "Rural Livelihoods",
  "Sanitation",
  "Other",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const DISTRICTS = [
  "Ranchi",
  "Dhanbad",
  "East Singhbhum",
  "West Singhbhum",
  "Bokaro",
  "Hazaribagh",
  "Deoghar",
  "Giridih",
  "Palamu",
  "Dumka",
  "Ramgarh",
  "Chatra",
  "Koderma",
  "Garhwa",
  "Latehar",
  "Lohardaga",
  "Gumla",
  "Simdega",
  "Khunti",
  "Saraikela-Kharsawan",
  "Jamtara",
  "Godda",
  "Sahibganj",
  "Pakur",
] as const;

export const SUBMITTER_TYPES = [
  { value: "citizen", label: "Individual citizen" },
  { value: "community_org", label: "Community organisation" },
  { value: "panchayat", label: "Panchayati Raj Institution" },
  { value: "urban_local_body", label: "Urban Local Body" },
  { value: "government_dept", label: "Government department" },
  { value: "ngo", label: "NGO / non-profit" },
] as const;

export type SubmitterType = (typeof SUBMITTER_TYPES)[number]["value"];

export const INSTITUTION_TYPES = [
  { value: "university", label: "University / HEI" },
  { value: "industry", label: "Industry" },
  { value: "startup", label: "Startup" },
  { value: "msme", label: "MSME" },
  { value: "csr", label: "CSR organisation" },
  { value: "research_lab", label: "Research laboratory" },
  { value: "incubator", label: "Innovation hub / incubator" },
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number]["value"];

export type ChallengeStatus =
  | "submitted"
  | "validated"
  | "routed"
  | "proposal_received"
  | "in_project"
  | "completed"
  | "rejected"
  | "duplicate";

export const CHALLENGE_STATUS_LABEL: Record<ChallengeStatus, string> = {
  submitted: "Submitted",
  validated: "AI validated",
  routed: "Routed to institutions",
  proposal_received: "Proposal received",
  in_project: "Project running",
  completed: "Solution deployed",
  rejected: "Rejected",
  duplicate: "Merged duplicate",
};

export const CHALLENGE_STATUS_TONE: Record<
  ChallengeStatus,
  "info" | "warning" | "success" | "destructive" | "muted"
> = {
  submitted: "info",
  validated: "info",
  routed: "warning",
  proposal_received: "warning",
  in_project: "warning",
  completed: "success",
  rejected: "destructive",
  duplicate: "muted",
};

export const CHALLENGE_LIFECYCLE: ChallengeStatus[] = [
  "submitted",
  "validated",
  "routed",
  "proposal_received",
  "in_project",
  "completed",
];

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "testing"
  | "piloting"
  | "deployed"
  | "completed"
  | "stalled";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  testing: "Testing",
  piloting: "Pilot deployment",
  deployed: "Deployed",
  completed: "Completed",
  stalled: "Stalled",
};

export const PARTNERSHIP_TYPES = [
  { value: "mentorship", label: "Mentorship" },
  { value: "funding", label: "Funding" },
  { value: "prototyping", label: "Prototyping support" },
  { value: "pilot", label: "Pilot implementation" },
  { value: "tech_transfer", label: "Technology transfer" },
  { value: "csr_grant", label: "CSR grant" },
] as const;

export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]["value"];

/**
 * Transparent challenge priority engine (server-authoritative, mirrored for display).
 * Score = severity*0.35 + min(support,50)*0.15 + log-scaled beneficiaries*0.30 + aging*0.20
 */
export function challengePriority(input: {
  severity: number;
  supportCount: number;
  beneficiaries: number;
  createdAt: string | Date;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const days = Math.max(
    0,
    Math.min(60, (now.getTime() - new Date(input.createdAt).getTime()) / 86_400_000),
  );
  const reach = Math.min(10, Math.log10(Math.max(1, input.beneficiaries)) * 2);
  const score =
    input.severity * 0.35 + Math.min(input.supportCount, 50) * 0.15 + reach * 0.3 + days * 0.2;
  return Math.round(score * 100) / 100;
}

export function challengePriorityBreakdown(input: {
  severity: number;
  supportCount: number;
  beneficiaries: number;
  createdAt: string | Date;
}) {
  const days = Math.max(
    0,
    Math.min(60, (Date.now() - new Date(input.createdAt).getTime()) / 86_400_000),
  );
  const reach = Math.min(10, Math.log10(Math.max(1, input.beneficiaries)) * 2);
  return [
    { label: "AI severity", weight: 0.35, raw: input.severity, value: input.severity * 0.35 },
    {
      label: "Community support",
      weight: 0.15,
      raw: Math.min(input.supportCount, 50),
      value: Math.min(input.supportCount, 50) * 0.15,
    },
    { label: "Population reach", weight: 0.3, raw: Math.round(reach * 10) / 10, value: reach * 0.3 },
    { label: "Days pending", weight: 0.2, raw: Math.round(days * 10) / 10, value: days * 0.2 },
  ];
}

/** Institution↔challenge match score (0-100) used by the routing engine. */
export function matchScore(input: {
  institutionDomains: string[];
  institutionDistrict: string | null;
  challengeDomain: string;
  challengeTags: string[];
  challengeDistrict: string | null;
  verified: boolean;
}): number {
  let score = 0;
  const domains = input.institutionDomains.map((d) => d.toLowerCase());
  if (domains.includes(input.challengeDomain.toLowerCase())) score += 55;
  const tagHits = input.challengeTags.filter((t) =>
    domains.some((d) => d.includes(t.toLowerCase()) || t.toLowerCase().includes(d)),
  ).length;
  score += Math.min(20, tagHits * 7);
  if (
    input.institutionDistrict &&
    input.challengeDistrict &&
    input.institutionDistrict.toLowerCase() === input.challengeDistrict.toLowerCase()
  )
    score += 15;
  if (input.verified) score += 10;
  return Math.min(100, score);
}

export function inr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
