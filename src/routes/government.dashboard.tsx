import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart3, Building2, FlaskConical, Layers, Loader2, Rocket, Users } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { ChallengeBadge, ProjectBadge } from "@/components/sanket/ChallengeBadge";
import { Chip } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { challengesQuery, institutionsQuery, partnershipsQuery, pendingProposalsQuery, projectsQuery } from "@/lib/innovation.queries";
import { reviewProposal } from "@/lib/innovation.functions";
import { DOMAINS, inr } from "@/lib/innovation";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/government/dashboard")({
  head: () => ({
    meta: [
      { title: "Government Analytics — Sanket Innovation Portal" },
      {
        name: "description",
        content:
          "District and domain-wise analytics on societal challenges, university participation, industry collaboration, project progress and innovation outcomes across Jharkhand.",
      },
      { property: "og:title", content: "Government Analytics — Sanket" },
      { property: "og:description", content: "Monitor challenges, institutions, projects and measurable social outcomes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GovernmentDashboard,
});

function GovernmentDashboard() {
  const { session, isGovernment } = useSanketAuth();
  const qc = useQueryClient();
  const review = useServerFn(reviewProposal);

  const { data: challenges = [] } = useQuery(challengesQuery);
  const { data: projects = [] } = useQuery(projectsQuery);
  const { data: institutions = [] } = useQuery(institutionsQuery);
  const { data: partnerships = [] } = useQuery(partnershipsQuery);
  const { data: pending = [] } = useQuery({ ...pendingProposalsQuery, enabled: isGovernment });

  const [notes, setNotes] = useState<Record<string, string>>({});

  const reviewMut = useMutation({
    mutationFn: (v: { proposalId: string; decision: "approved" | "rejected" }) =>
      review({ data: { proposalId: v.proposalId, decision: v.decision, notes: notes[v.proposalId] ?? null } }),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approved" ? "Proposal approved — project started" : "Proposal rejected");
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Could not record the decision"),
  });

  const stats = useMemo(() => {
    const byDomain = DOMAINS.map((d) => ({
      domain: d,
      count: challenges.filter((c) => c.domain === d).length,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    const districts = new Map<string, number>();
    for (const c of challenges) if (c.district) districts.set(c.district, (districts.get(c.district) ?? 0) + 1);

    const funding = partnerships.reduce((sum, p) => sum + Number(p.amount_inr ?? 0), 0);

    return {
      byDomain,
      districts: [...districts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      total: challenges.length,
      inProject: challenges.filter((c) => c.status === "in_project" || c.status === "completed").length,
      routed: challenges.filter((c) => c.status === "routed" || c.status === "proposal_received").length,
      universities: institutions.filter((i) => ["university", "research_lab", "incubator"].includes(i.type)).length,
      industry: institutions.filter((i) => ["industry", "startup", "msme", "csr"].includes(i.type)).length,
      projects: projects.length,
      completed: projects.filter((p) => p.status === "completed" || p.status === "deployed").length,
      patents: projects.reduce((s, p) => s + (p.patents ?? 0), 0),
      startups: projects.reduce((s, p) => s + (p.startups_created ?? 0), 0),
      beneficiaries: projects.reduce((s, p) => s + (p.beneficiaries ?? 0), 0),
      funding,
    };
  }, [challenges, projects, institutions, partnerships]);

  const maxDomain = Math.max(1, ...stats.byDomain.map((d) => d.count));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BarChart3 className="h-6 w-6 text-accent" /> Government innovation analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Live view of challenge intake, institutional participation, industry engagement and measurable outcomes.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Layers} label="Challenges received" value={stats.total} sub={`${stats.routed} routed · ${stats.inProject} in project`} />
          <Stat icon={Building2} label="Institutions engaged" value={stats.universities + stats.industry} sub={`${stats.universities} academic · ${stats.industry} industry`} />
          <Stat icon={FlaskConical} label="Projects" value={stats.projects} sub={`${stats.completed} completed or deployed`} />
          <Stat icon={Rocket} label="Innovation outcomes" value={stats.patents + stats.startups} sub={`${stats.patents} patents · ${stats.startups} startups`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-3 p-5">
            <h2 className="font-medium">Domain-wise distribution</h2>
            {stats.byDomain.length === 0 ? (
              <p className="text-sm text-muted-foreground">No challenges submitted yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.byDomain.map((d) => (
                  <li key={d.domain} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{d.domain.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">{d.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(d.count / maxDomain) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel space-y-3 p-5">
            <h2 className="font-medium">District participation</h2>
            {stats.districts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No district data yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {stats.districts.map(([district, count]) => (
                  <li key={district}>
                    <Chip tone="info">
                      {district} · {count}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t pt-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4" /> {stats.beneficiaries.toLocaleString("en-IN")} citizens reached by live projects
              </p>
              <p className="mt-1">Industry and CSR commitments: {inr(stats.funding)}</p>
            </div>
          </div>
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-medium">Proposals awaiting government review</h2>
          {!session || !isGovernment ? (
            <p className="text-sm text-muted-foreground">
              Sign in with the government passkey to review and approve university proposals.
            </p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proposals pending review.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((p) => {
                const inst = p.institutions as { name: string } | null;
                const ch = p.challenges as { title: string; domain: string; district: string | null } | null;
                return (
                  <li key={p.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{p.title}</h3>
                      <Chip>{inst?.name ?? "Institution"}</Chip>
                      {ch && <Chip tone="info">{ch.domain}</Chip>}
                    </div>
                    {ch && <p className="mt-1 text-xs text-muted-foreground">Challenge: {ch.title}</p>}
                    <p className="mt-2 text-sm text-muted-foreground">{p.abstract}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {p.duration_weeks} weeks · {inr(Number(p.budget_inr ?? 0))} · Mentor: {p.faculty_mentor ?? "—"}
                    </p>
                    <Textarea
                      className="mt-3"
                      rows={2}
                      placeholder="Review notes (optional)"
                      value={notes[p.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                    />
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={reviewMut.isPending}
                        onClick={() => reviewMut.mutate({ proposalId: p.id, decision: "approved" })}
                      >
                        {reviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & start project"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewMut.isPending}
                        onClick={() => reviewMut.mutate({ proposalId: p.id, decision: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-medium">Project progress monitor</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects started yet.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{p.title}</h3>
                    <ProjectBadge status={p.status} />
                    <Chip>{p.institutions?.name ?? "Institution"}</Chip>
                    {p.challenges?.district && <Chip tone="info">{p.challenges.district}</Chip>}
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-success" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.progress}% complete · {p.patents} patents · {p.startups_created} startups ·{" "}
                    {p.beneficiaries.toLocaleString("en-IN")} beneficiaries
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-medium">Latest challenge submissions</h2>
          <ul className="space-y-2">
            {challenges.slice(0, 8).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <ChallengeBadge status={c.status} />
                <span className="font-medium">{c.title}</span>
                <span className="text-muted-foreground">
                  {c.domain} · {c.district ?? "Jharkhand"} · priority {Math.round(c.priority_score)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="panel space-y-1 p-4">
      <Icon className="h-4 w-4 text-accent" />
      <p className="text-2xl font-semibold">{value.toLocaleString("en-IN")}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
