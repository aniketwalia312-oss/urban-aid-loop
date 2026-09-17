import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoSeverity = "critical" | "high" | "standard" | "resolved";

type DemoIncident = {
  id: string;
  title: string;
  category: string;
  location: string;
  severity: DemoSeverity;
  status: string;
  latitude: number;
  longitude: number;
};

type GoogleMap = {
  fitBounds: (bounds: unknown, padding?: number) => void;
};

type GoogleMarker = {
  addListener: (event: string, callback: () => void) => void;
  setMap: (map: GoogleMap | null) => void;
};

type GoogleInfoWindow = {
  setContent: (content: string) => void;
  open: (options: { anchor: GoogleMarker; map: GoogleMap }) => void;
};

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: Record<string, unknown>) => GoogleMarker;
  InfoWindow: new () => GoogleInfoWindow;
  LatLngBounds: new () => { extend: (position: { lat: number; lng: number }) => void };
  SymbolPath: { CIRCLE: unknown };
};

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
    initSanketHomepageMap?: () => void;
  }
}

const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: "demo-1",
    title: "School crossing signal not working",
    category: "Road safety",
    location: "New Delhi",
    severity: "critical",
    status: "Urgent inspection requested",
    latitude: 28.6139,
    longitude: 77.209,
  },
  {
    id: "demo-2",
    title: "Public health centre ramp damaged",
    category: "Accessibility",
    location: "Ahmedabad",
    severity: "high",
    status: "Assigned to civic works team",
    latitude: 23.0225,
    longitude: 72.5714,
  },
  {
    id: "demo-3",
    title: "Community water point leaking",
    category: "Water supply",
    location: "Hyderabad",
    severity: "high",
    status: "Verification in progress",
    latitude: 17.385,
    longitude: 78.4867,
  },
  {
    id: "demo-4",
    title: "Streetlight outage near bus stop",
    category: "Public lighting",
    location: "Pune",
    severity: "standard",
    status: "Report consolidated",
    latitude: 18.5204,
    longitude: 73.8567,
  },
  {
    id: "demo-5",
    title: "Waste collection point overflowing",
    category: "Sanitation",
    location: "Kolkata",
    severity: "critical",
    status: "Priority response queued",
    latitude: 22.5726,
    longitude: 88.3639,
  },
  {
    id: "demo-6",
    title: "Air-quality sensor requires service",
    category: "Environment",
    location: "Bengaluru",
    severity: "standard",
    status: "Technical review",
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    id: "demo-7",
    title: "Flooded pedestrian subway cleared",
    category: "Urban infrastructure",
    location: "Chennai",
    severity: "resolved",
    status: "Citizen verified",
    latitude: 13.0827,
    longitude: 80.2707,
  },
  {
    id: "demo-8",
    title: "Broken public information display",
    category: "Public services",
    location: "Kochi",
    severity: "resolved",
    status: "Repair completed",
    latitude: 9.9312,
    longitude: 76.2673,
  },
];

const SEVERITY_LABEL: Record<DemoSeverity, string> = {
  critical: "Critical",
  high: "High",
  standard: "Standard",
  resolved: "Resolved",
};

function loadGoogleMaps(onReady: () => void, onError: () => void) {
  if (window.google?.maps) {
    onReady();
    return;
  }

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) {
    onError();
    return;
  }

  const existing = document.querySelector<HTMLScriptElement>("script[data-sanket-google-map]");
  if (existing) {
    existing.addEventListener("load", onReady, { once: true });
    existing.addEventListener("error", onError, { once: true });
    return;
  }

  window.initSanketHomepageMap = onReady;
  const script = document.createElement("script");
  script.dataset.sanketGoogleMap = "true";
  script.async = true;
  script.defer = true;
  script.onerror = onError;
  const query = new URLSearchParams({ key, loading: "async", callback: "initSanketHomepageMap" });
  if (channel) query.set("channel", channel);
  script.src = `https://maps.googleapis.com/maps/api/js?${query.toString()}`;
  document.head.appendChild(script);
}

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function HomepageIssueMap({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<DemoIncident | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const markers: GoogleMarker[] = [];

    loadGoogleMaps(
      () => {
        const api = window.google?.maps;
        const container = containerRef.current;
        if (!active || !api || !container) return;

        const map = new api.Map(container, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 4,
          minZoom: 4,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        const bounds = new api.LatLngBounds();
        const infoWindow = new api.InfoWindow();
        const colors: Record<DemoSeverity, string> = {
          critical: token("--destructive"),
          high: token("--warning"),
          standard: token("--info"),
          resolved: token("--success"),
        };

        DEMO_INCIDENTS.forEach((incident) => {
          const position = { lat: incident.latitude, lng: incident.longitude };
          bounds.extend(position);
          const marker = new api.Marker({
            map,
            position,
            title: `${incident.title} — DEMO / SIMULATED DATA`,
            icon: {
              path: api.SymbolPath.CIRCLE,
              fillColor: colors[incident.severity],
              fillOpacity: 1,
              strokeColor: token("--card"),
              strokeOpacity: 1,
              strokeWeight: 3,
              scale: incident.severity === "critical" ? 10 : 8,
            },
          });
          marker.addListener("click", () => {
            setSelected(incident);
            infoWindow.setContent(
              `<div style="max-width:220px;font-family:system-ui,sans-serif;line-height:1.4"><strong>${incident.title}</strong><br/><span>${incident.category} · ${incident.location}</span><br/><small>${SEVERITY_LABEL[incident.severity]} · ${incident.status}</small><br/><small><strong>DEMO / SIMULATED DATA</strong></small></div>`,
            );
            infoWindow.open({ anchor: marker, map });
          });
          markers.push(marker);
        });
        map.fitBounds(bounds, 56);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );

    return () => {
      active = false;
      markers.forEach((marker) => marker.setMap(null));
    };
  }, []);

  return (
    <div className={cn("relative min-h-[390px] overflow-hidden rounded-xl border bg-secondary", className)}>
      <div ref={containerRef} className="absolute inset-0" aria-label="Interactive map of simulated civic incidents" />

      {loadFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-warning" />
          <p className="font-medium">The live map could not load.</p>
          <p className="max-w-sm text-sm text-muted-foreground">The demonstration incident list remains available below the map.</p>
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 rounded-md border bg-card/95 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-foreground">
          <MapPinned className="h-4 w-4 text-accent" /> Demo / simulated data
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Illustrative incidents across varied civic categories</p>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-2 rounded-md border bg-card/95 px-3 py-2 text-[11px] font-medium shadow-sm sm:right-auto">
        {(Object.keys(SEVERITY_LABEL) as DemoSeverity[]).map((severity) => (
          <span key={severity} className="flex items-center gap-1.5">
            <i
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                severity === "critical" && "bg-destructive",
                severity === "high" && "bg-warning",
                severity === "standard" && "bg-info",
                severity === "resolved" && "bg-success",
              )}
            />
            {SEVERITY_LABEL[severity]}
          </span>
        ))}
      </div>

      {selected?.severity === "resolved" && (
        <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1.5 rounded-md border bg-card/95 px-2.5 py-1.5 text-xs font-medium shadow-sm sm:flex">
          <CheckCircle2 className="h-4 w-4 text-success" /> Citizen verified
        </div>
      )}
    </div>
  );
}