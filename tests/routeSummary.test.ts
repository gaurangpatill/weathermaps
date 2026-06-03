import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRouteSummary,
  conditionLabelForScore,
  rainRiskForSamples,
  windImpactForSamples,
  type RouteSummarySample
} from "../lib/routeSummary.ts";

function sample(overrides: Partial<RouteSummarySample["weather"]> = {}): RouteSummarySample {
  return {
    index: 0,
    etaISO: "2026-06-02T14:00:00.000Z",
    locationName: "Hartford, CT",
    weather: {
      temp: 21,
      windSpeed: 3,
      condition: "Clear",
      precipProb: 0.05,
      ...overrides
    }
  };
}

test("labels comfort scores transparently", () => {
  assert.equal(conditionLabelForScore(90), "Excellent");
  assert.equal(conditionLabelForScore(75), "Good");
  assert.equal(conditionLabelForScore(55), "Fair");
  assert.equal(conditionLabelForScore(35), "Poor");
});

test("calculates high comfort for mild clear route", () => {
  const summary = calculateRouteSummary([sample(), { ...sample(), index: 1 }]);

  assert.equal(summary.overallLabel, "Excellent");
  assert.ok(summary.comfortScore >= 85);
  assert.equal(summary.rainRisk, "Low");
  assert.equal(summary.windImpact, "Minimal");
});

test("detects poor worst segment from rain and strong wind", () => {
  const summary = calculateRouteSummary([
    sample(),
    { ...sample({ condition: "Rain", precipProb: 0.8, windSpeed: 14 }), index: 1 }
  ]);

  assert.equal(summary.rainRisk, "High");
  assert.equal(summary.windImpact, "Strong");
  assert.equal(summary.worstSegment?.sampleIndex, 1);
  assert.match(summary.worstSegment?.reason ?? "", /Rain|Wind/);
  assert.ok(summary.comfortScore < 85);
});

test("classifies route-level rain and wind risk", () => {
  const samples = [sample({ precipProb: 0.3, windSpeed: 8 })];

  assert.equal(rainRiskForSamples(samples), "Medium");
  assert.equal(windImpactForSamples(samples), "Moderate");
});
