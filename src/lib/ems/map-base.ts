import L from "leaflet";
import type { Priority } from "@/lib/ems/types";

/**
 * Direction 3 Palette Colors for Map Markers
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  P1: "#EF4444",
  P2: "#F97316",
  P3: "#FBBF24",
  P4: "#60A5FA",
};

export const STATUS_COLORS: Record<string, string> = {
  available: "#22C55E",
  en_route: "#38BDF8",
  busy: "#F59E0B",
  at_hospital: "#A855F7",
  maintenance: "#EF4444",
  offline: "#64748B",
};

/**
 * Map Tile & Attribution Standards
 * - Light theme: Standard OpenStreetMap raster tiles with OSM attribution.
 * - Dark theme: MapTiler Dataviz Dark raster tiles if VITE_MAP_TILE_KEY is configured.
 *   Fallback: OpenStreetMap tiles with a mild scoped dark filter (no invert/hue-rotate).
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const MAPTILER_ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

let hasLoggedTileFallback = false;

/**
 * Apply or hot-swap the native tile layer based on active theme and configured API keys.
 * Preserves map zoom, pan coordinates, and layer groups.
 */
export function syncMapTileLayer(
  map: L.Map,
  isDark: boolean,
  tileLayerRef: React.MutableRefObject<L.TileLayer | null>,
): L.TileLayer {
  const mapTileKey = (import.meta.env.VITE_MAP_TILE_KEY || "").trim();
  const useMapTiler = isDark && Boolean(mapTileKey);

  // If a tile layer already exists, remove it cleanly without remounting map or resetting zoom/center
  if (tileLayerRef.current) {
    try {
      map.removeLayer(tileLayerRef.current);
    } catch {
      // Ignored if layer was already detached
    }
    tileLayerRef.current = null;
  }

  let layer: L.TileLayer;

  if (useMapTiler) {
    let errorCount = 0;
    const maptilerUrl = `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${mapTileKey}`;

    layer = L.tileLayer(maptilerUrl, {
      attribution: MAPTILER_ATTRIBUTION,
      tileSize: 512,
      zoomOffset: -1,
      minZoom: 0,
      maxZoom: 20,
      crossOrigin: true,
    });

    // Tile error handling: if MapTiler fails repeatedly (invalid key, rate limit, network),
    // automatically hot-swap to the dark-filtered OSM fallback and log once.
    layer.on("tileerror", () => {
      errorCount++;
      if (errorCount >= 3) {
        if (!hasLoggedTileFallback) {
          hasLoggedTileFallback = true;
          console.warn(
            "[ResQ Map] Primary MapTiler tile layer encountered errors; switching to OpenStreetMap dark fallback.",
          );
        }
        try {
          map.removeLayer(layer);
        } catch {
          // Ignored
        }

        const fallbackLayer = L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
          className: "dark-tile-fallback",
        }).addTo(map);

        tileLayerRef.current = fallbackLayer;
      }
    });
  } else {
    // Light theme or Dark theme fallback when no MapTiler key is set
    layer = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
      className: isDark ? "dark-tile-fallback" : "",
    });
  }

  layer.addTo(map);
  tileLayerRef.current = layer;
  return layer;
}

/**
 * Shared Incident Priority Marker
 */
export function createIncidentMarker(priority: Priority | string, selected: boolean = false) {
  const color = PRIORITY_COLORS[priority as Priority] ?? "#60A5FA";
  const ring = selected
    ? "outline: 2px solid #FFFFFF; outline-offset: 2px; box-shadow: 0 0 0 3px " + color + ";"
    : "border: 2px solid rgba(255, 255, 255, 0.7); box-shadow: 0 2px 4px rgba(0,0,0,0.35);";

  return L.divIcon({
    className: "incident-marker-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="width:26px;height:26px;border-radius:6px;background:${color};color:#0B0E14;font:700 11px/26px 'JetBrains Mono',monospace;text-align:center;${ring}transition:transform 150ms ease-out;">
          ${priority}
        </div>
      </div>`,
  });
}

/**
 * Shared Ambulance Marker
 */
export function createAmbulanceMarker(
  status: string,
  heading: number = 0,
  options?: { isSelf?: boolean },
) {
  const color = options?.isSelf ? "#38BDF8" : (STATUS_COLORS[status] ?? STATUS_COLORS.available);

  return L.divIcon({
    className: "ambulance-marker-smooth",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div style="width:32px;height:32px;transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;transition:transform 0.4s ease-out;">
        <div style="width:28px;height:28px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.35);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B0E14" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
          </svg>
        </div>
      </div>`,
  });
}

/**
 * Shared Citizen / Patient Marker
 */
export function createCitizenMarker(label: string = "You") {
  return L.divIcon({
    className: "citizen-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#EF4444;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;font:700 11px 'Inter',sans-serif;box-shadow:0 2px 4px rgba(0,0,0,0.35);letter-spacing:0.02em;">${label}</div>`,
  });
}

/**
 * Shared Hospital Marker
 */
export function createHospitalMarker(label: string = "H") {
  return L.divIcon({
    className: "hospital-marker-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:6px;background:#9333EA;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;font:800 12px 'Inter',sans-serif;box-shadow:0 2px 4px rgba(0,0,0,0.35);">${label}</div>`,
  });
}
