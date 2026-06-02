import type { SampleETA, SamplePoint } from "./types";

export function etaForSamples(
  samples: SamplePoint[],
  totalDistanceMeters: number,
  totalDurationSeconds: number,
  departAt: Date
): SampleETA[] {
  return samples.map((sample) => {
    const fraction = totalDistanceMeters === 0 ? 0 : sample.distanceFromStartMeters / totalDistanceMeters;
    const etaSeconds = fraction * totalDurationSeconds;
    const etaDate = new Date(departAt.getTime() + etaSeconds * 1000);
    return { ...sample, etaDate };
  });
}
