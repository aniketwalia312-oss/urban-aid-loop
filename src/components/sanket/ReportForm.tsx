import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { submitReport } from "@/lib/civic.functions";
import { compressImage, currentPosition, perceptualHash, readExif } from "@/lib/image-forensics";
import { CATEGORIES } from "@/lib/sanket";
import { useSanketAuth } from "@/hooks/useSanketAuth";

export function ReportForm() {
  const { session } = useSanketAuth();
  const send = useServerFn(submitReport);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Other");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const pickFile = async (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f && !coords) {
      const pos = await currentPosition();
      if (pos) setCoords(pos);
    }
  };

  const locate = async () => {
    const pos = await currentPosition();
    if (pos) {
      setCoords(pos);
      toast.success("GPS captured");
    } else toast.error("Location permission denied — enter the address instead");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!file) return toast.error("A photo of the issue is required");
    const position = coords ?? (await currentPosition());
    if (!position) return toast.error("GPS location is required to file a report");

    setBusy(true);
    try {
      setStage("Extracting EXIF & perceptual hash…");
      const [phash, exif, blob] = await Promise.all([
        perceptualHash(file),
        readExif(file),
        compressImage(file),
      ]);

      setStage("Uploading evidence…");
      const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("civic-evidence")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);

      setStage("AI vision analysis & deduplication…");
      const result = await send({
        data: {
          path,
          phash,
          exifTimestamp: exif.timestamp,
          exifLat: exif.lat,
          exifLng: exif.lng,
          lat: position.lat,
          lng: position.lng,
          address: address || null,
          description,
          category,
        },
      });

      await queryClient.invalidateQueries();
      if (result.merged) {
        toast.success("Merged with a nearby report", {
          description: "Your evidence strengthened an existing ticket within 50 m.",
        });
      } else {
        toast.success(`Ticket created — ${result.ai.category}`, {
          description: `AI severity ${result.ai.severity}/10`,
        });
      }
      if (result.flags.length > 0) {
        toast.warning("Integrity flags raised", { description: result.flags.join("; ") });
      }
      setFile(null);
      setPreview(null);
      setDescription("");
      void navigate({ to: "/issues/$id", params: { id: result.issueId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Report an issue</h2>
        <p className="text-sm text-muted-foreground">
          Photo, GPS and AI verification are captured together to keep evidence auditable.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Evidence photo</Label>
        <label
          htmlFor="photo"
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-secondary/40 p-4 text-sm text-muted-foreground hover:bg-secondary"
        >
          {preview ? (
            <img src={preview} alt="Selected evidence" className="max-h-52 rounded-md object-cover" />
          ) : (
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4" /> Tap to capture or upload
            </span>
          )}
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">AI re-classifies if it disagrees.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Landmark / address</Label>
          <Input
            id="address"
            value={address}
            maxLength={200}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Near Ward 12 bus stop"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">What is wrong?</Label>
        <Textarea
          id="desc"
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the damage and who it affects"
          rows={3}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => void locate()}>
          <MapPin className="h-4 w-4" /> {coords ? "Re-capture GPS" : "Capture GPS"}
        </Button>
        {coords && (
          <span className="font-mono text-xs text-muted-foreground">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}
      </div>

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {stage}
          </>
        ) : (
          "Submit report"
        )}
      </Button>
    </form>
  );
}
