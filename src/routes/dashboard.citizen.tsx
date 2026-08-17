import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/sanket/AppShell";
import { ReportForm } from "@/components/sanket/ReportForm";
import { IssueMap } from "@/components/sanket/IssueMap";
import { StatusBadge, Chip } from "@/components/sanket/StatusBadge";
import { PriorityMeter } from "@/components/sanket/PriorityMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { issuesQuery } from "@/lib/queries";
import { CATEGORIES, timeAgo } from "@/lib/sanket";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/dashboard/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen dashboard — Report & track civic issues | Sanket" },
      {
        name: "description",
        content:
          "File civic complaints with GPS-verified photos, follow the resolution timeline and explore the live municipal issue heatmap.",
      },
      { property: "og:title", content: "Citizen dashboard — Sanket" },
      { property: "og:description", content: "Report, track and audit civic issues in your ward." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CitizenDashboard,
});

function CitizenDashboard() {
  const { session } = useSanketAuth();
  const { data: issues = [] } = useQuery(issuesQuery);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (!category || i.category === category) &&
          (!search || `${i.title} ${i.address ?? ""}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [issues, category, search],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Citizen portal</h1>
          <p className="text-sm text-muted-foreground">
            Every report is hashed, GPS-checked and merged with nearby complaints within 50 metres.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {session ? (
            <ReportForm />
          ) : (
            <div className="panel space-y-3 p-5">
              <h2 className="text-lg font-semibold">Sign in to report</h2>
              <p className="text-sm text-muted-foreground">
                Reporting requires an account so evidence stays auditable.
              </p>
              <Button asChild>
                <Link to="/auth">Sign in or register</Link>
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="panel p-3">
              <IssueMap points={filtered} className="h-[320px]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Open" value={issues.filter((i) => i.status !== "closed_verified").length} />
              <Stat label="Resolved" value={issues.filter((i) => i.status === "closed_verified").length} />
              <Stat label="Reopened" value={issues.filter((i) => i.failure_count > 0).length} />
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-lg font-semibold">Live issue feed</h2>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or address"
              className="w-full sm:w-64"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory(null)}
              className={`rounded-full border px-3 py-1 text-xs ${!category ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c === category ? null : c)}
                className={`rounded-full border px-3 py-1 text-xs ${c === category ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((i) => (
              <Link
                key={i.id}
                to="/issues/$id"
                params={{ id: i.id }}
                className="panel block space-y-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={i.status} />
                  <Chip>{i.category}</Chip>
                  <PriorityMeter
                    compact
                    score={i.priority_score}
                    severity={i.severity_score}
                    reportCount={i.report_count}
                    createdAt={i.created_at}
                    verifiedEvidence={i.evidence_count}
                  />
                </div>
                <div>
                  <h3 className="font-medium">{i.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {i.address ?? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}`} · {timeAgo(i.created_at)} ·{" "}
                    {i.report_count} report{i.report_count === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No issues match this filter yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}
