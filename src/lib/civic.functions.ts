import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const reportSchema = z.object({
  path: z.string().min(1),
  phash: z.string().nullable(),
  exifTimestamp: z.string().nullable(),
  exifLat: z.number().nullable(),
  exifLng: z.number().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(300).nullable(),
  description: z.string().max(1000),
  category: z.string().max(60).nullable(),
});

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ingestReport } = await import("./civic.server");
    return await ingestReport(context.userId, data);
  });

export const elevateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ passkey: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { elevate } = await import("./civic.server");
    return await elevate(context.userId, data.passkey);
  });

export const submitResolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        issueId: z.string().uuid(),
        afterPath: z.string().min(1),
        notes: z.string().min(10).max(1000),
        lat: z.number(),
        lng: z.number(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isWorker = (roles ?? []).some((r) => r.role === "worker");
    const isAdmin = (roles ?? []).some((r) => r.role === "official_admin");
    if (!isWorker && !isAdmin) throw new Error("Field worker access required");
    const { ingestResolution } = await import("./civic.server");
    return await ingestResolution(context.userId, data);
  });

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        issueId: z.string().uuid(),
        vote: z.enum(["resolved", "partially_resolved", "still_present"]),
        feedback: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("verifications").upsert(
      {
        civic_issue_id: data.issueId,
        user_id: context.userId,
        vote: data.vote,
        feedback: data.feedback ?? null,
      },
      { onConflict: "civic_issue_id,user_id" },
    );
    if (error) throw new Error(error.message);
    const { tallyVotes } = await import("./civic.server");
    return await tallyVotes(data.issueId);
  });

export const assignWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ issueId: z.string().uuid(), workerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: adminRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "official_admin");
    const isAdmin = (adminRoles ?? []).length > 0;
    if (!isAdmin) throw new Error("Admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("civic_issues")
      .update({ assigned_worker_id: data.workerId, status: "assigned_to_worker" })
      .eq("id", data.issueId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWorkers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "official_admin");
    const isAdmin = (adminRoles ?? []).length > 0;
    if (!isAdmin) throw new Error("Admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "worker");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, name, email").in("id", ids);
    return profiles ?? [];
  });

export const updateIssueStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        issueId: z.string().uuid(),
        status: z.enum([
          "reported",
          "assigned_to_worker",
          "in_progress",
          "resolved_pending_audit",
          "closed_verified",
          "flagged_admin_review",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("civic_issues")
      .update({ status: data.status })
      .eq("id", data.issueId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
