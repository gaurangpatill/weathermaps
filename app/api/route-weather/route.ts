import { NextResponse } from "next/server";
import { directions, geocode } from "@/lib/mapbox";
import { etaForSamples } from "@/lib/eta";
import { sampleLineStringEveryMeters } from "@/lib/geo";
import { getWeatherForRoute } from "@/lib/weather";

const BASE_SPACING_METERS = 15000;
const MAX_SAMPLES = 40;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origin = typeof body.origin === "string" ? body.origin : "";
    const destination = typeof body.destination === "string" ? body.destination : "";
    const departAtRaw = typeof body.departAt === "string" ? body.departAt : undefined;

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origin and destination are required." }, { status: 400 });
    }

    const departAt = departAtRaw ? new Date(departAtRaw) : new Date();
    if (Number.isNaN(departAt.getTime())) {
      return NextResponse.json({ error: "Invalid departAt value." }, { status: 400 });
    }

    const [originResult, destinationResult] = await Promise.all([
      geocode(origin),
      geocode(destination)
    ]);

    const route = await directions(originResult.coordinates, destinationResult.coordinates);

    const samples = sampleLineStringEveryMeters(
      route.lineString,
      BASE_SPACING_METERS,
      MAX_SAMPLES
    );

    const samplesWithEta = etaForSamples(
      samples,
      route.distanceMeters,
      route.durationSeconds,
      departAt
    );

    const bbox = samplesWithEta.reduce(
      (acc, sample) => {
        const lat = sample.coordinates[1];
        const lon = sample.coordinates[0];
        acc.minLat = Math.min(acc.minLat, lat);
        acc.maxLat = Math.max(acc.maxLat, lat);
        acc.minLon = Math.min(acc.minLon, lon);
        acc.maxLon = Math.max(acc.maxLon, lon);
        return acc;
      },
      {
        minLat: Number.POSITIVE_INFINITY,
        maxLat: Number.NEGATIVE_INFINITY,
        minLon: Number.POSITIVE_INFINITY,
        maxLon: Number.NEGATIVE_INFINITY
      }
    );

    const weatherPerSample = await getWeatherForRoute(samplesWithEta);

    const weatherResults = samplesWithEta.map((sample, idx) => ({
      index: sample.index,
      coordinates: sample.coordinates,
      distanceFromStartMeters: sample.distanceFromStartMeters,
      etaISO: sample.etaDate.toISOString(),
      weather: weatherPerSample[idx]
    }));

    return NextResponse.json({
      origin: originResult,
      destination: destinationResult,
      route: {
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        lineString: route.lineString
      },
      samples: weatherResults,
      bbox
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status =
      message.includes("Tomorrow.io failed: 401")
        ? 401
        : message.includes("Mapbox") || message.includes("Tomorrow.io")
          ? 502
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with JSON body: { origin, destination, departAt?, units? }" },
    { status: 405 }
  );
}
