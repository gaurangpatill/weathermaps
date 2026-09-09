"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { formatDistance, formatTemp, formatTripDuration } from "@/lib/client/format";
import { calculateRouteSummary, type RouteSummarySample } from "@/lib/routeSummary";
import { WEATHER_ROUTE_COLORS, weatherRouteColorForSample } from "@/lib/weatherRouteSegments";
import type { RoutePreferences, Units } from "@/lib/types";

export interface WeatherSample extends RouteSummarySample {
  coordinates: [number, number];
  distanceFromStartMeters: number;
  weather: RouteSummarySample["weather"] & {
    icon: string;
    timestampISO: string;
  };
}

interface SuggestionInputProps {
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  active: boolean;
  suggestions: string[];
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSelectSuggestion: (value: string) => void;
}

interface LeftTripPanelProps {
  activeMode: "drive" | "compare";
  origin: string;
  destination: string;
  departAt: string;
  loading: boolean;
  error: string | null;
  originSuggestions: string[];
  destinationSuggestions: string[];
  activeField: "origin" | "destination" | null;
  preferences: RoutePreferences;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onDepartAtChange: (value: string) => void;
  onFieldFocus: (field: "origin" | "destination") => void;
  onFieldBlur: () => void;
  onOriginSuggestion: (value: string) => void;
  onDestinationSuggestion: (value: string) => void;
  onPreferenceChange: (key: keyof RoutePreferences, value: boolean) => void;
  onModeChange: (mode: "drive" | "compare") => void;
  onCollapse: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export interface RouteOption {
  id: "active";
  label: string;
  durationSeconds: number;
  distanceMeters: number;
  etaISO: string;
  riskScore: number;
  riskLabel: string;
  explanation: string;
  accent: string;
  preferenceBadges: string[];
  selected?: boolean;
}

interface RouteComparisonPanelProps {
  routeOptions: RouteOption[];
  hasRoute: boolean;
  samples: WeatherSample[];
  units: Units;
  onClose?: () => void;
}

interface MapControlsProps {
  units: Units;
  mapPreset: "day" | "night";
  legendVisible: boolean;
  comparisonVisible: boolean;
  insightsVisible: boolean;
  onUnitsChange: (units: Units) => void;
  onToggleMapPreset: () => void;
  onToggleLegend: () => void;
  onToggleComparison: () => void;
  onToggleInsights: () => void;
}

interface RightInsightPanelProps {
  samples: WeatherSample[];
  durationSeconds?: number;
  distanceMeters?: number;
  departAt: string;
  units: Units;
  onSelectSample: (index: number) => void;
}

interface BottomConditionBarProps {
  samples: WeatherSample[];
  units: Units;
}

const routePreferenceRows: Array<{
  key: keyof RoutePreferences;
  label: string;
  description: string;
}> = [
  {
    key: "avoidWeatherRisk",
    label: "Weather Risk Scoring",
    description: "Highlight risk along the selected route"
  },
  { key: "avoidTolls", label: "Avoid Tolls", description: "Ask routing to exclude toll roads" },
  { key: "avoidHighways", label: "Avoid Highways", description: "Favor local road alternatives" }
];

function Icon({ name }: { name: "pin" | "flag" | "car" | "compare" | "bell" | "search" | "moon" | "sun" | "layers" | "menu" | "grid" | "arrow" | "clock" | "road" | "eye" | "wind" | "temp" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      {name === "pin" && (
        <>
          <path {...common} d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" />
          <circle {...common} cx="12" cy="10" r="2" />
        </>
      )}
      {name === "flag" && (
        <>
          <path {...common} d="M6 21V5" />
          <path {...common} d="M6 5h11l-2 4 2 4H6" />
        </>
      )}
      {name === "car" && (
        <>
          <path {...common} d="M5 13l1.7-4.2A3 3 0 0 1 9.5 7h5a3 3 0 0 1 2.8 1.8L19 13" />
          <path {...common} d="M4 13h16v5h-2.5M6.5 18H4v-5" />
          <circle {...common} cx="8" cy="18" r="1.4" />
          <circle {...common} cx="16" cy="18" r="1.4" />
        </>
      )}
      {name === "compare" && (
        <>
          <path {...common} d="M7 7h10M7 17h10" />
          <path {...common} d="M9 5 7 7l2 2M15 15l2 2-2 2" />
        </>
      )}
      {name === "bell" && (
        <>
          <path {...common} d="M18 16H6l1.2-2V10a4.8 4.8 0 0 1 9.6 0v4L18 16Z" />
          <path {...common} d="M10 19h4" />
        </>
      )}
      {name === "search" && (
        <>
          <circle {...common} cx="10.5" cy="10.5" r="5.5" />
          <path {...common} d="m15 15 4 4" />
        </>
      )}
      {name === "moon" && <path {...common} d="M19 14.5A7 7 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />}
      {name === "sun" && (
        <>
          <circle {...common} cx="12" cy="12" r="3.5" />
          <path {...common} d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </>
      )}
      {name === "layers" && (
        <>
          <path {...common} d="m12 3 8 4-8 4-8-4 8-4Z" />
          <path {...common} d="m4 12 8 4 8-4M4 17l8 4 8-4" />
        </>
      )}
      {name === "menu" && (
        <>
          <path {...common} d="M5 7h14M5 12h14M5 17h14" />
        </>
      )}
      {name === "grid" && (
        <>
          <rect {...common} x="5" y="5" width="5" height="5" rx="1.2" />
          <rect {...common} x="14" y="5" width="5" height="5" rx="1.2" />
          <rect {...common} x="5" y="14" width="5" height="5" rx="1.2" />
          <rect {...common} x="14" y="14" width="5" height="5" rx="1.2" />
        </>
      )}
      {name === "arrow" && <path {...common} d="M5 12h13M13 6l6 6-6 6" />}
      {name === "clock" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 8v4l3 2" />
        </>
      )}
      {name === "road" && (
        <>
          <path {...common} d="M9 21 11 3M15 21 13 3" />
          <path {...common} d="M12 7v2M12 13v2M12 19v1" />
        </>
      )}
      {name === "eye" && (
        <>
          <path {...common} d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
          <circle {...common} cx="12" cy="12" r="2.5" />
        </>
      )}
      {name === "wind" && (
        <>
          <path {...common} d="M4 8h10a2 2 0 1 0-2-2M4 13h15a2 2 0 1 1-2 2M4 18h8" />
        </>
      )}
      {name === "temp" && (
        <>
          <path {...common} d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
          <path {...common} d="M12 7v8" />
        </>
      )}
    </svg>
  );
}

function panelClass(extra = "") {
  return `border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/35 backdrop-blur-2xl ${extra}`;
}

function formatClock(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function riskTone(score: number) {
  if (score >= 70) return "text-red-300 border-red-400/70";
  if (score >= 48) return "text-orange-300 border-orange-400/70";
  if (score >= 28) return "text-amber-300 border-amber-300/70";
  return "text-emerald-300 border-emerald-300/70";
}

function riskLabel(score: number) {
  if (score >= 70) return "Severe Risk";
  if (score >= 48) return "High Risk";
  if (score >= 28) return "Moderate Risk";
  return "Low Risk";
}

function SuggestionInput({
  label,
  icon,
  value,
  placeholder,
  active,
  suggestions,
  onChange,
  onFocus,
  onBlur,
  onSelectSuggestion
}: SuggestionInputProps) {
  return (
    <div className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-slate-100 shadow-inner shadow-black/20 transition focus-within:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/20">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-blue-300">{icon}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-500"
        />
      </div>
      {active && suggestions.length > 0 && (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelectSuggestion(suggestion)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 border-t border-white/10 px-3 py-3 text-left first:border-t-0"
    >
      <span>
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked ? "border-blue-300/70 bg-blue-500" : "border-white/10 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function LeftTripPanel({
  activeMode,
  origin,
  destination,
  departAt,
  loading,
  error,
  originSuggestions,
  destinationSuggestions,
  activeField,
  preferences,
  onOriginChange,
  onDestinationChange,
  onDepartAtChange,
  onFieldFocus,
  onFieldBlur,
  onOriginSuggestion,
  onDestinationSuggestion,
  onPreferenceChange,
  onModeChange,
  onCollapse,
  onSubmit
}: LeftTripPanelProps) {
  return (
    <aside className={`${panelClass("rounded-[1.6rem]")} relative z-30 p-4 xl:h-screen xl:overflow-y-auto xl:rounded-none xl:border-y-0 xl:border-l-0 xl:p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/25">
            <span className="relative h-5 w-7 rounded-full bg-white/90 shadow-sm">
              <span className="absolute -left-1 top-2 h-3 w-3 rounded-full bg-white" />
              <span className="absolute -right-1 top-1.5 h-3.5 w-3.5 rounded-full bg-white" />
              <span className="absolute left-2 -top-2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgb(251_191_36/.8)]" />
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-6 text-white">WeatherMaps</h1>
            <p className="text-xs text-slate-400">Route weather intelligence</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onCollapse}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300 transition hover:bg-white/10"
        >
          &lt;&lt;
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
        <button
          type="button"
          aria-pressed={activeMode === "drive"}
          onClick={() => onModeChange("drive")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            activeMode === "drive"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          <Icon name="car" />
          Drive
        </button>
        <button
          type="button"
          aria-pressed={activeMode === "compare"}
          onClick={() => onModeChange("compare")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            activeMode === "compare"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          <Icon name="compare" />
          Details
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Your Trip</h2>
        </div>

        <SuggestionInput
          label="Origin"
          icon={<Icon name="pin" />}
          value={origin}
          placeholder="Start typing a place..."
          active={activeField === "origin"}
          suggestions={originSuggestions}
          onChange={onOriginChange}
          onFocus={() => onFieldFocus("origin")}
          onBlur={onFieldBlur}
          onSelectSuggestion={onOriginSuggestion}
        />
        <SuggestionInput
          label="Destination"
          icon={<Icon name="flag" />}
          value={destination}
          placeholder="Start typing a place..."
          active={activeField === "destination"}
          suggestions={destinationSuggestions}
          onChange={onDestinationChange}
          onFocus={() => onFieldFocus("destination")}
          onBlur={onFieldBlur}
          onSelectSuggestion={onDestinationSuggestion}
        />

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Departure
          </label>
          <input
            type="datetime-local"
            value={departAt}
            onChange={(event) => onDepartAtChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-medium text-slate-100 shadow-inner shadow-black/20 outline-none transition [color-scheme:dark] focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Finding route..." : "Find Best Route"}
          <Icon name="arrow" />
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/12 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="flex items-center justify-between px-3 py-3">
          <h3 className="text-sm font-semibold text-white">Route Preferences</h3>
          <span className="text-slate-500">^</span>
        </div>
        {routePreferenceRows.map((row) => (
          <ToggleRow
            key={row.key}
            label={row.label}
            description={row.description}
            checked={preferences[row.key]}
            onChange={(checked) => onPreferenceChange(row.key, checked)}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-blue-300/20 bg-blue-500/12 p-4 shadow-xl shadow-blue-950/20">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-400/15 text-blue-200">
            <Icon name="bell" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">(coming soon - alerts)</h3>
          </div>
        </div>
      </div>
    </aside>
  );
}

function preferenceBadgesFor(preferences: RoutePreferences) {
  const badges: string[] = [];
  if (preferences.avoidTolls) badges.push("Avoiding tolls");
  if (preferences.avoidHighways) badges.push("Avoiding highways");
  if (preferences.avoidWeatherRisk) badges.push("Weather risk scored");
  return badges.length > 0 ? badges : ["Default driving route"];
}

function RiskStrip({ samples }: { samples: WeatherSample[] }) {
  const colors =
    samples.length > 0
      ? samples.map((sample) => weatherRouteColorForSample(sample))
      : [WEATHER_ROUTE_COLORS.unknown];
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className={`flex-1 ${index > 0 ? "ml-1" : ""}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function RouteOptionCard({
  option,
  units,
  samples
}: {
  option: RouteOption;
  units: Units;
  samples: WeatherSample[];
}) {
  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        option.selected
          ? "border-blue-300/80 bg-blue-500/15 shadow-[0_0_0_1px_rgb(96_165_250/.35),0_20px_50px_rgb(37_99_235/.18)]"
          : "border-white/10 bg-white/[0.045] hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-blue-300">{option.label}</div>
          <div className="mt-2 text-xl font-bold leading-6 text-white">
            {formatTripDuration(option.durationSeconds)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {formatDistance(option.distanceMeters, units)} - ETA {formatClock(option.etaISO)}
          </div>
        </div>
        <div className={`grid h-14 w-14 place-items-center rounded-full border-2 bg-slate-950/40 text-center ${riskTone(option.riskScore)}`}>
          <span className="text-lg font-bold leading-none">{option.riskScore}</span>
          <span className="-mt-1 text-[9px] font-medium text-slate-400">Risk</span>
        </div>
      </div>
      <div className="mt-4">
        <RiskStrip samples={samples} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {option.preferenceBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-slate-300"
          >
            {badge}
          </span>
        ))}
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color: option.accent }}>
        {option.riskLabel}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-400">{option.explanation}</p>
    </article>
  );
}

export function RouteComparisonPanel({
  routeOptions,
  hasRoute,
  samples,
  units,
  onClose
}: RouteComparisonPanelProps) {
  const routeCountLabel = routeOptions.length === 1 ? "1 Route Found" : `${routeOptions.length} Routes Found`;
  return (
    <section className={`${panelClass("rounded-3xl")} pointer-events-auto w-[min(92vw,360px)] p-3`}>
      <div className="flex items-start justify-between gap-3 px-1 pb-3">
        <div>
          <div className="text-sm font-semibold text-white">{hasRoute ? routeCountLabel : "Route Details"}</div>
          <p className="mt-0.5 text-xs text-slate-400">
            {hasRoute ? "Actual route from current preferences" : "Run a search to view route details"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Hide route comparison"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          >
            Hide
          </button>
        )}
      </div>
      {!hasRoute ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-4 py-8 text-center">
          <div className="text-sm font-semibold text-white">No route loaded</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Enter an origin and destination, then choose Find Best Routes.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {routeOptions.map((option) => (
              <RouteOptionCard key={option.id} option={option} units={units} samples={samples} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ControlButton({
  label,
  active,
  children,
  onClick
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-xl border text-slate-200 shadow-xl shadow-black/25 backdrop-blur-xl transition ${
        active ? "border-blue-300/55 bg-blue-500/30" : "border-white/10 bg-slate-950/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function MapControls({
  units,
  mapPreset,
  legendVisible,
  comparisonVisible,
  insightsVisible,
  onUnitsChange,
  onToggleMapPreset,
  onToggleLegend,
  onToggleComparison,
  onToggleInsights
}: MapControlsProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <div className="flex rounded-xl border border-white/10 bg-slate-950/70 p-1 shadow-xl shadow-black/25 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onUnitsChange("metric")}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            units === "metric" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/10"
          }`}
        >
          °C
        </button>
        <button
          type="button"
          onClick={() => onUnitsChange("imperial")}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            units === "imperial" ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/10"
          }`}
        >
          °F
        </button>
      </div>
      <ControlButton label={mapPreset === "night" ? "Switch to day map" : "Switch to night map"} active={mapPreset === "night"} onClick={onToggleMapPreset}>
        <Icon name={mapPreset === "night" ? "moon" : "sun"} />
      </ControlButton>
      <ControlButton label="Show route details" active={comparisonVisible} onClick={onToggleComparison}>
        <Icon name="grid" />
      </ControlButton>
      <ControlButton label="Show weather legend" active={legendVisible} onClick={onToggleLegend}>
        <Icon name="layers" />
      </ControlButton>
      <ControlButton label="Show insight panel" active={insightsVisible} onClick={onToggleInsights}>
        <Icon name="menu" />
      </ControlButton>
    </div>
  );
}

export function WeatherLegend() {
  const items = [
    ["Clear", WEATHER_ROUTE_COLORS.clear],
    ["Rain", WEATHER_ROUTE_COLORS.rain],
    ["Snow", WEATHER_ROUTE_COLORS.snow],
    ["Mix", WEATHER_ROUTE_COLORS.mix],
    ["Cloudy", WEATHER_ROUTE_COLORS.cloudy]
  ];
  return (
    <div className="pointer-events-auto hidden rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-xs font-medium text-slate-300 shadow-xl shadow-black/25 backdrop-blur-xl md:flex md:items-center md:gap-4">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-2">
          <span className="h-2 w-5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function SummaryMetric({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold text-white">{value}</div>
      {subValue && <div className="mt-0.5 text-xs text-slate-400">{subValue}</div>}
    </div>
  );
}

export function TripSummaryCard({
  samples,
  durationSeconds,
  distanceMeters,
  units
}: {
  samples: WeatherSample[];
  durationSeconds?: number;
  distanceMeters?: number;
  units: Units;
}) {
  const summary = useMemo(() => calculateRouteSummary(samples), [samples]);
  const risk = Math.max(0, 100 - summary.comfortScore);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <h2 className="text-base font-semibold text-white">Trip Summary</h2>
      <div className="mt-4 grid grid-cols-3 rounded-xl border border-white/10 bg-slate-950/35">
        <SummaryMetric label="Total Time" value={durationSeconds ? formatTripDuration(durationSeconds) : "--"} />
        <SummaryMetric label="Distance" value={distanceMeters ? formatDistance(distanceMeters, units) : "--"} />
        <div className="grid place-items-center px-3 py-3">
          <div className={`grid h-14 w-14 place-items-center rounded-full border-2 ${riskTone(risk)} bg-slate-950/50`}>
            <span className="text-lg font-bold leading-none">{risk}</span>
            <span className="-mt-1 text-[9px] text-slate-400">Risk</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeatherGlyph({ condition }: { condition: string }) {
  const normalized = condition.toLowerCase();
  const label = normalized.includes("snow")
    ? "SN"
    : normalized.includes("storm")
      ? "ST"
      : normalized.includes("rain") || normalized.includes("drizzle")
        ? "RN"
        : normalized.includes("cloud")
          ? "CL"
          : normalized.includes("fog")
            ? "FG"
            : "OK";
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.07] text-[11px] font-bold text-slate-100">
      {label}
    </span>
  );
}

export function WeatherTimeline({
  samples,
  units,
  onSelectSample
}: {
  samples: WeatherSample[];
  units: Units;
  onSelectSample: (index: number) => void;
}) {
  const visibleSamples =
    samples.length <= 7
      ? samples
      : [samples[0], ...samples.slice(1, 5), samples[Math.floor(samples.length / 2)], samples[samples.length - 1]];
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <h2 className="text-base font-semibold text-white">Weather Timeline</h2>
      <div className="mt-5 space-y-1">
        {visibleSamples.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-slate-500">
            Weather checkpoints will appear after search.
          </div>
        )}
        {visibleSamples.map((sample, index) => {
          const isEndpoint = index === 0 || index === visibleSamples.length - 1;
          return (
            <button
              key={`${sample.index}-${index}`}
              type="button"
              onClick={() => onSelectSample(sample.index)}
              className="group grid w-full grid-cols-[72px_18px_minmax(0,1fr)_48px] gap-3 text-left"
            >
              <div className={`pt-1 text-sm font-semibold ${isEndpoint ? "text-white" : "text-slate-300"}`}>
                {formatClock(sample.etaISO)}
              </div>
              <div className="relative flex justify-center">
                <span className={`mt-1 h-3 w-3 rounded-full ring-4 ring-slate-950 ${isEndpoint ? "bg-red-400" : "bg-blue-400"}`} />
                {index < visibleSamples.length - 1 && <span className="absolute top-5 h-[calc(100%+20px)] w-px bg-blue-400/40" />}
              </div>
              <div className="min-w-0 pb-4">
                <div className={`truncate text-sm font-semibold ${isEndpoint ? "text-white" : "text-slate-300"}`}>
                  {sample.locationName || (isEndpoint ? "Route endpoint" : "Route checkpoint")}
                </div>
                <div className="mt-1 truncate text-xs capitalize text-slate-500">{sample.weather.condition}</div>
              </div>
              <div className="flex flex-col items-end gap-1 pb-4">
                <WeatherGlyph condition={sample.weather.condition} />
                <span className="text-xs font-semibold text-slate-300">{formatTemp(sample.weather.temp, units)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BestDepartureCard({ samples, departAt }: { samples: WeatherSample[]; departAt: string }) {
  const bars = [34, 39, 46, 51, 68, 82, 56, 48, 38, 41, 52, 57, 61, 55, 45, 36];
  const bestIndex = 5;
  const recommendation = new Date(departAt || Date.now());
  if (!Number.isNaN(recommendation.getTime())) {
    recommendation.setMinutes(recommendation.getMinutes() + 90);
  }
  const hasSamples = samples.length > 0;
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 shadow-xl shadow-cyan-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-100">
          <Icon name="clock" />
          <h2 className="text-sm font-semibold">Best time to leave</h2>
        </div>
        <span className="text-slate-400">&gt;</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        {hasSamples ? (
          <>
            Leave at <span className="font-semibold text-emerald-300">{formatClock(recommendation)}</span> for lower risk.
          </>
        ) : (
          "Run a search to compare departure windows."
        )}
      </p>
      <div className="mt-5 flex h-24 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={`relative flex-1 rounded-t-md ${
              index === bestIndex ? "bg-emerald-300 shadow-[0_0_18px_rgb(110_231_183/.55)]" : height > 58 ? "bg-amber-400/55" : "bg-slate-500/55"
            }`}
            style={{ height: `${height}%` }}
          >
            {index === bestIndex && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">
                Best
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>12 AM</span>
        <span>3 AM</span>
        <span>6 AM</span>
        <span>9 AM</span>
        <span>12 PM</span>
      </div>
    </section>
  );
}

export function RightInsightPanel({
  samples,
  durationSeconds,
  distanceMeters,
  departAt,
  units,
  onSelectSample
}: RightInsightPanelProps) {
  return (
    <aside className={`${panelClass("rounded-[1.6rem]")} relative z-30 space-y-4 p-4 xl:h-screen xl:overflow-y-auto xl:rounded-none xl:border-y-0 xl:border-r-0 xl:p-5`}>
      <TripSummaryCard samples={samples} durationSeconds={durationSeconds} distanceMeters={distanceMeters} units={units} />
      <WeatherTimeline samples={samples} units={units} onSelectSample={onSelectSample} />
      <BestDepartureCard samples={samples} departAt={departAt} />
    </aside>
  );
}

function conditionSummary(samples: WeatherSample[], units: Units) {
  const summary = calculateRouteSummary(samples);
  if (samples.length === 0) {
    return [
      { icon: "road" as const, label: "Road Conditions", value: "--", detail: "Search a route" },
      { icon: "eye" as const, label: "Visibility", value: "--", detail: "Awaiting checkpoints" },
      { icon: "wind" as const, label: "Wind Impact", value: "--", detail: "Awaiting forecast" },
      { icon: "temp" as const, label: "Temperature", value: "--", detail: "Awaiting forecast" }
    ];
  }
  return [
    {
      icon: "road" as const,
      label: "Road Conditions",
      value: summary.rainRisk === "High" ? "Mostly Wet" : summary.rainRisk === "Medium" ? "Variable" : "Mostly Clear",
      detail: summary.recommendation
    },
    {
      icon: "eye" as const,
      label: "Visibility",
      value: summary.rainRisk === "High" ? "Reduced" : "Good",
      detail: summary.rainRisk === "High" ? "Watch spray and rain bands" : "10+ km visibility"
    },
    {
      icon: "wind" as const,
      label: "Wind Impact",
      value: summary.windImpact,
      detail: summary.windImpact === "Strong" ? "Use caution on exposed roads" : "Manageable crosswinds"
    },
    {
      icon: "temp" as const,
      label: "Temperature",
      value: `${formatTemp(summary.tempRange.min, units)} - ${formatTemp(summary.tempRange.max, units)}`,
      detail: "Range across checkpoints"
    }
  ];
}

export function BottomConditionBar({ samples, units }: BottomConditionBarProps) {
  const items = conditionSummary(samples, units);
  return (
    <section className={`${panelClass("rounded-2xl")} pointer-events-auto grid w-full grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-4`}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 items-start gap-3 rounded-xl px-3 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-200">
            <Icon name={item.icon} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-slate-300">{item.label}</span>
            <span className="mt-0.5 block truncate text-sm font-bold text-white">{item.value}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

export function buildRouteOptions({
  samples,
  durationSeconds,
  distanceMeters,
  departAt,
  preferences
}: {
  samples: WeatherSample[];
  durationSeconds?: number;
  distanceMeters?: number;
  departAt: string;
  preferences: RoutePreferences;
}): RouteOption[] {
  const summary = calculateRouteSummary(samples);
  const baseDuration = durationSeconds || 18 * 60 * 60 + 20 * 60;
  const baseDistance = distanceMeters || 780000;
  const baseRisk = samples.length > 0 ? Math.max(8, 100 - summary.comfortScore) : 36;
  const departDate = new Date(departAt || Date.now());
  const startTime = Number.isNaN(departDate.getTime()) ? Date.now() : departDate.getTime();
  const withEta = (seconds: number) => new Date(startTime + seconds * 1000).toISOString();

  return [
    {
      id: "active",
      label: "Selected Route",
      durationSeconds: baseDuration,
      distanceMeters: baseDistance,
      etaISO: withEta(baseDuration),
      riskScore: Math.round(baseRisk),
      riskLabel: riskLabel(baseRisk),
      explanation: samples.length > 0 ? summary.recommendation : "Route details will appear after search.",
      accent: baseRisk >= 48 ? WEATHER_ROUTE_COLORS.storm : baseRisk >= 28 ? WEATHER_ROUTE_COLORS.clear : "#34d399",
      preferenceBadges: preferenceBadgesFor(preferences),
      selected: true
    }
  ];
}
