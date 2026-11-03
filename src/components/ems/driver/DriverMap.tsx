import { useEffect, useRef, useState, useCallback } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import { Crosshair, Focus } from "lucide-react";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";
import { dispatchApi } from "@/lib/api/dispatch";

interface Props {
  driver: Driver;
  incident: Incident | null;
  hospital: Hospital | null;
}

function driverIcon(heading: number) {
  return L.divIcon({
    className: "driver-marker-smooth",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(6,182,212,0.25);opacity:.3;animation:pulse-ring 1.8s ease-out infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:8px;background:#06b6d4;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(6,182,212,0.8);border:2px solid #fff;transition:transform 0.4s ease-out;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#041f26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    </div>`,
  });
}

function patientIcon() {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:oklch(0.62 0.24 25);border:2px solid #fff;box-shadow:0 0 12px oklch(0.62 0.24 25);display:flex;align-items:center;justify-content:center;color:#fff;font:800 11px 'Inter';">P</div>`,
  });
}

function hospitalIcon() {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:6px;background:oklch(0.28 0.03 250);border:1.5px solid oklch(0.76 0.15 290);display:flex;align-items:center;justify-content:center;color:oklch(0.76 0.15 290);font:800 12px 'Inter';">H</div>`,
  });
}

export default function DriverMap({ driver, incident, hospital }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [driver.location.lat, driver.location.lng],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap · ResQ Dispatch Navigation",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    L.marker([driver.location.lat, driver.location.lng], { icon: driverIcon(driver.heading) })
      .bindTooltip(`${driver.callSign} · You`, { direction: "top", offset: [0, -14] })
      .addTo(layer);

    if (incident) {
      L.marker([incident.location.lat, incident.location.lng], { icon: patientIcon() })
        .bindTooltip(`${incident.code} · ${incident.citizenName}`, {
          direction: "top",
          offset: [0, -12],
        })
        .addTo(layer);
    }
    if (hospital) {
      L.marker([hospital.location.lat, hospital.location.lng], { icon: hospitalIcon() })
        .bindTooltip(`${hospital.name}`, { direction: "top", offset: [0, -10] })
        .addTo(layer);
    }

    // Render Real Road Route (Dual Casing + Core Line)
    if (roadPolyline && roadPolyline.length >= 2) {
      L.polyline(roadPolyline, {
        color: transporting ? "#9333ea" : "#0891b2",
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      L.polyline(roadPolyline, {
        color: transporting ? "#c084fc" : "#06b6d4",
        weight: 5,
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
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Action Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-cyan-400 active:scale-95"
          title="Recenter"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitRoute}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-primary active:scale-95"
          title="Fit Route"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
