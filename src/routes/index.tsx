import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Radar, Users, Workflow } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { IssueMap } from "@/components/sanket/IssueMap";
import { Button } from "@/components/ui/button";
import { issuesQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanket — Intelligent Civic Grievance & Resolution Platform" },
      {
        name: "description",
        content:
          "Report civic issues with GPS-verified photos, watch AI validate repairs before and after, and audit municipal work as a community.",
      },
      { property: "og:title", content: "Sanket — Civic grievance, resolved transparently" },
      {
        property: "og:description",
        content: "AI evidence integrity, spatial deduplication and citizen-audited municipal repairs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: issues = [] } = useQuery(issuesQuery);

  return (
    <AppShell>
      <section className="civic-grid border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <Radar className="h-3.5 w-3.5 text-accent" /> Closed-loop civic accountability
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Every complaint becomes an auditable public record.
            </h1>
            <p className="text-muted-foreground">
              Sanket verifies photo evidence, merges duplicate reports within 50 metres, scores priority with a
              transparent formula, and lets neighbours audit the repair with an AI-checked before/after comparison.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard/citizen">Report an issue</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Worker / official access</Link>
              </Button>
            </div>
          </div>
          <div className="panel p-3">
            <IssueMap points={issues} className="h-[300px]" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
        <Feature icon={ShieldCheck} title="Evidence integrity">
          EXIF and perceptual-hash checks flag recycled or relocated photos before a ticket is created.
        </Feature>
        <Feature icon={Users} title="Community aggregation">
          Nearby reports of the same category merge into one ticket and strengthen its evidence count.
        </Feature>
        <Feature icon={Workflow} title="Transparent priority">
          Severity, report volume, ageing and verified evidence produce a score anyone can recompute.
        </Feature>
        <Feature icon={Radar} title="AI resolution audit">
          Vision compares before and after, then citizens vote — 30% "still present" reopens the ticket.
        </Feature>
      </section>
    </AppShell>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Radar;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel space-y-2 p-5">
      <Icon className="h-5 w-5 text-accent" />
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
