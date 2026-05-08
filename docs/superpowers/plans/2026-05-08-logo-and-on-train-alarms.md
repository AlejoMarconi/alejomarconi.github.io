# Logo on home screen + on-train destination alarms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the PWA install icon use `logo_tren.png` and add an "En el tren" feature that shows the trip on the map, displays a live countdown to arrival, and exports both "5 min before arrival" and "at arrival" reminders to the device calendar.

**Architecture:** Pure functions (`src/lib/etaCalc.js`, `src/lib/calendar.js`) hold the trip math and iCal generation; a new presentational component `OnTrainCard` plus additions to `StationMap` consume them. Trip state lives in `App.js` via `useState` and is passed down — no context, no localStorage. The OS calendar is the only thing scheduling the actual notifications.

**Tech Stack:** React 18, MUI 5, react-leaflet 4, framer-motion, jest (via react-scripts test). No new dependencies.

---

## File Structure

**Create:**
- `public/logo_tren.png` (move from repo root)
- `src/lib/etaCalc.js` — pure trip math
- `src/lib/etaCalc.test.js` — unit tests
- `src/lib/calendar.test.js` — unit tests for the existing calendar lib + the new shareTripICS
- `src/components/OnTrainCard.js` — new UI card

**Modify:**
- `public/manifest.json` — point icons to `logo_tren.png`
- `public/index.html` — point apple-touch-icon to `logo_tren.png`
- `src/lib/calendar.js` — add `buildTripICS` + `shareTripICS`
- `src/components/StationMap.js` — add `trip` prop, red overlay polyline, destination flag marker, floating chip
- `src/App.js` — add trip state, render OnTrainCard, pass trip to StationMap
- Repo root: delete the old `logo_tren.png` after copying it to `public/`

---

## Task 1: Logo on home screen

**Files:**
- Move: `logo_tren.png` (repo root) → `public/logo_tren.png`
- Modify: `public/manifest.json`
- Modify: `public/index.html`

- [ ] **Step 1: Move the logo into `public/`**

```bash
git mv logo_tren.png public/logo_tren.png
```

- [ ] **Step 2: Update `public/manifest.json` to reference `logo_tren.png`**

Replace the entire file with:

```json
{
  "short_name": "Tren Urquiza",
  "name": "Tren Urquiza - Próximos trenes y alarmas",
  "description": "Próximos trenes del Tren Urquiza para tu estación, mapa de la línea y alarmas con vibración y notificación.",
  "icons": [
    {
      "src": "logo_tren.png",
      "type": "image/png",
      "sizes": "1254x1254",
      "purpose": "any maskable"
    },
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#FFD500",
  "background_color": "#0D1117",
  "categories": ["transportation", "utilities", "travel"]
}
```

- [ ] **Step 3: Update `public/index.html` apple-touch-icon link**

Find the line:

```html
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
```

Replace with:

```html
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo_tren.png" />
```

- [ ] **Step 4: Build to confirm assets resolve**

Run: `cd <repo> && CI=false npm run build 2>&1 | tail -20`
Expected: build succeeds; `build/logo_tren.png` exists.

```bash
ls -la build/logo_tren.png
```

Expected output: file present, ~1.8 MB.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/index.html public/logo_tren.png
git commit -m "Use logo_tren.png as the PWA home-screen icon"
```

---

## Task 2: ETA computation library + tests (TDD)

**Files:**
- Create: `src/lib/etaCalc.js`
- Create: `src/lib/etaCalc.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/etaCalc.test.js`:

```javascript
import { computeTrip, routeStationsBetween, PER_STATION_MIN } from './etaCalc';

describe('routeStationsBetween', () => {
  test('returns the inclusive segment in travel order, low->high index', () => {
    const seg = routeStationsBetween('Tropezon', 'Federico Lacroze');
    expect(seg[0][2]).toBe('Tropezon');
    expect(seg[seg.length - 1][2]).toBe('Federico Lacroze');
    // Tropezon idx 13, Lacroze idx 22 in stations.js -> 10 stations inclusive
    expect(seg.length).toBe(10);
  });

  test('returns the inclusive segment in travel order, high->low index', () => {
    const seg = routeStationsBetween('Federico Lacroze', 'Tropezon');
    expect(seg[0][2]).toBe('Federico Lacroze');
    expect(seg[seg.length - 1][2]).toBe('Tropezon');
    expect(seg.length).toBe(10);
  });

  test('returns null when either station is unknown', () => {
    expect(routeStationsBetween('Tropezon', 'Nowhere')).toBeNull();
  });
});

describe('computeTrip', () => {
  test("'a_lacroze' direction when destinationIdx > originIdx", () => {
    // Pick a 'now' that has trains running
    const now = new Date('2026-05-04T10:00:00-03:00'); // Monday 10:00 ART
    const trip = computeTrip('Tropezon', 'Federico Lacroze', now);
    expect(trip).not.toBeNull();
    expect(trip.direction).toBe('a_lacroze');
    expect(trip.originName).toBe('Tropezon');
    expect(trip.destinationName).toBe('Federico Lacroze');
    // 9 hops between idx 13 and 22
    expect(trip.stopsBetween).toBe(9);
  });

  test("'a_lemos' direction when destinationIdx < originIdx", () => {
    const now = new Date('2026-05-04T10:00:00-03:00');
    const trip = computeTrip('Federico Lacroze', 'Tropezon', now);
    expect(trip).not.toBeNull();
    expect(trip.direction).toBe('a_lemos');
    expect(trip.stopsBetween).toBe(9);
  });

  test('arrivalEpoch = departureEpoch + stops * PER_STATION_MIN', () => {
    const now = new Date('2026-05-04T10:00:00-03:00');
    const trip = computeTrip('Tropezon', 'Federico Lacroze', now);
    expect(trip.arrivalEpoch - trip.departureEpoch).toBe(
      trip.stopsBetween * PER_STATION_MIN * 60 * 1000,
    );
  });

  test('returns null when origin and destination are the same', () => {
    const now = new Date('2026-05-04T10:00:00-03:00');
    expect(computeTrip('Tropezon', 'Tropezon', now)).toBeNull();
  });

  test('returns null when origin is unknown', () => {
    const now = new Date('2026-05-04T10:00:00-03:00');
    expect(computeTrip('Nowhere', 'Tropezon', now)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `CI=true npm test -- --testPathPattern=etaCalc 2>&1 | tail -30`

Expected: all tests fail with "Cannot find module './etaCalc'".

- [ ] **Step 3: Implement `src/lib/etaCalc.js`**

Create the file:

```javascript
import { stations } from '../data/stations';
import { findUpcomingTrains, getDayType } from '../hooks/useTrainSchedule';

// Average travel minutes between two adjacent Urquiza stations.
// Empirical: the JSON shows ~1.5-2 min hops; 2 covers slightly slower
// segments and dwell time at the platform.
export const PER_STATION_MIN = 2;

const stationNames = stations.map((s) => s[2]);

function indexOf(name) {
  return stationNames.indexOf(name);
}

/**
 * Inclusive segment from origin to destination, in travel order.
 * Returns array of [lat, lng, name] tuples (same shape as stations.js)
 * or null if either name is unknown.
 */
export function routeStationsBetween(originName, destinationName) {
  const i = indexOf(originName);
  const j = indexOf(destinationName);
  if (i < 0 || j < 0) return null;
  if (i === j) return [stations[i]];
  const step = i < j ? 1 : -1;
  const out = [];
  for (let k = i; k !== j + step; k += step) {
    out.push(stations[k]);
  }
  return out;
}

/**
 * Compute a trip from origin to destination starting from `now`.
 * Returns:
 *   {
 *     originName, destinationName,
 *     direction: 'a_lemos' | 'a_lacroze',
 *     trainTime: 'HH:MM',
 *     departureEpoch: number,
 *     arrivalEpoch: number,
 *     stopsBetween: number,
 *   }
 * or null if the input is invalid or no upcoming train is found.
 */
export function computeTrip(originName, destinationName, now = new Date()) {
  const i = indexOf(originName);
  const j = indexOf(destinationName);
  if (i < 0 || j < 0 || i === j) return null;

  // Stations are ordered General Lemos (idx 0) -> Federico Lacroze (idx 22).
  // Going to a lower index means going toward Lemos.
  const direction = j < i ? 'a_lemos' : 'a_lacroze';
  const stopsBetween = Math.abs(j - i);

  const dayType = getDayType(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = findUpcomingTrains(originName, direction, nowMinutes, 1, dayType);
  if (!upcoming.length) return null;

  const next = upcoming[0];
  const departure = new Date(now);
  if (next.isTomorrow) departure.setDate(departure.getDate() + 1);
  const [h, m] = next.time.split(':').map(Number);
  departure.setHours(h, m, 0, 0);

  const departureEpoch = departure.getTime();
  const arrivalEpoch = departureEpoch + stopsBetween * PER_STATION_MIN * 60 * 1000;

  return {
    originName,
    destinationName,
    direction,
    trainTime: next.time,
    departureEpoch,
    arrivalEpoch,
    stopsBetween,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `CI=true npm test -- --testPathPattern=etaCalc 2>&1 | tail -30`

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/etaCalc.js src/lib/etaCalc.test.js
git commit -m "Add etaCalc lib for on-train trip and ETA computation"
```

---

## Task 3: Add `buildTripICS` + `shareTripICS` to calendar lib

**Files:**
- Modify: `src/lib/calendar.js`
- Create: `src/lib/calendar.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/calendar.test.js`:

```javascript
import { buildAlarmICS, buildTripICS } from './calendar';

describe('buildAlarmICS', () => {
  test('contains BEGIN:VEVENT, SUMMARY, and one VALARM block', () => {
    const fireEpoch = Date.UTC(2026, 4, 8, 18, 25, 0); // 18:25 UTC
    const ics = buildAlarmICS({
      id: 'abc123',
      stationName: 'Tropezon',
      direction: 'a_lacroze',
      trainTime: '18:30',
      minutesBefore: 5,
      fireEpoch,
    });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('SUMMARY:Tren a F. Lacroze - 18:30');
    expect(ics).toContain('TRIGGER:-PT5M');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
  });
});

describe('buildTripICS', () => {
  test('contains two VALARM blocks: -PT5M and PT0S', () => {
    const arrival = Date.UTC(2026, 4, 8, 18, 32, 0);
    const ics = buildTripICS({
      originName: 'Tropezon',
      destinationName: 'Federico Lacroze',
      direction: 'a_lacroze',
      trainTime: '18:14',
      arrivalEpoch: arrival,
      stopsBetween: 9,
    });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Llegada a Federico Lacroze');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain('TRIGGER:-PT5M');
    expect(ics).toContain('TRIGGER:PT0S');
  });

  test('uses CRLF line endings as the iCalendar spec requires', () => {
    const arrival = Date.UTC(2026, 4, 8, 18, 32, 0);
    const ics = buildTripICS({
      originName: 'Tropezon',
      destinationName: 'Federico Lacroze',
      direction: 'a_lacroze',
      trainTime: '18:14',
      arrivalEpoch: arrival,
      stopsBetween: 9,
    });
    expect(ics).toMatch(/BEGIN:VCALENDAR\r\n/);
  });
});
```

- [ ] **Step 2: Run tests to verify the trip tests fail**

Run: `CI=true npm test -- --testPathPattern=calendar 2>&1 | tail -30`

Expected: `buildAlarmICS` tests pass (function exists); `buildTripICS` tests fail with "buildTripICS is not a function" or undefined.

- [ ] **Step 3: Add `buildTripICS` + `shareTripICS` to `src/lib/calendar.js`**

Open `src/lib/calendar.js`. After the existing `buildAlarmICS` export, add:

```javascript
/**
 * Build an .ics for an in-train trip. The single VEVENT carries TWO
 * VALARM blocks so the OS rings once 5 min before arrival and once at
 * arrival.
 */
export function buildTripICS(trip) {
  const arrival = new Date(trip.arrivalEpoch);
  const arrivalEnd = new Date(trip.arrivalEpoch + 60 * 1000);
  const stamp = toICSUtc(new Date());
  const dtStart = toICSUtc(arrival);
  const dtEnd = toICSUtc(arrivalEnd);
  const uid = `trip-${trip.originName}-${trip.destinationName}-${trip.arrivalEpoch}@urquiza-trenes`;

  const dirLabel =
    trip.direction === 'a_lemos' ? 'Gral. Lemos' : 'F. Lacroze';
  const summary = `Llegada a ${trip.destinationName}`;
  const description = `Viaje en el Urquiza desde ${trip.originName} hacia ${trip.destinationName} (sentido ${dirLabel}). Sale a las ${trip.trainTime}.`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tren Urquiza//ES//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(`Estación ${trip.destinationName}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT5M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(`5 min para llegar a ${trip.destinationName}`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(`Llegaste a ${trip.destinationName}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

function safeTripFilename(trip) {
  const sanitize = (s) => s.replace(/[^A-Za-z0-9]+/g, '-');
  return `viaje-${sanitize(trip.originName)}-a-${sanitize(trip.destinationName)}.ics`;
}

/**
 * Hand the trip .ics to the OS via Web Share API (preferred on iOS) or
 * a download anchor (desktop fallback). Returns true on apparent
 * success, false on hard failure.
 */
export async function shareTripICS(trip) {
  const ics = buildTripICS(trip);
  const filename = safeTripFilename(trip);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], filename, { type: 'text/calendar' });

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({
        files: [file],
        title: `Llegada a ${trip.destinationName}`,
        text: 'Importá el evento al Calendario y iOS te avisará 5 min antes y al llegar.',
      });
      return true;
    }
  } catch (err) {
    // user cancelled or share unsupported, fall through
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `CI=true npm test -- --testPathPattern=calendar 2>&1 | tail -30`

Expected: all calendar tests pass (3 of them).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar.js src/lib/calendar.test.js
git commit -m "Add buildTripICS + shareTripICS for in-train destination alarms"
```

---

## Task 4: `OnTrainCard` component

**Files:**
- Create: `src/components/OnTrainCard.js`

- [ ] **Step 1: Create the component**

Create `src/components/OnTrainCard.js`:

```javascript
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit';
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';

import { stations } from '../data/stations';
import { computeTrip } from '../lib/etaCalc';
import { shareTripICS } from '../lib/calendar';
import { urquizaColors } from '../theme';

function formatHM(epoch) {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function minutesUntil(epoch, now) {
  return Math.max(0, Math.round((epoch - now.getTime()) / 60000));
}

const OnTrainCard = ({ nearestStation, trip, setTrip }) => {
  const [destination, setDestination] = useState(trip?.destinationName || '');
  const [now, setNow] = useState(() => new Date());

  // 1-minute tick for the live countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-clear once the trip is 10 min past arrival.
  useEffect(() => {
    if (trip && Date.now() > trip.arrivalEpoch + 10 * 60 * 1000) {
      setTrip(null);
      setDestination('');
    }
  }, [trip, now, setTrip]);

  // When the user picks a destination, compute and lift the trip.
  useEffect(() => {
    if (!nearestStation || !destination) {
      if (trip) setTrip(null);
      return;
    }
    if (destination === nearestStation.name) return;
    const t = computeTrip(nearestStation.name, destination, new Date());
    setTrip(t);
  }, [nearestStation, destination, setTrip, trip]);

  const stationOptions = useMemo(
    () =>
      stations
        .map((s) => s[2])
        .filter((name) => !nearestStation || name !== nearestStation.name),
    [nearestStation],
  );

  const cancel = () => {
    setDestination('');
    setTrip(null);
  };

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      sx={{
        bgcolor: urquizaColors.surface,
        border: `1px solid ${urquizaColors.border}`,
        borderRadius: 3,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <DirectionsTransitIcon sx={{ color: urquizaColors.yellow }} />
        <Typography variant="h3" sx={{ fontSize: '1.05rem' }}>
          En el tren
        </Typography>
      </Stack>

      {!nearestStation && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Detectá tu estación primero para usar este modo.
        </Alert>
      )}

      {nearestStation && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Origen: <strong>{nearestStation.name}</strong>
          </Typography>

          <Select
            size="small"
            fullWidth
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            displayEmpty
            sx={{ mt: 1 }}
          >
            <MenuItem value="" disabled>
              Elegí destino
            </MenuItem>
            {stationOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>

          {destination && !trip && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              No hay trenes próximos a {destination} desde {nearestStation.name}{' '}
              en este momento.
            </Alert>
          )}

          {trip && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`Salida ${trip.trainTime}`}
                  sx={{ bgcolor: urquizaColors.surfaceElevated }}
                />
                <Chip
                  size="small"
                  label={`Llegada ${formatHM(trip.arrivalEpoch)}`}
                  sx={{ bgcolor: urquizaColors.surfaceElevated }}
                />
                <Chip
                  size="small"
                  label={`llegás en ${minutesUntil(trip.arrivalEpoch, now)} min`}
                  sx={{
                    bgcolor: urquizaColors.yellow,
                    color: '#000',
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<EventAvailableIcon />}
                  onClick={() => shareTripICS(trip)}
                >
                  Programar avisos en Calendario
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={cancel}
                  color="inherit"
                >
                  Cancelar viaje
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}
    </Card>
  );
};

export default OnTrainCard;
```

- [ ] **Step 2: Verify the component compiles**

Run: `cd <repo> && CI=false npm run build 2>&1 | tail -10`

Expected: build succeeds. The component isn't wired into App.js yet, so it won't render — that's fine for this task.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnTrainCard.js
git commit -m "Add OnTrainCard: pick destination, see ETA, export to Calendar"
```

---

## Task 5: Map highlight + countdown chip

**Files:**
- Modify: `src/components/StationMap.js`

- [ ] **Step 1: Add the destination flag icon and import the trip helpers**

Open `src/components/StationMap.js`. Just after the existing `nearestStationIcon` declaration, add:

```javascript
const destinationStationIcon = L.divIcon({
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:0;width:22px;height:22px;border-radius:50%;background:${urquizaColors.yellow};border:3px solid ${urquizaColors.red};box-shadow:0 0 12px ${urquizaColors.red}66;"></div>
  </div>`,
  className: 'urquiza-destination-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
```

At the top of the file, just after the existing `import { stations as stationsData } from '../data/stations';`, add:

```javascript
import { routeStationsBetween } from '../lib/etaCalc';
```

- [ ] **Step 2: Accept the `trip` prop and render the overlay**

Find the `StationMap` component declaration:

```javascript
const StationMap = ({ currentLocation, nearestStation, autoCenter = true, height = 360 }) => {
```

Replace it with:

```javascript
const StationMap = ({
  currentLocation,
  nearestStation,
  trip = null,
  autoCenter = true,
  height = 360,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
```

You'll need to add the `useState`/`useEffect` imports. Find the existing import line:

```javascript
import React, { useEffect, useMemo, useRef } from 'react';
```

Replace with:

```javascript
import React, { useEffect, useMemo, useRef, useState } from 'react';
```

- [ ] **Step 3: Compute the trip route geometry**

Inside the component body, just below the `useEffect` for `now`, add:

```javascript
  const tripRoute = useMemo(() => {
    if (!trip) return null;
    const seg = routeStationsBetween(trip.originName, trip.destinationName);
    if (!seg) return null;
    return seg.map(([lat, lng]) => [lat, lng]);
  }, [trip]);

  const minutesUntilArrival = trip
    ? Math.max(0, Math.round((trip.arrivalEpoch - now.getTime()) / 60000))
    : null;
```

- [ ] **Step 4: Render the overlay polyline + destination marker inside the map**

Find the `<Polyline>` in the JSX:

```javascript
          <Polyline
            positions={STATION_ROUTE}
            pathOptions={{ color: urquizaColors.yellow, weight: 4, opacity: 0.9 }}
          />
```

Right after that closing `/>`, add:

```javascript
          {tripRoute && (
            <Polyline
              positions={tripRoute}
              pathOptions={{
                color: urquizaColors.red,
                weight: 6,
                opacity: 0.95,
              }}
            />
          )}
```

Find where individual station markers are rendered:

```javascript
          {stations.map((station) => {
            const [lat, lng, name] = station;
            const isNearest = nearestStation?.name === name;
            return (
              <Marker
                key={name}
                position={[lat, lng]}
                icon={isNearest ? nearestStationIcon : stationIcon}
              >
```

Change the icon selection to also pick the destination icon:

```javascript
          {stations.map((station) => {
            const [lat, lng, name] = station;
            const isNearest = nearestStation?.name === name;
            const isDestination = trip?.destinationName === name;
            const icon = isDestination
              ? destinationStationIcon
              : isNearest
              ? nearestStationIcon
              : stationIcon;
            return (
              <Marker key={name} position={[lat, lng]} icon={icon}>
```

- [ ] **Step 5: Add the floating countdown chip**

Find the `<Box sx={{ height, width: '100%' }}>` that wraps the `MapContainer`. Replace that opening line with:

```javascript
      <Box sx={{ position: 'relative', height, width: '100%' }}>
```

Just inside that Box, before the `<MapContainer ...>` tag, add:

```javascript
        {trip && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 500,
              bgcolor: urquizaColors.yellow,
              color: '#000',
              px: 1.25,
              py: 0.75,
              borderRadius: 2,
              boxShadow: 3,
              fontWeight: 700,
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            → {trip.destinationName} · llegás en {minutesUntilArrival} min
          </Box>
        )}
```

- [ ] **Step 6: Build to verify**

Run: `cd <repo> && CI=false npm run build 2>&1 | tail -10`

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/StationMap.js
git commit -m "Highlight on-train trip on the map with red overlay and floating chip"
```

---

## Task 6: Wire `trip` state into `App.js`

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: Add the trip state and import OnTrainCard**

Open `src/App.js`. Find the import block; just after:

```javascript
import AlarmsPanel from './components/AlarmsPanel';
```

Add:

```javascript
import OnTrainCard from './components/OnTrainCard';
```

Inside `App()`, find the existing state declarations:

```javascript
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
```

Right after that block, add:

```javascript
  const [trip, setTrip] = useState(null);
```

- [ ] **Step 2: Pass `trip` and `setTrip` to MobileLayout and DesktopLayout**

Find the `MobileLayout` and `DesktopLayout` invocations near the bottom of `App()`. Both currently look like:

```javascript
        {isDesktop ? (
          <DesktopLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
          />
        ) : (
          <MobileLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
          />
        )}
```

Add the `trip` and `setTrip` props to both:

```javascript
        {isDesktop ? (
          <DesktopLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
            trip={trip}
            setTrip={setTrip}
          />
        ) : (
          <MobileLayout
            detectorProps={detectorProps}
            nearestStation={nearestStation}
            currentLocation={currentLocation}
            alarmsApi={alarmsApi}
            pendingDraft={pendingDraft}
            onConsumeDraft={consumeDraft}
            onAddAlarmShortcut={handleAddAlarmShortcut}
            trip={trip}
            setTrip={setTrip}
          />
        )}
```

- [ ] **Step 3: Render OnTrainCard in MobileLayout (Home tab) and pass trip to StationMap**

Find the `MobileLayout` function definition. Update its signature to accept the new props:

```javascript
function MobileLayout({
  detectorProps,
  nearestStation,
  currentLocation,
  alarmsApi,
  pendingDraft,
  onConsumeDraft,
  onAddAlarmShortcut,
  trip,
  setTrip,
}) {
```

In the `tab === TABS.HOME` branch, find:

```javascript
        {tab === TABS.HOME && (
          <Stack spacing={2}>
            <StationDetector {...detectorProps} />
            {nearestStation && (
              <NextTrainSchedule
                nearestStation={nearestStation}
                onAddAlarm={(d) => {
                  onAddAlarmShortcut(d);
                  setTab(TABS.ALARMS);
                }}
              />
            )}
            <ScheduleSourceInfo />
          </Stack>
        )}
```

Replace with:

```javascript
        {tab === TABS.HOME && (
          <Stack spacing={2}>
            <StationDetector {...detectorProps} />
            {nearestStation && (
              <NextTrainSchedule
                nearestStation={nearestStation}
                onAddAlarm={(d) => {
                  onAddAlarmShortcut(d);
                  setTab(TABS.ALARMS);
                }}
              />
            )}
            <OnTrainCard nearestStation={nearestStation} trip={trip} setTrip={setTrip} />
            <ScheduleSourceInfo />
          </Stack>
        )}
```

In the `tab === TABS.MAP` branch, find:

```javascript
        {tab === TABS.MAP && (
          <StationMap
            currentLocation={currentLocation}
            nearestStation={nearestStation}
            height={'calc(100vh - 220px)'}
          />
        )}
```

Replace with:

```javascript
        {tab === TABS.MAP && (
          <StationMap
            currentLocation={currentLocation}
            nearestStation={nearestStation}
            trip={trip}
            height={'calc(100vh - 220px)'}
          />
        )}
```

- [ ] **Step 4: Render OnTrainCard in DesktopLayout sidebar and pass trip to StationMap**

Find the `DesktopLayout` function definition. Update its signature:

```javascript
function DesktopLayout({
  detectorProps,
  nearestStation,
  currentLocation,
  alarmsApi,
  pendingDraft,
  onConsumeDraft,
  onAddAlarmShortcut,
  trip,
  setTrip,
}) {
```

Find the sidebar `<Stack>` in the body:

```javascript
      <Stack spacing={2} sx={{ width: 360, flexShrink: 0 }}>
        <StationDetector {...detectorProps} />
        <AlarmsPanel
          {...alarmsApi}
          nearestStation={nearestStation}
          pendingDraft={pendingDraft}
          onConsumeDraft={onConsumeDraft}
        />
        <ScheduleSourceInfo />
      </Stack>
```

Insert the OnTrainCard between AlarmsPanel and ScheduleSourceInfo:

```javascript
      <Stack spacing={2} sx={{ width: 360, flexShrink: 0 }}>
        <StationDetector {...detectorProps} />
        <AlarmsPanel
          {...alarmsApi}
          nearestStation={nearestStation}
          pendingDraft={pendingDraft}
          onConsumeDraft={onConsumeDraft}
        />
        <OnTrainCard nearestStation={nearestStation} trip={trip} setTrip={setTrip} />
        <ScheduleSourceInfo />
      </Stack>
```

Find the StationMap in the desktop main column:

```javascript
        <StationMap currentLocation={currentLocation} nearestStation={nearestStation} height={520} />
```

Replace with:

```javascript
        <StationMap
          currentLocation={currentLocation}
          nearestStation={nearestStation}
          trip={trip}
          height={520}
        />
```

- [ ] **Step 5: Verify the wiring with a build**

Run: `cd <repo> && CI=false npm run build 2>&1 | tail -10`

Expected: build succeeds. Bundle size grows by a small amount (~1-3 KB) for OnTrainCard.

- [ ] **Step 6: Commit**

```bash
git add src/App.js
git commit -m "Wire OnTrainCard + trip state in App; share trip with StationMap"
```

---

## Task 7: Final build, full test suite, push, manual verify

- [ ] **Step 1: Run the full jest suite**

Run: `CI=true npm test -- --watchAll=false 2>&1 | tail -20`

Expected: all tests pass (etaCalc + calendar suites).

- [ ] **Step 2: Run a final production build**

Run: `cd <repo> && CI=false npm run build 2>&1 | tail -10`

Expected: build succeeds. The "File sizes after gzip" report should list `main.<hash>.js` ~228-232 KB (was ~226 KB).

- [ ] **Step 3: Push**

```bash
git push origin main
```

The Deploy to GitHub Pages workflow will pick this up and publish to https://alejomarconi.github.io/.

- [ ] **Step 4: Manual verification on the deployed site**

After ~3 minutes, open https://alejomarconi.github.io/ on the iPhone:

1. Reinstall the PWA (delete the old icon, then "Add to Home Screen" again). Confirm the icon on the home screen is `logo_tren.png`, not the default Safari globe.
2. Open the PWA. Detect station. Scroll to "En el tren". Pick a destination far down the line.
3. Confirm:
   - The card shows `Salida HH:MM · Llegada HH:MM · llegás en N min`.
   - Switching to the Mapa tab shows the red polyline overlay between origin and destination, the destination station has the yellow-with-red-border flag marker, and a yellow chip overlays the top-right with `→ <destination> · llegás en N min`.
4. Tap "Programar avisos en Calendario". Confirm the iOS share sheet appears, choose Calendar, save the event.
5. Open iOS Calendar and confirm the event has TWO reminders set (5 min before and at the event time).
6. Tap "Cancelar viaje" — confirm the red overlay, flag marker, and chip disappear.

If any step fails, file a follow-up task; do not block on visual polish.

---

## Self-Review Notes

- **Spec coverage:** Every requirement in the spec is covered:
  - Logo on home screen → Task 1.
  - Trip data model → Task 2 (computeTrip).
  - ETA computation → Task 2.
  - OnTrainCard UI (origin auto, destination select, ETA, two buttons) → Task 4.
  - Auto-clear when trip is +10 min past arrival → Task 4 step 1.
  - Map red overlay → Task 5 step 4.
  - Destination flag icon → Task 5 step 1 + step 4.
  - Floating countdown chip → Task 5 step 5.
  - Two-VALARM iCal export → Task 3 step 3.
  - App wiring → Task 6.
  - Manual test plan → Task 7 step 4.

- **Type consistency:** `computeTrip` returns the same shape consumed by `OnTrainCard`, `StationMap`, and `buildTripICS`. `routeStationsBetween` returns `[lat, lng, name]` tuples and is consumed by both `StationMap.tripRoute` and the test in Task 2.

- **Out-of-scope items not added:** no GPS detection, no transfers, no localStorage persistence — matches the spec.
