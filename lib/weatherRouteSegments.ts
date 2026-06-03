import { haversineMeters, lineStringLengthMeters } from "./geo.ts";
import type { LineString, LngLat, WeatherPoint } from "./types.ts";

export type WeatherRouteCondition =
  | "clear"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "fog"
  | "wind"
  | "unknown";

export interface WeatherRouteSample {
  index: number;
  coordinates: LngLat;
  distanceFromStartMeters: number;
  weather?: Pick<WeatherPoint, "condition" | "precipProb" | "windSpeed" | "temp">;
}

export interface WeatherRouteSegmentFeature {
  type: "Feature";
  geometry: LineString;
  properties: {
    sampleIndex: number;
    weatherCondition: WeatherRouteCondition;
    condition: string;
  };
}

export interface WeatherRouteSegmentCollection {
  type: "FeatureCollection";
  features: WeatherRouteSegmentFeature[];
}

function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function sameCoordinate(a: LngLat, b: LngLat) {
  return Math.abs(a[0] - b[0]) < 0.000001 && Math.abs(a[1] - b[1]) < 0.000001;
}

function appendCoordinate(coordinates: LngLat[], coordinate: LngLat) {
  const previous = coordinates[coordinates.length - 1];
  if (!previous || !sameCoordinate(previous, coordinate)) {
    coordinates.push(coordinate);
  }
}

function pointAtDistance(line: LineString, targetMeters: number) {
  const coordinates = line.coordinates;
  if (coordinates.length === 0) return { coordinate: [0, 0] as LngLat, segmentIndex: 0 };
  if (coordinates.length === 1 || targetMeters <= 0) {
    return { coordinate: coordinates[0], segmentIndex: 0 };
  }

  let traveled = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    const start = coordinates[i - 1];
    const end = coordinates[i];
    const segmentLength = haversineMeters(start, end);
    if (traveled + segmentLength >= targetMeters) {
      const remaining = targetMeters - traveled;
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      return {
        coordinate: interpolate(start, end, Math.min(1, Math.max(0, t))),
        segmentIndex: i - 1
      };
    }
    traveled += segmentLength;
  }

  return { coordinate: coordinates[coordinates.length - 1], segmentIndex: coordinates.length - 2 };
}

function sliceLineByDistance(line: LineString, startMeters: number, endMeters: number): LineString {
  const total = lineStringLengthMeters(line);
  const start = Math.max(0, Math.min(total, startMeters));
  const end = Math.max(start, Math.min(total, endMeters));
  const startPoint = pointAtDistance(line, start);
  const endPoint = pointAtDistance(line, end);
  const coordinates: LngLat[] = [];

  appendCoordinate(coordinates, startPoint.coordinate);
  for (let i = startPoint.segmentIndex + 1; i <= endPoint.segmentIndex; i += 1) {
    const coordinate = line.coordinates[i];
    if (coordinate) appendCoordinate(coordinates, coordinate);
  }
  appendCoordinate(coordinates, endPoint.coordinate);

  return { type: "LineString", coordinates };
}

export function weatherRouteConditionForSample(sample: WeatherRouteSample): WeatherRouteCondition {
  const weather = sample.weather;
  if (!weather) return "unknown";

  const normalized = weather.condition.toLowerCase();
  if (normalized.includes("thunder") || normalized.includes("storm")) return "storm";
  if (
    normalized.includes("snow") ||
    normalized.includes("sleet") ||
    normalized.includes("ice") ||
    normalized.includes("freezing")
  ) {
    return "snow";
  }
  if (
    normalized.includes("rain") ||
    normalized.includes("drizzle") ||
    normalized.includes("shower") ||
    weather.precipProb >= 0.55
  ) {
    return "rain";
  }
  if (normalized.includes("fog") || normalized.includes("mist") || normalized.includes("haze")) {
    return "fog";
  }
  if (weather.windSpeed >= 12) return "wind";
  if (normalized.includes("cloud") || normalized.includes("overcast")) return "cloudy";
  if (normalized.includes("clear") || normalized.includes("sun")) return "clear";
  if (normalized.includes("unavailable") || normalized.includes("unknown")) return "unknown";
  return "clear";
}

function representativeSegmentSample(start: WeatherRouteSample, end: WeatherRouteSample) {
  return end.distanceFromStartMeters > start.distanceFromStartMeters ? end : start;
}

export function buildWeatherRouteSegments(
  route: LineString | null,
  samples: WeatherRouteSample[]
): WeatherRouteSegmentCollection {
  if (!route || route.coordinates.length < 2 || samples.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  const sortedSamples = [...samples]
    .filter((sample) => Number.isFinite(sample.distanceFromStartMeters))
    .sort((a, b) => a.distanceFromStartMeters - b.distanceFromStartMeters);

  const features: WeatherRouteSegmentFeature[] = [];

  for (let i = 0; i < sortedSamples.length - 1; i += 1) {
    const start = sortedSamples[i];
    const end = sortedSamples[i + 1];
    if (end.distanceFromStartMeters <= start.distanceFromStartMeters) continue;

    const representative = representativeSegmentSample(start, end);
    features.push({
      type: "Feature",
      geometry: sliceLineByDistance(
        route,
        start.distanceFromStartMeters,
        end.distanceFromStartMeters
      ),
      properties: {
        sampleIndex: representative.index,
        weatherCondition: weatherRouteConditionForSample(representative),
        condition: representative.weather?.condition ?? "Unknown"
      }
    });
  }

  return { type: "FeatureCollection", features };
}
