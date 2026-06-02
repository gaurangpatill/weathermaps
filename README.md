# WeatherMaps

Weather along your route, aligned to ETA.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_public_mapbox_token
TOMORROW_API_KEY=your_tomorrow_api_key
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Uses Mapbox Geocoding + Directions APIs on the server with the public token.
- Uses Tomorrow.io Timelines (hourly) on the server.
- In-memory TTL cache (10 min) for geocoding, directions, and weather.
