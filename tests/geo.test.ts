import assert from "node:assert/strict";
import test from "node:test";
import { haversineMeters, sampleLineStringEveryMeters } from "../lib/geo.ts";

test("samples follow each segment of the route geometry instead of origin-destination diagonal", () => {
  const route = {
    type: "LineString" as const,
    coordinates: [
      [0, 0],
      [0, 1],
      [1, 1]
    ] as [number, number][]
  };
  const firstLegMeters = haversineMeters(route.coordinates[0], route.coordinates[1]);
  const samples = sampleLineStringEveryMeters(route, firstLegMeters);

  assert.equal(samples[1].coordinates[0], 0);
  assert.equal(samples[1].coordinates[1], 1);
  assert.notDeepEqual(samples[1].coordinates, [0.5, 0.5]);
});

test("limits samples while preserving route start and end coordinates", () => {
  const route = {
    type: "LineString" as const,
    coordinates: [
      [-122.42, 37.78],
      [-121.9, 37.33],
      [-121.49, 38.58],
      [-120.66, 35.28]
    ] as [number, number][]
  };
  const samples = sampleLineStringEveryMeters(route, 1000, 4);

  assert.equal(samples.length, 4);
  assert.deepEqual(samples[0].coordinates, route.coordinates[0]);
  assert.deepEqual(samples.at(-1)?.coordinates, route.coordinates.at(-1));
});
