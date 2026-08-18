import { useEffect, useRef } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";

interface Props {
  driver: Driver;
  incident: Incident | null;
  hospital: Hospital | null;
}

function driverIcon(heading: number) {
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:oklch(0.75 0.17 220);opacity:.22;animation:pulse-ring 1.8s ease-out infinite;"></div>
      <div style="position:absolute;inset:5px;border-radius:8px;background:oklch(0.75 0.17 220);transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px oklch(0.75 0.17 220);border:1.5px solid #fff;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b0f14" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    </div>`,
  });
}

function patientIcon() {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:oklch(0.62 0.24 25);border:2px solid #fff;box-shadow:0 0 12px oklch(0.62 0.24 25);display:flex;align-items:center;justify-content:center;color:#fff;font:800 10px 'Inter';">P</div>`,
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

export default function DriverMap({ driver, incident, hospital }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [driver.location.lat, driver.location.lng],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    L.marker([driver.location.lat, driver.location.lng], { icon: driverIcon(driver.heading) })
      .bindTooltip(`${driver.callSign} · You`, { direction: "top", offset: [0, -14] })
      .addTo(layer);

    const transporting = incident?.status === "patient_loaded";
    const target = transporting && hospital ? hospital.location : (incident?.location ?? null);

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
    if (target) {
      L.polyline(
        [
          [driver.location.lat, driver.location.lng],
          [target.lat, target.lng],
        ],
        {
          color: transporting ? "oklch(0.76 0.15 290)" : "oklch(0.62 0.24 25)",
          weight: 3.5,
          opacity: 0.8,
          dashArray: "8 8",
        },
      ).addTo(layer);
    }

    const points: [number, number][] = [[driver.location.lat, driver.location.lng]];
    if (incident) points.push([incident.location.lat, incident.location.lng]);
    if (hospital && transporting) points.push([hospital.location.lat, hospital.location.lng]);
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: true });
    } else {
      map.setView([driver.location.lat, driver.location.lng], 14);
    }
  }, [driver, incident, hospital]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
