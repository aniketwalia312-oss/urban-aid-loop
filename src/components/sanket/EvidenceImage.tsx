import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

export function useEvidenceUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);
  useEffect(() => {
    let active = true;
    if (!path) return;
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    void supabase.storage
      .from("civic-evidence")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl && active) {
          cache.set(path, data.signedUrl);
          setUrl(data.signedUrl);
        }
      });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}

export function EvidenceImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = useEvidenceUrl(path);
  return (
    <div className={cn("overflow-hidden rounded-lg bg-muted", className)}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}
