# Logo on home screen + on-train destination alarms

Date: 2026-05-08
Status: design

## Goals

1. The PWA installed via "Add to Home Screen" must show `logo_tren.png`
   as its icon on iOS and other platforms.
2. Users on the train can configure a destination, see the trip
   highlighted on the map, see a live countdown to arrival, and export
   two reminders to their device calendar — "5 min before arrival" and
   "at arrival" — that fire reliably even if the PWA is closed.

## Non-goals

- No GPS-based detection of "you are arriving". iOS does not run JS in
  the PWA when backgrounded; geofencing in a browser PWA is not
  reliable. Alarms are scheduled via the OS calendar from a computed
  ETA.
- No multi-leg trips or transfers. One origin, one destination, one
  direction.
- No persistence of the active trip across reloads. The trip lives in
  React state only; refreshing the page clears it. Justified because
  trips are short (≤ ~40 min) and re-entering origin/destination is
  fast.
- No regeneration of `logo192.png` / `logo512.png` variants. The
  manifest will reference the single `logo_tren.png` asset for all
  sizes; browsers scale it down. This trades initial download size
  (~1.8 MB once, then cached) for build simplicity.

## Logo: changes

- Move `logo_tren.png` from the repo root into `public/logo_tren.png`
  so CRA includes it in the build output.
- Update `public/manifest.json`: replace the `logo192.png` /
  `logo512.png` entries with one entry pointing to `logo_tren.png`,
  declaring `sizes: "1254x1254"` and `purpose: "any maskable"`.
- Update `public/index.html`: change the `apple-touch-icon` link to
  `logo_tren.png`.

## On-train alarms: components

### Data model

Trip state held by `App.js`, passed to children:

```
trip = {
  originName: string,
  destinationName: string,
  direction: 'a_lemos' | 'a_lacroze',
  trainTime: 'HH:MM',           // departure time at origin
  departureEpoch: number,       // ms since epoch
  arrivalEpoch: number,         // estimated, ms since epoch
  stopsBetween: number,         // abs(destinationIdx - originIdx);
                                // i.e. number of station-to-station
                                // hops, e.g. 1 if origin and destination
                                // are adjacent.
}
```

`trip` is null when no destination is selected.

### ETA computation: `src/lib/etaCalc.js`

Pure functions, no React imports:

- `computeTrip(originName, destinationName, now)` — looks up origin
  and destination indices in `stations.js` (the array is ordered from
  `General Lemos` at idx 0 to `Federico Lacroze` at idx 22). Direction
  is `'a_lemos'` when `destinationIdx < originIdx` (travelling toward
  Lemos / lower index), otherwise `'a_lacroze'`. Pulls the next train
  at origin in that direction from the schedule, computes the arrival
  epoch as `departureEpoch + stopsBetween * PER_STATION_MIN * 60_000`.
  Returns the trip object or null if no upcoming train is found.
- `PER_STATION_MIN = 2` (the line averages roughly 2 minutes between
  adjacent stations).
- `routeStationsBetween(originName, destinationName)` — array of
  station tuples `[lat, lng, name]` covering origin → destination
  inclusive, in travel order. Used by the map.

### `src/components/OnTrainCard.js`

A new card. Props: `nearestStation`, `trip`, `setTrip`.

UI:

- Title: "En el tren".
- If `nearestStation` is null: prompt the user to detect a station
  first. Disable the destination select.
- Else: show "Estás en/cerca de: {nearestStation.name}".
- A `Select` of the other 22 stations (origin excluded), listed in
  the same order as `stations.js` (General Lemos → Federico Lacroze).
- When a destination is picked: call `computeTrip` and call
  `setTrip(trip)`.
- Once `trip` is set, render:
  - `Salida {trainTime} · Llegada {arrivalTime} · llegás en {N} min`
    where `N` updates every minute via a 60-s tick.
  - Two buttons:
    - `Cancelar viaje` → `setTrip(null)`.
    - `Programar avisos en Calendario` → calls
      `shareTripICS(trip)`.

Auto-clear: if `trip` is set and `Date.now() > trip.arrivalEpoch +
10 * 60_000`, the component calls `setTrip(null)` once on its own.

### `src/components/StationMap.js` additions

Map already takes `nearestStation` and `currentLocation`. Add a `trip`
prop. When `trip` is non-null:

- Compute the highlighted positions via `routeStationsBetween` on the
  trip's origin / destination.
- Add a second `<Polyline>` overlay using the same coordinate list,
  styled red (`urquizaColors.red`), `weight: 6`, `opacity: 0.95`,
  `dashArray` none. Drawn after the yellow line so it sits on top.
- Add a `<Marker>` at the destination station with a custom
  `divIcon`: a yellow flag with red border, larger than the regular
  station marker.
- A floating chip overlay in the top-right corner of the map (CSS
  `position: absolute`, inside the map's relative wrapper): shows
  `→ {destinationName} · llegás en {N} min`. Updates every minute via
  the same tick used by `OnTrainCard`.
- The existing yellow polyline and station markers stay as they are.

### `src/lib/calendar.js` additions

A new export `shareTripICS(trip)` parallel to the existing
`shareAlarmICS(alarm)`. Builds one VEVENT covering the destination
arrival with two `BEGIN:VALARM` blocks inside:

- `TRIGGER:-PT5M` — "5 min antes de llegar a {destino}"
- `TRIGGER:PT0S` — "Llegaste a {destino}"

The VEVENT's `DTSTART` is the arrival time, `DTEND` is +1 min, and
`SUMMARY` reads `Llegada a {destino}`. Same Web Share / download
fallback as `shareAlarmICS`.

### `src/App.js` wiring

- Add `const [trip, setTrip] = useState(null)` next to the existing
  state.
- Pass `trip` and `setTrip` to `OnTrainCard`.
- Pass `trip` to `StationMap`.
- Place `OnTrainCard` in the home content right under
  `NextTrainSchedule` on mobile, and in the sidebar right under
  `AlarmsPanel` on desktop.

## Data flow

```
   user picks destination
         |
         v
 OnTrainCard.computeTrip()  ----------> setTrip(trip)
                                              |
                            +-----------------+-----------------+
                            v                                   v
                    OnTrainCard re-renders               StationMap re-renders
                    (countdown, buttons)                 (red polyline, dest flag,
                                                          floating chip)
```

The 60-s tick lives in each consumer (`OnTrainCard` and the floating
chip) — they keep their own `useEffect` interval. The trip object
itself is immutable; only the consumers' rendering depends on the
clock.

## Edge cases

- No nearest station yet → card shows the hint and disables the
  select; map shows nothing extra.
- User picks the same station as origin → `computeTrip` returns null;
  the select clamps to a different value (UI ensures origin is
  excluded).
- No upcoming train in the chosen direction (e.g., past midnight, no
  more trains tonight) → card shows "no hay trenes próximos en esta
  dirección"; no Calendar button.
- Weekday/Saturday/Sunday rolls over while the user is mid-trip → not
  handled; the trip computed at pick time stays valid.
- iOS dismisses the share sheet for the `.ics` → user can press the
  Calendar button again to retry. The trip remains in state.

## Out of scope (won't change)

- Existing alarms flow (per-train alarm with iCal export) stays as is.
- The PWA service worker, schedule auto-update workflow, and parser
  remain untouched.
- No new dependencies. Uses MUI components already in the bundle and
  the existing Leaflet setup.

## Manual test plan

1. After deploy, "Add to Home Screen" on iPhone → confirm the icon is
   `logo_tren.png` (not the default Safari globe).
2. Open the PWA → detect station → in the new card, pick a destination
   far down the line → verify the red polyline appears between the two
   stations, the destination has the flag marker, and the floating
   chip on the map shows the countdown.
3. Tap "Programar avisos en Calendario" → confirm the iOS share sheet
   appears → tap Calendar → confirm an event is added with two
   reminders at -5 min and at 0 min.
4. Wait for the trigger times → confirm both reminders fire as system
   notifications regardless of whether the PWA is open.
5. Tap "Cancelar viaje" → confirm the red overlay, flag marker, and
   floating chip disappear.
