"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LineString } from "@/lib/types";

interface MapViewProps {
  route: LineString | null;
  samples: { coordinates: [number, number]; index: number }[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export default function MapView({ route, samples, selectedIndex, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
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

  function isLngLat(coordinates: [number, number]) {
    const [lng, lat] = coordinates;
    return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
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
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-98.5795, 39.8283],
      zoom: 3
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    const ensureRouteSourceAndLayer = () => {
      if (!map.getStyle()) return;
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
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#111827",
            "line-width": 5
          }
        });
      }
    };

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
      ensureRouteSourceAndLayer();
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
      setMapError(null);
    });
    map.on("styledata", () => {
      if (map.isStyleLoaded()) {
        setMapLoaded(true);
        map.resize();
        if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
        if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
        setMapError(null);
      }
      if (map.isStyleLoaded()) {
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
      if (map.isStyleLoaded()) {
        setMapLoaded(true);
        map.resize();
        if (loadCheckRef.current) window.clearInterval(loadCheckRef.current);
      }
    }, 500);

    loadTimeoutRef.current = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
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
    if (!map || !route || !mapLoaded) return;

    if (!map.getStyle()) return;
    const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        geometry: route,
        properties: {}
      });
    }

    if (route.coordinates.length > 1) {
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
    if (!map || !mapLoaded) return;

    if (!map.getStyle()) return;

    const existing = markersRef.current;
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
        button.classList.toggle("route-sample-marker--selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      }
    });
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
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white text-sm text-slate-500">
          Loading map…
        </div>
      )}
    </div>
  );
}
