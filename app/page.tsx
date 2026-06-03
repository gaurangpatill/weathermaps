"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import ResultsList from "@/components/ResultsList";
import RoutePreviewPlaceholder from "@/components/RoutePreviewPlaceholder";
import RouteSummaryPanel from "@/components/RouteSummaryPanel";
import TripInfoPanel from "@/components/TripInfoPanel";
import UnitsToggle from "@/components/UnitsToggle";
import { detectUnitsFromLocale, getStoredUnits, storeUnits } from "@/lib/client/units";
import { formatDistance } from "@/lib/client/format";
import type { LineString, Units } from "@/lib/types";

interface ApiResponse {
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  route: { distanceMeters: number; durationSeconds: number; lineString: LineString };
  samples: Array<{
    index: number;
    coordinates: [number, number];
    distanceFromStartMeters: number;
    etaISO: string;
    locationName: string;
    weather: {
      temp: number;
      windSpeed: number;
      condition: string;
      icon: string;
      precipProb: number;
      timestampISO: string;
    };
  }>;
}

interface MapboxFeature {
  place_name: string;
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

export default function HomePage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departAt, setDepartAt] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [unitsAuto, setUnitsAuto] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(null);

  useEffect(() => {
    const storedUnits = getStoredUnits();
    if (storedUnits) {
      setUnits(storedUnits);
      setUnitsAuto(false);
    } else {
      setUnits(detectUnitsFromLocale());
      setUnitsAuto(true);
    }
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
    setDepartAt(local);
  }, []);

  function handleUnitsChange(nextUnits: Units) {
    setUnits(nextUnits);
    setUnitsAuto(false);
    storeUnits(nextUnits);
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchSuggestions(query: string, field: "origin" | "destination") {
      if (query.trim().length < 3) {
        if (field === "origin") setOriginSuggestions([]);
        if (field === "destination") setDestinationSuggestions([]);
        return;
      }
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("autocomplete", "true");
      url.searchParams.set("limit", "5");
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = (await res.json()) as MapboxGeocodeResponse;
      if (cancelled) return;
      const places = (data.features || []).map((feature) => feature.place_name);
      if (field === "origin") setOriginSuggestions(places);
      if (field === "destination") setDestinationSuggestions(places);
    }
    const timeout = setTimeout(() => {
      if (activeField === "origin") fetchSuggestions(origin, "origin");
      if (activeField === "destination") fetchSuggestions(destination, "destination");
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [origin, destination, activeField]);

  const samples = useMemo(() => data?.samples ?? [], [data]);
  const route = useMemo(() => data?.route.lineString ?? null, [data]);
  const mapSamples = useMemo(
    () =>
      samples.map((sample) => ({
        coordinates: sample.coordinates,
        index: sample.index,
        distanceFromStartMeters: sample.distanceFromStartMeters,
        weather: {
          temp: sample.weather.temp,
          windSpeed: sample.weather.windSpeed,
          condition: sample.weather.condition,
          precipProb: sample.weather.precipProb
        }
      })),
    [samples]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    setData(null);

    try {
      const res = await fetch("/api/route-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          departAt: new Date(departAt).toISOString(),
          units
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch route weather.");
      }
      setData(json);
      setSelectedIndex(json.samples?.[0]?.index ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-2 text-slate-950 md:p-2.5">
      <div className="mx-auto max-w-[1920px]">
        <header className="mb-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold leading-7 text-white">WeatherMaps</h1>
            <p className="text-sm leading-5 text-slate-400">Weather along your route, aligned to ETA.</p>
          </div>
          <UnitsToggle units={units} isAuto={unitsAuto} onChange={handleUnitsChange} />
        </header>

        <div className="grid gap-3 xl:grid-cols-[308px_minmax(720px,1fr)_320px] xl:items-start">
          <section className="rounded-xl border border-slate-700/70 bg-[#f8fafc] p-3.5 shadow-[0_10px_28px_rgb(0_0_0/0.24)] xl:h-[calc(100vh-58px)] xl:overflow-auto">
            <div>
              <h2 className="text-base font-bold leading-6 text-slate-950">Trip Info</h2>
              <p className="text-sm leading-5 text-slate-600">Set the route and departure time.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Origin</label>
                <div className="relative">
                  <input
                    value={origin}
                    onChange={(event) => setOrigin(event.target.value)}
                    onFocus={() => setActiveField("origin")}
                    onBlur={() => setTimeout(() => setActiveField(null), 150)}
                    placeholder="Start typing a place..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-inner shadow-slate-100/60 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    required
                  />
                  {activeField === "origin" && originSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
                      {originSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setOrigin(suggestion);
                            setOriginSuggestions([]);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Destination</label>
                <div className="relative">
                  <input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    onFocus={() => setActiveField("destination")}
                    onBlur={() => setTimeout(() => setActiveField(null), 150)}
                    placeholder="Start typing a place..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-inner shadow-slate-100/60 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    required
                  />
                  {activeField === "destination" && destinationSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
                      {destinationSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setDestination(suggestion);
                            setDestinationSuggestions([]);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Depart At</label>
                <input
                  type="datetime-local"
                  value={departAt}
                  onChange={(event) => setDepartAt(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-inner shadow-slate-100/60 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Calculating..." : "Show Weather Along Route"}
              </button>
            </form>
            {error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            {data && (
              <>
                <TripInfoPanel
                  originName={data.origin.name}
                  destinationName={data.destination.name}
                  departAtISO={samples[0]?.etaISO ?? new Date(departAt).toISOString()}
                  durationSeconds={data.route.durationSeconds}
                  distanceMeters={data.route.distanceMeters}
                  sampleCount={data.samples.length}
                  units={units}
                />
                <RouteSummaryPanel samples={samples} units={units} onSelectSample={setSelectedIndex} />
              </>
            )}
            {!data && <RoutePreviewPlaceholder />}
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.38)] xl:h-[calc(100vh-58px)]">
            <div className="h-[60vh] min-h-[420px] xl:h-full xl:min-h-0">
              <MapView
                route={route}
                samples={mapSamples}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-700/70 bg-[#f8fafc] p-3.5 shadow-[0_10px_28px_rgb(0_0_0/0.24)] xl:h-[calc(100vh-58px)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold leading-6 text-slate-950">Weather Samples</h2>
              {data && (
                <span className="text-xs text-slate-500">
                  {data.samples.length} points · {formatDistance(data.route.distanceMeters, units)}
                </span>
              )}
            </div>
            <div className="mt-3 max-h-[58vh] overflow-auto pr-1 xl:max-h-[calc(100vh-132px)]">
              <ResultsList
                samples={samples}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                units={units}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
