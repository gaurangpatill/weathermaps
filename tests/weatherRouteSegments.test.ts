import assert from "node:assert/strict";
import test from "node:test";
import { haversineMeters, lineStringLengthMeters } from "../lib/geo.ts";
import {
  buildWeatherRouteSegments,
  weatherRouteConditionForSample,
  type WeatherRouteSample
} from "../lib/weatherRouteSegments.ts";

function weather(overrides: Partial<WeatherRouteSample["weather"]> = {}) {
  return {
    temp: 20,
    windSpeed: 3,
    condition: "Clear",
    precipProb: 0.04,
    ...overrides
  };
}

test("builds colored route segments along the actual route geometry", () => {
  const route = {
    type: "LineString" as const,
    coordinates: [
      [0, 0],
      [0, 1],
      [1, 1]
    ] as [number, number][]
  };
  const firstLegMeters = haversineMeters(route.coordinates[0], route.coordinates[1]);
  const totalMeters = lineStringLengthMeters(route);
  const segments = buildWeatherRouteSegments(route, [
    {
      index: 0,
      coordinates: [0, 0],
      distanceFromStartMeters: 0,
      weather: weather()
    },
    {
      index: 1,
      coordinates: [0, 1],
      distanceFromStartMeters: firstLegMeters,
      weather: weather({ condition: "Rain", precipProb: 0.7 })
    },
    {
      index: 2,
      coordinates: [1, 1],
      distanceFromStartMeters: totalMeters,
      weather: weather()
    }
  ]);

  assert.equal(segments.features.length, 2);
  assert.deepEqual(segments.features[0].geometry.coordinates.at(-1), [0, 1]);
  assert.deepEqual(segments.features[1].geometry.coordinates[0], [0, 1]);
  assert.notDeepEqual(segments.features[0].geometry.coordinates.at(-1), [0.5, 0.5]);
  assert.equal(segments.features[0].properties.weatherCondition, "rain");
  assert.equal(segments.features[1].properties.weatherCondition, "clear");
});

test("maps route colors to actual weather conditions", () => {
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Mostly Clear" }) }), "clear");
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Cloudy" }) }), "cloudy");
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Light Rain" }) }), "rain");
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Thunderstorm" }) }), "storm");
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Snow" }) }), "snow");
  assert.equal(weatherRouteConditionForSample({ index: 0, coordinates: [0, 0], distanceFromStartMeters: 0, weather: weather({ condition: "Fog" }) }), "fog");
});
