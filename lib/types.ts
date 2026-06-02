export type LngLat = [number, number];

export interface LineString {
  type: "LineString";
  coordinates: LngLat[];
}

export interface GeocodeResult {
  name: string;
  coordinates: LngLat;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  lineString: LineString;
}

export interface SamplePoint {
  index: number;
  coordinates: LngLat;
  distanceFromStartMeters: number;
}

export interface SampleETA extends SamplePoint {
  etaDate: Date;
}

export type Units = "metric" | "imperial";

export interface WeatherPoint {
  temp: number;
  windSpeed: number;
  condition: string;
  icon: string;
  precipProb: number;
  timestampISO: string;
}
