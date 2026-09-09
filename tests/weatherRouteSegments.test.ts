import assert from "node:assert/strict";
import test from "node:test";
import { haversineMeters, lineStringLengthMeters } from "../lib/geo.ts";
import {
  buildWeatherRouteSegments,
  WEATHER_ROUTE_COLORS,
  weatherRouteColorForSample,
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

function assertCoordinateClose(actual: [number, number] | undefined, expected: [number, number]) {
  assert.ok(actual, "Expected coordinate to exist");
  assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001);
  assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001);
}

test("builds one colored route segment per weather sample along the actual route geometry", () => {
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

  assert.equal(segments.features.length, 3);
  assert.equal(segments.features[0].properties.sampleIndex, 0);
  assert.equal(segments.features[1].properties.sampleIndex, 1);
  assert.equal(segments.features[2].properties.sampleIndex, 2);
  assertCoordinateClose(segments.features[0].geometry.coordinates[0], [0, 0]);
  assertCoordinateClose(segments.features.at(-1)?.geometry.coordinates.at(-1), [1, 1]);
  assert.ok(
    segments.features[1].geometry.coordinates.some(
      (coordinate) => coordinate[0] === 0 && coordinate[1] === 1
    )
  );
  assert.equal(segments.features[0].properties.weatherCondition, "clear");
  assert.equal(segments.features[1].properties.weatherCondition, "rain");
  assert.equal(segments.features[2].properties.weatherCondition, "clear");
});

test("maps route colors to actual weather conditions", () => {
  const base = { index: 0, coordinates: [0, 0] as [number, number], distanceFromStartMeters: 0 };

  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Mostly Clear" }) }),
    "clear"
  );
  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Cloudy" }) }),
    "cloudy"
  );
  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Light Rain" }) }),
    "rain"
  );
  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Thunderstorm" }) }),
    "storm"
  );
  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Snow" }) }),
    "snow"
  );
  assert.equal(
    weatherRouteConditionForSample({ ...base, weather: weather({ condition: "Fog" }) }),
    "fog"
  );
});

test("uses the shared palette for route segments and markers", () => {
  const sample = {
    index: 0,
    coordinates: [0, 0] as [number, number],
    distanceFromStartMeters: 0,
    weather: weather({ condition: "Light Rain" })
  };

  assert.equal(weatherRouteColorForSample(sample), WEATHER_ROUTE_COLORS.rain);
  assert.equal(WEATHER_ROUTE_COLORS.rain, "#3b82f6");
});
