"use client";

import { useMemo } from "react";
import { formatTemp, formatWind } from "@/lib/client/format";
import { calculateRouteSummary, type RouteSummarySample } from "@/lib/routeSummary";
import type { Units } from "@/lib/types";

interface RouteSummaryPanelProps {
  samples: RouteSummarySample[];
  units: Units;
  onSelectSample: (index: number) => void;
}

function badgeClass(label: string) {
  if (label === "Excellent") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (label === "Good") return "border-blue-200 bg-blue-50 text-blue-800";
  if (label === "Fair") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export default function RouteSummaryPanel({ samples, units, onSelectSample }: RouteSummaryPanelProps) {
  const summary = useMemo(() => calculateRouteSummary(samples), [samples]);
  const worst = summary.worstSegment;

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Route Intelligence</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">{summary.recommendation}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(summary.overallLabel)}`}>
          {summary.overallLabel}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Comfort</div>
          <div className="mt-0.5 text-lg font-semibold leading-6 text-slate-950">
            {summary.comfortScore}
            <span className="text-xs font-medium text-slate-500"> / 100</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Temp Range</div>
          <div className="mt-0.5 text-sm font-semibold leading-6 text-slate-950">
            {formatTemp(summary.tempRange.min, units)} - {formatTemp(summary.tempRange.max, units)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Rain Risk</div>
          <div className="mt-0.5 text-sm font-semibold leading-6 text-slate-950">{summary.rainRisk}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Wind</div>
          <div className="mt-0.5 text-sm font-semibold leading-6 text-slate-950">{summary.windImpact}</div>
        </div>
      </div>

      {worst && (
        <button
          type="button"
          onClick={() => onSelectSample(worst.sampleIndex)}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Worst Segment
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-950">
                {worst.reason}
                {worst.locationName ? ` near ${worst.locationName}` : ""}
              </div>
            </div>
            <div className="text-xs font-medium text-slate-500">
              {new Date(worst.etaISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            {worst.weather.condition} · Precip {Math.round(worst.weather.precipProb * 100)}% · Wind{" "}
            {formatWind(worst.weather.windSpeed, units)} · {formatTemp(worst.weather.temp, units)}
          </div>
        </button>
      )}
    </div>
  );
}
