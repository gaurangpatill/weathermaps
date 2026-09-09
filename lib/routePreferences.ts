import type { RoutePreferences } from "./types";

export function parseRoutePreferences(value: unknown): RoutePreferences {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof RoutePreferences, unknown>>)
      : {};

  return {
    avoidWeatherRisk: source.avoidWeatherRisk === true,
    avoidTolls: source.avoidTolls === true,
    avoidHighways: source.avoidHighways === true
  };
}

export function mapboxExcludeFromPreferences(
  preferences: Pick<RoutePreferences, "avoidTolls" | "avoidHighways">
) {
  const exclude: string[] = [];
  if (preferences.avoidTolls) exclude.push("toll");
  if (preferences.avoidHighways) exclude.push("motorway");
  return exclude.join(",");
}
