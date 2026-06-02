import assert from "node:assert/strict";
import test from "node:test";
import { formatDistance, formatTemp, formatTripDuration, formatWind } from "../lib/client/format.ts";

test("formats metric route weather values", () => {
  assert.equal(formatDistance(1500, "metric"), "1.5 km");
  assert.equal(formatTemp(21.4, "metric"), "21°C");
  assert.equal(formatWind(10, "metric"), "36 km/h");
});

test("formats imperial route weather values", () => {
  assert.equal(formatDistance(1609.34, "imperial"), "1.0 mi");
  assert.equal(formatTemp(0, "imperial"), "32°F");
  assert.equal(formatWind(10, "imperial"), "22 mph");
});

test("formats total trip duration", () => {
  assert.equal(formatTripDuration(29 * 60), "29 min");
  assert.equal(formatTripDuration(60 * 60), "1 hr");
  assert.equal(formatTripDuration(2 * 60 * 60 + 11 * 60), "2 hr 11 min");
});
