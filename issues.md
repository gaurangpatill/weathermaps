# WeatherMaps UI Issues

This file tracks frontend issues found during the WeatherMaps 2.0 redesign audit.

## Registered Issues

1. `Edit` button has no functionality.
   - Status: resolved by removal. The trip fields are already editable directly, so the redundant `Edit` button was removed.
   - Location: left trip panel.
   - Previous behavior: button rendered and appeared clickable.
   - Expected behavior: no separate edit control is needed because users can click directly into the fields.

2. `Enable Alerts` button has no functionality.
   - Status: resolved by replacing the fake alert copy/button with only static text: `(coming soon - alerts)`.
   - Location: alerts card in the left panel.
   - Current behavior: button renders and appears clickable.
   - Expected behavior: should enable alerts, open alert settings, or clearly show that alerts are unavailable.

3. `View details >` button has no functionality.
   - Status: resolved by removal. The timeline is already visible, and there is no detail view behind this control yet.
   - Location: weather timeline header in the right panel.
   - Previous behavior: button rendered and appeared clickable.
   - Expected behavior: should open a detailed weather timeline, expanded checkpoint list, or details panel.

5. Route preference toggles are not connected to route behavior.
   - Status: partially resolved. `Avoid Tolls` and `Avoid Highways` are sent through `/api/route-weather` and translated to Mapbox `exclude=toll` / `exclude=motorway`. `Avoid High Weather Risk` is sent through the API but still needs real alternative-route weather scoring before it can affect route selection.
   - Affected controls:
     - `Avoid High Weather Risk`
     - `Avoid Tolls`
     - `Avoid Highways`
   - Current behavior: toll/highway toggles affect the Mapbox route request; weather-risk preference is carried but not yet applied to route selection.
   - Expected behavior: toggles should affect route search, route scoring, API payload, or route comparison.

6. Best time to leave chevron is visual only.
   - Location: best time to leave card.
   - Current behavior: `>` is a non-clickable visual span.
   - Expected behavior: should open more departure-time detail or not appear interactive.

7. Route comparison cards look selectable but are not interactive.
   - Status: resolved by removing synthetic selectable alternatives. The panel now shows one actual route returned by the API instead of fake `Recommended` / `Fastest` / `Safest` cards.
   - Affected cards:
     - `Recommended`
     - `Fastest`
     - `Safest`
   - Previous behavior: cards rendered like selectable options, but clicking them did not switch the active route.
   - Expected behavior: clicking a route card should update selected route, selected styling, map route, summary, and timeline.

8. Cannot switch between `Recommended`, `Fastest`, and `Safest` routes.
   - Status: resolved for now by removing fake alternatives. Real switching should return only when the API provides real alternative route geometries and weather samples for each route.
   - Previous behavior: the route comparison panel showed multiple route cards but did not support selection.
   - Expected behavior: selected route should drive map styling, trip summary, risk score, ETA, and timeline.

9. `Drive` tab does not hide the route comparison panel.
   - Status: resolved. Switching to `Drive` hides the route detail/comparison overlay.
   - Previous behavior: `Drive` could become visually active, but the route comparison overlay could remain visible.
   - Expected behavior: `Drive` should return to drive mode and hide the comparison overlay.

10. `Hazards On / Hazards Off` does not work correctly.
    - Intended behavior: toggle map hazard/checkpoint markers.
    - Current issue: user reports marker toggle behavior is incorrect.
    - Expected behavior: state, label, and visible markers should stay in sync.

11. Weather timeline points do not line up with map hazard/checkpoint markers.
    - Current behavior: right-panel timeline rows do not clearly correspond to the visible map markers.
    - Expected behavior: timeline rows and map markers should represent the same samples and selecting one should highlight/select the other.

12. Night/dark mode button only changes the map style.
    - Current behavior: the button switches Mapbox light/night preset only.
    - Expected behavior: it should switch the full website theme, including panels, controls, backgrounds, cards, text, shadows, and map.

## Potential Future Features

1. Search along route.
   - Status: removed from current UI until it can be implemented properly.
   - Future behavior: should search/filter checkpoints, places, hazards, or route locations.

## Additional Issues Found In Code

13. Route comparison options are synthetic, not actual alternative routes.
    - Status: resolved by removal. The UI now shows one actual route returned by the API instead of synthetic `Fastest` and `Safest` alternatives.
    - Previous behavior: `Fastest` and `Safest` were generated client-side from the single API route by adjusting duration, distance, and risk values.
    - Expected behavior: comparison routes should come from real route alternatives or clearly be labeled as simulated placeholders.

14. Route preferences are not sent to `/api/route-weather`.
    - Status: resolved. API request body now includes route preferences.
    - Previous behavior: API request body included `origin`, `destination`, `departAt`, and `units`, but not route preferences.
    - Expected behavior: preferences should be included in the route request if they are user-facing controls.

15. Best time to leave chart uses hardcoded placeholder bars.
    - Current behavior: risk-by-hour bars are fixed values, not derived from route weather data.
    - Expected behavior: chart should be calculated from forecast/risk data or marked as unavailable.

16. Best time to leave recommendation is placeholder logic.
    - Current behavior: recommendation is based on current departure time plus 90 minutes.
    - Expected behavior: recommended departure time should be calculated from route weather/risk data.

17. Weather legend toggle does not fully work on mobile.
    - Current behavior: legend has `hidden md:flex`, so even when toggled visible it remains hidden below the `md` breakpoint.
    - Expected behavior: if the layers/legend button is available on mobile, it should reveal a mobile-friendly legend.

18. Timeline sample reduction can duplicate checkpoints.
    - Current behavior: when there are more than seven samples, the timeline builds a reduced list with first, samples 1-4, middle sample, and last sample. For some sample counts, the middle sample can duplicate one already included.
    - Expected behavior: reduced timeline samples should be unique and ordered.

19. Timeline endpoint styling can be misleading after sample reduction.
    - Current behavior: the first and last visible rows are styled as endpoints, even though the reduced list may omit many intermediate samples.
    - Expected behavior: endpoint styling should only indicate actual origin/destination samples, not just first/last visible rows.

20. Route comparison panel can be opened before a route exists.
    - Current behavior: compare mode can show the panel with a no-route placeholder.
    - Expected behavior: this may be acceptable, but it should be a deliberate empty state and not imply route comparison data exists.

21. Some controls are clickable but have no user feedback when unavailable.
    - Examples: alerts, details, route selection, preferences.
    - Expected behavior: either wire them to real behavior, disable them, or show a clear unavailable/coming-soon state.

22. `Compare` mode changes overlay visibility but does not change the left panel content.
    - Current behavior: tab state changes and route comparison overlay can show, but the left panel still mostly shows drive input controls.
    - Expected behavior: compare mode should either change the left panel content or avoid presenting itself as a full mode switch.

23. Search, route comparison, preferences, and best-departure UI imply advanced route intelligence that is not currently implemented.
    - Current behavior: the interface suggests Google Maps-style route alternatives and Apple Maps-style trip intelligence, but several pieces are placeholders.
    - Expected behavior: the UI should either be wired to actual data/logic or visually scoped so users do not mistake placeholders for working features.

24. Route line coloring is hard to interpret.
    - Status: restored to condition-based coloring by request.
    - Current behavior: route colors represent weather condition categories: clear yellow, rain blue, snow cyan, mixed purple, cloudy gray.
    - Expected behavior: route colors should communicate the weather outside along each route segment.
