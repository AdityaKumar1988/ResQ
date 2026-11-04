import { useEffect, useRef, useCallback } from "react";
import type * as LType from "leaflet";
import { Crosshair, Focus } from "lucide-react";
import { OPS_CENTER } from "@/lib/ems/geo";
import { PRIORITY_META } from "@/lib/ems/types";
import { useIncidents } from "@/hooks/dispatch/use-incidents";
import { useDrivers } from "@/hooks/fleet/use-drivers";
import { useHospitals } from "@/hooks/fleet/use-hospitals";
import { dispatchApi } from "@/lib/api/dispatch";
import {
  createIncidentMarker,
  createAmbulanceMarker,
  createHospitalMarker,
  syncMapTileLayer,
  PRIORITY_COLORS,
} from "@/lib/ems/map-base";
import { useTheme } from "@/components/providers/ThemeProvider";
import L from "leaflet";

export default function LiveMap({
  selectedId,
  onSelect,
  isVisible = true,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  isVisible?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const incidentLayerRef = useRef<LType.LayerGroup | null>(null);
  const driverLayerRef = useRef<LType.LayerGroup | null>(null);
  const hospitalLayerRef = useRef<LType.LayerGroup | null>(null);
  const routeLayerRef = useRef<LType.LayerGroup | null>(null);

  // Cached marker maps for smooth diffing
  const incidentMarkersRef = useRef<Map<string, LType.Marker>>(new Map());
  const driverMarkersRef = useRef<Map<string, LType.Marker>>(new Map());
  const hospitalMarkersRef = useRef<Map<string, LType.Marker>>(new Map());

  const { data: incidents = [] } = useIncidents();
  const { data: drivers = [] } = useDrivers();
  const { data: hospitals = [] } = useHospitals();

  // Initialize Map Once (never remount on theme change)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [OPS_CENTER.lat, OPS_CENTER.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    syncMapTileLayer(map, resolvedTheme === "dark", tileLayerRef);

    incidentLayerRef.current = L.layerGroup().addTo(map);
    driverLayerRef.current = L.layerGroup().addTo(map);
    hospitalLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Handle container resizing (e.g. from react-resizable-panels) smoothly
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap theme-based tile layer without remounting map or resetting zoom/center
  useEffect(() => {
    if (!mapRef.current) return;
    syncMapTileLayer(mapRef.current, resolvedTheme === "dark", tileLayerRef);
  }, [resolvedTheme]);

  // Invalidate map size when switching back to Map tab or when container becomes visible
  useEffect(() => {
    if (isVisible && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize({ animate: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Sync Hospitals Layer
  useEffect(() => {
    if (!hospitalLayerRef.current || !mapRef.current) return;
    const layer = hospitalLayerRef.current;
    const currentMarkers = hospitalMarkersRef.current;
    const newIds = new Set<string>();

    hospitals.forEach((h) => {
      newIds.add(h.id);
      const existing = currentMarkers.get(h.id);
      if (existing) {
        existing.setLatLng([h.location.lat, h.location.lng]);
      } else {
        const marker = L.marker([h.location.lat, h.location.lng], { icon: createHospitalMarker() })
          .bindTooltip(`<b>${h.name}</b><br/>${h.bedsAvailable}/${h.beds} beds available`, {
            direction: "top",
            offset: [0, -10],
          })
          .addTo(layer);
        currentMarkers.set(h.id, marker);
      }
    });

    // Remove stale hospital markers
    currentMarkers.forEach((marker, id) => {
      if (!newIds.has(id)) {
        layer.removeLayer(marker);
        currentMarkers.delete(id);
      }
    });
  }, [hospitals]);

  // Sync Incidents Layer (Memoized diff update)
  useEffect(() => {
    if (!incidentLayerRef.current || !mapRef.current) return;
    const layer = incidentLayerRef.current;
    const currentMarkers = incidentMarkersRef.current;
    const activeIds = new Set<string>();

    incidents.forEach((i) => {
      if (i.status === "completed" || i.status === "cancelled") return;
      activeIds.add(i.id);
      const isSelected = i.id === selectedId;
      const existing = currentMarkers.get(i.id);

      if (existing) {
        existing.setLatLng([i.location.lat, i.location.lng]);
        existing.setIcon(createIncidentMarker(i.priority, isSelected));
      } else {
        const marker = L.marker([i.location.lat, i.location.lng], {
          icon: createIncidentMarker(i.priority, isSelected),
        })
          .bindTooltip(
            `<div style="font:600 12px 'Inter',sans-serif;color:#F8FAFC;"><span style="color:${PRIORITY_COLORS[i.priority] ?? "#60A5FA"};font-weight:700;">${i.priority}</span> ${i.code}<br/><span style="color:#94A3B8;font-weight:400;font-size:11px;">${i.address}</span></div>`,
            { direction: "top", offset: [0, -16] },
          )
          .on("click", () => onSelect(i.id));
        marker.addTo(layer);
        currentMarkers.set(i.id, marker);
      }
    });

    // Cleanup finished incidents
    currentMarkers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        layer.removeLayer(marker);
        currentMarkers.delete(id);
      }
    });
  }, [incidents, selectedId, onSelect]);

  // Sync Drivers Layer (Memoized diff update)
  useEffect(() => {
    if (!driverLayerRef.current || !mapRef.current) return;
    const layer = driverLayerRef.current;
    const currentMarkers = driverMarkersRef.current;
    const activeDriverIds = new Set<string>();

    drivers.forEach((d) => {
      if (d.status === "offline" || d.status === "maintenance") return;
      activeDriverIds.add(d.id);
      const existing = currentMarkers.get(d.id);

      if (existing) {
        existing.setLatLng([d.location.lat, d.location.lng]);
        existing.setIcon(createAmbulanceMarker(d.status, d.heading));
      } else {
        const marker = L.marker([d.location.lat, d.location.lng], {
          icon: createAmbulanceMarker(d.status, d.heading),
        })
          .bindTooltip(
            `<div style="font:600 12px 'Inter',sans-serif;color:#F8FAFC;">${d.callSign}<br/><span style="color:#94A3B8;font-weight:400;font-size:11px;">${d.name} · ${d.status.replace("_", " ")}</span></div>`,
            { direction: "top", offset: [0, -12] },
          )
          .addTo(layer);
        currentMarkers.set(d.id, marker);
      }
    });

    // Cleanup offline drivers
    currentMarkers.forEach((marker, id) => {
      if (!activeDriverIds.has(id)) {
        layer.removeLayer(marker);
        currentMarkers.delete(id);
      }
    });
  }, [drivers]);

  // Draw Live Road Route Line for selected incident
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
      if (inc.polyline && Array.isArray(inc.polyline) && inc.polyline.length >= 2) {
        L.polyline(inc.polyline, {
          color: "#0284C7",
          weight: 6,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routeLayerRef.current);

        L.polyline(inc.polyline, {
          color: "#38BDF8",
          weight: 3.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(routeLayerRef.current);
      } else {
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
                color: "#0284C7",
                weight: 6,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
              }).addTo(routeLayerRef.current);

              L.polyline(res.polyline, {
                color: "#38BDF8",
                weight: 3.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }).addTo(routeLayerRef.current);
            }
          })
          .catch(() => {});
      }
    }
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
      mapRef.current.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }, [selectedId, incidents, drivers]);

  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      <div ref={containerRef} className="h-full w-full" />
      <MapLegend />

      {/* Floating Action Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground shadow-md backdrop-blur transition-colors hover:bg-surface-3 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Recenter Map"
          aria-label="Recenter map to incident or dispatch center"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-foreground shadow-md backdrop-blur transition-colors hover:bg-surface-3 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Fit Incident & Ambulance Route"
          aria-label="Fit route to screen bounds"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div
      aria-label="Map Visual Legend"
      className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-md border border-border-strong bg-surface/95 p-2.5 text-xs backdrop-blur-md shadow-lg"
    >
      <div className="mb-1.5 font-mono uppercase tracking-widest text-muted-foreground text-[11px] font-semibold">
        Legend
      </div>
      <div className="grid gap-1.5">
        {(["P1", "P2", "P3", "P4"] as const).map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ background: PRIORITY_COLORS[p] }}
            />
            <span className="text-muted-foreground font-mono text-xs">
              <strong className="text-foreground">{p}</strong> · {PRIORITY_META[p].label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-border/60">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#38BDF8] shrink-0" />
          <span className="text-muted-foreground font-mono text-xs">Ambulance En Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E] shrink-0" />
          <span className="text-muted-foreground font-mono text-xs">Ambulance Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm border border-[#A855F7] text-[#A855F7] font-bold text-xs flex items-center justify-center shrink-0">
            H
          </span>
          <span className="text-muted-foreground font-mono text-xs">Trauma Hospital</span>
        </div>
      </div>
    </div>
  );
}
