import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChallengeStatus, ProjectStatus } from "./innovation";

export type Challenge = {
  id: string;
  title: string;
  description: string;
  domain: string;
  tags: string[];
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  submitter_type: string;
  organisation_name: string | null;
  status: ChallengeStatus;
  priority_score: number;
  severity_score: number;
  beneficiaries: number;
  support_count: number;
  ai_summary: string | null;
  ai_confidence: number;
  ai_rationale: string | null;
  media_paths: string[];
  created_at: string;
};

const CHALLENGE_COLUMNS =
  "id,title,description,domain,tags,district,address,latitude,longitude,submitter_type,organisation_name,status,priority_score,severity_score,beneficiaries,support_count,ai_summary,ai_confidence,ai_rationale,media_paths,created_at";

export const challengesQuery = queryOptions({
  queryKey: ["challenges"],
  queryFn: async (): Promise<Challenge[]> => {
    const { data, error } = await supabase
      .from("challenges")
      .select(CHALLENGE_COLUMNS)
      .order("priority_score", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as Challenge[];
  },
});

export const challengeQuery = (id: string) =>
  queryOptions({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const [challenge, routes, proposals, projects, messages] = await Promise.all([
        supabase.from("challenges").select(CHALLENGE_COLUMNS).eq("id", id).maybeSingle(),
        supabase
          .from("challenge_routes")
          .select("id,match_score,rationale,status,institution_id,institutions:institution_id(id,name,type,district,verified)")
          .eq("challenge_id", id)
          .order("match_score", { ascending: false }),
        supabase
          .from("proposals")
          .select(
            "id,title,abstract,approach,team_members,faculty_mentor,duration_weeks,budget_inr,status,review_notes,created_at,institution_id,institutions:institution_id(name,type)",
          )
          .eq("challenge_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id,title,status,progress,target_date,progress,outcome_summary,patents,startups_created,beneficiaries,institution_id")
          .eq("challenge_id", id),
        supabase
          .from("challenge_messages")
          .select("id,body,author_name,created_at,user_id")
          .eq("challenge_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (challenge.error) throw new Error(challenge.error.message);
      return {
        challenge: (challenge.data ?? null) as Challenge | null,
        routes: routes.data ?? [],
        proposals: proposals.data ?? [],
        projects: projects.data ?? [],
        messages: messages.data ?? [],
      };
    },
  });

export const institutionsQuery = queryOptions({
  queryKey: ["institutions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("institutions")
      .select("id,name,type,district,domains,description,website,verified,owner_id")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export const myInstitutionsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-institutions", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id,name,type,district,domains,verified")
        .eq("owner_id", userId!);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  target_date: string | null;
  started_at: string;
  patents: number;
  startups_created: number;
  beneficiaries: number;
  outcome_summary: string | null;
  challenge_id: string;
  institution_id: string;
  institutions: { name: string; type: string } | null;
  challenges: { title: string; domain: string; district: string | null } | null;
};

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async (): Promise<ProjectRow[]> => {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,title,status,progress,target_date,started_at,patents,startups_created,beneficiaries,outcome_summary,challenge_id,institution_id,institutions:institution_id(name,type),challenges:challenge_id(title,domain,district)",
      )
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProjectRow[];
  },
});

export const projectDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => {
      const [milestones, partnerships] = await Promise.all([
        supabase
          .from("milestones")
          .select("id,title,description,due_date,status,order_index,completed_at")
          .eq("project_id", id)
          .order("order_index"),
        supabase
          .from("partnerships")
          .select("id,partner_type,amount_inr,notes,status,institution_id,institutions:institution_id(name,type)")
          .eq("project_id", id),
      ]);
      return { milestones: milestones.data ?? [], partnerships: partnerships.data ?? [] };
    },
  });

export const partnershipsQuery = queryOptions({
  queryKey: ["partnerships"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("partnerships")
      .select("id,partner_type,amount_inr,status,project_id,institution_id,institutions:institution_id(name,type)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export const notificationsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,link,read,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const mySupportsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-supports", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_supports")
        .select("challenge_id")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.challenge_id);
    },
  });

export const myChallengesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-challenges", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase
        .from("challenges")
        .select(CHALLENGE_COLUMNS)
        .eq("submitter_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Challenge[];
    },
  });
