import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IssueStatus } from "./sanket";

export type Issue = {
  id: string;
  title: string;
  category: string;
  description: string;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  ward: string | null;
  priority_score: number;
  severity_score: number;
  evidence_count: number;
  report_count: number;
  failure_count: number;
  admin_review_flag: boolean;
  assigned_worker_id: string | null;
  created_at: string;
  updated_at: string;
};

const ISSUE_COLUMNS =
  "id,title,category,description,status,latitude,longitude,address,ward,priority_score,severity_score,evidence_count,report_count,failure_count,admin_review_flag,assigned_worker_id,created_at,updated_at";

export const issuesQuery = queryOptions({
  queryKey: ["issues"],
  queryFn: async (): Promise<Issue[]> => {
    const { data, error } = await supabase
      .from("civic_issues")
      .select(ISSUE_COLUMNS)
      .order("priority_score", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as Issue[];
  },
});

export const issueQuery = (id: string) =>
  queryOptions({
    queryKey: ["issue", id],
    queryFn: async () => {
      const [issue, reports, proof, votes] = await Promise.all([
        supabase.from("civic_issues").select(ISSUE_COLUMNS).eq("id", id).maybeSingle(),
        supabase
          .from("reports")
          .select("id,image_url,created_at,is_flagged_fraud,fraud_reason,exif_timestamp,ai_summary")
          .eq("civic_issue_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("resolution_proofs")
          .select(
            "id,before_image_url,after_image_url,worker_notes,ai_confidence_score,ai_analysis_summary,is_same_scene,issue_resolved,potential_anomaly,submitted_at",
          )
          .eq("civic_issue_id", id)
          .maybeSingle(),
        supabase.from("verifications").select("id,vote,feedback,created_at,user_id").eq("civic_issue_id", id),
      ]);
      if (issue.error) throw new Error(issue.error.message);
      return {
        issue: (issue.data ?? null) as Issue | null,
        reports: reports.data ?? [],
        proof: proof.data ?? null,
        votes: votes.data ?? [],
      };
    },
  });

export const myReportsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-reports", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id,civic_issue_id,image_url,created_at,is_flagged_fraud")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
