export type OverallConditionLabel = "Excellent" | "Good" | "Fair" | "Poor";
export type RainRisk = "Low" | "Medium" | "High";
export type WindImpact = "Minimal" | "Moderate" | "Strong";

export interface SummaryWeatherPoint {
  temp: number;
  windSpeed: number;
  condition: string;
  precipProb: number;
}

export interface RouteSummarySample {
  index: number;
  etaISO: string;
  locationName?: string;
  weather: SummaryWeatherPoint;
}

export interface RouteSummaryOptions {
  departureOffsetMinutes?: number;
}

export interface WorstSegment {
  sampleIndex: number;
  locationName?: string;
  etaISO: string;
  weather: SummaryWeatherPoint;
  score: number;
  reason: string;
}

export interface RouteSummary {
  overallLabel: OverallConditionLabel;
  comfortScore: number;
  rainRisk: RainRisk;
  windImpact: WindImpact;
  tempRange: { min: number; max: number };
  recommendation: string;
  worstSegment: WorstSegment | null;
}

function conditionPenalty(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes("thunder") || normalized.includes("storm")) return 35;
  if (normalized.includes("snow") || normalized.includes("ice")) return 28;
  if (normalized.includes("rain") || normalized.includes("drizzle")) return 18;
  if (normalized.includes("fog")) return 10;
  if (normalized.includes("unavailable") || normalized.includes("unknown")) return 20;
  if (normalized.includes("cloud")) return 3;
  return 0;
}

function windPenalty(metersPerSecond: number) {
  if (metersPerSecond >= 16) return 30;
  if (metersPerSecond >= 10) return 18;
  if (metersPerSecond >= 6) return 8;
  return 0;
}

function tempPenalty(celsius: number) {
  if (celsius < -5 || celsius > 35) return 25;
  if (celsius < 0 || celsius > 30) return 16;
  if (celsius < 5 || celsius > 27) return 8;
  return 0;
}

function precipPenalty(precipProb: number) {
  return Math.min(35, Math.max(0, precipProb) * 35);
}

function sampleSeverity(sample: RouteSummarySample) {
  const precip = precipPenalty(sample.weather.precipProb);
  const wind = windPenalty(sample.weather.windSpeed);
  const temp = tempPenalty(sample.weather.temp);
  const condition = conditionPenalty(sample.weather.condition);
  const score = Math.min(100, Math.round(precip + wind + temp + condition));

  const reasons = [
    { label: "Rain risk", value: precip },
    { label: "Wind impact", value: wind },
    { label: "Temperature exposure", value: temp },
    { label: sample.weather.condition, value: condition }
  ].sort((a, b) => b.value - a.value);

  return {
    score,
    reason: reasons[0]?.value > 0 ? reasons[0].label : "Most favorable segment"
  };
}

export function conditionLabelForScore(score: number): OverallConditionLabel {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

export function rainRiskForSamples(samples: RouteSummarySample[]): RainRisk {
  const maxPrecip = Math.max(...samples.map((sample) => sample.weather.precipProb), 0);
  const hasRainCondition = samples.some((sample) => {
    const condition = sample.weather.condition.toLowerCase();
    return condition.includes("rain") || condition.includes("storm") || condition.includes("drizzle");
  });
  if (maxPrecip >= 0.6 || (maxPrecip >= 0.4 && hasRainCondition)) return "High";
  if (maxPrecip >= 0.25 || hasRainCondition) return "Medium";
  return "Low";
}

export function windImpactForSamples(samples: RouteSummarySample[]): WindImpact {
  const maxWind = Math.max(...samples.map((sample) => sample.weather.windSpeed), 0);
  if (maxWind >= 12) return "Strong";
  if (maxWind >= 7) return "Moderate";
  return "Minimal";
}

function recommendationFor(summary: Omit<RouteSummary, "recommendation">) {
  const worst = summary.worstSegment;
  if (!worst) return "Enter a route to evaluate weather along the drive.";

  const place = worst.locationName ? ` near ${worst.locationName}` : "";
  const time = new Date(worst.etaISO).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (summary.overallLabel === "Excellent") {
    return "Excellent conditions overall. The route looks comfortable across the sampled checkpoints.";
  }
  if (summary.overallLabel === "Good") {
    return `Good conditions overall. ${worst.reason} is most notable${place} around ${time}, but most of the route looks comfortable.`;
  }
  if (summary.overallLabel === "Fair") {
    return `Fair conditions. Watch for ${worst.reason.toLowerCase()}${place} around ${time}.`;
  }
  return `Poor conditions. ${worst.reason} is the main issue${place} around ${time}.`;
}

export function calculateRouteSummary(
  samples: RouteSummarySample[],
  options: RouteSummaryOptions = {}
): RouteSummary {
  if (samples.length === 0) {
    return {
      overallLabel: "Excellent",
      comfortScore: 100,
      rainRisk: "Low",
      windImpact: "Minimal",
      tempRange: { min: 0, max: 0 },
      recommendation: "Enter a route to evaluate weather along the drive.",
      worstSegment: null
    };
  }

  const departureOffsetMinutes = options.departureOffsetMinutes ?? 0;
  const severities = samples.map((sample) => ({ sample, ...sampleSeverity(sample) }));
  const averageSeverity = severities.reduce((sum, item) => sum + item.score, 0) / severities.length;
  const worst = severities.reduce((max, item) => (item.score > max.score ? item : max), severities[0]);
  const routePenalty = averageSeverity * 0.65 + worst.score * 0.35;
  const comfortScore = Math.max(0, Math.min(100, Math.round(100 - routePenalty)));
  const tempValues = samples.map((sample) => sample.weather.temp);

  const summaryBase: Omit<RouteSummary, "recommendation"> = {
    overallLabel: conditionLabelForScore(comfortScore),
    comfortScore,
    rainRisk: rainRiskForSamples(samples),
    windImpact: windImpactForSamples(samples),
    tempRange: {
      min: Math.min(...tempValues),
      max: Math.max(...tempValues)
    },
    worstSegment: {
      sampleIndex: worst.sample.index,
      locationName: worst.sample.locationName,
      etaISO: new Date(
        new Date(worst.sample.etaISO).getTime() + departureOffsetMinutes * 60 * 1000
      ).toISOString(),
      weather: worst.sample.weather,
      score: worst.score,
      reason: worst.reason
    }
  };

  return {
    ...summaryBase,
    recommendation: recommendationFor(summaryBase)
  };
}
