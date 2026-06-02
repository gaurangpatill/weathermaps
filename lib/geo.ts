import type { LineString, LngLat, SamplePoint } from "./types";

const R = 6371000;

export function haversineMeters(a: LngLat, b: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineStringLengthMeters(line: LineString): number {
  let total = 0;
  for (let i = 1; i < line.coordinates.length; i += 1) {
    total += haversineMeters(line.coordinates[i - 1], line.coordinates[i]);
  }
  return total;
}

function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function sampleLineStringEveryMeters(
  line: LineString,
  spacingMeters: number,
  maxSamples?: number
): SamplePoint[] {
  const total = lineStringLengthMeters(line);
  if (total === 0 || line.coordinates.length < 2) {
    return [
      {
        index: 0,
        coordinates: line.coordinates[0] ?? [0, 0],
        distanceFromStartMeters: 0
      }
    ];
  }

  let spacing = spacingMeters;
  if (maxSamples && maxSamples > 1) {
    const rawCount = Math.floor(total / spacing) + 1;
    if (rawCount > maxSamples) {
      spacing = total / (maxSamples - 1);
    }
  }

  const targets: number[] = [];
  for (let d = 0; d < total; d += spacing) {
    targets.push(d);
  }
  if (targets[targets.length - 1] !== total) {
    targets.push(total);
  }

  const samples: SamplePoint[] = [];
  let segIndex = 0;
  let segStart = line.coordinates[0];
  let segEnd = line.coordinates[1];
  let segLen = haversineMeters(segStart, segEnd);
  let traveled = 0;

  targets.forEach((target, idx) => {
    while (traveled + segLen < target && segIndex < line.coordinates.length - 2) {
      traveled += segLen;
      segIndex += 1;
      segStart = line.coordinates[segIndex];
      segEnd = line.coordinates[segIndex + 1];
      segLen = haversineMeters(segStart, segEnd);
    }

    const remaining = Math.max(0, target - traveled);
    const t = segLen === 0 ? 0 : remaining / segLen;
    const coordinates = interpolate(segStart, segEnd, Math.min(1, Math.max(0, t)));

    samples.push({
      index: idx,
      coordinates,
      distanceFromStartMeters: target
    });
  });

  return samples;
}
