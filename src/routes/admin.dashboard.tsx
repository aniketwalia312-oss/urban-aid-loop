import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/sanket/AppShell";
import { IssueMap } from "@/components/sanket/IssueMap";
import { Chip, StatusBadge } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { issuesQuery } from "@/lib/queries";
import { timeAgo } from "@/lib/sanket";
import { assignWorker, listWorkers } from "@/lib/civic.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Municipal command centre — Sanket" },
      {
        name: "description",
        content: "Ward-wise GIS clusters, SLA telemetry, worker assignment and the AI anomaly review queue.",
      },
      { property: "og:title", content: "Municipal command centre — Sanket" },
      { property: "og:description", content: "Live civic operations telemetry and AI anomaly review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { isAdmin, loading } = useSanketAuth();
  const { data: issues = [] } = useQuery(issuesQuery);
  const fetchWorkers = useServerFn(listWorkers);
  const assign = useServerFn(assignWorker);
  const queryClient = useQueryClient();
  const { data: workers = [] } = useQuery({
    queryKey: ["workers"],
    enabled: isAdmin,
    queryFn: () => fetchWorkers({ data: undefined }),
  });

  if (loading) return <AppShell><p className="p-8 text-sm text-muted-foreground">Loading…</p></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Administrative passkey required</h1>
          <p className="text-sm text-muted-foreground">Officials must elevate their role on the sign-in screen.</p>
          <Button asChild>
            <Link to="/auth">Enter passkey</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const closed = issues.filter((i) => i.status === "closed_verified");
  const anomalies = issues.filter(
    (i) => i.admin_review_flag || i.status === "resolution_anomaly" || i.status === "reopened_failed_resolution",
  );
  const avgHours =
    closed.length > 0
      ? closed.reduce(
          (sum, i) => sum + (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 3.6e6,
          0,
        ) / closed.length
      : 0;
  const completion = issues.length > 0 ? Math.round((closed.length / issues.length) * 100) : 0;

  const wards = Object.entries(
    issues.reduce<Record<string, number>>((acc, i) => {
      const key = i.ward ?? "Unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const handleAssign = async (issueId: string, workerId: string) => {
    try {
      await assign({ data: { issueId, workerId } });
      await queryClient.invalidateQueries();
      toast.success("Task assigned");
    } catch {
      toast.error("Assignment failed");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Command centre</h1>
          <p className="text-sm text-muted-foreground">Live municipal telemetry and AI integrity oversight.</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Total tickets" value={String(issues.length)} />
          <Metric label="Completion rate" value={`${completion}%`} />
          <Metric label="Avg turnaround" value={`${avgHours.toFixed(1)} h`} />
          <Metric label="Anomalies" value={String(anomalies.length)} tone="destructive" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="panel p-3">
            <IssueMap points={issues} className="h-[340px]" />
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ward clusters</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {wards.map(([ward, count]) => (
                <li key={ward} className="flex items-center gap-3">
                  <span className="w-28 truncate">{ward}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / (wards[0]?.[1] ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs">{count}</span>
                </li>
              ))}
              {wards.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
            </ul>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">AI anomaly & escalation queue</h2>
          <div className="space-y-3">
            {anomalies.map((i) => (
              <div key={i.id} className="panel flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={i.status} />
                    {i.failure_count > 0 && <Chip tone="destructive">{i.failure_count} failed fixes</Chip>}
                  </div>
                  <Link to="/issues/$id" params={{ id: i.id }} className="mt-1 block truncate font-medium hover:underline">
                    {i.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{timeAgo(i.updated_at)}</p>
                </div>
                <Select onValueChange={(v) => void handleAssign(i.id, v)}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Assign worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name ?? w.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {anomalies.length === 0 && <p className="text-sm text-muted-foreground">No anomalies flagged.</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">All tickets by priority</h2>
          <div className="panel divide-y">
            {issues.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="w-14 font-mono">{i.priority_score.toFixed(1)}</span>
                <Link to="/issues/$id" params={{ id: i.id }} className="min-w-0 flex-1 truncate hover:underline">
                  {i.title}
                </Link>
                <StatusBadge status={i.status} />
                <Select onValueChange={(v) => void handleAssign(i.id, v)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name ?? w.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-mono text-2xl font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}
