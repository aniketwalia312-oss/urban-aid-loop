import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, MessageSquare, ThumbsUp } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { ChallengeBadge, ProjectBadge } from "@/components/sanket/ChallengeBadge";
import { Chip } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { challengeQuery, mySupportsQuery, myInstitutionsQuery } from "@/lib/innovation.queries";
import {
  CHALLENGE_LIFECYCLE,
  CHALLENGE_STATUS_LABEL,
  challengePriorityBreakdown,
  inr,
  type ChallengeStatus,
  type ProjectStatus,
} from "@/lib/innovation";
import { postMessage, respondToRoute, submitProposal, toggleSupport } from "@/lib/innovation.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";
import { timeAgo } from "@/lib/sanket";

export const Route = createFileRoute("/challenges/$id")({
  head: () => ({
    meta: [
      { title: "Challenge detail — Societal innovation portal | Sanket" },
      {
        name: "description",
        content:
          "Track a societal challenge: AI categorisation, priority breakdown, institutional routing, university proposals and project milestones.",
      },
      { property: "og:title", content: "Challenge detail — Sanket" },
      {
        property: "og:description",
        content: "Follow a community challenge from submission through to a deployed solution.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengeDetail,
});

function ChallengeDetail() {
  const { id } = Route.useParams();
  const { session, name, isUniversity } = useSanketAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(challengeQuery(id));
  const { data: supports = [] } = useQuery(mySupportsQuery(session?.user.id));
  const { data: myInstitutions = [] } = useQuery(myInstitutionsQuery(session?.user.id));

  const support = useServerFn(toggleSupport);
  const send = useServerFn(postMessage);
  const respond = useServerFn(respondToRoute);
  const [body, setBody] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["challenge", id] });

  if (isLoading) {
    return (
      <AppShell>
        <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Loading challenge…</p>
      </AppShell>
    );
  }

  const challenge = data?.challenge;
  if (!challenge) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Challenge not found</h1>
          <Button asChild>
            <Link to="/challenges">Back to all challenges</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const supported = supports.includes(challenge.id);
  const breakdown = challengePriorityBreakdown({
    severity: challenge.severity_score,
    supportCount: challenge.support_count,
    beneficiaries: challenge.beneficiaries,
    createdAt: challenge.created_at,
  });
  const routes = (data?.routes ?? []) as Array<{
    id: string;
    match_score: number;
    rationale: string | null;
    status: string;
    institution_id: string;
    institutions: { id: string; name: string; type: string; district: string | null; verified: boolean } | null;
  }>;
  const proposals = (data?.proposals ?? []) as Array<{
    id: string;
    title: string;
    abstract: string;
    faculty_mentor: string | null;
    duration_weeks: number;
    budget_inr: number;
    status: string;
    review_notes: string | null;
    institutions: { name: string; type: string } | null;
  }>;
  const projects = (data?.projects ?? []) as Array<{
    id: string;
    title: string;
    status: ProjectStatus;
    progress: number;
    outcome_summary: string | null;
    patents: number;
    startups_created: number;
  }>;
  const messages = (data?.messages ?? []) as Array<{
    id: string;
    body: string;
    author_name: string | null;
    created_at: string;
  }>;

  const myRoutes = routes.filter((r) =>
    myInstitutions.some((i) => i.id === r.institution_id),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ChallengeBadge status={challenge.status} />
            <Chip tone="info">{challenge.domain}</Chip>
            {challenge.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground">
            {challenge.district ?? "Jharkhand"} · {challenge.address ?? "No address given"} ·{" "}
            {timeAgo(challenge.created_at)} · {challenge.beneficiaries.toLocaleString("en-IN")} people
            affected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={supported ? "default" : "outline"}
              disabled={!session}
              onClick={async () => {
                try {
                  await support({ data: { challengeId: challenge.id } });
                  await queryClient.invalidateQueries({ queryKey: ["my-supports"] });
                  await refresh();
                } catch {
                  toast.error("Could not record your support");
                }
              }}
            >
              <ThumbsUp className="h-4 w-4" />
              {supported ? "Supported" : "Support"} · {challenge.support_count}
            </Button>
          </div>
        </div>

        <Lifecycle status={challenge.status} />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="panel space-y-2 p-5">
              <h2 className="font-semibold">Problem statement</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{challenge.description}</p>
            </section>

            <section className="panel space-y-3 p-5">
              <h2 className="font-semibold">Institutional routing</h2>
              {routes.length === 0 && (
                <p className="text-sm text-muted-foreground">No institutions matched yet.</p>
              )}
              {routes.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
                  <Building2 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">{r.institutions?.name ?? "Institution"}</span>
                  <Chip>{r.institutions?.type ?? "partner"}</Chip>
                  <Chip tone={r.status === "accepted" ? "success" : r.status === "declined" ? "destructive" : "info"}>
                    {r.status}
                  </Chip>
                  <span className="ml-auto font-mono text-xs">{Math.round(r.match_score)}% match</span>
                  {myRoutes.some((m) => m.id === r.id) && r.status === "routed" && (
                    <div className="flex w-full gap-2 pt-1">
                      {(["accepted", "declined"] as const).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === "accepted" ? "default" : "outline"}
                          onClick={async () => {
                            await respond({ data: { routeId: r.id, status: s } });
                            await refresh();
                            toast.success(`Challenge ${s}`);
                          }}
                        >
                          {s === "accepted" ? "Accept challenge" : "Decline"}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>

            <section className="panel space-y-3 p-5">
              <h2 className="font-semibold">Solution proposals</h2>
              {proposals.length === 0 && (
                <p className="text-sm text-muted-foreground">No proposals submitted yet.</p>
              )}
              {proposals.map((p) => (
                <div key={p.id} className="space-y-1 border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    <Chip
                      tone={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"}
                    >
                      {p.status}
                    </Chip>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.abstract}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.institutions?.name} · mentor {p.faculty_mentor ?? "TBD"} · {p.duration_weeks} weeks ·{" "}
                    {inr(p.budget_inr)}
                  </p>
                  {p.review_notes && <p className="text-xs italic">Review: {p.review_notes}</p>}
                </div>
              ))}
              {isUniversity && myInstitutions.length > 0 && (
                <ProposalForm challengeId={challenge.id} institutions={myInstitutions} onDone={refresh} />
              )}
            </section>

            {projects.length > 0 && (
              <section className="panel space-y-3 p-5">
                <h2 className="font-semibold">Projects</h2>
                {projects.map((p) => (
                  <div key={p.id} className="space-y-1 border-b pb-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      <ProjectBadge status={p.status} />
                      <span className="ml-auto font-mono text-xs">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-accent" style={{ width: `${p.progress}%` }} />
                    </div>
                    {p.outcome_summary && (
                      <p className="text-xs text-muted-foreground">{p.outcome_summary}</p>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="panel space-y-3 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" /> Stakeholder discussion
              </h2>
              {messages.map((m) => (
                <div key={m.id} className="border-b pb-2 text-sm last:border-0">
                  <p className="text-xs text-muted-foreground">
                    {m.author_name ?? "Participant"} · {timeAgo(m.created_at)}
                  </p>
                  <p>{m.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}
              {session ? (
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (body.trim().length < 2) return;
                    await send({ data: { challengeId: challenge.id, body, authorName: name } });
                    setBody("");
                    await refresh();
                  }}
                >
                  <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add an update…" />
                  <Button type="submit">Post</Button>
                </form>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to="/auth">Sign in to join the discussion</Link>
                </Button>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="panel space-y-3 p-5">
              <h2 className="font-semibold">Priority breakdown</h2>
              <p className="font-mono text-3xl font-semibold">{challenge.priority_score.toFixed(2)}</p>
              {breakdown.map((b) => (
                <div key={b.label} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-mono">{b.value.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.raw} × weight {b.weight}
                  </p>
                </div>
              ))}
            </div>

            <div className="panel space-y-2 p-5">
              <h2 className="font-semibold">AI assessment</h2>
              <p className="text-sm text-muted-foreground">{challenge.ai_summary ?? "Pending analysis."}</p>
              <p className="text-xs text-muted-foreground">
                Severity {challenge.severity_score.toFixed(1)}/10 · confidence{" "}
                {Math.round(challenge.ai_confidence * 100)}%
              </p>
              {challenge.ai_rationale && (
                <p className="text-xs italic text-muted-foreground">{challenge.ai_rationale}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Lifecycle({ status }: { status: ChallengeStatus }) {
  const index = CHALLENGE_LIFECYCLE.indexOf(status);
  return (
    <ol className="panel flex flex-wrap gap-2 p-4 text-xs">
      {CHALLENGE_LIFECYCLE.map((s, i) => (
        <li
          key={s}
          className={`rounded-full border px-3 py-1 ${
            index >= i && index >= 0 ? "bg-accent/15 border-accent/40 text-accent" : "text-muted-foreground"
          }`}
        >
          {CHALLENGE_STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

function ProposalForm({
  challengeId,
  institutions,
  onDone,
}: {
  challengeId: string;
  institutions: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const submit = useServerFn(submitProposal);
  const [open, setOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [approach, setApproach] = useState("");
  const [mentor, setMentor] = useState("");
  const [weeks, setWeeks] = useState("16");
  const [budget, setBudget] = useState("250000");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Submit a proposal
      </Button>
    );

  return (
    <form
      className="space-y-3 border-t pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await submit({
            data: {
              challengeId,
              institutionId,
              title,
              abstract,
              approach: approach || null,
              teamMembers: team
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [n, d] = line.split("—").map((s) => s.trim());
                  return { name: n ?? line, discipline: d ?? "Multidisciplinary" };
                }),
              facultyMentor: mentor || null,
              durationWeeks: Number(weeks) || 16,
              budgetInr: Number(budget) || 0,
            },
          });
          toast.success("Proposal submitted for government review");
          setOpen(false);
          onDone();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not submit proposal");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="inst">Institution</Label>
        <select
          id="inst"
          value={institutionId}
          onChange={(e) => setInstitutionId(e.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" required />
      <Textarea
        value={abstract}
        onChange={(e) => setAbstract(e.target.value)}
        placeholder="Abstract (min 30 characters)"
        rows={3}
        required
      />
      <Textarea
        value={approach}
        onChange={(e) => setApproach(e.target.value)}
        placeholder="Technical approach / methodology"
        rows={3}
      />
      <Textarea
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        placeholder={"Team members, one per line: Name — Discipline"}
        rows={3}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input value={mentor} onChange={(e) => setMentor(e.target.value)} placeholder="Faculty mentor" />
        <Input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="Weeks" />
        <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget ₹" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Submit proposal
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
