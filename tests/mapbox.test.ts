import assert from "node:assert/strict";
import test from "node:test";
import { mapboxExcludeFromPreferences } from "../lib/routePreferences.ts";

test("builds Mapbox exclude parameter from route preferences", () => {
  assert.equal(
    mapboxExcludeFromPreferences({ avoidTolls: false, avoidHighways: false }),
    ""
  );
  assert.equal(
    mapboxExcludeFromPreferences({ avoidTolls: true, avoidHighways: false }),
    "toll"
  );
  assert.equal(
    mapboxExcludeFromPreferences({ avoidTolls: false, avoidHighways: true }),
    "motorway"
  );
  assert.equal(
    mapboxExcludeFromPreferences({ avoidTolls: true, avoidHighways: true }),
    "toll,motorway"
  );
});
