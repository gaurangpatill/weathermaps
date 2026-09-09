"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LineString } from "@/lib/types";
import {
  buildWeatherRouteSegments,
  WEATHER_ROUTE_COLORS,
  weatherRouteColorForSample
} from "@/lib/weatherRouteSegments";

const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/standard";
const MAPBOX_STYLE_CONFIG = {
  basemap: {
    lightPreset: "night" as "day" | "night",
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

function emptyRouteFeature() {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: [] },
    properties: {}
  };
}

function emptyWeatherRouteSegments() {
  return {
    type: "FeatureCollection" as const,
    features: []
  };
}

function ensureRouteSourceAndLayer(map: mapboxgl.Map) {
  if (!isMapStyleReady(map)) return false;
  if (!map.getSource("route")) {
    map.addSource("route", {
      type: "geojson",
      data: emptyRouteFeature()
    });
  }
  if (!map.getSource("weather-route-segments")) {
    map.addSource("weather-route-segments", {
      type: "geojson",
      data: emptyWeatherRouteSegments()
    });
  }
  if (!map.getLayer("route-glow")) {
    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route",
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-blur": 8,
        "line-color": "#38bdf8",
        "line-opacity": 0.46,
        "line-width": 20
      }
    });
  }
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
        "line-color": "#020817",
        "line-width": 12,
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
        "line-color": "#93c5fd",
        "line-width": 9,
        "line-opacity": 0.28
      }
    });
  }
  if (!map.getLayer("weather-route-line")) {
    map.addLayer({
      id: "weather-route-line",
      type: "line",
      source: "weather-route-segments",
      layout: {
        "line-cap": "butt",
        "line-join": "round"
      },
      paint: {
        "line-color": [
          "match",
          ["get", "weatherCondition"],
          "clear",
          WEATHER_ROUTE_COLORS.clear,
          "cloudy",
          WEATHER_ROUTE_COLORS.cloudy,
          "rain",
          WEATHER_ROUTE_COLORS.rain,
          "storm",
          WEATHER_ROUTE_COLORS.storm,
          "snow",
          WEATHER_ROUTE_COLORS.snow,
          "mix",
          WEATHER_ROUTE_COLORS.mix,
          "fog",
          WEATHER_ROUTE_COLORS.fog,
          "wind",
          WEATHER_ROUTE_COLORS.wind,
          WEATHER_ROUTE_COLORS.unknown
        ],
        "line-width": 8,
        "line-opacity": 1
      }
    });
  }
  return true;
}

interface MapViewProps {
  route: LineString | null;
  mapPreset: "day" | "night";
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
  sampleMarkersAwake: boolean;
  onSelect: (index: number) => void;
  onToggleSampleMarkers: () => void;
}

export default function MapView({
  route,
  mapPreset,
  samples,
  selectedIndex,
  sampleMarkersAwake,
  onSelect,
  onToggleSampleMarkers
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialMapPresetRef = useRef(mapPreset);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const endpointMarkersRef = useRef<{ start?: mapboxgl.Marker; end?: mapboxgl.Marker }>({});
  const markerSetKeyRef = useRef("");
  const pendingFitRef = useRef(false);
  const syncRouteLayersRef = useRef<
    (map: mapboxgl.Map, options?: { fitRoute?: boolean }) => boolean
  >(() => false);
  const syncSampleMarkersRef = useRef<(map: mapboxgl.Map) => boolean>(() => false);
  const syncEndpointMarkersRef = useRef<(map: mapboxgl.Map) => boolean>(() => false);
  const flushMapStateRef = useRef<
    (map: mapboxgl.Map, options?: { fitRoute?: boolean }) => boolean
  >(() => false);
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
  const latestMapStateRef = useRef<{
    route: LineString | null;
    samples: MapViewProps["samples"];
    selectedIndex: number | null;
    sampleMarkersAwake: boolean;
    onSelect: (index: number) => void;
    weatherRouteSegments: typeof weatherRouteSegments;
  }>({ route, samples, selectedIndex, sampleMarkersAwake, onSelect, weatherRouteSegments });
  latestMapStateRef.current = {
    route,
    samples,
    selectedIndex,
    sampleMarkersAwake,
    onSelect,
    weatherRouteSegments
  };

  function isLngLat(coordinates: [number, number]) {
    const [lng, lat] = coordinates;
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
  }

  function fitRouteBounds(map: mapboxgl.Map, line: LineString) {
    if (line.coordinates.length <= 1) return;
    const bounds = line.coordinates.reduce(
      (b, coord) => b.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(
        line.coordinates[0] as [number, number],
        line.coordinates[0] as [number, number]
      )
    );
    map.fitBounds(bounds, { padding: 80, duration: 800 });
    lastFitRef.current = Date.now();
  }

  function syncRouteLayers(map: mapboxgl.Map, options: { fitRoute?: boolean } = {}) {
    if (!ensureRouteSourceAndLayer(map)) return false;
    const latest = latestMapStateRef.current;
    const routeSource = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    const weatherSource = map.getSource("weather-route-segments") as
      | mapboxgl.GeoJSONSource
      | undefined;

    if (routeSource) {
      routeSource.setData(
        latest.route
          ? {
              type: "Feature",
              geometry: latest.route,
              properties: {}
            }
          : emptyRouteFeature()
      );
    }
    if (weatherSource) {
      weatherSource.setData(
        (latest.route ? latest.weatherRouteSegments : emptyWeatherRouteSegments()) as Parameters<
          mapboxgl.GeoJSONSource["setData"]
        >[0]
      );
    }

    if (options.fitRoute && latest.route) {
      fitRouteBounds(map, latest.route);
      pendingFitRef.current = false;
    }
    map.triggerRepaint();
    return true;
  }

  function markerCode(condition: string) {
    const normalized = condition.toLowerCase();
    if (normalized.includes("snow") || normalized.includes("ice")) return "SN";
    if (normalized.includes("storm") || normalized.includes("thunder")) return "ST";
    if (normalized.includes("rain") || normalized.includes("drizzle")) return "RN";
    if (normalized.includes("fog")) return "FG";
    if (normalized.includes("wind")) return "WD";
    if (normalized.includes("cloud")) return "CL";
    return "OK";
  }

  function removeEndpointMarkers() {
    endpointMarkersRef.current.start?.remove();
    endpointMarkersRef.current.end?.remove();
    endpointMarkersRef.current = {};
  }

  function createEndpointMarker(kind: "start" | "end") {
    const el = document.createElement("div");
    el.className = `route-endpoint-pin route-endpoint-pin--${kind}`;
    const dot = document.createElement("span");
    dot.className = "route-endpoint-pin__dot";
    const label = document.createElement("span");
    label.className = "route-endpoint-pin__label";
    label.textContent = kind === "start" ? "Start" : "Finish";
    el.appendChild(dot);
    el.appendChild(label);
    return new mapboxgl.Marker({ element: el, anchor: "bottom" });
  }

  function syncEndpointMarkers(map: mapboxgl.Map) {
    const latest = latestMapStateRef.current;
    const coordinates = latest.route?.coordinates ?? [];
    const start = coordinates[0] as [number, number] | undefined;
    const end = coordinates[coordinates.length - 1] as [number, number] | undefined;

    if (!start || !end || !isLngLat(start) || !isLngLat(end)) {
      removeEndpointMarkers();
      return true;
    }

    if (!endpointMarkersRef.current.start) {
      endpointMarkersRef.current.start = createEndpointMarker("start").setLngLat(start).addTo(map);
    }
    if (!endpointMarkersRef.current.end) {
      endpointMarkersRef.current.end = createEndpointMarker("end").setLngLat(end).addTo(map);
    }
    endpointMarkersRef.current.start.setLngLat(start);
    endpointMarkersRef.current.end.setLngLat(end);
    return true;
  }

  function syncSampleMarkers(map: mapboxgl.Map) {
    if (!isMapStyleReady(map)) return false;
    const latest = latestMapStateRef.current;
    const existing = markersRef.current;

    if (!latest.sampleMarkersAwake || latest.samples.length === 0) {
      existing.forEach((marker) => marker.remove());
      existing.clear();
      markerSetKeyRef.current = "";
      map.triggerRepaint();
      return true;
    }

    const markerSetKey = latest.samples
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

    const nextIds = new Set(latest.samples.map((sample) => sample.index));
    Array.from(existing.entries()).forEach(([index, marker]) => {
      if (!nextIds.has(index)) {
        marker.remove();
        existing.delete(index);
      }
    });

    latest.samples.forEach((sample) => {
      let marker = existing.get(sample.index);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "route-sample-marker-shell";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "route-hazard-marker";
        button.setAttribute("aria-label", `Select weather sample ${sample.index + 1}`);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          latestMapStateRef.current.onSelect(sample.index);
        });
        el.appendChild(button);

        marker = new mapboxgl.Marker({ element: el }).setLngLat(sample.coordinates).addTo(map);
        existing.set(sample.index, marker);
      } else {
        marker.setLngLat(sample.coordinates);
      }
      const button = marker.getElement().querySelector<HTMLButtonElement>(".route-hazard-marker");
      if (button) {
        const isSelected = sample.index === latest.selectedIndex;
        button.className = "route-hazard-marker";
        button.textContent = markerCode(sample.weather.condition);
        button.style.setProperty("--route-sample-color", weatherRouteColorForSample(sample));
        button.classList.toggle("route-hazard-marker--selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      }
    });
    map.triggerRepaint();
    return true;
  }

  function flushMapState(map: mapboxgl.Map, options: { fitRoute?: boolean } = {}) {
    const syncedRoute = syncRouteLayers(map, options);
    const syncedMarkers = syncSampleMarkers(map);
    const syncedEndpoints = syncEndpointMarkers(map);
    return syncedRoute && syncedMarkers && syncedEndpoints;
  }
  syncRouteLayersRef.current = syncRouteLayers;
  syncSampleMarkersRef.current = syncSampleMarkers;
  syncEndpointMarkersRef.current = syncEndpointMarkers;
  flushMapStateRef.current = flushMapState;

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
      config: {
        basemap: {
          ...MAPBOX_STYLE_CONFIG.basemap,
          lightPreset: initialMapPresetRef.current
        }
      },
      center: [-98.5795, 39.8283],
      zoom: 3
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "imperial", maxWidth: 100 }), "bottom-left");
    const markReadyAndFlush = () => {
      if (!isMapStyleReady(map)) return;
      setMapLoaded(true);
      map.resize();
      flushMapStateRef.current(map, { fitRoute: pendingFitRef.current });
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
      setMapError(null);
    };

    map.on("load", () => {
      markReadyAndFlush();
    });
    map.on("styledata", () => {
      markReadyAndFlush();
    });
    map.on("idle", () => {
      markReadyAndFlush();
    });
    map.on("error", (event) => {
      const message =
        event?.error?.message ||
        "Map failed to load. Check NEXT_PUBLIC_MAPBOX_TOKEN and network access.";
      setMapError(message);
    });
    mapRef.current = map;

    loadCheckRef.current = window.setInterval(() => {
      markReadyAndFlush();
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
      removeEndpointMarkers();
      markerSetKeyRef.current = "";
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    try {
      map.setConfigProperty("basemap", "lightPreset", mapPreset);
    } catch {
      // Older Mapbox runtimes may ignore basemap config changes.
    }
  }, [mapPreset, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    pendingFitRef.current = Boolean(route);
    if (!map || !mapLoaded) return;
    const synced = syncRouteLayersRef.current(map, { fitRoute: Boolean(route) });
    syncEndpointMarkersRef.current(map);
    if (!synced) pendingFitRef.current = Boolean(route);
  }, [route, weatherRouteSegments, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    syncSampleMarkersRef.current(map);
  }, [samples, selectedIndex, sampleMarkersAwake, onSelect, mapLoaded]);

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
      <div className="flex h-full w-full items-center justify-center border border-dashed border-white/10 bg-slate-950 text-sm text-slate-400">
        Missing NEXT_PUBLIC_MAPBOX_TOKEN
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-dashed border-red-300/30 bg-red-950/30 px-6 text-center text-sm text-red-100">
        {mapError}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {samples.length > 0 && (
        <button
          type="button"
          aria-pressed={sampleMarkersAwake}
          onClick={onToggleSampleMarkers}
          className="absolute bottom-36 right-4 z-10 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200 shadow-xl shadow-black/25 backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/30 xl:bottom-32"
        >
          {sampleMarkersAwake ? "Hazards On" : "Hazards Off"}
        </button>
      )}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
          Loading map…
        </div>
      )}
    </div>
  );
}
