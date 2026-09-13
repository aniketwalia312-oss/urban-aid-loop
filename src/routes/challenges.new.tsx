import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { submitChallenge } from "@/lib/innovation.functions";
import { DISTRICTS, SUBMITTER_TYPES, type SubmitterType } from "@/lib/innovation";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/challenges/new")({
  head: () => ({
    meta: [
      { title: "Submit a societal challenge | Sanket" },
      {
        name: "description",
        content:
          "Citizens, panchayats, urban local bodies, NGOs and government departments can submit local challenges with photos, documents and location.",
      },
      { property: "og:title", content: "Submit a societal challenge — Sanket" },
      {
        property: "og:description",
        content: "Describe a community problem and let AI route it to the right university or industry partner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewChallenge,
});

function NewChallenge() {
  const { session } = useSanketAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(submitChallenge);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitterType, setSubmitterType] = useState<SubmitterType>("citizen");
  const [organisationName, setOrganisationName] = useState("");
  const [beneficiaries, setBeneficiaries] = useState("500");
  const [media, setMedia] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Sign in to submit a challenge</h1>
          <p className="text-sm text-muted-foreground">
            An account keeps every submission accountable and lets you track its progress.
          </p>
          <Button asChild>
            <Link to="/auth">Sign in or register</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured");
      },
      () => toast.error("Could not read your location"),
    );
  };

  const upload = async (files: File[], folder: string) => {
    const paths: string[] = [];
    for (const file of files) {
      const path = `${session.user.id}/${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("challenge-media").upload(path, file);
      if (error) throw new Error(error.message);
      paths.push(path);
    }
    return paths;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const [mediaPaths, documentPaths] = await Promise.all([
        upload(media.slice(0, 6), "media"),
        upload(docs.slice(0, 6), "docs"),
      ]);
      const result = await submit({
        data: {
          title,
          description,
          district: district || null,
          address: address || null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          submitterType,
          organisationName: organisationName || null,
          beneficiaries: Number(beneficiaries) || 0,
          mediaPaths,
          documentPaths,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast.success(
        result.merged
          ? "Merged with an existing similar challenge"
          : `Routed to ${result.routes.length} matching institution${result.routes.length === 1 ? "" : "s"}`,
      );
      void navigate({ to: "/challenges/$id", params: { id: result.challengeId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the challenge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Submit a societal challenge</h1>
          <p className="text-sm text-muted-foreground">
            AI will categorise the domain, score severity, check for duplicates and route it to matching
            universities and innovation partners.
          </p>
        </header>

        <form onSubmit={onSubmit} className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Challenge title</Label>
            <Input
              id="title"
              value={title}
              required
              minLength={6}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fluoride contamination in village handpumps"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Detailed description</Label>
            <Textarea
              id="description"
              value={description}
              required
              minLength={30}
              rows={6}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who is affected, since when, what has been tried, and what a good solution looks like."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="submitter">Submitting as</Label>
              <select
                id="submitter"
                value={submitterType}
                onChange={(e) => setSubmitterType(e.target.value as SubmitterType)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {SUBMITTER_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org">Organisation name (optional)</Label>
              <Input
                id="org"
                value={organisationName}
                onChange={(e) => setOrganisationName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <select
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select district</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="beneficiaries">People affected (estimate)</Label>
              <Input
                id="beneficiaries"
                type="number"
                min={0}
                value={beneficiaries}
                onChange={(e) => setBeneficiaries(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address / landmark</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="flex items-center gap-3 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={locate}>
                <MapPin className="h-4 w-4" /> Use my location
              </Button>
              {coords && (
                <span className="font-mono text-xs text-muted-foreground">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="media">Photos / videos (up to 6)</Label>
              <Input
                id="media"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setMedia(Array.from(e.target.files ?? []))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="docs">Supporting documents (up to 6)</Label>
              <Input
                id="docs"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                multiple
                onChange={(e) => setDocs(Array.from(e.target.files ?? []))}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit challenge"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
