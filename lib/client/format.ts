import type { Units } from "@/lib/types";

export function formatDistance(meters: number, units: Units) {
  if (units === "imperial") {
    return `${(meters / 1609.34).toFixed(1)} mi`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatTemp(celsius: number, units: Units) {
  if (units === "imperial") {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatWind(metersPerSecond: number, units: Units) {
  if (units === "imperial") {
    return `${Math.round(metersPerSecond * 2.23694)} mph`;
  }
  return `${Math.round(metersPerSecond * 3.6)} km/h`;
}

export function formatTripDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
