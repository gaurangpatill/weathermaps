import { TTLCache } from "./cache";
import type { GeocodeResult, LngLat, RouteResult } from "./types";

const geocodeCache = new TTLCache<GeocodeResult>(10 * 60 * 1000);
const directionsCache = new TTLCache<RouteResult>(10 * 60 * 1000);
const reverseGeocodeCache = new TTLCache<string>(10 * 60 * 1000);

type MapboxContext = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxReverseFeature = {
  text?: string;
  place_name?: string;
  context?: MapboxContext[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

function coordinateFallback(coordinates: LngLat) {
  return `${coordinates[1].toFixed(2)}, ${coordinates[0].toFixed(2)}`;
}

function reverseGeocodeKey(coordinates: LngLat) {
  return `${coordinates[0].toFixed(3)},${coordinates[1].toFixed(3)}`;
}

function contextText(context: MapboxContext[] | undefined, prefix: string) {
  return context?.find((entry) => entry.id?.startsWith(`${prefix}.`))?.text;
}

function regionCode(context: MapboxContext[] | undefined) {
  const region = context?.find((entry) => entry.id?.startsWith("region."));
  if (!region?.short_code) return region?.text;
  const code = region.short_code.split("-").at(-1);
  return code?.toUpperCase() || region.text;
}

function formatReverseFeature(feature: MapboxReverseFeature | undefined, coordinates: LngLat) {
  if (!feature) return coordinateFallback(coordinates);

  const parts: string[] = [];
  const primary = feature.text?.trim();
  const place = contextText(feature.context, "place") || contextText(feature.context, "locality");
  const region = regionCode(feature.context);

  if (primary) parts.push(primary);
  if (place && place !== primary) parts.push(place);
  if (region && region !== primary && region !== place) parts.push(region);

  return parts.length > 0 ? parts.join(", ") : feature.place_name || coordinateFallback(coordinates);
}

async function reverseGeocode(coordinates: LngLat): Promise<string> {
  const key = reverseGeocodeKey(coordinates);
  const cached = reverseGeocodeCache.get(key);
  if (cached) return cached;

  const token = requireEnv("NEXT_PUBLIC_MAPBOX_TOKEN");
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "place,locality,neighborhood,district,region");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const fallback = coordinateFallback(coordinates);
      reverseGeocodeCache.set(key, fallback);
      return fallback;
    }

    const data = await res.json();
    const name = formatReverseFeature(data.features?.[0], coordinates);
    reverseGeocodeCache.set(key, name);
    return name;
  } catch {
    return coordinateFallback(coordinates);
  }
}

export async function reverseGeocodeLocations(coordinates: LngLat[]) {
  const results = new Array<string>(coordinates.length);
  const queue = coordinates.map((coordinate, index) => ({ coordinate, index }));
  const maxConcurrency = 4;

  const workers = new Array(Math.min(maxConcurrency, queue.length)).fill(null).map(async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      results[next.index] = await reverseGeocode(next.coordinate);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const normalized = query.trim().toLowerCase();
  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  const token = requireEnv("NEXT_PUBLIC_MAPBOX_TOKEN");
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Mapbox geocoding failed: ${res.status}`);
  }
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error(`No geocoding results for: ${query}`);
  }

  const result: GeocodeResult = {
    name: feature.place_name,
    coordinates: feature.center as LngLat
  };
  geocodeCache.set(normalized, result);
  return result;
}

export async function directions(
  origin: LngLat,
  destination: LngLat
): Promise<RouteResult> {
  const key = `${origin.join(",")}_${destination.join(",")}`;
  const cached = directionsCache.get(key);
  if (cached) return cached;

  const token = requireEnv("NEXT_PUBLIC_MAPBOX_TOKEN");
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Mapbox directions failed: ${res.status}`);
  }
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("No route found");
  }
  if (
    route.geometry?.type !== "LineString" ||
    !Array.isArray(route.geometry.coordinates) ||
    !route.geometry.coordinates.every(isLngLat)
  ) {
    throw new Error("Mapbox directions returned invalid route geometry");
  }

  const result: RouteResult = {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    lineString: route.geometry
  };

  directionsCache.set(key, result);
  return result;
}
