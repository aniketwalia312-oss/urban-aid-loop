import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/sanket/StatusBadge";
import { registerInstitution } from "@/lib/innovation.functions";
import { myInstitutionsQuery } from "@/lib/innovation.queries";
import { DISTRICTS, DOMAINS, INSTITUTION_TYPES, type InstitutionType } from "@/lib/innovation";

export function InstitutionPanel({
  userId,
  allowedTypes,
  heading,
}: {
  userId: string | undefined;
  allowedTypes: InstitutionType[];
  heading: string;
}) {
  const qc = useQueryClient();
  const register = useServerFn(registerInstitution);
  const { data: mine = [] } = useQuery(myInstitutionsQuery(userId));

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<InstitutionType>(allowedTypes[0]!);
  const [district, setDistrict] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domains.length === 0) {
      toast.error("Pick at least one focus area");
      return;
    }
    setBusy(true);
    try {
      await register({
        data: {
          name,
          type,
          district: district || null,
          domains,
          description: description || null,
          website: website || null,
          contactEmail: email || null,
        },
      });
      toast.success("Organisation registered");
      setOpen(false);
      setName("");
      setDomains([]);
      await qc.invalidateQueries({ queryKey: ["my-institutions"] });
      await qc.invalidateQueries({ queryKey: ["institutions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Building2 className="h-5 w-5 text-accent" />
        <h2 className="font-medium">{heading}</h2>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Register organisation"}
        </Button>
      </div>

      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No organisation yet. Register one to receive matched challenges and collaborate.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {mine.map((i) => (
            <li key={i.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{i.name}</span>
                {i.verified ? <Chip tone="success">Verified</Chip> : <Chip>Pending</Chip>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {i.type.replace("_", " ")} · {i.district ?? "Jharkhand"} · {(i.domains ?? []).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="grid gap-3 border-t pt-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="inst-name">Organisation name</Label>
            <Input id="inst-name" value={name} required onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inst-type">Type</Label>
            <select
              id="inst-type"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as InstitutionType)}
            >
              {INSTITUTION_TYPES.filter((t) => allowedTypes.includes(t.value)).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inst-district">District</Label>
            <select
              id="inst-district"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">Select district</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Focus areas</Label>
            <div className="flex flex-wrap gap-1.5">
              {DOMAINS.map((d) => {
                const active = domains.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDomains((prev) => (active ? prev.filter((x) => x !== d) : [...prev, d]))
                    }
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    }`}
                  >
                    {d.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="inst-desc">Capabilities</Label>
            <Textarea
              id="inst-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Research strengths, labs, incubation, funding capacity…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inst-web">Website</Label>
            <Input id="inst-web" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inst-mail">Contact email</Label>
            <Input id="inst-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save organisation"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
