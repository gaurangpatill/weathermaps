"use client";

import { formatDistance, formatTemp, formatWind } from "@/lib/client/format";
import type { Units } from "@/lib/types";

interface SampleListItem {
  index: number;
  distanceFromStartMeters: number;
  etaISO: string;
  weather: {
    temp: number;
    windSpeed: number;
    condition: string;
    icon: string;
    precipProb: number;
    timestampISO: string;
  };
}

interface ResultsListProps {
  samples: SampleListItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  units: Units;
}

export default function ResultsList({ samples, selectedIndex, onSelect, units }: ResultsListProps) {
  return (
    <div className="space-y-2">
      {samples.map((sample) => {
        const isActive = selectedIndex === sample.index;
        const isUnavailable = sample.weather.condition.toLowerCase() === "unavailable";
        return (
          <button
            key={sample.index}
            type="button"
            onClick={() => onSelect(sample.index)}
            aria-current={isActive ? "true" : undefined}
            className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
              isActive
                ? "border-slate-900 bg-slate-50"
                : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold leading-5 text-slate-950">
                {formatDistance(sample.distanceFromStartMeters, units)}
              </span>
              <span className="text-xs font-medium text-slate-500">
                ETA {new Date(sample.etaISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className={`capitalize ${isUnavailable ? "text-slate-400" : "text-slate-700"}`}>
                {sample.weather.condition}
              </span>
              <span className="font-medium text-slate-800">{formatTemp(sample.weather.temp, units)}</span>
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Wind {formatWind(sample.weather.windSpeed, units)} · Precip {Math.round(sample.weather.precipProb * 100)}%
            </div>
          </button>
        );
      })}
      {samples.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-sm font-semibold text-slate-900">No route loaded</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Weather checkpoints will appear here after the route is calculated.
          </p>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              How it works
            </div>
            <ol className="mt-2 space-y-1.5 text-xs leading-5 text-slate-700">
              <li className="flex gap-2">
                <span className="font-semibold text-slate-950">1.</span>
                <span>Enter origin and destination</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-slate-950">2.</span>
                <span>Choose departure time</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-slate-950">3.</span>
                <span>View weather along your route</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
