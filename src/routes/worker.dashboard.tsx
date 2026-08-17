import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Navigation } from "lucide-react";
import { AppShell } from "@/components/sanket/AppShell";
import { Chip, StatusBadge } from "@/components/sanket/StatusBadge";
import { EvidenceImage } from "@/components/sanket/EvidenceImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { issuesQuery, type Issue } from "@/lib/queries";
import { priorityTier } from "@/lib/sanket";
import { compressImage, currentPosition } from "@/lib/image-forensics";
import { supabase } from "@/integrations/supabase/client";
import { submitResolution } from "@/lib/civic.functions";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export const Route = createFileRoute("/worker/dashboard")({
  head: () => ({
    meta: [
      { title: "Field worker tasks — Sanket" },
      {
        name: "description",
        content: "Priority-sorted municipal repair tasks with navigation and camera-verified completion proof.",
      },
      { property: "og:title", content: "Field worker tasks — Sanket" },
      { property: "og:description", content: "Mobile-first task queue for municipal field crews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkerDashboard,
});

function WorkerDashboard() {
  const { isWorker, isAdmin, loading } = useSanketAuth();
  const { data: issues = [] } = useQuery(issuesQuery);

  if (loading) return <AppShell><p className="p-8 text-sm text-muted-foreground">Loading…</p></AppShell>;

  if (!isWorker && !isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Field worker access required</h1>
          <p className="text-sm text-muted-foreground">
            Enter your role passkey on the sign-in screen to unlock the task queue.
          </p>
          <Button asChild>
            <Link to="/auth">Enter passkey</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const tasks = issues
    .filter((i) => !["closed_verified", "resolved_pending_audit"].includes(i.status))
    .sort((a, b) => b.priority_score - a.priority_score);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Task queue</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} open tasks, highest priority first.</p>
        </header>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No open tasks. Well done.</p>}
      </div>
    </AppShell>
  );
}

function TaskCard({ task }: { task: Issue }) {
  const queryClient = useQueryClient();
  const send = useServerFn(submitResolution);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const tier = priorityTier(task.priority_score);

  const { data } = useQuery({
    queryKey: ["task-photo", task.id],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("reports")
        .select("image_url")
        .eq("civic_issue_id", task.id)
        .order("created_at", { ascending: true })
        .limit(1);
      return rows?.[0]?.image_url ?? null;
    },
  });

  const complete = async () => {
    if (!file) {
      toast.error("Capture an 'after work' photo");
      return;
    }
    if (notes.trim().length < 10) {
      toast.error("Add completion notes (min 10 characters)");
      return;
    }
    const pos = await currentPosition();
    if (!pos) {
      toast.error("Live GPS is required to verify the work site");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const path = `resolutions/${task.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("civic-evidence")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      const res = await send({
        data: { issueId: task.id, afterPath: path, notes, lat: pos.lat, lng: pos.lng },
      });
      await queryClient.invalidateQueries();
      toast.success(
        res.anomaly
          ? "Flagged for admin review — AI could not confirm the repair"
          : "Resolution submitted for citizen audit",
      );
      setOpen(false);
      setFile(null);
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel overflow-hidden">
      <div className="flex gap-3 p-3">
        <EvidenceImage path={data} alt="Damaged area" className="h-24 w-24 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={tier.tone}>
              {tier.label} · {task.priority_score.toFixed(1)}
            </Chip>
            <Chip>{task.category}</Chip>
            <StatusBadge status={task.status} />
          </div>
          <h2 className="truncate font-medium">{task.title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {task.address ?? `${task.latitude.toFixed(5)}, ${task.longitude.toFixed(5)}`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="secondary">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="h-4 w-4" /> Navigate
              </a>
            </Button>
            <Button size="sm" onClick={() => setOpen((v) => !v)}>
              <Camera className="h-4 w-4" /> Complete
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t bg-secondary/30 p-3">
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
            {file ? file.name : "Capture after-work photo (camera only)"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Textarea
            rows={3}
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the work carried out"
          />
          <Button className="w-full" disabled={busy} onClick={() => void complete()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit resolution proof"}
          </Button>
        </div>
      )}
    </article>
  );
}
