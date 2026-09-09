# WeatherMaps 2.0

WeatherMaps is a route planning app that shows forecast conditions along a drive, aligned to the trip ETA. The 2.0 branch redesigns the app around a dark, map-first interface with glass panels, route weather overlays, timeline checkpoints, trip summary cards, and practical routing preferences.

## What It Does

- Plans a driving route between an origin and destination.
- Samples weather along the route at ETA-aligned checkpoints.
- Colors route segments by weather condition.
- Shows map markers for sampled route conditions.
- Summarizes trip duration, distance, temperature range, road conditions, visibility, wind impact, and overall route risk.
- Supports metric and imperial units.
- Supports Mapbox routing preferences for avoiding tolls and highways.

## Weather Route Colors

Route segments are colored by the weather outside at each sampled checkpoint:

| Condition | Color |
| --- | --- |
| Clear | Yellow |
| Rain | Blue |
| Snow | Cyan |
| Mixed winter conditions | Purple |
| Cloudy | Gray |
| Storm | Red |
| Fog | Light gray |
| High wind | Teal |

## Current Routing Behavior

WeatherMaps currently requests one route from Mapbox and overlays weather data onto that route. The app no longer shows fake `Recommended`, `Fastest`, or `Safest` alternatives unless the API returns real alternative route data in the future.

The active route details panel shows the route returned by the API and badges for applied preferences:

- `Avoiding tolls`
- `Avoiding highways`
- `Weather risk scored`
- `Default driving route`

`Avoid Tolls` and `Avoid Highways` are sent to Mapbox as routing exclusions. `Weather Risk Scoring` is sent through the API and used for weather visibility/scoring, but it does not yet reroute around bad weather because real alternative-route weather scoring is not implemented.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Mapbox GL JS
- Mapbox Geocoding API
- Mapbox Directions API
- Tomorrow.io weather API
- Node test runner

## Project Structure

```text
app/
  api/route-weather/     Route and weather API endpoint
  page.tsx               Main app screen and client state
components/
  MapView.tsx            Mapbox map, route layers, markers, controls
  PremiumRouteUI.tsx     WeatherMaps 2.0 UI components
lib/
  mapbox.ts              Mapbox geocoding, reverse geocoding, directions
  weather.ts             Tomorrow.io weather requests
  routePreferences.ts    Preference parsing and Mapbox exclusion mapping
  routeSummary.ts        Route weather scoring and summaries
  weatherRouteSegments.ts Route segment slicing and weather color mapping
tests/
  *.test.ts              Unit tests for formatting, geometry, routing helpers, summaries
issues.md                Known UI issues and future feature notes
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_public_mapbox_token
TOMORROW_API_KEY=your_tomorrow_api_key
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is used by the client map and server-side Mapbox requests. `TOMORROW_API_KEY` is used only on the server.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Quality Checks

Run TypeScript:

```bash
npm run typecheck
```

Run ESLint:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

Do not run `npm run build` while `npm run dev` is actively serving the app. Both commands write to `.next`, and running them at the same time can corrupt the local Next.js build cache.

## Troubleshooting

If the app returns missing `.next` files such as `routes-manifest.json`, `server/app/page.js`, or a missing chunk like `./331.js`, stop all running Next.js processes, remove the stale `.next` directory, and restart the dev server.

If route search is slow, the most common causes are:

- Mapbox geocoding/directions latency.
- Tomorrow.io weather requests for many route checkpoints.
- Cold Next.js dev compilation.
- Reverse geocoding for sampled checkpoint names.

## Branch

This README describes the `weathermaps-2.0` branch. This branch is intended to become the main branch for the redesigned WeatherMaps experience.

## Roadmap

- Real alternative route support from the routing API.
- Weather-aware route ranking across those alternatives.
- Full-site light/dark theme switching.
- Search along route.
- Alert configuration for saved trips.
- More accurate best-departure recommendations from forecast data.
