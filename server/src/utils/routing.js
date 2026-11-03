import { haversineKm } from "./geo.js";

/**
 * Validates that a coordinate has valid, non-null, within-bounds latitude and longitude.
 * Explicitly guards against Null Island (0, 0) and NaN values.
 */
export function isValidCoordinate(coord) {
  if (!coord || typeof coord !== "object") return false;
  const lat = Number(coord.lat);
  const lng = Number(coord.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  // Guard against (0, 0) Null Island
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;

  return true;
}

/**
 * Converts GeoJSON [lng, lat] LineString coordinate array into Leaflet [lat, lng] array.
 * Validates each point to guard against invalid or inverted values.
 */
export function geojsonToLeaflet(coordinates) {
  if (!Array.isArray(coordinates)) return [];
  const valid = [];
  for (const pt of coordinates) {
    if (Array.isArray(pt) && pt.length >= 2) {
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (isValidCoordinate({ lat, lng })) {
        valid.push([lat, lng]);
      }
    }
  }
  return valid;
}

/**
 * Calculates distance between two points in meters using Haversine formula.
 */
export function distanceMeters(a, b) {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) return Infinity;
  return haversineKm(a, b) * 1000;
}

/**
 * Determines whether a vehicle has moved more than a given threshold in meters.
 * Used for GPS debouncing and throttling route recalculations.
 */
export function hasSignificantMovement(prevLoc, currLoc, thresholdMeters = 35) {
  if (!isValidCoordinate(prevLoc) || !isValidCoordinate(currLoc)) return true;
  return distanceMeters(prevLoc, currLoc) >= thresholdMeters;
}

/**
 * Checks if the vehicle has deviated from the road route polyline by more than thresholdMeters.
 */
export function isDeviatedFromRoute(currentLoc, polylineCoords, thresholdMeters = 80) {
  if (
    !isValidCoordinate(currentLoc) ||
    !Array.isArray(polylineCoords) ||
    polylineCoords.length === 0
  ) {
    return false;
  }
  let minDistance = Infinity;
  for (const pt of polylineCoords) {
    const d = distanceMeters(currentLoc, { lat: pt[0], lng: pt[1] });
    if (d < minDistance) {
      minDistance = d;
    }
    // Early exit if close enough to any road node
    if (minDistance <= thresholdMeters) return false;
  }
  return minDistance > thresholdMeters;
}

// ── In-Memory Routing Cache with TTL and Max Capacity ─────────────────────────

const routeCache = new Map();
const CACHE_TTL_MS = 30_000; // 30 seconds TTL for repeated telemetry pings
const MAX_CACHE_SIZE = 500;

function getCacheKey(from, to, includeGeometry = true) {
  // Round to 3 decimal places (~110m resolution) to coalesce micro GPS jitter
  return `${from.lat.toFixed(3)},${from.lng.toFixed(3)}->${to.lat.toFixed(3)},${to.lng.toFixed(3)}:geom=${includeGeometry}`;
}

export function clearRouteCache() {
  routeCache.clear();
}

/**
 * Calculates road distance, estimated response duration (ETA), and real road route geometry.
 *
 * Primary: OSRM Driving API (or custom ROUTING_API_URL) with GeoJSON LineString coordinates.
 * Fallback: Geodesic Haversine with 1.3x urban road winding circuity factor and 42 km/h response speed.
 *           (Returns polyline: null when OSRM is unavailable so UI indicates no road route rather than fake straight line)
 */
export async function calculateRouteEta(from, to, options = {}) {
  const includeGeometry = options.includeGeometry !== false;

  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    return {
      distanceKm: null,
      etaMinutes: null,
      polyline: null,
      provider: "none",
      error: "invalid_coordinates",
    };
  }

  const cacheKey = getCacheKey(from, to, includeGeometry);
  const cached = routeCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      distanceKm: cached.distanceKm,
      etaMinutes: cached.etaMinutes,
      polyline: cached.polyline,
      provider: cached.provider,
      cached: true,
    };
  }

  const routingBaseUrl =
    process.env.ROUTING_API_URL || "https://router.project-osrm.org/route/v1/driving";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    // Request full GeoJSON geometries along road network
    const geomParam = includeGeometry ? "overview=full&geometries=geojson" : "overview=false";
    const url = `${routingBaseUrl}/${from.lng},${from.lat};${to.lng},${to.lat}?${geomParam}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.code === "Ok" && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const etaMinutes = Math.max(1, Math.round(route.duration / 60));

        let polyline = null;
        if (includeGeometry && route.geometry?.coordinates) {
          polyline = geojsonToLeaflet(route.geometry.coordinates);
        }

        const result = { distanceKm, etaMinutes, polyline, provider: "osrm" };

        // Save in cache (pruning if capacity exceeded)
        if (routeCache.size >= MAX_CACHE_SIZE) {
          const firstKey = routeCache.keys().next().value;
          if (firstKey) routeCache.delete(firstKey);
        }
        routeCache.set(cacheKey, { ...result, timestamp: now });

        return result;
      }
    }
  } catch {
    // Timeout or network error — gracefully fallback
  }

  // Graceful Fallback: Haversine with 1.3x urban road circuity factor and 42 km/h average emergency speed
  // NOTE: polyline is set to null per specification — never draw fake straight lines as road routes!
  const directKm = haversineKm(from, to);
  const roadKm = Number((directKm * 1.3).toFixed(2));
  const etaMinutes = Math.max(1, Math.round((roadKm / 42) * 60));

  const result = {
    distanceKm: roadKm,
    etaMinutes,
    polyline: null,
    provider: "haversine_fallback",
  };

  if (routeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = routeCache.keys().next().value;
    if (firstKey) routeCache.delete(firstKey);
  }
  routeCache.set(cacheKey, { ...result, timestamp: now });

  return result;
}
