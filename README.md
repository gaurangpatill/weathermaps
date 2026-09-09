# WeatherMaps

**Weather-aware route planning for the conditions you'll actually encounter along the way.**

WeatherMaps is a route planning application that combines driving directions with time-aware weather forecasts. Instead of showing the weather only at your origin or destination, WeatherMaps analyzes the entire journey and estimates the conditions you are likely to experience as you travel.

Enter where you're starting, where you're going, and WeatherMaps builds your route, samples checkpoints along the drive, estimates when you'll reach each one, and matches those checkpoints with the corresponding forecast.

The result is a map-first view of your trip that makes it easy to see where conditions change, which parts of the drive may be uncomfortable or risky, and what the journey looks like as a whole.

---

## Why WeatherMaps?

Traditional weather applications answer:

> **"What will the weather be like in Boston?"**

Navigation applications answer:

> **"How do I get from Amherst to Boston?"**

WeatherMaps answers:

> **"What weather will I actually drive through between Amherst and Boston?"**

For longer trips, the weather at the destination tells only part of the story. Conditions can change dramatically across a route, and the weather at a location when you leave is not necessarily the weather that will be there when you arrive.

WeatherMaps combines **location + route + time** to provide weather information in the context of the journey itself.

---

## Features

### ETA-Aligned Weather

WeatherMaps samples checkpoints along the calculated route and estimates when the traveler will reach each location.

Each checkpoint is matched against the forecast for that approximate arrival time rather than simply using the current weather.

This means a four-hour trip is analyzed as a four-hour journey, not as a collection of locations viewed at the same moment.

### Weather-Aware Route Visualization

The route is divided into segments and visually colored based on the conditions expected along the drive.

| Condition               | Route Color |
| ----------------------- | ----------- |
| Clear                   | Yellow      |
| Rain                    | Blue        |
| Snow                    | Cyan        |
| Mixed winter conditions | Purple      |
| Cloudy                  | Gray        |
| Storm                   | Red         |
| Fog                     | Light gray  |
| High wind               | Teal        |

Weather markers along the route provide additional details for individual checkpoints.

### Trip Intelligence

Rather than exposing only raw forecast values, WeatherMaps summarizes the journey into information that is easier to act on.

The trip summary includes:

* Overall weather risk
* Temperature range
* Rain risk
* Wind impact
* Visibility
* Road condition indicators
* Most concerning portion of the route
* Trip duration and distance

### Interactive Map Experience

WeatherMaps 2.0 is built around a map-first interface with:

* Weather-colored route segments
* Forecast checkpoint markers
* Interactive timeline checkpoints
* Route and weather summary cards
* Glass-style map overlays
* Location-focused interactions
* Metric and imperial units

Selecting a weather checkpoint focuses the map on the corresponding part of the journey, connecting the forecast information directly to its geographic location.

### Routing Preferences

Users can customize Mapbox routing behavior with:

* **Avoid tolls**
* **Avoid highways**

These preferences are applied directly to the routing request.

Weather risk scoring analyzes the weather along the selected route but does **not currently reroute around weather conditions**.

---

## How It Works

At a high level, WeatherMaps runs the following pipeline:

```text
Origin + Destination
        │
        ▼
   Geocode locations
        │
        ▼
 Calculate driving route
        │
        ▼
 Sample route checkpoints
        │
        ▼
 Estimate ETA at each point
        │
        ▼
 Fetch hourly weather forecasts
        │
        ▼
 Match forecast to location + ETA
        │
        ▼
 Score and classify conditions
        │
        ▼
 Render weather-aware route
        │
        ▼
 Generate trip summary
```

The important distinction is that weather is associated with both a **location** and an **estimated arrival time**.

For every sampled checkpoint:

```text
checkpoint = {
    latitude,
    longitude,
    estimatedArrivalTime
}
```

WeatherMaps uses that information to retrieve the forecast closest to when the traveler is expected to reach the checkpoint.

Those forecasts are then converted into route conditions, visual segments, markers, and trip-level summaries.

---

## The Technical Challenge

The core challenge behind WeatherMaps is synchronization between **space and time**.

Fetching weather for coordinates is relatively straightforward. The more interesting problem is determining which weather forecast matters for each coordinate.

A traveler may reach a location several hours after beginning the trip. WeatherMaps therefore has to combine:

* Route geometry
* Distance along the route
* Estimated travel duration
* Geographic checkpoint sampling
* Hourly forecast data
* Weather classification
* Route visualization

This allows the application to reason about the conditions a traveler is likely to encounter rather than simply displaying current weather along a polyline.

---

## Architecture

```text
                         ┌──────────────────┐
                         │      User        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Next.js App    │
                         │   React + TS     │
                         └────────┬─────────┘
                                  │
                       origin + destination
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Route Weather API     │
                    └───────┬─────────┬───────┘
                            │         │
                ┌───────────┘         └───────────┐
                ▼                                 ▼
       ┌─────────────────┐              ┌─────────────────┐
       │     Mapbox      │              │   Tomorrow.io   │
       │                 │              │                 │
       │ Geocoding       │              │ Hourly Weather  │
       │ Directions      │              │ Forecasts       │
       └────────┬────────┘              └────────┬────────┘
                │                                │
                └──────────────┬─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Route Processing    │
                    │                     │
                    │ ETA Sampling        │
                    │ Weather Scoring     │
                    │ Segment Generation  │
                    │ Trip Summary        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Mapbox GL View    │
                    │                     │
                    │ Colored Route       │
                    │ Weather Markers     │
                    │ Timeline + Summary  │
                    └─────────────────────┘
```

---

## Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Mapbox GL JS**

### Mapping & Routing

* **Mapbox Geocoding API**
* **Mapbox Directions API**

### Weather

* **Tomorrow.io Weather API**

### Testing & Tooling

* **Node.js test runner**
* **TypeScript**
* **ESLint**

---

## Project Structure

```text
app/
├── api/
│   └── route-weather/
│       └── Route + weather processing endpoint
│
└── page.tsx
    └── Main application state and experience

components/
├── MapView.tsx
│   └── Mapbox map, route layers, markers, and controls
│
└── PremiumRouteUI.tsx
    └── WeatherMaps 2.0 interface components

lib/
├── mapbox.ts
│   └── Geocoding, reverse geocoding, and directions
│
├── weather.ts
│   └── Tomorrow.io forecast requests
│
├── routePreferences.ts
│   └── Routing preference parsing and Mapbox exclusions
│
├── routeSummary.ts
│   └── Route-level weather scoring and summaries
│
└── weatherRouteSegments.ts
    └── Route slicing and weather-condition visualization

tests/
└── *.test.ts
    └── Geometry, formatting, routing, and summary tests

issues.md
└── Known issues and future improvements
```

---

## Getting Started

### Prerequisites

You'll need:

* Node.js
* A Mapbox account and access token
* A Tomorrow.io API key

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_public_mapbox_token
TOMORROW_API_KEY=your_tomorrow_api_key
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is used by the client-side map and Mapbox requests.

`TOMORROW_API_KEY` remains server-side and is used for weather forecast requests.

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Development

### Type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Tests

```bash
npm test
```

### Production build

```bash
npm run build
```

> Do not run `npm run build` while `npm run dev` is actively using the same `.next` directory. Both processes modify the Next.js build output and can corrupt the local cache.

---

## Routing Behavior

WeatherMaps currently analyzes **one route returned by Mapbox**.

Earlier versions of the interface experimented with labels such as `Recommended`, `Fastest`, and `Safest`, but WeatherMaps does not present alternatives unless those alternatives correspond to real routing data.

Current route badges can include:

* `Avoiding tolls`
* `Avoiding highways`
* `Weather risk scored`
* `Default driving route`

`Avoid Tolls` and `Avoid Highways` translate into Mapbox routing exclusions.

Weather risk scoring currently evaluates the returned route. It does not yet influence route selection.

This distinction is intentional: WeatherMaps should not imply that a route is weather-optimized until alternative routes are actually evaluated against forecast conditions.

---

## Roadmap

### Weather-Aware Alternative Routing

Request multiple legitimate route alternatives and independently analyze the forecast conditions along each route.

This would allow WeatherMaps to compare routes across dimensions such as:

```text
Route A
Fastest: 3h 42m
Weather Risk: High

Route B
+14 minutes
Weather Risk: Low
```

The application could then make genuine weather-aware route recommendations rather than simply scoring the default route.

### Best Departure Time

Analyze forecast changes across different departure windows to answer questions such as:

> "Would leaving two hours later avoid the storm?"

### Search Along Route

Find useful locations such as:

* Gas stations
* Restaurants
* Hotels
* EV chargers
* Rest stops

while preserving awareness of the active route and weather conditions.

### Saved Trips & Alerts

Allow users to save upcoming journeys and receive alerts when forecast conditions materially change.

### Additional Improvements

* Full light/dark theme support
* Improved weather-risk models
* Better severe-weather handling
* More detailed road-condition indicators
* Improved route sampling
* Expanded trip summaries

---

## Current Version

This README describes **WeatherMaps 2.0**, the redesigned version of the application.

WeatherMaps 2.0 moves the project toward a more complete route-planning product with a map-first interface, clearer trip intelligence, and an architecture designed for future weather-aware routing.

---

## The Goal

WeatherMaps started with a simple question:

> **If navigation apps know where I'm going, and weather apps know what the weather will be, why can't I see the weather I'll experience during the drive?**

The goal of WeatherMaps is to bridge that gap and make weather part of the journey, not just the destination.
