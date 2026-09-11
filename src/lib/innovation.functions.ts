import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function rolesOf(supabase: { from: (t: string) => any }, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

/** Citizen / organisation submits a societal challenge. */
export const submitChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(6).max(160),
        description: z.string().min(30).max(4000),
        district: z.string().max(60).nullable(),
        address: z.string().max(300).nullable(),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
        submitterType: z.enum([
          "citizen",
          "community_org",
          "panchayat",
          "urban_local_body",
          "government_dept",
          "ngo",
        ]),
        organisationName: z.string().max(160).nullable(),
        beneficiaries: z.number().int().min(0).max(50_000_000),
        mediaPaths: z.array(z.string()).max(6),
        documentPaths: z.array(z.string()).max(6),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ingestChallenge } = await import("./innovation.server");
    return await ingestChallenge(context.userId, data);
  });

/** Community upvote / remove upvote on a challenge. */
export const toggleSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ challengeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("challenge_supports")
      .select("id")
      .eq("challenge_id", data.challengeId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      await context.supabase.from("challenge_supports").delete().eq("id", existing.id);
    } else {
      const { error } = await context.supabase
        .from("challenge_supports")
        .insert({ challenge_id: data.challengeId, user_id: context.userId });
      if (error) throw new Error(error.message);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("challenge_supports")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", data.challengeId);
    await supabaseAdmin
      .from("challenges")
      .update({ support_count: count ?? 0 })
      .eq("id", data.challengeId);
    const { recomputeChallengePriority } = await import("./innovation.server");
    await recomputeChallengePriority(data.challengeId);
    return { supported: !existing, supportCount: count ?? 0 };
  });

/** Stakeholder discussion thread on a challenge. */
export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        body: z.string().min(2).max(1500),
        authorName: z.string().max(120).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("challenge_messages").insert({
      challenge_id: data.challengeId,
      user_id: context.userId,
      author_name: data.authorName,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** University / industry / government access passkey. */
export const elevateEcosystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ passkey: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { elevateEcosystemRole } = await import("./innovation.server");
    return await elevateEcosystemRole(context.userId, data.passkey);
  });

/** Register (or claim) an institution profile. */
export const registerInstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(3).max(160),
        type: z.enum(["university", "industry", "startup", "msme", "csr", "research_lab", "incubator"]),
        district: z.string().max(60).nullable(),
        domains: z.array(z.string().max(60)).min(1).max(12),
        description: z.string().max(1000).nullable(),
        website: z.string().max(300).nullable(),
        contactEmail: z.string().email().max(160).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    if (!roles.some((r) => ["university", "industry", "government", "official_admin"].includes(r)))
      throw new Error("Institution access required");
    const { data: created, error } = await context.supabase
      .from("institutions")
      .insert({
        name: data.name,
        type: data.type,
        district: data.district,
        domains: data.domains,
        description: data.description,
        website: data.website,
        contact_email: data.contactEmail,
        owner_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { institutionId: created.id };
  });

/** Institution accepts or declines a routed challenge. */
export const respondToRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ routeId: z.string().uuid(), status: z.enum(["accepted", "declined"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("challenge_routes")
      .update({ status: data.status })
      .eq("id", data.routeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** University submits a solution proposal for a routed challenge. */
export const submitProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        challengeId: z.string().uuid(),
        institutionId: z.string().uuid(),
        title: z.string().min(6).max(160),
        abstract: z.string().min(30).max(3000),
        approach: z.string().max(3000).nullable(),
        teamMembers: z
          .array(z.object({ name: z.string().max(120), discipline: z.string().max(120) }))
          .max(20),
        facultyMentor: z.string().max(160).nullable(),
        durationWeeks: z.number().int().min(2).max(104),
        budgetInr: z.number().min(0).max(1_000_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: proposal, error } = await context.supabase
      .from("proposals")
      .insert({
        challenge_id: data.challengeId,
        institution_id: data.institutionId,
        title: data.title,
        abstract: data.abstract,
        approach: data.approach,
        team_members: data.teamMembers,
        faculty_mentor: data.facultyMentor,
        duration_weeks: data.durationWeeks,
        budget_inr: data.budgetInr,
        status: "submitted",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("challenges")
      .update({ status: "proposal_received" })
      .eq("id", data.challengeId);
    const { notify } = await import("./innovation.server");
    const { data: challenge } = await supabaseAdmin
      .from("challenges")
      .select("submitter_id, title")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (challenge?.submitter_id)
      await notify([challenge.submitter_id], {
        title: "A university proposed a solution",
        body: data.title,
        link: `/challenges/${data.challengeId}`,
      });
    return { proposalId: proposal.id };
  });

/** Government / admin reviews a proposal; approval starts a monitored project. */
export const reviewProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        proposalId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        notes: z.string().max(1000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    if (!roles.some((r) => ["government", "official_admin"].includes(r)))
      throw new Error("Government reviewer access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("proposals")
      .update({ review_notes: data.notes, status: data.decision })
      .eq("id", data.proposalId);

    if (data.decision === "rejected") return { ok: true, projectId: null };
    const { approveProposalAsProject } = await import("./innovation.server");
    const { projectId } = await approveProposalAsProject(data.proposalId, context.userId);
    return { ok: true, projectId };
  });

/** Move a project milestone and re-sync overall progress. */
export const updateMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        milestoneId: z.string().uuid(),
        projectId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "done", "blocked"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("milestones")
      .update({
        status: data.status,
        completed_at: data.status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", data.milestoneId);
    if (error) throw new Error(error.message);
    const { syncProjectProgress } = await import("./innovation.server");
    return await syncProjectProgress(data.projectId);
  });

/** Record project outcomes (patents, startups, beneficiaries, summary). */
export const recordOutcomes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        patents: z.number().int().min(0).max(1000),
        startupsCreated: z.number().int().min(0).max(1000),
        beneficiaries: z.number().int().min(0).max(50_000_000),
        outcomeSummary: z.string().max(2000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({
        patents: data.patents,
        startups_created: data.startupsCreated,
        beneficiaries: data.beneficiaries,
        outcome_summary: data.outcomeSummary,
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Industry / CSR partner offers support to a running project. */
export const offerPartnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        institutionId: z.string().uuid(),
        partnerType: z.enum([
          "mentorship",
          "funding",
          "prototyping",
          "pilot",
          "tech_transfer",
          "csr_grant",
        ]),
        amountInr: z.number().min(0).max(1_000_000_000),
        notes: z.string().max(1000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("partnerships")
      .insert({
        project_id: data.projectId,
        institution_id: data.institutionId,
        partner_type: data.partnerType,
        amount_inr: data.amountInr,
        notes: data.notes,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notify } = await import("./innovation.server");
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("title, institution_id, institutions:institution_id(owner_id)")
      .eq("id", data.projectId)
      .maybeSingle();
    const ownerId = (project as { institutions?: { owner_id: string | null } } | null)?.institutions
      ?.owner_id;
    if (ownerId)
      await notify([ownerId], {
        title: "New industry partnership offer",
        body: project?.title ?? "A partner offered support",
        link: `/projects`,
      });
    return { partnershipId: created.id };
  });

/** Mark the signed-in user's notifications as read. */
export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    return { ok: true };
  });
