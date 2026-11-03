import { useEffect, useRef, useState, useCallback } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import { Crosshair, Focus, Navigation, AlertTriangle } from "lucide-react";
import type { Driver, Hospital, Incident } from "@/lib/ems/types";
import { dispatchApi } from "@/lib/api/dispatch";

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
    className: "ambulance-marker-smooth",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="width:32px;height:32px;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;transition:transform 0.4s ease-out;">
      <div style="width:26px;height:26px;border-radius:8px;background:#06b6d4;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(6,182,212,0.8);border:2px solid #ffffff;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#041f26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    </div>`,
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

export default function CitizenMap({ incident, driver, hospital, citizenLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerRef = useRef<LType.LayerGroup | null>(null);
  const lastValidPolylineRef = useRef<[number, number][] | null>(null);
  const [activePolyline, setActivePolyline] = useState<[number, number][] | null>(null);
  const [routingStatus, setRoutingStatus] = useState<"road" | "fallback" | "loading">("loading");
  const lastFetchedLocRef = useRef<{ lat: number; lng: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [citizenLocation.lat, citizenLocation.lng],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap · ResQ Navigation",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [citizenLocation.lat, citizenLocation.lng]);

  const hasValidDriverLoc =
    driver?.location &&
    typeof driver.location.lat === "number" &&
    typeof driver.location.lng === "number" &&
    !isNaN(driver.location.lat) &&
    !isNaN(driver.location.lng) &&
    (driver.location.lat !== 0 || driver.location.lng !== 0);

  const isLiveMission =
    incident && incident.status !== "completed" && incident.status !== "cancelled";

  // Fetch or Synchronize Road Geometry
  useEffect(() => {
    if (!driver || !hasValidDriverLoc || !isLiveMission) {
      setActivePolyline(null);
      setRoutingStatus("loading");
      return;
    }

    // 1. If incident already carries a live road polyline from backend Socket.IO
    if (incident?.polyline && Array.isArray(incident.polyline) && incident.polyline.length >= 2) {
      lastValidPolylineRef.current = incident.polyline;
      setActivePolyline(incident.polyline);
      setRoutingStatus("road");
      return;
    }

    // 2. Check if ambulance has moved > 35m from last client route query
    const currentLoc = driver.location;
    const lastLoc = lastFetchedLocRef.current;
    if (lastLoc) {
      const dLat = (currentLoc.lat - lastLoc.lat) * 111_000;
      const dLng =
        (currentLoc.lng - lastLoc.lng) * 111_000 * Math.cos((currentLoc.lat * Math.PI) / 180);
      const movedMeters = Math.hypot(dLat, dLng);
      if (movedMeters < 35 && lastValidPolylineRef.current) {
        return; // debounce / throttle repeated fetch
      }
    }

    let isSubscribed = true;
    lastFetchedLocRef.current = { lat: currentLoc.lat, lng: currentLoc.lng };

    dispatchApi
      .getRoute({
        fromLat: currentLoc.lat,
        fromLng: currentLoc.lng,
        toLat: citizenLocation.lat,
        toLng: citizenLocation.lng,
      })
      .then((res) => {
        if (!isSubscribed) return;
        if (res?.polyline && res.polyline.length >= 2) {
          lastValidPolylineRef.current = res.polyline;
          setActivePolyline(res.polyline);
          setRoutingStatus("road");
        } else if (res?.provider === "haversine_fallback") {
          // If fallback provider, preserve last valid route if available, otherwise notify
          if (!lastValidPolylineRef.current) {
            setActivePolyline(null);
          }
          setRoutingStatus("fallback");
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setRoutingStatus("fallback");
      });

    return () => {
      isSubscribed = false;
    };
  }, [
    incident?.polyline,
    driver,
    driver?.location?.lat,
    driver?.location?.lng,
    citizenLocation,
    hasValidDriverLoc,
    isLiveMission,
  ]);

  // Render Map Layers
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Citizen Emergency Location Marker
    L.marker([citizenLocation.lat, citizenLocation.lng], { icon: citizenIcon() })
      .bindTooltip("Emergency Location", { direction: "top", offset: [0, -12] })
      .addTo(layer);

    // Live Ambulance Marker
    if (driver && hasValidDriverLoc && isLiveMission) {
      L.marker([driver.location.lat, driver.location.lng], {
        icon: ambulanceIcon(driver.heading),
      })
        .bindTooltip(`<b>${driver.callSign}</b><br/>${driver.name}`, {
          direction: "top",
          offset: [0, -14],
        })
        .addTo(layer);

      // Render Genuine Road Polyline (Dual-layered Cyan Casing + Core Line)
      const roadLine = activePolyline || lastValidPolylineRef.current;
      if (roadLine && roadLine.length >= 2) {
        // Outer glowing casing
        L.polyline(roadLine, {
          color: "#0891b2",
          weight: 8,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);

        // Vibrant cyan core road polyline
        L.polyline(roadLine, {
          color: "#06b6d4",
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);
      }
      // Note: If no road line is available, NO straight fake line is drawn per specification!
    }

    // Destination Hospital Marker (if applicable)
    if (hospital) {
      L.marker([hospital.location.lat, hospital.location.lng], { icon: hospitalIcon() })
        .bindTooltip(`${hospital.name} · ${hospital.bedsAvailable} beds`, {
          direction: "top",
          offset: [0, -10],
        })
        .addTo(layer);
    }

    // Dynamic Viewport Bounds Fitting
    const points: [number, number][] = [[citizenLocation.lat, citizenLocation.lng]];
    if (driver && hasValidDriverLoc && isLiveMission) {
      points.push([driver.location.lat, driver.location.lng]);
    }
    if (
      hospital &&
      (incident?.status === "patient_loaded" ||
        incident?.status === "at_hospital" ||
        incident?.status === "completed")
    ) {
      points.push([hospital.location.lat, hospital.location.lng]);
    }

    if (points.length > 1) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [
    driver,
    hospital,
    incident,
    citizenLocation.lat,
    citizenLocation.lng,
    activePolyline,
    hasValidDriverLoc,
    isLiveMission,
  ]);

  // Map Controls
  const handleRecenterAmbulance = useCallback(() => {
    if (!mapRef.current || !driver || !hasValidDriverLoc) return;
    mapRef.current.panTo([driver.location.lat, driver.location.lng], { animate: true });
  }, [driver, hasValidDriverLoc]);

  const handleFitRoute = useCallback(() => {
    if (!mapRef.current) return;
    const points: [number, number][] = [[citizenLocation.lat, citizenLocation.lng]];
    if (driver && hasValidDriverLoc) {
      points.push([driver.location.lat, driver.location.lng]);
    }
    const roadLine = activePolyline || lastValidPolylineRef.current;
    if (roadLine && roadLine.length >= 2) {
      roadLine.forEach((pt) => points.push(pt));
    }
    if (points.length > 1) {
      mapRef.current.fitBounds(points, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [driver, citizenLocation, activePolyline, hasValidDriverLoc]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-surface panel">
      <div ref={containerRef} className="h-full w-full" />

      {/* Navigation Telemetry & Routing Status Banner */}
      {isLiveMission && driver && (
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface/90 px-3 py-1.5 shadow-md backdrop-blur text-xs">
            {routingStatus === "road" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="font-semibold text-cyan-400 font-mono text-[11px] uppercase tracking-wider">
                  Live Road Navigation
                </span>
              </>
            ) : routingStatus === "fallback" ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium text-[11px]">
                  Road Route Unavailable · Direct Telemetry Active
                </span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-muted-foreground text-[11px]">Calculating road route…</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Map Action Floating Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        {driver && hasValidDriverLoc && (
          <button
            onClick={handleRecenterAmbulance}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-cyan-400 active:scale-95"
            title="Recenter on Ambulance"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleFitRoute}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/90 text-foreground shadow-md backdrop-blur transition-all hover:bg-surface hover:text-primary active:scale-95"
          title="Fit Entire Route"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
