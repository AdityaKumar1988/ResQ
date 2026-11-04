import { useEffect, useRef, useState, useCallback } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import { Crosshair, Focus } from "lucide-react";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";
import { dispatchApi } from "@/lib/api/dispatch";
import {
  createCitizenMarker,
  createAmbulanceMarker,
  createHospitalMarker,
  syncMapTileLayer,
} from "@/lib/ems/map-base";
import { useTheme } from "@/components/providers/ThemeProvider";

interface Props {
  driver: Driver;
  incident: Incident | null;
  hospital: Hospital | null;
}

export default function DriverMap({ driver, incident, hospital }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [driver.location.lat, driver.location.lng],
      zoom: 14,
      zoomControl: true,
    });
    syncMapTileLayer(map, resolvedTheme === "dark", tileLayerRef);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync theme-based tile layer
  useEffect(() => {
    if (!mapRef.current) return;
    syncMapTileLayer(mapRef.current, resolvedTheme === "dark", tileLayerRef);
  }, [resolvedTheme]);

  const transporting = incident?.status === "patient_loaded";
  const target = transporting && hospital ? hospital.location : (incident?.location ?? null);

  // Synchronize Road Geometry
  useEffect(() => {
    if (!target || !driver.location || (driver.location.lat === 0 && driver.location.lng === 0)) {
      setRoadPolyline(null);
      return;
    }

    if (
      !transporting &&
      incident?.polyline &&
      Array.isArray(incident.polyline) &&
      incident.polyline.length >= 2
    ) {
      setRoadPolyline(incident.polyline);
      return;
    }

    let isSubscribed = true;
    dispatchApi
      .getRoute({
        fromLat: driver.location.lat,
        fromLng: driver.location.lng,
        toLat: target.lat,
        toLng: target.lng,
      })
      .then((res) => {
        if (!isSubscribed) return;
        if (res?.polyline && Array.isArray(res.polyline) && res.polyline.length >= 2) {
          setRoadPolyline(res.polyline);
        } else {
          setRoadPolyline(null);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setRoadPolyline(null);
      });

    return () => {
      isSubscribed = false;
    };
  }, [
    driver.location,
    driver.location.lat,
    driver.location.lng,
    target,
    target?.lat,
    target?.lng,
    transporting,
    incident?.polyline,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    L.marker([driver.location.lat, driver.location.lng], {
      icon: createAmbulanceMarker(driver.status, driver.heading, { isSelf: true }),
    })
      .bindTooltip(`${driver.callSign} · You`, { direction: "top", offset: [0, -14] })
      .addTo(layer);

    if (incident) {
      L.marker([incident.location.lat, incident.location.lng], { icon: createCitizenMarker("P") })
        .bindTooltip(`${incident.code} · ${incident.citizenName}`, {
          direction: "top",
          offset: [0, -12],
        })
        .addTo(layer);
    }
    if (hospital) {
      L.marker([hospital.location.lat, hospital.location.lng], { icon: createHospitalMarker("H") })
        .bindTooltip(`${hospital.name}`, { direction: "top", offset: [0, -10] })
        .addTo(layer);
    }

    // Render High-Contrast Dual Polyline
    if (roadPolyline && roadPolyline.length >= 2) {
      // Dark high-contrast casing
      L.polyline(roadPolyline, {
        color: "#0F172A",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      // Core colored line (Purple for hospital transport, Primary Cyan for scene navigation)
      L.polyline(roadPolyline, {
        color: transporting ? "#A855F7" : "#38BDF8",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);
    }

    const points: [number, number][] = [[driver.location.lat, driver.location.lng]];
    if (incident) points.push([incident.location.lat, incident.location.lng]);
    if (hospital && transporting) points.push([hospital.location.lat, hospital.location.lng]);
    if (roadPolyline && roadPolyline.length >= 2) {
      roadPolyline.forEach((pt) => points.push(pt));
    }

    if (points.length > 1) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15, animate: true });
    } else {
      map.setView([driver.location.lat, driver.location.lng], 14);
    }
  }, [driver, incident, hospital, roadPolyline, transporting]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.panTo([driver.location.lat, driver.location.lng], { animate: true });
  }, [driver.location]);

  const handleFitRoute = useCallback(() => {
    if (!mapRef.current) return;
    const points: [number, number][] = [[driver.location.lat, driver.location.lng]];
    if (incident) points.push([incident.location.lat, incident.location.lng]);
    if (hospital && transporting) points.push([hospital.location.lat, hospital.location.lng]);
    if (roadPolyline && roadPolyline.length >= 2) {
      roadPolyline.forEach((pt) => points.push(pt));
    }
    if (points.length > 1) {
      mapRef.current.fitBounds(points, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [driver.location, incident, hospital, transporting, roadPolyline]);

  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Action Controls (>= 44px touch targets) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-elevated hover:text-primary active:scale-95"
          title="Recenter on Ambulance"
          aria-label="Recenter on Ambulance"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-elevated hover:text-primary active:scale-95"
          title="Fit Route to Viewport"
          aria-label="Fit Route to Viewport"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
