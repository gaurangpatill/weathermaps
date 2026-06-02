import { TTLCache } from "./cache";
import type { GeocodeResult, LngLat, RouteResult } from "./types";

const geocodeCache = new TTLCache<GeocodeResult>(10 * 60 * 1000);
const directionsCache = new TTLCache<RouteResult>(10 * 60 * 1000);

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
