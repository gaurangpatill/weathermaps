"use client";

import { formatDistance, formatTripDuration } from "@/lib/client/format";
import type { Units } from "@/lib/types";

interface TripInfoPanelProps {
  originName: string;
  destinationName: string;
  departAtISO: string;
  durationSeconds: number;
  distanceMeters: number;
  sampleCount: number;
  units: Units;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TripInfoPanel({
  originName,
  destinationName,
  departAtISO,
  durationSeconds,
  distanceMeters,
  sampleCount,
  units
}: TripInfoPanelProps) {
  const departAt = new Date(departAtISO);
  const arriveAt = new Date(departAt.getTime() + durationSeconds * 1000);

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Route Overview</h3>
        <p className="mt-1 text-sm leading-5 text-slate-600">Driving route with weather checkpoints.</p>
      </div>

      <div className="mt-3 grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50">
        <div className="border-r border-slate-200 px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Time</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-950">
            {formatTripDuration(durationSeconds)}
          </div>
        </div>
        <div className="border-r border-slate-200 px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Distance</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-950">
            {formatDistance(distanceMeters, units)}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Points</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-950">{sampleCount}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Leave</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">{formatClock(departAt)}</div>
          <div className="text-xs text-slate-500">{formatDate(departAt)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Arrive</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">{formatClock(arriveAt)}</div>
          <div className="text-xs text-slate-500">{formatDate(arriveAt)}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="grid grid-cols-[18px_1fr] gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full border border-white bg-slate-900 shadow-sm" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">From</div>
            <div className="truncate text-sm font-medium leading-5 text-slate-900" title={originName}>
              {originName}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[18px_1fr] gap-3">
          <div className="ml-[4px] h-full min-h-4 border-l border-dashed border-slate-300" />
          <div />
        </div>
        <div className="grid grid-cols-[18px_1fr] gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full border border-slate-900 bg-white shadow-sm" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">To</div>
            <div className="truncate text-sm font-medium leading-5 text-slate-900" title={destinationName}>
              {destinationName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
