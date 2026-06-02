import { TTLCache } from "./cache";
import type { SampleETA, WeatherPoint } from "./types";
import { haversineMeters } from "./geo";

type TimelineInterval = {
  startTime: string;
  values: {
    temperature: number;
    windSpeed: number;
    precipitationProbability: number;
    weatherCode: number;
  };
};

const WEATHER_TTL_MS = 60 * 60 * 1000;
const weatherCache = new TTLCache<WeatherPoint>(WEATHER_TTL_MS);
const timelineCache = new TTLCache<TimelineInterval[]>(WEATHER_TTL_MS);
const requestTimestamps: number[] = [];
const cacheHitTimestamps: number[] = [];
const cacheMissTimestamps: number[] = [];
let saw429InLastRequest = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(input: RequestInfo, init?: RequestInit) {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(input, init);
    if (res.status === 429) {
      saw429InLastRequest = true;
    }
    if (res.status !== 429 || attempt === maxRetries) {
      return res;
    }
    const retryAfter = res.headers.get("retry-after");
    const waitMs = retryAfter ? Number(retryAfter) * 1000 : 2000 * Math.pow(2, attempt);
    await sleep(waitMs);
  }
  return fetch(input, init);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function locationKey(lat: number, lon: number) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function hourBucket(date: Date) {
  return date.toISOString().slice(0, 13);
}

function cacheKey(lat: number, lon: number, bucket: string) {
  return `${lat.toFixed(2)}:${lon.toFixed(2)}:${bucket}`;
}

function weatherCodeToText(code: number): string {
  if (code === 1000) return "Clear";
  if (code === 1100) return "Mostly clear";
  if (code === 1101) return "Partly cloudy";
  if (code === 1102) return "Mostly cloudy";
  if (code === 1001) return "Cloudy";
  if (code >= 2000 && code < 2100) return "Fog";
  if (code >= 4000 && code < 4200) return "Rain";
  if (code >= 4200 && code < 4300) return "Heavy rain";
  if (code >= 5000 && code < 5200) return "Snow";
  if (code >= 6000 && code < 6200) return "Freezing rain";
  if (code >= 7000 && code < 7200) return "Ice pellets";
  if (code >= 8000 && code < 8200) return "Thunderstorm";
  return "Unknown";
}

type RepresentativeLocation = {
  lat: number;
  lon: number;
};

function selectRepresentativeLocations(
  ordered: RepresentativeLocation[],
  maxLocations: number
): RepresentativeLocation[] {
  if (ordered.length <= maxLocations) return ordered;
  const step = (ordered.length - 1) / (maxLocations - 1);
  const selected: RepresentativeLocation[] = [];
  for (let i = 0; i < maxLocations; i += 1) {
    const idx = Math.round(i * step);
    selected.push(ordered[idx]);
  }
  return selected;
}

async function fetchTimeline(lat: number, lon: number) {
  const key = locationKey(lat, lon);
  const cached = timelineCache.get(key);
  if (cached) return cached;

  const apiKey = requireEnv("TOMORROW_API_KEY");
  const url = new URL("https://api.tomorrow.io/v4/timelines");
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set(
    "fields",
    "temperature,windSpeed,precipitationProbability,weatherCode"
  );
  url.searchParams.set("units", "metric");
  url.searchParams.set("timesteps", "1h");
  const startTime = new Date(Date.now() - 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  url.searchParams.set("startTime", startTime.toISOString());
  url.searchParams.set("endTime", endTime.toISOString());
  url.searchParams.set("apikey", apiKey);

  requestTimestamps.push(Date.now());
  const res = await fetchWithRetry(url.toString(), {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    let details = "";
    try {
      const text = await res.text();
      details = text ? ` ${text}` : "";
    } catch {
      details = "";
    }
    if (res.status === 401) {
      throw new Error(`Tomorrow.io failed: 401 (check TOMORROW_API_KEY).${details}`);
    }
    throw new Error(`Tomorrow.io failed: ${res.status}.${details}`);
  }
  const data = await res.json();
  const intervals: TimelineInterval[] = data?.data?.timelines?.[0]?.intervals;
  if (!intervals || intervals.length === 0) {
    throw new Error("Tomorrow.io forecast data unavailable");
  }
  timelineCache.set(key, intervals);
  return intervals;
}

function intervalToWeather(interval: TimelineInterval): WeatherPoint {
  const code = interval.values.weatherCode;
  return {
    temp: interval.values.temperature,
    windSpeed: interval.values.windSpeed,
    condition: weatherCodeToText(code),
    icon: String(code),
    precipProb: (interval.values.precipitationProbability ?? 0) / 100,
    timestampISO: interval.startTime
  };
}

export async function getWeatherForRoute(samples: SampleETA[]) {
  saw429InLastRequest = false;
  const orderedLocations: RepresentativeLocation[] = [];
  const locationKeySet = new Set<string>();

  samples.forEach((sample) => {
    const lat = sample.coordinates[1];
    const lon = sample.coordinates[0];
    const key = locationKey(lat, lon);
    if (!locationKeySet.has(key)) {
      locationKeySet.add(key);
      orderedLocations.push({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
    }
  });

  const MAX_LOCATIONS = 2;
  const selectedLocations = selectRepresentativeLocations(orderedLocations, MAX_LOCATIONS);

  const pickNearest = (lat: number, lon: number) => {
    let best = selectedLocations[0];
    let bestDist = Number.POSITIVE_INFINITY;
    selectedLocations.forEach((loc) => {
      const dist = haversineMeters([lon, lat], [loc.lon, loc.lat]);
      if (dist < bestDist) {
        bestDist = dist;
        best = loc;
      }
    });
    return best;
  };

  const perSampleKeys = samples.map((sample) => {
    const lat = sample.coordinates[1];
    const lon = sample.coordinates[0];
    const bucket = hourBucket(sample.etaDate);
    const loc = pickNearest(lat, lon);
    return cacheKey(loc.lat, loc.lon, bucket);
  });

  let cacheHits = 0;
  let cacheMisses = 0;

  const cacheResults = perSampleKeys.map((key) => {
    const cached = weatherCache.get(key);
    if (cached) {
      cacheHits += 1;
      cacheHitTimestamps.push(Date.now());
      return cached;
    }
    cacheMisses += 1;
    cacheMissTimestamps.push(Date.now());
    return null;
  });

  const missingKeys = new Set<string>();
  cacheResults.forEach((value, idx) => {
    if (!value) missingKeys.add(perSampleKeys[idx]);
  });

  const locationsToFetch = Array.from(
    new Set(
      Array.from(missingKeys).map((key) => {
        const [latStr, lonStr] = key.split(":");
        return `${latStr}:${lonStr}`;
      })
    )
  ).map((key) => {
    const [latStr, lonStr] = key.split(":");
    return { lat: Number(latStr), lon: Number(lonStr) };
  });

  const maxConcurrency = 2;
  const fetchQueue = [...locationsToFetch];
  const runners = new Array(Math.min(maxConcurrency, fetchQueue.length))
    .fill(null)
    .map(async () => {
      while (fetchQueue.length > 0) {
        const loc = fetchQueue.shift();
        if (!loc) break;
        const intervals = await fetchTimeline(loc.lat, loc.lon);
        intervals.forEach((interval) => {
          const bucket = interval.startTime.slice(0, 13);
          const key = cacheKey(loc.lat, loc.lon, bucket);
          if (!weatherCache.get(key)) {
            weatherCache.set(key, intervalToWeather(interval));
          }
        });
      }
    });
  await Promise.all(runners);

  const results = perSampleKeys.map((key) => {
    const cached = weatherCache.get(key);
    if (cached) return cached;
    return {
      temp: 0,
      windSpeed: 0,
      condition: "Unavailable",
      icon: "0",
      precipProb: 0,
      timestampISO: new Date().toISOString()
    };
  });

  console.log(
    `[tomorrow] locations=${selectedLocations.length} cacheHits=${cacheHits} cacheMisses=${cacheMisses} saw429=${saw429InLastRequest}`
  );

  return results;
}

export function getTomorrowStats() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentRequests = requestTimestamps.filter((t) => t >= oneHourAgo);
  const recentHits = cacheHitTimestamps.filter((t) => t >= oneHourAgo);
  const recentMisses = cacheMissTimestamps.filter((t) => t >= oneHourAgo);
  const hitRate = recentHits.length + recentMisses.length === 0 ? 0 : recentHits.length / (recentHits.length + recentMisses.length);

  return {
    requestsLastHour: recentRequests.length,
    cacheSize: weatherCache.size(),
    cacheHitRate: Number(hitRate.toFixed(3))
  };
}
