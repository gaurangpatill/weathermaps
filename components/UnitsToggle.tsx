"use client";

import type { Units } from "@/lib/types";

interface UnitsToggleProps {
  units: Units;
  isAuto: boolean;
  onChange: (units: Units) => void;
}

export default function UnitsToggle({ units, isAuto, onChange }: UnitsToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Units</span>
      <div className="inline-flex rounded-lg border border-slate-600 bg-slate-950 p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => onChange("metric")}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            units === "metric" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          Metric
        </button>
        <button
          type="button"
          onClick={() => onChange("imperial")}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            units === "imperial" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          Imperial
        </button>
      </div>
      {isAuto ? (
        <span className="text-xs text-slate-400">Auto</span>
      ) : (
        <span className="text-xs text-slate-500">Manual</span>
      )}
    </div>
  );
}
