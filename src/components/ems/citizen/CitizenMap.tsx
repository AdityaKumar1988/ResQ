import { useEffect, useRef } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";

interface Props {
  incident: Incident | null;
  driver: Driver | null;
  hospital: Hospital | null;
  citizenLocation: { lat: number; lng: number };
}

function citizenIcon() {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="position:relative;width:30px;height:30px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:oklch(0.62 0.24 25);opacity:.25;animation:pulse-ring 1.8s ease-out infinite;"></div>
      <div style="position:absolute;inset:6px;border-radius:9999px;background:oklch(0.62 0.24 25);box-shadow:0 0 12px oklch(0.62 0.24 25);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font:700 10px 'Inter';">You</div>
    </div>`,
  });
}

function ambulanceIcon(heading: number) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
      <div style="width:24px;height:24px;border-radius:6px;background:oklch(0.75 0.17 220);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px oklch(0.75 0.17 220);border:1.5px solid #fff;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b0f14" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    </div>`,
  });
}

function hospitalIcon() {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="width:24px;height:24px;border-radius:6px;background:oklch(0.28 0.03 250);border:1px solid oklch(0.76 0.15 290);display:flex;align-items:center;justify-content:center;color:oklch(0.76 0.15 290);font:800 12px 'Inter';">H</div>`,
  });
}

export default function CitizenMap({ incident, driver, hospital, citizenLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [citizenLocation.lat, citizenLocation.lng],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [citizenLocation.lat, citizenLocation.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    L.marker([citizenLocation.lat, citizenLocation.lng], { icon: citizenIcon() }).addTo(layer);

    if (driver) {
      L.marker([driver.location.lat, driver.location.lng], {
        icon: ambulanceIcon(driver.heading),
      })
        .bindTooltip(`${driver.callSign} · ${driver.name}`, { direction: "top", offset: [0, -12] })
        .addTo(layer);

      L.polyline(
        [
          [driver.location.lat, driver.location.lng],
          [citizenLocation.lat, citizenLocation.lng],
        ],
        { color: "oklch(0.75 0.17 220)", weight: 3, opacity: 0.7, dashArray: "6 6" },
      ).addTo(layer);
    }

    if (hospital) {
      L.marker([hospital.location.lat, hospital.location.lng], { icon: hospitalIcon() })
        .bindTooltip(`${hospital.name} · ${hospital.bedsAvailable} beds`, {
          direction: "top",
          offset: [0, -10],
        })
        .addTo(layer);
    }

    // Fit map to relevant markers
    const points: [number, number][] = [[citizenLocation.lat, citizenLocation.lng]];
    if (driver) points.push([driver.location.lat, driver.location.lng]);
    if (hospital && incident?.status === "patient_loaded") {
      points.push([hospital.location.lat, hospital.location.lng]);
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }, [driver, hospital, incident?.status, citizenLocation.lat, citizenLocation.lng]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
