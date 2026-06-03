"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LineString } from "@/lib/types";
import { buildWeatherRouteSegments } from "@/lib/weatherRouteSegments";

const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/standard";
const MAPBOX_STYLE_CONFIG = {
  basemap: {
    lightPreset: "day",
    showPointOfInterestLabels: true,
    showRoadLabels: true,
    showPlaceLabels: true,
    showTransitLabels: false
  }
};

function isMapStyleReady(map: mapboxgl.Map) {
  try {
    return map.isStyleLoaded();
  } catch {
    return false;
  }
}

interface MapViewProps {
  route: LineString | null;
  samples: {
    coordinates: [number, number];
    index: number;
    distanceFromStartMeters: number;
    weather: {
      temp: number;
      windSpeed: number;
      condition: string;
      precipProb: number;
    };
  }[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export default function MapView({ route, samples, selectedIndex, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const markerSetKeyRef = useRef("");
  const [tokenMissing, setTokenMissing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const loadTimeoutRef = useRef<number | null>(null);
  const loadCheckRef = useRef<number | null>(null);
  const lastFitRef = useRef<number>(0);

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.index === selectedIndex),
    [samples, selectedIndex]
  );
  const weatherRouteSegments = useMemo(
    () => buildWeatherRouteSegments(route, samples),
    [route, samples]
  );

  function isLngLat(coordinates: [number, number]) {
    const [lng, lat] = coordinates;
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
  }

  function markerConditionClass(condition?: string) {
    const normalized = condition?.toLowerCase() ?? "";
    if (normalized.includes("thunder") || normalized.includes("storm")) return "route-sample-marker--storm";
    if (normalized.includes("rain") || normalized.includes("drizzle")) return "route-sample-marker--rain";
    if (normalized.includes("snow") || normalized.includes("ice")) return "route-sample-marker--snow";
    if (normalized.includes("clear")) return "route-sample-marker--clear";
    if (normalized.includes("fog") || normalized.includes("mist") || normalized.includes("haze")) return "route-sample-marker--fog";
    if (normalized.includes("cloud") || normalized.includes("fog")) return "route-sample-marker--cloud";
    return "route-sample-marker--neutral";
  }

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const markers = markersRef.current;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (!token) {
      setTokenMissing(true);
      return;
    }
    mapboxgl.accessToken = token;
    if (!mapboxgl.supported()) {
      setMapError("Mapbox GL is not supported in this browser/environment.");
      return;
    }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE_URL,
      config: MAPBOX_STYLE_CONFIG,
      center: [-98.5795, 39.8283],
      zoom: 3
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "imperial", maxWidth: 100 }), "bottom-left");
    const ensureRouteSourceAndLayer = () => {
      if (!isMapStyleReady(map)) return;
      if (!map.getSource("route")) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: [] },
            properties: {}
          }
        });
      }
      if (!map.getSource("weather-route-segments")) {
        map.addSource("weather-route-segments", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        });
      }
      // Add casing before the main route so the path stays legible over roads, labels, parks, and water.
      if (!map.getLayer("route-casing")) {
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#ffffff",
            "line-width": 8,
            "line-opacity": 0.92
          }
        });
      }
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#0f3d63",
            "line-width": 4,
            "line-opacity": 0.38
          }
        });
      }
      if (!map.getLayer("weather-route-line")) {
        map.addLayer({
          id: "weather-route-line",
          type: "line",
          source: "weather-route-segments",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": [
              "match",
              ["get", "weatherCondition"],
              "clear",
              "#f59e0b",
              "cloudy",
              "#64748b",
              "rain",
              "#5b7c99",
              "storm",
              "#7f1d1d",
              "snow",
              "#06b6d4",
              "fog",
              "#94a3b8",
              "wind",
              "#0f766e",
              "#334155"
            ],
            "line-width": 5.5,
            "line-opacity": 0.98
          }
        });
      }
    };

    map.on("load", () => {
      map.resize();
      ensureRouteSourceAndLayer();
      if (isMapStyleReady(map)) {
        setMapLoaded(true);
        if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
        if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
        setMapError(null);
      }
    });
    map.on("styledata", () => {
      if (isMapStyleReady(map)) {
        setMapLoaded(true);
        map.resize();
        if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
        if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
        setMapError(null);
        ensureRouteSourceAndLayer();
      }
    });
    map.on("error", (event) => {
      const message =
        event?.error?.message ||
        "Map failed to load. Check NEXT_PUBLIC_MAPBOX_TOKEN and network access.";
      setMapError(message);
    });
    mapRef.current = map;

    loadCheckRef.current = window.setInterval(() => {
      if (isMapStyleReady(map)) {
        setMapLoaded(true);
        map.resize();
        ensureRouteSourceAndLayer();
        if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
      }
    }, 500);

    loadTimeoutRef.current = window.setTimeout(() => {
      if (!isMapStyleReady(map)) {
        setMapError(
          "Map failed to load (timeout). Check NEXT_PUBLIC_MAPBOX_TOKEN and Mapbox network requests."
        );
      }
    }, 6000);

    return () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!isMapStyleReady(map)) return;
    const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        geometry: route ?? { type: "LineString", coordinates: [] },
        properties: {}
      });
    }

    if (route && route.coordinates.length > 1) {
      const bounds = route.coordinates.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(
          route.coordinates[0] as [number, number],
          route.coordinates[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 80, duration: 800 });
      lastFitRef.current = Date.now();
    }
  }, [route, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isMapStyleReady(map)) return;

    const weatherSource = map.getSource("weather-route-segments") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (weatherSource) {
      weatherSource.setData(
        weatherRouteSegments as unknown as Parameters<mapboxgl.GeoJSONSource["setData"]>[0]
      );
    }
  }, [weatherRouteSegments, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!isMapStyleReady(map)) return;

    const existing = markersRef.current;
    const markerSetKey = samples
      .map(
        (sample) =>
          `${sample.index}:${sample.coordinates[0].toFixed(5)},${sample.coordinates[1].toFixed(5)}`
      )
      .join("|");

    if (markerSetKeyRef.current !== markerSetKey) {
      existing.forEach((marker) => marker.remove());
      existing.clear();
      markerSetKeyRef.current = markerSetKey;
    }

    const nextIds = new Set(samples.map((sample) => sample.index));

    Array.from(existing.entries()).forEach(([index, marker]) => {
      if (!nextIds.has(index)) {
        marker.remove();
        existing.delete(index);
      }
    });

    samples.forEach((sample) => {
      let marker = existing.get(sample.index);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "route-sample-marker-shell";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "route-sample-marker";
        button.setAttribute("aria-label", `Select weather sample ${sample.index + 1}`);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(sample.index);
        });
        el.appendChild(button);

        marker = new mapboxgl.Marker({ element: el }).setLngLat(sample.coordinates).addTo(map);
        existing.set(sample.index, marker);
      } else {
        marker.setLngLat(sample.coordinates);
      }
      const button = marker.getElement().querySelector<HTMLButtonElement>(".route-sample-marker");
      if (button) {
        const isSelected = sample.index === selectedIndex;
        button.className = `route-sample-marker ${markerConditionClass(sample.weather.condition)}`;
        button.classList.toggle("route-sample-marker--selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      }
    });
    map.triggerRepaint();
  }, [samples, selectedIndex, onSelect, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSample || !mapLoaded || !isLngLat(selectedSample.coordinates)) return;
    map.flyTo({
      center: selectedSample.coordinates,
      zoom: Math.max(map.getZoom(), 8),
      duration: 700,
      essential: true
    });
  }, [selectedSample, mapLoaded]);

  if (tokenMissing) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
        Missing NEXT_PUBLIC_MAPBOX_TOKEN
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50 px-6 text-center text-sm text-rose-700">
        {mapError}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-lg">
      <div ref={containerRef} className="absolute inset-0 rounded-lg" />
      {weatherRouteSegments.features.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-2 text-[11px] font-medium text-slate-700 shadow-sm">
          <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
            Route weather
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#f59e0b]" />
              Clear
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#64748b]" />
              Cloudy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#5b7c99]" />
              Rain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#7f1d1d]" />
              Storm
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#06b6d4]" />
              Snow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#94a3b8]" />
              Fog
            </span>
          </div>
        </div>
      )}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white text-sm text-slate-500">
          Loading map…
        </div>
      )}
    </div>
  );
}
