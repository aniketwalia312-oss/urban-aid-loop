import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleSlash, MapPin, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { StatusBadge, Chip } from "@/components/sanket/StatusBadge";
import { PriorityMeter } from "@/components/sanket/PriorityMeter";
import { EvidenceImage } from "@/components/sanket/EvidenceImage";
import { BeforeAfterSlider } from "@/components/sanket/BeforeAfterSlider";
import { Button } from "@/components/ui/button";
import { issueQuery } from "@/lib/queries";
import { LIFECYCLE, STATUS_LABEL, timeAgo, type Vote } from "@/lib/sanket";
import { castVote } from "@/lib/civic.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/issues/$id")({
  head: () => ({
    meta: [
      { title: "Civic issue detail — Sanket" },
      {
        name: "description",
        content:
          "Full audit trail for a civic issue: evidence gallery, transparent priority breakdown, AI resolution analysis and citizen verification votes.",
      },
      { property: "og:title", content: "Civic issue detail — Sanket" },
      { property: "og:description", content: "Evidence, priority breakdown and community audit for this ticket." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IssueDetail,
});

const VOTES: { key: Vote; label: string; icon: typeof CheckCircle2 }[] = [
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
  { key: "partially_resolved", label: "Partially resolved", icon: AlertTriangle },
  { key: "still_present", label: "Still present", icon: CircleSlash },
];

function IssueDetail() {
  const { id } = Route.useParams();
  const { session } = useSanketAuth();
  const queryClient = useQueryClient();
  const vote = useServerFn(castVote);
  const { data, isPending } = useQuery(issueQuery(id));

  const submitVote = async (choice: Vote) => {
    if (!session) {
      toast.error("Sign in to audit this resolution");
      return;
    }
    try {
      const res = await vote({ data: { issueId: id, vote: choice } });
      await queryClient.invalidateQueries();
      toast.success(
        res.status === "reopened_failed_resolution"
          ? "Ticket reopened — enough citizens report the issue persists"
          : "Audit vote recorded",
      );
    } catch {
      toast.error("Could not record your vote");
    }
  };

  if (isPending) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Loading issue…</div>
      </AppShell>
    );
  }

  const issue = data?.issue;
  if (!issue) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Issue not found.</div>
      </AppShell>
    );
  }

  const proof = data.proof;
  const tally = data.votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.vote] = (acc[v.vote] ?? 0) + 1;
    return acc;
  }, {});
  const stageIndex = LIFECYCLE.indexOf(issue.status);

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={issue.status} />
              <Chip>{issue.category}</Chip>
              {issue.failure_count > 0 && (
                <Chip tone="destructive">Failed resolutions: {issue.failure_count}</Chip>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{issue.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {issue.address ?? `${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`} ·{" "}
              {timeAgo(issue.created_at)}
            </p>
            {issue.description && <p className="mt-3 text-sm leading-relaxed">{issue.description}</p>}
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle</h2>
            <ol className="mt-3 space-y-3">
              {LIFECYCLE.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                      (i <= stageIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {i + 1}
                  </span>
                  <span className={i <= stageIndex ? "font-medium" : "text-muted-foreground"}>
                    {STATUS_LABEL[s]}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Community evidence ({data.reports.length})
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.reports.map((r) => (
                <div key={r.id} className="space-y-1">
                  <EvidenceImage path={r.image_url} alt="Citizen evidence" className="aspect-square" />
                  <p className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
                  {r.is_flagged_fraud && (
                    <Chip tone="destructive">
                      <ShieldAlert className="h-3 w-3" /> {r.fraud_reason ?? "Integrity flag"}
                    </Chip>
                  )}
                </div>
              ))}
            </div>
          </div>

          {proof && (
            <div className="panel space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  AI before / after inspection
                </h2>
                <Chip tone={proof.potential_anomaly ? "destructive" : "success"}>
                  Confidence {Math.round(proof.ai_confidence_score)}%
                </Chip>
              </div>
              <BeforeAfterSlider beforePath={proof.before_image_url} afterPath={proof.after_image_url} />
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <Chip tone={proof.is_same_scene ? "success" : "destructive"}>
                  Same scene: {proof.is_same_scene ? "yes" : "no"}
                </Chip>
                <Chip tone={proof.issue_resolved ? "success" : "warning"}>
                  Resolved: {proof.issue_resolved ? "yes" : "no"}
                </Chip>
                <Chip tone={proof.potential_anomaly ? "destructive" : "muted"}>
                  Anomaly: {proof.potential_anomaly ? "flagged" : "none"}
                </Chip>
              </div>
              <p className="text-sm text-muted-foreground">{proof.ai_analysis_summary}</p>
              <p className="text-sm">
                <span className="font-medium">Worker notes: </span>
                {proof.worker_notes}
              </p>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold">Citizen audit</h3>
                <p className="text-xs text-muted-foreground">
                  If 30% or more neighbours report the issue is still present, the ticket reopens automatically.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {VOTES.map(({ key, label, icon: Icon }) => (
                    <Button key={key} variant="outline" size="sm" onClick={() => void submitVote(key)}>
                      <Icon className="h-4 w-4" /> {label}
                      <span className="ml-1 font-mono text-xs text-muted-foreground">{tally[key] ?? 0}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="panel p-5">
            <PriorityMeter
              score={issue.priority_score}
              severity={issue.severity_score}
              reportCount={issue.report_count}
              createdAt={issue.created_at}
              verifiedEvidence={issue.evidence_count}
            />
          </div>
          <div className="panel space-y-2 p-5 text-sm">
            <Row label="Reports merged" value={String(issue.report_count)} />
            <Row label="Evidence photos" value={String(issue.evidence_count)} />
            <Row label="AI severity" value={`${issue.severity_score.toFixed(1)} / 10`} />
            <Row label="Ward" value={issue.ward ?? "Unassigned"} />
            <Row label="Last update" value={timeAgo(issue.updated_at)} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
