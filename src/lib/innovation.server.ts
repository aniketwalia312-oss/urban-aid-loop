// Server-only logic for the Societal Innovation Collaboration Portal.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { challengePriority, matchScore, DOMAINS } from "./innovation";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export type ChallengeClassification = {
  domain: string;
  tags: string[];
  severity: number;
  confidence: number;
  summary: string;
  rationale: string;
  suggestedTitle: string;
};

const FALLBACK: ChallengeClassification = {
  domain: "Other",
  tags: [],
  severity: 5,
  confidence: 0,
  summary: "Awaiting AI classification.",
  rationale: "AI classification unavailable; queued for manual triage.",
  suggestedTitle: "Community challenge",
};

export async function classifyChallenge(input: {
  title: string;
  description: string;
  district: string | null;
  imageUrl: string | null;
}): Promise<ChallengeClassification> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return FALLBACK;
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `Classify this societal challenge submitted from Jharkhand, India.
Title: ${input.title}
District: ${input.district ?? "unknown"}
Description: ${input.description}

Return JSON only:
{"domain": one of ${DOMAINS.map((d) => `"${d}"`).join("|")},
 "tags": array of 3-6 lowercase keywords (academic disciplines / technologies relevant to solving it),
 "severity": number 1.0-10.0 (urgency and social harm),
 "confidence": number 0-100,
 "summary": one-sentence neutral summary,
 "rationale": one sentence on why this domain and severity,
 "suggestedTitle": crisp 8-word title}`,
    },
  ];
  if (input.imageUrl) content.push({ type: "image_url", image_url: { url: input.imageUrl } });

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You triage community problems for a government innovation portal. Answer only with strict JSON.",
          },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("[sanket-innovation] gateway error", res.status, await res.text());
      return FALLBACK;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return FALLBACK;
    const parsed = { ...FALLBACK, ...(JSON.parse(raw) as Partial<ChallengeClassification>) };
    return {
      ...parsed,
      domain: DOMAINS.includes(parsed.domain as (typeof DOMAINS)[number]) ? parsed.domain : "Other",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map(String) : [],
      severity: Math.max(1, Math.min(10, Number(parsed.severity) || 5)),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    };
  } catch (err) {
    console.error("[sanket-innovation] classify failed", err);
    return FALLBACK;
  }
}

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((w) => {
    if (b.has(w)) inter += 1;
  });
  return inter / (a.size + b.size - inter);
}

export async function notify(
  userIds: string[],
  payload: { title: string; body?: string; link?: string },
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  await supabaseAdmin.from("notifications").insert(
    unique.map((user_id) => ({
      user_id,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    })),
  );
}

export type SubmitChallengeInput = {
  title: string;
  description: string;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  submitterType: string;
  organisationName: string | null;
  beneficiaries: number;
  mediaPaths: string[];
  documentPaths: string[];
};

export async function ingestChallenge(userId: string, input: SubmitChallengeInput) {
  let imageUrl: string | null = null;
  if (input.mediaPaths[0]) {
    const { data } = await supabaseAdmin.storage
      .from("challenge-media")
      .createSignedUrl(input.mediaPaths[0], 900);
    imageUrl = data?.signedUrl ?? null;
  }

  const ai = await classifyChallenge({
    title: input.title,
    description: input.description,
    district: input.district,
    imageUrl,
  });

  // ---- deduplication: same domain + district, high text overlap ----
  const { data: existing } = await supabaseAdmin
    .from("challenges")
    .select("id, title, description, support_count, district, domain, status")
    .eq("domain", ai.domain)
    .not("status", "in", "(completed,rejected,duplicate)")
    .order("created_at", { ascending: false })
    .limit(200);

  const incoming = tokenise(`${input.title} ${input.description}`);
  const duplicate = (existing ?? []).find(
    (c) =>
      (c.district ?? null) === input.district &&
      jaccard(incoming, tokenise(`${c.title} ${c.description}`)) >= 0.45,
  );

  if (duplicate) {
    await supabaseAdmin
      .from("challenges")
      .update({ support_count: duplicate.support_count + 1 })
      .eq("id", duplicate.id);
    await recomputeChallengePriority(duplicate.id);
    return { challengeId: duplicate.id, merged: true, ai, routes: [] as RoutedInstitution[] };
  }

  const { data: created, error } = await supabaseAdmin
    .from("challenges")
    .insert({
      title: ai.suggestedTitle || input.title,
      description: input.description,
      domain: ai.domain,
      tags: ai.tags,
      district: input.district,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      submitter_id: userId,
      submitter_type: input.submitterType as never,
      organisation_name: input.organisationName,
      beneficiaries: input.beneficiaries,
      severity_score: ai.severity,
      ai_summary: ai.summary,
      ai_confidence: ai.confidence,
      ai_rationale: ai.rationale,
      media_paths: input.mediaPaths,
      document_paths: input.documentPaths,
      status: ai.confidence >= 50 ? "validated" : "submitted",
    })
    .select("id, created_at")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create challenge");

  await recomputeChallengePriority(created.id);
  const routes = await routeChallenge(created.id);

  await notify([userId], {
    title: "Challenge submitted",
    body: `Classified as ${ai.domain} and routed to ${routes.length} institution(s).`,
    link: `/challenges/${created.id}`,
  });

  return { challengeId: created.id, merged: false, ai, routes };
}

export async function recomputeChallengePriority(challengeId: string) {
  const { data: c } = await supabaseAdmin
    .from("challenges")
    .select("id, severity_score, support_count, beneficiaries, created_at")
    .eq("id", challengeId)
    .maybeSingle();
  if (!c) return;
  const score = challengePriority({
    severity: Number(c.severity_score),
    supportCount: c.support_count,
    beneficiaries: c.beneficiaries,
    createdAt: c.created_at,
  });
  await supabaseAdmin.from("challenges").update({ priority_score: score }).eq("id", challengeId);
}

export type RoutedInstitution = {
  institutionId: string;
  name: string;
  score: number;
  rationale: string;
};

/** Match a validated challenge to the best-fit universities and research institutions. */
export async function routeChallenge(challengeId: string): Promise<RoutedInstitution[]> {
  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("id, title, domain, tags, district")
    .eq("id", challengeId)
    .maybeSingle();
  if (!challenge) return [];

  const { data: institutions } = await supabaseAdmin
    .from("institutions")
    .select("id, name, type, district, domains, verified, owner_id")
    .in("type", ["university", "research_lab", "incubator"]);

  const scored = (institutions ?? [])
    .map((i) => ({
      institution: i,
      score: matchScore({
        institutionDomains: i.domains ?? [],
        institutionDistrict: i.district,
        challengeDomain: challenge.domain,
        challengeTags: challenge.tags ?? [],
        challengeDistrict: challenge.district,
        verified: i.verified,
      }),
    }))
    .filter((s) => s.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) return [];

  await supabaseAdmin.from("challenge_routes").upsert(
    scored.map((s) => ({
      challenge_id: challengeId,
      institution_id: s.institution.id,
      match_score: s.score,
      rationale: `Domain "${challenge.domain}" matches declared expertise${
        s.institution.district === challenge.district ? ` and the institution is based in ${challenge.district}` : ""
      }.`,
      status: "routed" as const,
    })),
    { onConflict: "challenge_id,institution_id" },
  );

  await supabaseAdmin.from("challenges").update({ status: "routed" }).eq("id", challengeId);

  await notify(
    scored.map((s) => s.institution.owner_id).filter((v): v is string => Boolean(v)),
    {
      title: "New challenge routed to your institution",
      body: challenge.title,
      link: `/challenges/${challengeId}`,
    },
  );

  return scored.map((s) => ({
    institutionId: s.institution.id,
    name: s.institution.name,
    score: s.score,
    rationale: `Expertise match on ${challenge.domain}`,
  }));
}

const DEFAULT_MILESTONES = [
  "Problem study & field validation",
  "Solution design & literature review",
  "Prototype development",
  "Field testing with community",
  "Pilot deployment & impact report",
];

export async function approveProposalAsProject(proposalId: string, approverId: string) {
  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("id, challenge_id, institution_id, title, duration_weeks, created_by")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) throw new Error("Proposal not found");

  await supabaseAdmin.from("proposals").update({ status: "approved" }).eq("id", proposalId);

  const { data: existing } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (existing) return { projectId: existing.id };

  const target = new Date(Date.now() + proposal.duration_weeks * 7 * 86_400_000);
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .insert({
      proposal_id: proposal.id,
      challenge_id: proposal.challenge_id,
      institution_id: proposal.institution_id,
      title: proposal.title,
      status: "planning",
      target_date: target.toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error || !project) throw new Error(error?.message ?? "Could not create project");

  const step = Math.max(7, Math.round((proposal.duration_weeks * 7) / DEFAULT_MILESTONES.length));
  await supabaseAdmin.from("milestones").insert(
    DEFAULT_MILESTONES.map((title, idx) => ({
      project_id: project.id,
      title,
      order_index: idx,
      due_date: new Date(Date.now() + step * (idx + 1) * 86_400_000).toISOString().slice(0, 10),
    })),
  );

  await supabaseAdmin.from("challenges").update({ status: "in_project" }).eq("id", proposal.challenge_id);

  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("submitter_id, title")
    .eq("id", proposal.challenge_id)
    .maybeSingle();

  await notify([proposal.created_by, challenge?.submitter_id, approverId].filter(Boolean) as string[], {
    title: "Proposal approved — project started",
    body: proposal.title,
    link: `/challenges/${proposal.challenge_id}`,
  });

  return { projectId: project.id };
}

export async function syncProjectProgress(projectId: string) {
  const { data: milestones } = await supabaseAdmin
    .from("milestones")
    .select("status")
    .eq("project_id", projectId);
  const all = milestones ?? [];
  const done = all.filter((m) => m.status === "done").length;
  const progress = all.length === 0 ? 0 : Math.round((done / all.length) * 100);
  await supabaseAdmin
    .from("projects")
    .update(progress === 100 ? { progress, status: "completed" as const } : { progress })
    .eq("id", projectId);

  if (progress === 100) {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("challenge_id")
      .eq("id", projectId)
      .maybeSingle();
    if (project) {
      await supabaseAdmin.from("challenges").update({ status: "completed" }).eq("id", project.challenge_id);
      const { data: challenge } = await supabaseAdmin
        .from("challenges")
        .select("submitter_id, title")
        .eq("id", project.challenge_id)
        .maybeSingle();
      if (challenge?.submitter_id)
        await notify([challenge.submitter_id], {
          title: "Your challenge has a deployed solution",
          body: challenge.title,
          link: `/challenges/${project.challenge_id}`,
        });
    }
  }
  return { progress };
}

const ROLE_PASSKEYS: Record<string, "university" | "industry" | "government"> = {
  UNIVERSITY123: "university",
  INDUSTRY123: "industry",
  GOVT123: "government",
};

export async function elevateEcosystemRole(userId: string, passkey: string) {
  const role = ROLE_PASSKEYS[passkey];
  if (!role) throw new Error("Invalid access passkey");
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  return { role };
}
