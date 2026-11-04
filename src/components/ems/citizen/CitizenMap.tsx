import { useEffect, useRef, useState, useCallback } from "react";
import type * as LType from "leaflet";
import L from "leaflet";
import { Crosshair, Focus, Navigation, AlertTriangle } from "lucide-react";
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
  incident: Incident | null;
  driver: Driver | null;
  hospital: Hospital | null;
  citizenLocation: { lat: number; lng: number };
}

export default function CitizenMap({ incident, driver, hospital, citizenLocation }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
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
    syncMapTileLayer(map, resolvedTheme === "dark", tileLayerRef);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenLocation.lat, citizenLocation.lng]);

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
    L.marker([citizenLocation.lat, citizenLocation.lng], { icon: createCitizenMarker("You") })
      .bindTooltip("Emergency Location", { direction: "top", offset: [0, -12] })
      .addTo(layer);

    // Live Ambulance Marker
    if (driver && hasValidDriverLoc && isLiveMission) {
      L.marker([driver.location.lat, driver.location.lng], {
        icon: createAmbulanceMarker(driver.status, driver.heading, { isSelf: true }),
      })
        .bindTooltip(`<b>${driver.callSign}</b><br/>${driver.name}`, {
          direction: "top",
          offset: [0, -14],
        })
        .addTo(layer);

      // Render Genuine Road Polyline (Dual-layered Contrast Base + Cyan Core)
      const roadLine = activePolyline || lastValidPolylineRef.current;
      if (roadLine && roadLine.length >= 2) {
        // High-contrast dark casing
        L.polyline(roadLine, {
          color: "#0F172A",
          weight: 6,
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);

        // Vibrant cyan core road polyline
        L.polyline(roadLine, {
          color: "#38BDF8",
          weight: 4,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);
      }
    }

    // Destination Hospital Marker (if applicable)
    if (hospital) {
      L.marker([hospital.location.lat, hospital.location.lng], { icon: createHospitalMarker("H") })
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
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      <div ref={containerRef} className="h-full w-full" />

      {/* Navigation Telemetry & Routing Status Banner */}
      {isLiveMission && driver && (
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur text-xs">
            {routingStatus === "road" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-semibold text-primary font-mono text-[11px] uppercase tracking-wider">
                  Live Road Navigation
                </span>
              </>
            ) : routingStatus === "fallback" ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-priority-p2" />
                <span className="text-priority-p2 font-medium text-xs">
                  Direct Telemetry Active
                </span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-muted-foreground text-xs">Calculating road route…</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Map Action Floating Controls (>= 44px touch targets) */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        {driver && hasValidDriverLoc && (
          <button
            type="button"
            onClick={handleRecenterAmbulance}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-elevated hover:text-primary active:scale-95"
            title="Recenter on Ambulance"
            aria-label="Recenter on Ambulance"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleFitRoute}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-elevated hover:text-primary active:scale-95"
          title="Fit Entire Route"
          aria-label="Fit Entire Route"
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
