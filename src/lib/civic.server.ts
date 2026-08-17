// Server-only civic pipeline logic (RLS-bypassing admin work, dedupe, scoring).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { analyseEvidence, analyseResolution } from "./ai-vision.server";
import { DEDUPE_RADIUS_M, distanceMeters, hammingDistance, priorityScore } from "./sanket";

const BUCKET = "civic-evidence";

export async function signedUrl(path: string, seconds = 900): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(error?.message ?? "Could not read evidence file");
  return data.signedUrl;
}

export async function recomputePriority(issueId: string) {
  const { data: issue } = await supabaseAdmin
    .from("civic_issues")
    .select("id, severity_score, report_count, evidence_count, created_at")
    .eq("id", issueId)
    .maybeSingle();
  if (!issue) return;
  const score = priorityScore({
    severity: issue.severity_score,
    reportCount: issue.report_count,
    createdAt: issue.created_at,
    verifiedEvidence: issue.evidence_count,
  });
  await supabaseAdmin.from("civic_issues").update({ priority_score: score }).eq("id", issueId);
}

export type ReportInput = {
  path: string;
  phash: string | null;
  exifTimestamp: string | null;
  exifLat: number | null;
  exifLng: number | null;
  lat: number;
  lng: number;
  address: string | null;
  description: string;
  category: string | null;
};

export async function ingestReport(userId: string, input: ReportInput) {
  const url = await signedUrl(input.path);
  const ai = await analyseEvidence(url, input.description);
  const category = input.category && input.category !== "Other" ? input.category : ai.category;

  // --- Integrity guard -------------------------------------------------
  const flags: string[] = [];
  if (input.exifLat != null && input.exifLng != null) {
    const drift = distanceMeters({ lat: input.exifLat, lng: input.exifLng }, { lat: input.lat, lng: input.lng });
    if (drift > 500) flags.push(`EXIF GPS is ${Math.round(drift)}m from device GPS`);
  }
  if (input.exifTimestamp) {
    const ageDays = (Date.now() - new Date(input.exifTimestamp).getTime()) / 86_400_000;
    if (ageDays > 7) flags.push(`Photo was captured ${Math.round(ageDays)} days ago`);
  }
  if (input.phash) {
    const { data: recent } = await supabaseAdmin
      .from("reports")
      .select("id, phash, civic_issue_id")
      .not("phash", "is", null)
      .order("created_at", { ascending: false })
      .limit(400);
    const reused = (recent ?? []).find((r) => r.phash && hammingDistance(r.phash, input.phash!) <= 4);
    if (reused) flags.push("Perceptual hash matches an earlier submitted photo (possible reuse)");
  }
  if (!ai.isCivicIssue) flags.push("AI could not confirm a civic infrastructure issue in this photo");

  // --- Spatial deduplication (50 m, same category) ----------------------
  const delta = 0.001; // ~110 m bounding box
  const { data: nearby } = await supabaseAdmin
    .from("civic_issues")
    .select("id, latitude, longitude, category, status, report_count, evidence_count")
    .eq("category", category)
    .gte("latitude", input.lat - delta)
    .lte("latitude", input.lat + delta)
    .gte("longitude", input.lng - delta)
    .lte("longitude", input.lng + delta)
    .not("status", "in", "(closed_verified)");

  const parent = (nearby ?? []).find(
    (i) => distanceMeters({ lat: i.latitude, lng: i.longitude }, { lat: input.lat, lng: input.lng }) <= DEDUPE_RADIUS_M,
  );

  const isFraud = flags.length > 0;
  let issueId: string;
  let merged = false;

  if (parent) {
    merged = true;
    issueId = parent.id;
    await supabaseAdmin
      .from("civic_issues")
      .update({
        report_count: parent.report_count + 1,
        evidence_count: parent.evidence_count + (isFraud ? 0 : 1),
      })
      .eq("id", parent.id);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("civic_issues")
      .insert({
        title: ai.title,
        category,
        description: input.description || ai.summary,
        latitude: input.lat,
        longitude: input.lng,
        address: input.address,
        severity_score: Math.max(1, Math.min(10, ai.severity)),
        created_by: userId,
        evidence_count: isFraud ? 0 : 1,
        report_count: 1,
        admin_review_flag: isFraud,
        status: isFraud ? "flagged_admin_review" : "reported",
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create issue");
    issueId = created.id;
  }

  await supabaseAdmin.from("reports").insert({
    civic_issue_id: issueId,
    user_id: userId,
    image_url: input.path,
    phash: input.phash,
    exif_timestamp: input.exifTimestamp,
    exif_lat: input.exifLat,
    exif_lng: input.exifLng,
    device_lat: input.lat,
    device_lng: input.lng,
    is_flagged_fraud: isFraud,
    fraud_reason: isFraud ? flags.join("; ") : null,
    ai_summary: ai.summary,
  });

  if (isFraud && merged) {
    await supabaseAdmin.from("civic_issues").update({ admin_review_flag: true }).eq("id", issueId);
  }

  await recomputePriority(issueId);
  return { issueId, merged, flags, ai: { ...ai, category } };
}

export async function ingestResolution(
  workerId: string,
  input: { issueId: string; afterPath: string; notes: string; lat: number; lng: number },
) {
  const { data: issue } = await supabaseAdmin
    .from("civic_issues")
    .select("id, category, latitude, longitude, assigned_worker_id")
    .eq("id", input.issueId)
    .maybeSingle();
  if (!issue) throw new Error("Issue not found");

  const gpsDrift = distanceMeters(
    { lat: issue.latitude, lng: issue.longitude },
    { lat: input.lat, lng: input.lng },
  );

  const { data: firstReport } = await supabaseAdmin
    .from("reports")
    .select("image_url")
    .eq("civic_issue_id", input.issueId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstReport) throw new Error("No original evidence photo for this issue");

  const [beforeUrl, afterUrl] = await Promise.all([
    signedUrl(firstReport.image_url),
    signedUrl(input.afterPath),
  ]);
  const ai = await analyseResolution(beforeUrl, afterUrl, issue.category);

  const gpsFail = gpsDrift > 150;
  const anomaly = ai.potentialAnomaly || !ai.isSameScene || !ai.issueResolved || ai.confidenceScore < 70 || gpsFail;
  const summary = `${ai.visualChangesDetected} GPS match: ${Math.round(gpsDrift)}m from reported location.`;

  await supabaseAdmin.from("resolution_proofs").upsert(
    {
      civic_issue_id: input.issueId,
      worker_id: workerId,
      before_image_url: firstReport.image_url,
      after_image_url: input.afterPath,
      worker_notes: input.notes,
      ai_confidence_score: ai.confidenceScore,
      ai_analysis_summary: summary,
      is_same_scene: ai.isSameScene,
      issue_resolved: ai.issueResolved,
      potential_anomaly: anomaly,
    },
    { onConflict: "civic_issue_id" },
  );

  await supabaseAdmin
    .from("civic_issues")
    .update({
      status: anomaly ? "resolution_anomaly" : "resolved_pending_audit",
      admin_review_flag: anomaly,
    })
    .eq("id", input.issueId);

  return { anomaly, confidence: ai.confidenceScore, summary, gpsDrift: Math.round(gpsDrift) };
}

export async function tallyVotes(issueId: string) {
  const { data: votes } = await supabaseAdmin
    .from("verifications")
    .select("vote")
    .eq("civic_issue_id", issueId);
  const all = votes ?? [];
  const still = all.filter((v) => v.vote === "still_present").length;
  const resolved = all.filter((v) => v.vote === "resolved").length;

  const { data: issue } = await supabaseAdmin
    .from("civic_issues")
    .select("failure_count, status")
    .eq("id", issueId)
    .maybeSingle();
  if (!issue) return { total: all.length, still, resolved, reopened: false };

  if (all.length >= 3 && still / all.length >= 0.3 && issue.status !== "reopened_failed_resolution") {
    await supabaseAdmin
      .from("civic_issues")
      .update({
        status: "reopened_failed_resolution",
        failure_count: issue.failure_count + 1,
        admin_review_flag: true,
      })
      .eq("id", issueId);
    await recomputePriority(issueId);
    return { total: all.length, still, resolved, reopened: true };
  }

  if (all.length >= 3 && resolved / all.length >= 0.7 && issue.status === "resolved_pending_audit") {
    await supabaseAdmin.from("civic_issues").update({ status: "closed_verified" }).eq("id", issueId);
  }
  return { total: all.length, still, resolved, reopened: false };
}

const PASSKEYS: Record<string, "worker" | "official_admin"> = {
  India123: "worker",
  INDIA123: "official_admin",
};

export async function elevate(userId: string, passkey: string) {
  const role = PASSKEYS[passkey];
  if (!role) throw new Error("Invalid access passkey");
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  return { role };
}
