import { useEffect, useRef, useState, useCallback } from "react";
import type * as LType from "leaflet";
import { Crosshair, Focus } from "lucide-react";
import { OPS_CENTER } from "@/lib/ems/geo";
import { PRIORITY_META } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { dispatchApi } from "@/lib/api/dispatch";

// This file imports leaflet at module scope, so it must ONLY be imported
// via React.lazy inside a <ClientOnly> boundary.
import L from "leaflet";

function priorityColor(priority: string) {
  switch (priority) {
    case "P1":
      return "oklch(0.62 0.24 25)";
    case "P2":
      return "oklch(0.72 0.19 55)";
    case "P3":
      return "oklch(0.82 0.17 90)";
    default:
      return "oklch(0.72 0.15 220)";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "available":
      return "oklch(0.72 0.19 155)";
    case "en_route":
      return "oklch(0.75 0.17 220)";
    case "busy":
      return "oklch(0.72 0.19 55)";
    case "at_hospital":
      return "oklch(0.76 0.15 290)";
    default:
      return "oklch(0.55 0.02 250)";
  }
}

function incidentIcon(priority: string, selected: boolean) {
  const color = priorityColor(priority);
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `
      <div style="position:relative;width:40px;height:40px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.25;animation:pulse-ring 1.8s ease-out infinite;"></div>
        <div style="position:absolute;inset:8px;border-radius:9999px;background:${color};box-shadow:0 0 12px ${color};display:flex;align-items:center;justify-content:center;color:#0b0f14;font:700 10px 'Inter';border:${selected ? "2px solid white" : "2px solid rgba(255,255,255,.35)"};">${priority}</div>
      </div>`,
  });
}

function ambulanceIcon(status: string, heading: number) {
  const color = statusColor(status);
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `
      <div style="width:26px;height:26px;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
        <div style="width:22px;height:22px;border-radius:6px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${color}88;border:1.5px solid rgba(255,255,255,.6);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b0f14" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
        </div>
      </div>`,
  });
}

function hospitalIcon() {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:5px;background:oklch(0.28 0.03 250);border:1px solid oklch(0.76 0.15 290);display:flex;align-items:center;justify-content:center;color:oklch(0.76 0.15 290);font:800 11px 'Inter';">H</div>`,
  });
}

export default function LiveMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const incidentLayerRef = useRef<LType.LayerGroup | null>(null);
  const driverLayerRef = useRef<LType.LayerGroup | null>(null);
  const hospitalLayerRef = useRef<LType.LayerGroup | null>(null);
  const routeLayerRef = useRef<LType.LayerGroup | null>(null);

  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: hospitals = [] } = useHospitals();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [OPS_CENTER.lat, OPS_CENTER.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);
    driverLayerRef.current = L.layerGroup().addTo(map);
    hospitalLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update hospitals (re-render when API data arrives/changes)
  useEffect(() => {
    if (!hospitalLayerRef.current) return;
    hospitalLayerRef.current.clearLayers();
    hospitals.forEach((h) => {
      L.marker([h.location.lat, h.location.lng], { icon: hospitalIcon() })
        .bindTooltip(`<b>${h.name}</b><br/>${h.bedsAvailable}/${h.beds} beds`, {
          direction: "top",
          offset: [0, -8],
        })
        .addTo(hospitalLayerRef.current!);
    });
  }, [hospitals]);

  // Update incidents
  useEffect(() => {
    if (!incidentLayerRef.current) return;
    incidentLayerRef.current.clearLayers();
    incidents.forEach((i) => {
      if (i.status === "completed" || i.status === "cancelled") return;
      const marker = L.marker([i.location.lat, i.location.lng], {
        icon: incidentIcon(i.priority, i.id === selectedId),
      })
        .bindTooltip(
          `<div style="font:600 11px 'Inter';color:#fff"><span style="color:${priorityColor(i.priority)}">${i.priority}</span> ${i.code}<br/><span style="color:#94a3b8;font-weight:400">${i.address}</span></div>`,
          { direction: "top", offset: [0, -14] },
        )
        .on("click", () => onSelect(i.id));
      marker.addTo(incidentLayerRef.current!);
    });
  }, [incidents, selectedId, onSelect]);

  // Update drivers
  useEffect(() => {
    if (!driverLayerRef.current) return;
    driverLayerRef.current.clearLayers();
    drivers.forEach((d) => {
      if (d.status === "offline" || d.status === "maintenance") return;
      L.marker([d.location.lat, d.location.lng], {
        icon: ambulanceIcon(d.status, d.heading),
      })
        .bindTooltip(
          `<div style="font:600 11px 'Inter';color:#fff">${d.callSign}<br/><span style="color:#94a3b8;font-weight:400">${d.name}</span></div>`,
          { direction: "top", offset: [0, -10] },
        )
        .addTo(driverLayerRef.current!);
    });
  }, [drivers]);

  // Draw live road route line for selected incident + its assigned driver
  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) return;
    routeLayerRef.current.clearLayers();
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc || inc.status === "completed" || inc.status === "cancelled") return;
    const driver = inc.driverId ? drivers.find((d) => d.id === inc.driverId) : null;

    if (
      driver &&
      driver.status !== "available" &&
      driver.status !== "offline" &&
      driver.status !== "maintenance" &&
      driver.location &&
      (driver.location.lat !== 0 || driver.location.lng !== 0)
    ) {
      // 1. If incident already has road polyline from Socket.IO / backend
      if (inc.polyline && Array.isArray(inc.polyline) && inc.polyline.length >= 2) {
        L.polyline(inc.polyline, {
          color: "#0891b2",
          weight: 7,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routeLayerRef.current);

        L.polyline(inc.polyline, {
          color: "#06b6d4",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routeLayerRef.current);
      } else {
        // Asynchronously fetch road geometry from route endpoint
        dispatchApi
          .getRoute({
            fromLat: driver.location.lat,
            fromLng: driver.location.lng,
            toLat: inc.location.lat,
            toLng: inc.location.lng,
          })
          .then((res) => {
            if (res?.polyline && Array.isArray(res.polyline) && res.polyline.length >= 2) {
              if (!routeLayerRef.current) return;
              routeLayerRef.current.clearLayers();
              L.polyline(res.polyline, {
                color: "#0891b2",
                weight: 7,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
              }).addTo(routeLayerRef.current);

              L.polyline(res.polyline, {
                color: "#06b6d4",
                weight: 4.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }).addTo(routeLayerRef.current);
            }
          })
          .catch(() => {
            // If offline, do NOT draw a fake straight line per specification
          });
      }
    }
    mapRef.current.panTo([inc.location.lat, inc.location.lng], { animate: true });
  }, [selectedId, incidents, drivers]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (inc) {
      mapRef.current.panTo([inc.location.lat, inc.location.lng], { animate: true });
    } else {
      mapRef.current.panTo([OPS_CENTER.lat, OPS_CENTER.lng], { animate: true });
    }
  }, [selectedId, incidents]);

  const handleFitRoute = useCallback(() => {
    if (!mapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc) return;
    const driver = inc.driverId ? drivers.find((d) => d.id === inc.driverId) : null;
    const points: [number, number][] = [[inc.location.lat, inc.location.lng]];
    if (driver?.location && (driver.location.lat !== 0 || driver.location.lng !== 0)) {
      points.push([driver.location.lat, driver.location.lng]);
    }
    if (inc.polyline && Array.isArray(inc.polyline) && inc.polyline.length >= 2) {
      inc.polyline.forEach((pt) => points.push(pt));
    }
    if (points.length > 1) {
      mapRef.current.fitBounds(points, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [selectedId, incidents, drivers]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div ref={containerRef} className="h-full w-full" />
      <MapLegend />

      {/* Floating Action Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-primary active:scale-95"
          title="Recenter"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitRoute}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-cyan-400 active:scale-95"
          title="Fit Route"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-md border border-border-strong bg-surface/90 p-2.5 text-[10px] backdrop-blur">
      <div className="mb-1.5 font-mono uppercase tracking-widest text-muted-foreground">Legend</div>
      <div className="grid gap-1">
        {(["P1", "P2", "P3", "P4"] as const).map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: priorityColor(p), boxShadow: `0 0 6px ${priorityColor(p)}` }}
            />
            <span className="text-muted-foreground">
              {p} · {PRIORITY_META[p].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
