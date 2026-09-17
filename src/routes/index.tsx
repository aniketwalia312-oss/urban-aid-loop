import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Files,
  Gauge,
  Landmark,
  MapPinned,
  Radar,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { HomepageIssueMap } from "@/components/sanket/HomepageIssueMap";
import { Button } from "@/components/ui/button";
import civicHero from "@/assets/sanket-civic-hero.jpg";

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
  return (
    <AppShell>
      <section className="relative min-h-[610px] overflow-hidden border-b sm:min-h-[660px]">
        <img
          src={civicHero}
          alt="Citizens and municipal workers documenting varied civic issues including road damage, waste, water leakage, accessibility and public lighting"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        <div className="relative mx-auto flex min-h-[610px] max-w-6xl items-center px-4 py-16 sm:min-h-[660px]">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
              <Radar className="h-3.5 w-3.5 text-accent" /> Civic intelligence. Public accountability.
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold sm:text-5xl lg:text-6xl">
                See the issue. Signal it. Track the change.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Sanket turns citizen evidence into verified, prioritised action across roads, water, health,
                accessibility, sanitation, safety and public services.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard/citizen">Report an issue</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/challenges/new">Submit a societal challenge</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-card/90 backdrop-blur">
                <Link to="/auth">Institution / official access</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-success" /> Evidence checked</span>
              <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-info" /> Priority explained</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-accent" /> Citizens verify</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase text-accent">Live civic overview</span>
            <h2 className="text-2xl font-semibold sm:text-3xl">One map. Every kind of civic signal.</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Explore how diverse issues can be triaged, tracked and verified through a shared public view.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <MapPinned className="h-4 w-4 text-primary" /> DEMO / SIMULATED DATA
          </div>
        </div>
        <div className="panel p-2 shadow-sm sm:p-3">
          <HomepageIssueMap className="h-[430px] sm:h-[520px]" />
        </div>
      </section>

      <section className="border-y bg-secondary/35">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 max-w-xl space-y-2">
            <span className="text-xs font-semibold uppercase text-accent">Built for trust</span>
            <h2 className="text-2xl font-semibold sm:text-3xl">A clear record from report to resolution.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Feature icon={ShieldCheck} title="Evidence Integrity">
              Photo, location and reuse checks help establish trustworthy evidence.
            </Feature>
            <Feature icon={Users} title="Community Aggregation">
              Related nearby reports combine into one stronger civic signal.
            </Feature>
            <Feature icon={Workflow} title="Transparent Priority">
              Severity, evidence and urgency create a priority score everyone can understand.
            </Feature>
            <Feature icon={Radar} title="AI Resolution Audit">
              Before-and-after evidence and citizen feedback verify the result.
            </Feature>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl space-y-2">
            <span className="text-xs font-semibold uppercase text-accent">How Sanket works</span>
            <h2 className="text-2xl font-semibold sm:text-3xl">From signal to verified change.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/challenges">Browse challenges</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/government/dashboard">View analytics</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <FlowStep icon={Camera} label="Citizen Reports" />
          <FlowStep icon={BrainCircuit} label="AI Understanding" />
          <FlowStep icon={ShieldCheck} label="Evidence Check" />
          <FlowStep icon={Files} label="Related Reports Consolidated" />
          <FlowStep icon={Gauge} label="Priority" />
          <FlowStep icon={Landmark} label="Authority Action" />
          <FlowStep icon={CheckCircle2} label="Citizen Verification" last />
        </div>
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
    <div className="panel space-y-3 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function FlowStep({ icon: Icon, label, last = false }: { icon: typeof Radar; label: string; last?: boolean }) {
  return (
    <div className="relative flex min-h-28 items-center gap-3 rounded-lg border bg-card p-4 shadow-sm lg:flex-col lg:items-start lg:justify-between">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-semibold leading-snug">{label}</span>
      {!last && (
        <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full border bg-card p-0.5 text-accent lg:block" />
      )}
    </div>
  );
}
