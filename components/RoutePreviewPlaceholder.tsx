"use client";

export default function RoutePreviewPlaceholder() {
  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Route Preview</h3>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          Distance, travel time, arrival, and weather checkpoints will appear here.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50">
        <div className="border-r border-slate-200 px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Time</div>
          <div className="mt-1 h-3 w-12 rounded bg-slate-200" />
        </div>
        <div className="border-r border-slate-200 px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Distance</div>
          <div className="mt-1 h-3 w-12 rounded bg-slate-200" />
        </div>
        <div className="px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Points</div>
          <div className="mt-1 h-3 w-8 rounded bg-slate-200" />
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">From</div>
            <div className="mt-1 h-3 w-4/5 rounded bg-slate-200" />
          </div>
        </div>
        <div className="ml-1 my-2 h-4 border-l border-dashed border-slate-300" />
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full border border-slate-900 bg-white" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">To</div>
            <div className="mt-1 h-3 w-3/4 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
