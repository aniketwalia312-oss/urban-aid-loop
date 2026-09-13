import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { ChallengeBadge } from "@/components/sanket/ChallengeBadge";
import { Chip } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { challengesQuery } from "@/lib/innovation.queries";
import { DOMAINS, DISTRICTS } from "@/lib/innovation";
import { timeAgo } from "@/lib/sanket";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Societal challenges — Jharkhand innovation portal | Sanket" },
      {
        name: "description",
        content:
          "Browse community-submitted societal challenges across Jharkhand, sorted by transparent priority and routed to universities and industry partners.",
      },
      { property: "og:title", content: "Societal challenges — Sanket" },
      {
        property: "og:description",
        content: "Community problems categorised by AI and matched with universities and industry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengeBrowse,
});

function ChallengeBrowse() {
  const { data: challenges = [], isLoading } = useQuery(challengesQuery);
  const [domain, setDomain] = useState<string | null>(null);
  const [district, setDistrict] = useState<string>("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      challenges.filter(
        (c) =>
          (!domain || c.domain === domain) &&
          (!district || c.district === district) &&
          (!search ||
            `${c.title} ${c.description} ${c.tags.join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [challenges, domain, district, search],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-end gap-4">
          <div className="mr-auto">
            <h1 className="text-2xl font-semibold tracking-tight">Societal challenges</h1>
            <p className="text-sm text-muted-foreground">
              Community problems, AI-categorised by domain and routed to matching institutions.
            </p>
          </div>
          <Button asChild>
            <Link to="/challenges/new">
              <Plus className="h-4 w-4" /> Submit a challenge
            </Link>
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search challenges, tags or keywords"
          />
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDomain(null)}
            className={`rounded-full border px-3 py-1 text-xs ${!domain ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            All domains
          </button>
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d === domain ? null : d)}
              className={`rounded-full border px-3 py-1 text-xs ${d === domain ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/challenges/$id"
              params={{ id: c.id }}
              className="panel block space-y-3 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ChallengeBadge status={c.status} />
                <Chip tone="info">{c.domain}</Chip>
                <span className="ml-auto font-mono text-sm font-semibold">
                  {c.priority_score.toFixed(1)}
                </span>
              </div>
              <div>
                <h2 className="font-medium">{c.title}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {c.ai_summary ?? c.description}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.district ?? "Jharkhand"} · {timeAgo(c.created_at)} · {c.support_count} supporter
                {c.support_count === 1 ? "" : "s"} · {c.beneficiaries.toLocaleString("en-IN")} people
                affected
              </p>
            </Link>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="panel flex flex-col items-start gap-3 p-6">
              <Lightbulb className="h-5 w-5 text-accent" />
              <p className="text-sm text-muted-foreground">
                No challenges match this filter yet. Be the first to submit one.
              </p>
              <Button asChild size="sm">
                <Link to="/challenges/new">Submit a challenge</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
