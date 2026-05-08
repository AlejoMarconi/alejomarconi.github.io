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
