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
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Units</span>
      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        <button
          type="button"
          onClick={() => onChange("metric")}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            units === "metric" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Metric
        </button>
        <button
          type="button"
          onClick={() => onChange("imperial")}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            units === "imperial" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Imperial
        </button>
      </div>
      {isAuto ? (
        <span className="text-xs text-slate-500">Auto</span>
      ) : (
        <span className="text-xs text-slate-400">Manual</span>
      )}
    </div>
  );
}
