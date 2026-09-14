import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Factory, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { InstitutionPanel } from "@/components/sanket/InstitutionPanel";
import { Chip } from "@/components/sanket/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useSanketAuth } from "@/hooks/useSanketAuth";
import { myInstitutionsQuery, partnershipsQuery, projectsQuery } from "@/lib/innovation.queries";
import { offerPartnership } from "@/lib/innovation.functions";
import { inr, PARTNERSHIP_TYPES, PROJECT_STATUS_LABEL, type PartnershipType } from "@/lib/innovation";

export const Route = createFileRoute("/industry/dashboard")({
  head: () => ({
    meta: [
      { title: "Industry & CSR Partnerships — Sanket" },
      {
        name: "description",
        content:
          "Industries, startups, MSMEs and CSR funds offer mentorship, funding, prototyping, pilots and technology transfer to university innovation projects.",
      },
      { property: "og:title", content: "Industry & CSR Partnerships — Sanket" },
      {
        property: "og:description",
        content: "Back Jharkhand's community innovation projects with funding, mentoring and pilot capacity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndustryDashboard,
});

function IndustryDashboard() {
  const { session, isIndustry } = useSanketAuth();
  const userId = session?.user.id;
  const { data: mine = [] } = useQuery(myInstitutionsQuery(userId));
  const { data: projects = [] } = useQuery(projectsQuery);
  const { data: partnerships = [] } = useQuery(partnershipsQuery);
  const ids = useMemo(() => mine.map((i) => i.id), [mine]);
  const myPartnerships = partnerships.filter((p) => ids.includes(p.institution_id));
  const [openFor, setOpenFor] = useState<string | null>(null);

  if (!session)
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Industry access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your industry passkey to support live innovation projects.
          </p>
          <Button asChild className="mt-5">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-center gap-3">
          <Factory className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight">Industry & CSR collaboration</h1>
          {!isIndustry && <Chip tone="warning">Add the industry passkey on the sign-in page</Chip>}
        </header>

        <InstitutionPanel
          userId={userId}
          allowedTypes={["industry", "startup", "msme", "csr", "research_lab", "incubator"]}
          heading="Your organisations"
        />

        {myPartnerships.length > 0 && (
          <section className="panel space-y-2 p-5">
            <h2 className="font-medium">Your commitments</h2>
            <div className="flex flex-wrap gap-2">
              {myPartnerships.map((p) => (
                <Chip key={p.id} tone="success">
                  {p.partner_type.replace("_", " ")}
                  {Number(p.amount_inr) > 0 ? ` · ${inr(Number(p.amount_inr))}` : ""} · {p.status}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-medium">Projects seeking partners</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{p.title}</h3>
                  <Chip tone="info">{PROJECT_STATUS_LABEL[p.status]}</Chip>
                  <Chip>{p.institutions?.name ?? "University"}</Chip>
                  {p.challenges?.district && <Chip>{p.challenges.district}</Chip>}
                  <span className="ml-auto text-sm text-muted-foreground">{p.progress}%</span>
                </div>
                <Progress value={p.progress} />
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Domain: {p.challenges?.domain?.replace("_", " ") ?? "—"}</span>
                  <span>Patents {p.patents}</span>
                  <span>Startups {p.startups_created}</span>
                  <span>Beneficiaries {p.beneficiaries.toLocaleString("en-IN")}</span>
                  <Link
                    to="/challenges/$id"
                    params={{ id: p.challenge_id }}
                    className="ml-auto hover:underline"
                  >
                    View challenge
                  </Link>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenFor(openFor === p.id ? null : p.id)}>
                  {openFor === p.id ? "Cancel" : "Offer partnership"}
                </Button>
                {openFor === p.id && (
                  <PartnershipForm
                    projectId={p.id}
                    institutions={mine}
                    onDone={() => setOpenFor(null)}
                  />
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PartnershipForm({
  projectId,
  institutions,
  onDone,
}: {
  projectId: string;
  institutions: { id: string; name: string }[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const offer = useServerFn(offerPartnership);
  const [busy, setBusy] = useState(false);
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? "");
  const [partnerType, setPartnerType] = useState<PartnershipType>("funding");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionId) {
      toast.error("Register your organisation first");
      return;
    }
    setBusy(true);
    try {
      await offer({
        data: { projectId, institutionId, partnerType, amountInr: amount, notes: notes || null },
      });
      toast.success("Partnership offered");
      await qc.invalidateQueries({ queryKey: ["partnerships"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send offer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 border-t pt-4 md:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`org-${projectId}`}>Your organisation</Label>
        <select
          id={`org-${projectId}`}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={institutionId}
          onChange={(e) => setInstitutionId(e.target.value)}
        >
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`type-${projectId}`}>Support type</Label>
        <select
          id={`type-${projectId}`}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value as PartnershipType)}
        >
          {PARTNERSHIP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`amt-${projectId}`}>Amount (₹)</Label>
        <Input
          id={`amt-${projectId}`}
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5 md:col-span-3">
        <Label htmlFor={`notes-${projectId}`}>Notes</Label>
        <Textarea id={`notes-${projectId}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send offer"}
        </Button>
      </div>
    </form>
  );
}
