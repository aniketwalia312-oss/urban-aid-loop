import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { InstitutionPanel } from "@/components/sanket/InstitutionPanel";
import { Chip } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useSanketAuth } from "@/hooks/useSanketAuth";
import {
  myInstitutionsQuery,
  projectsQuery,
  projectDetailQuery,
  proposalsForInstitutionsQuery,
  routesForInstitutionsQuery,
} from "@/lib/innovation.queries";
import { respondToRoute, submitProposal, updateMilestone, recordOutcomes } from "@/lib/innovation.functions";
import { inr, PROJECT_STATUS_LABEL } from "@/lib/innovation";

export const Route = createFileRoute("/university/dashboard")({
  head: () => ({
    meta: [
      { title: "University Innovation Desk — Sanket" },
      {
        name: "description",
        content:
          "Review routed societal challenges, form multidisciplinary teams, submit solution proposals and track funded projects.",
      },
      { property: "og:title", content: "University Innovation Desk — Sanket" },
      {
        property: "og:description",
        content: "Higher education institutions turning Jharkhand's community challenges into research projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UniversityDashboard,
});

function UniversityDashboard() {
  const { session, isUniversity } = useSanketAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const { data: mine = [] } = useQuery(myInstitutionsQuery(userId));
  const ids = useMemo(() => mine.map((i) => i.id), [mine]);
  const { data: routes = [] } = useQuery(routesForInstitutionsQuery(ids));
  const { data: proposals = [] } = useQuery(proposalsForInstitutionsQuery(ids));
  const { data: allProjects = [] } = useQuery(projectsQuery);
  const myProjects = allProjects.filter((p) => ids.includes(p.institution_id));

  const respond = useServerFn(respondToRoute);
  const [proposeFor, setProposeFor] = useState<{ challengeId: string; institutionId: string } | null>(null);

  const act = async (routeId: string, status: "accepted" | "declined") => {
    try {
      await respond({ data: { routeId, status } });
      toast.success(status === "accepted" ? "Challenge accepted" : "Challenge declined");
      await qc.invalidateQueries({ queryKey: ["routes-for-institutions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  if (!session) return <SignedOut />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-center gap-3">
          <GraduationCap className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight">University innovation desk</h1>
          {!isUniversity && <Chip tone="warning">Add the university passkey on the sign-in page</Chip>}
        </header>

        <InstitutionPanel
          userId={userId}
          allowedTypes={["university", "research_lab", "incubator"]}
          heading="Your institutions"
        />

        <section className="panel space-y-3 p-5">
          <h2 className="font-medium">Routed challenges</h2>
          {routes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No challenges routed yet. Matching happens automatically from your focus areas and district.
            </p>
          ) : (
            <ul className="space-y-3">
              {routes.map((r) => {
                const c = r.challenges as
                  | { id: string; title: string; domain: string; district: string | null; priority_score: number; ai_summary: string | null }
                  | null;
                return (
                  <li key={r.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/challenges/$id"
                        params={{ id: r.challenge_id }}
                        className="font-medium hover:underline"
                      >
                        {c?.title ?? "Challenge"}
                      </Link>
                      <Chip>{c?.domain?.replace("_", " ")}</Chip>
                      <Chip tone="info">Match {Math.round(Number(r.match_score))}%</Chip>
                      <Chip tone={r.status === "accepted" ? "success" : r.status === "declined" ? "muted" : "warning"}>
                        {r.status}
                      </Chip>
                    </div>
                    {c?.ai_summary && <p className="mt-2 text-sm text-muted-foreground">{c.ai_summary}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === "routed" && (
                        <>
                          <Button size="sm" onClick={() => void act(r.id, "accepted")}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void act(r.id, "declined")}>
                            Decline
                          </Button>
                        </>
                      )}
                      {r.status === "accepted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setProposeFor({ challengeId: r.challenge_id, institutionId: r.institution_id })
                          }
                        >
                          Submit proposal
                        </Button>
                      )}
                    </div>
                    {proposeFor?.challengeId === r.challenge_id && (
                      <ProposalForm
                        challengeId={r.challenge_id}
                        institutionId={r.institution_id}
                        onDone={() => {
                          setProposeFor(null);
                          void qc.invalidateQueries({ queryKey: ["proposals-for-institutions"] });
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-medium">Your proposals</h2>
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proposals submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {proposals.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                  <span className="font-medium">{p.title}</span>
                  <Chip
                    tone={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "warning"}
                  >
                    {p.status}
                  </Chip>
                  <span className="text-muted-foreground">
                    {p.duration_weeks} weeks · {inr(Number(p.budget_inr))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Live projects</h2>
          {myProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Approved proposals appear here as monitored projects.</p>
          ) : (
            myProjects.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ProposalForm({
  challengeId,
  institutionId,
  onDone,
}: {
  challengeId: string;
  institutionId: string;
  onDone: () => void;
}) {
  const propose = useServerFn(submitProposal);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [approach, setApproach] = useState("");
  const [mentor, setMentor] = useState("");
  const [team, setTeam] = useState("");
  const [weeks, setWeeks] = useState(12);
  const [budget, setBudget] = useState(200000);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await propose({
        data: {
          challengeId,
          institutionId,
          title,
          abstract,
          approach: approach || null,
          teamMembers: team
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 20)
            .map((l) => {
              const [name, discipline] = l.split(/\s*[-–—]\s*/);
              return { name: (name ?? l).slice(0, 120), discipline: (discipline ?? "Multidisciplinary").slice(0, 120) };
            }),
          facultyMentor: mentor || null,
          durationWeeks: weeks,
          budgetInr: budget,
        },
      });
      toast.success("Proposal submitted for review");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit proposal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-title">Proposal title</Label>
        <Input id="p-title" value={title} required onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-abs">Abstract</Label>
        <Textarea id="p-abs" rows={3} value={abstract} required onChange={(e) => setAbstract(e.target.value)} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-app">Approach and methodology</Label>
        <Textarea id="p-app" rows={3} value={approach} onChange={(e) => setApproach(e.target.value)} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="p-team">Team (one per line: name – discipline)</Label>
        <Textarea
          id="p-team"
          rows={3}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder={"Asha Kumari – Civil Engineering\nRavi Oraon – Data Science"}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-mentor">Faculty mentor</Label>
        <Input id="p-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-weeks">Duration (weeks)</Label>
        <Input
          id="p-weeks"
          type="number"
          min={2}
          max={104}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-budget">Budget (₹)</Label>
        <Input
          id="p-budget"
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit proposal"}
        </Button>
      </div>
    </form>
  );
}

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    title: string;
    status: keyof typeof PROJECT_STATUS_LABEL;
    progress: number;
    patents: number;
    startups_created: number;
    beneficiaries: number;
    outcome_summary: string | null;
  };
}) {
  const qc = useQueryClient();
  const { data } = useQuery(projectDetailQuery(project.id));
  const move = useServerFn(updateMilestone);
  const outcomes = useServerFn(recordOutcomes);
  const [patents, setPatents] = useState(project.patents);
  const [startups, setStartups] = useState(project.startups_created);
  const [people, setPeople] = useState(project.beneficiaries);
  const [summary, setSummary] = useState(project.outcome_summary ?? "");

  const setStatus = async (milestoneId: string, status: "pending" | "in_progress" | "done" | "blocked") => {
    try {
      await move({ data: { milestoneId, projectId: project.id, status } });
      await qc.invalidateQueries({ queryKey: ["project", project.id] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update milestone");
    }
  };

  const saveOutcomes = async () => {
    try {
      await outcomes({
        data: {
          projectId: project.id,
          patents,
          startupsCreated: startups,
          beneficiaries: people,
          outcomeSummary: summary || null,
        },
      });
      toast.success("Outcomes recorded");
      await qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save outcomes");
    }
  };

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{project.title}</h3>
        <Chip tone="info">{PROJECT_STATUS_LABEL[project.status]}</Chip>
        <span className="ml-auto text-sm text-muted-foreground">{project.progress}%</span>
      </div>
      <Progress value={project.progress} />

      <ul className="space-y-2">
        {(data?.milestones ?? []).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
            <span className="font-medium">{m.title}</span>
            <span className="text-xs text-muted-foreground">{m.due_date ?? ""}</span>
            <select
              className="ml-auto h-8 rounded-md border bg-background px-2 text-xs"
              value={m.status}
              onChange={(e) =>
                void setStatus(m.id, e.target.value as "pending" | "in_progress" | "done" | "blocked")
              }
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </li>
        ))}
      </ul>

      {(data?.partnerships ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(data?.partnerships ?? []).map((p) => (
            <Chip key={p.id} tone="success">
              {(p.institutions as { name: string } | null)?.name ?? "Partner"} ·{" "}
              {p.partner_type.replace("_", " ")}
              {Number(p.amount_inr) > 0 ? ` · ${inr(Number(p.amount_inr))}` : ""}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid gap-3 border-t pt-4 md:grid-cols-4">
        <NumField label="Patents" value={patents} onChange={setPatents} />
        <NumField label="Startups" value={startups} onChange={setStartups} />
        <NumField label="Beneficiaries" value={people} onChange={setPeople} />
        <div className="flex items-end">
          <Button size="sm" onClick={() => void saveOutcomes()}>
            Save outcomes
          </Button>
        </div>
        <div className="space-y-1.5 md:col-span-4">
          <Label htmlFor={`sum-${project.id}`}>Outcome summary</Label>
          <Textarea
            id={`sum-${project.id}`}
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function SignedOut() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">University access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with your university passkey to review routed challenges.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    </AppShell>
  );
}
