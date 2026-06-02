import type { Units } from "@/lib/types";

const UNITS_KEY = "weathermaps_units";

export function detectUnitsFromLocale(): Units {
  if (typeof navigator === "undefined") return "metric";
  const locale = navigator.language.toLowerCase();
  if (locale.startsWith("en-us") || locale.startsWith("en-lr") || locale.startsWith("en-mm")) {
    return "imperial";
  }
  return "metric";
}

export function getStoredUnits(): Units | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(UNITS_KEY);
  if (stored === "metric" || stored === "imperial") return stored;
  return null;
}

export function storeUnits(units: Units) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNITS_KEY, units);
}
