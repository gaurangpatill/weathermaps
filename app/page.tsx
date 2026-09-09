"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import {
  BottomConditionBar,
  LeftTripPanel,
  MapControls,
  RightInsightPanel,
  RouteComparisonPanel,
  WeatherLegend,
  buildRouteOptions,
  type WeatherSample
} from "@/components/PremiumRouteUI";
import { detectUnitsFromLocale, getStoredUnits, storeUnits } from "@/lib/client/units";
import type { LineString, RoutePreferences, Units } from "@/lib/types";

interface ApiResponse {
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  route: { distanceMeters: number; durationSeconds: number; lineString: LineString };
  preferences?: RoutePreferences;
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
  const [, setUnitsAuto] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sampleMarkersAwake, setSampleMarkersAwake] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(null);
  const [mapPreset, setMapPreset] = useState<"day" | "night">("night");
  const [legendVisible, setLegendVisible] = useState(true);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [insightsVisible, setInsightsVisible] = useState(true);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [activeMode, setActiveMode] = useState<"drive" | "compare">("drive");
  const [preferences, setPreferences] = useState<RoutePreferences>({
    avoidWeatherRisk: true,
    avoidTolls: false,
    avoidHighways: false
  });

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
  const appliedPreferences = data?.preferences ?? preferences;
  const mapSamples = useMemo(
    () =>
      samples.map((sample): WeatherSample => ({
        coordinates: sample.coordinates,
        index: sample.index,
        distanceFromStartMeters: sample.distanceFromStartMeters,
        etaISO: sample.etaISO,
        locationName: sample.locationName,
        weather: {
          temp: sample.weather.temp,
          windSpeed: sample.weather.windSpeed,
          condition: sample.weather.condition,
          icon: sample.weather.icon,
          precipProb: sample.weather.precipProb,
          timestampISO: sample.weather.timestampISO
        }
      })),
    [samples]
  );
  const routeOptions = useMemo(
    () =>
      data
        ? buildRouteOptions({
            samples: mapSamples,
            durationSeconds: data.route.durationSeconds,
            distanceMeters: data.route.distanceMeters,
            departAt,
            preferences: appliedPreferences
          })
        : [],
    [appliedPreferences, data, departAt, mapSamples]
  );

  useEffect(() => {
    if (data) {
      setComparisonVisible(true);
      setInsightsVisible(true);
      setActiveMode("compare");
    }
  }, [data]);

  function handleModeChange(mode: "drive" | "compare") {
    setActiveMode(mode);
    if (mode === "compare") {
      setComparisonVisible(true);
    } else {
      setComparisonVisible(false);
    }
  }

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
          units,
          preferences
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch route weather.");
      }
      setData(json);
      setSampleMarkersAwake(true);
      setSelectedIndex(json.samples?.[0]?.index ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#040915] text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.14),transparent_34%),linear-gradient(180deg,#07111f_0%,#040915_100%)]" />
      <div
        className={`relative z-10 grid min-h-screen grid-cols-1 gap-3 p-3 xl:h-screen xl:gap-0 xl:p-0 ${
          leftPanelVisible && insightsVisible
            ? "xl:grid-cols-[320px_minmax(0,1fr)_360px]"
            : leftPanelVisible
              ? "xl:grid-cols-[320px_minmax(0,1fr)]"
              : insightsVisible
                ? "xl:grid-cols-[minmax(0,1fr)_360px]"
                : "xl:grid-cols-[minmax(0,1fr)]"
        }`}
      >
        {leftPanelVisible && (
          <LeftTripPanel
            activeMode={activeMode}
            origin={origin}
            destination={destination}
            departAt={departAt}
            loading={loading}
            error={error}
            originSuggestions={originSuggestions}
            destinationSuggestions={destinationSuggestions}
            activeField={activeField}
            preferences={preferences}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onDepartAtChange={setDepartAt}
            onFieldFocus={setActiveField}
            onFieldBlur={() => setTimeout(() => setActiveField(null), 150)}
            onOriginSuggestion={(suggestion) => {
              setOrigin(suggestion);
              setOriginSuggestions([]);
            }}
            onDestinationSuggestion={(suggestion) => {
              setDestination(suggestion);
              setDestinationSuggestions([]);
            }}
            onPreferenceChange={(key, value) => setPreferences((current) => ({ ...current, [key]: value }))}
            onModeChange={handleModeChange}
            onCollapse={() => setLeftPanelVisible(false)}
            onSubmit={handleSubmit}
          />
        )}

        <section className="relative order-first h-[74vh] min-h-[560px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 xl:order-none xl:h-screen xl:min-h-0 xl:rounded-none xl:border-y-0">
          <MapView
            route={route}
            mapPreset={mapPreset}
            samples={mapSamples}
            selectedIndex={selectedIndex}
            sampleMarkersAwake={sampleMarkersAwake}
            onSelect={setSelectedIndex}
            onToggleSampleMarkers={() => setSampleMarkersAwake((current) => !current)}
          />

          {!leftPanelVisible && (
            <button
              type="button"
              aria-label="Show trip panel"
              onClick={() => setLeftPanelVisible(true)}
              className="absolute left-4 top-4 z-30 rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:bg-white/10"
            >
              &gt;&gt; Trip
            </button>
          )}

          <div
            className={`pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-col gap-3 lg:inset-x-6 ${
              leftPanelVisible ? "" : "pl-32"
            }`}
          >
            <div className="flex flex-col items-end gap-3 min-[980px]:flex-row min-[980px]:items-start min-[980px]:justify-end">
              <MapControls
                units={units}
                mapPreset={mapPreset}
                legendVisible={legendVisible}
                comparisonVisible={comparisonVisible}
                insightsVisible={insightsVisible}
                onUnitsChange={handleUnitsChange}
                onToggleMapPreset={() => setMapPreset((current) => (current === "night" ? "day" : "night"))}
                onToggleLegend={() => setLegendVisible((current) => !current)}
                onToggleComparison={() =>
                  setComparisonVisible((current) => {
                    const next = !current;
                    setActiveMode(next ? "compare" : "drive");
                    return next;
                  })
                }
                onToggleInsights={() => setInsightsVisible((current) => !current)}
              />
            </div>
            <div className={`flex justify-center ${legendVisible ? "" : "hidden"}`}>
              <WeatherLegend />
            </div>
          </div>

          {comparisonVisible && (
            <div className="pointer-events-none absolute left-4 top-32 z-20 hidden lg:block xl:left-5">
              <RouteComparisonPanel
                routeOptions={routeOptions}
                hasRoute={Boolean(data)}
                samples={mapSamples}
                units={units}
                onClose={() => {
                  setComparisonVisible(false);
                  setActiveMode("drive");
                }}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 lg:inset-x-5">
            <BottomConditionBar samples={mapSamples} units={units} />
          </div>
        </section>

        {insightsVisible && (
          <RightInsightPanel
            samples={mapSamples}
            durationSeconds={data?.route.durationSeconds}
            distanceMeters={data?.route.distanceMeters}
            departAt={departAt}
            units={units}
            onSelectSample={setSelectedIndex}
          />
        )}

        {comparisonVisible && (
          <div className="lg:hidden">
            <RouteComparisonPanel
              routeOptions={routeOptions}
              hasRoute={Boolean(data)}
              samples={mapSamples}
              units={units}
              onClose={() => {
                setComparisonVisible(false);
                setActiveMode("drive");
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
