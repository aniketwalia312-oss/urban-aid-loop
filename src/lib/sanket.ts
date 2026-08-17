// Shared, client-safe domain logic for the Sanket civic platform.

export const CATEGORIES = [
  "Pothole",
  "Sewage Leak",
  "Streetlight Outage",
  "Garbage Dump",
  "Water Pipeline Burst",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type IssueStatus =
  | "reported"
  | "clustered_duplicate"
  | "assigned_to_worker"
  | "in_progress"
  | "resolved_pending_audit"
  | "closed_verified"
  | "resolution_anomaly"
  | "reopened_failed_resolution"
  | "flagged_admin_review";

export type Vote = "resolved" | "partially_resolved" | "still_present";

export const STATUS_LABEL: Record<IssueStatus, string> = {
  reported: "Reported",
  clustered_duplicate: "Merged duplicate",
  assigned_to_worker: "Assigned to worker",
  in_progress: "Work in progress",
  resolved_pending_audit: "Resolved — pending citizen audit",
  closed_verified: "Closed & verified",
  resolution_anomaly: "Resolution anomaly",
  reopened_failed_resolution: "Reopened — failed resolution",
  flagged_admin_review: "Flagged for admin review",
};

export const STATUS_TONE: Record<IssueStatus, "info" | "warning" | "success" | "destructive" | "muted"> = {
  reported: "info",
  clustered_duplicate: "muted",
  assigned_to_worker: "info",
  in_progress: "warning",
  resolved_pending_audit: "warning",
  closed_verified: "success",
  resolution_anomaly: "destructive",
  reopened_failed_resolution: "destructive",
  flagged_admin_review: "destructive",
};

export const LIFECYCLE: IssueStatus[] = [
  "reported",
  "assigned_to_worker",
  "in_progress",
  "resolved_pending_audit",
  "closed_verified",
];

/**
 * Transparent priority engine (server-authoritative, mirrored here for display).
 * Score = S*0.35 + min(R,20)*0.25 + Thours*0.20 + Everified*0.20
 * Aging term is capped at 100 hours so aging cannot fully swamp severity.
 */
export function priorityScore(input: {
  severity: number;
  reportCount: number;
  createdAt: string | Date;
  verifiedEvidence: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const created = new Date(input.createdAt);
  const hours = Math.max(0, Math.min(100, (now.getTime() - created.getTime()) / 3_600_000));
  const score =
    input.severity * 0.35 +
    Math.min(input.reportCount, 20) * 0.25 +
    hours * 0.2 +
    input.verifiedEvidence * 0.2;
  return Math.round(score * 100) / 100;
}

export function priorityBreakdown(input: {
  severity: number;
  reportCount: number;
  createdAt: string | Date;
  verifiedEvidence: number;
}) {
  const created = new Date(input.createdAt);
  const hours = Math.max(0, Math.min(100, (Date.now() - created.getTime()) / 3_600_000));
  return [
    { label: "AI severity", weight: 0.35, raw: input.severity, value: input.severity * 0.35 },
    {
      label: "Citizen reports",
      weight: 0.25,
      raw: Math.min(input.reportCount, 20),
      value: Math.min(input.reportCount, 20) * 0.25,
    },
    { label: "Pending hours", weight: 0.2, raw: Math.round(hours * 10) / 10, value: hours * 0.2 },
    {
      label: "Verified evidence",
      weight: 0.2,
      raw: input.verifiedEvidence,
      value: input.verifiedEvidence * 0.2,
    },
  ];
}

export function priorityTier(score: number): { label: string; tone: "destructive" | "warning" | "info" } {
  if (score >= 12) return { label: "Critical", tone: "destructive" };
  if (score >= 6) return { label: "High", tone: "warning" };
  return { label: "Standard", tone: "info" };
}

/** Metres between two coordinates (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const DEDUPE_RADIUS_M = 50;

/** Hamming distance between two hex perceptual hashes. */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export function timeAgo(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
