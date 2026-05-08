import { useEffect, useMemo, useState } from 'react';
import trainSchedules from '../data/trainSchedules.json';

const DAY_OF_WEEK_TO_TYPE = {
  0: 'domingos_feriados',
  1: 'lunes_a_viernes',
  2: 'lunes_a_viernes',
  3: 'lunes_a_viernes',
  4: 'lunes_a_viernes',
  5: 'lunes_a_viernes',
  6: 'sabados',
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getDayType(date = new Date()) {
  return DAY_OF_WEEK_TO_TYPE[date.getDay()];
}

export function timeToMinutes(t) {
  if (!t || !TIME_RE.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatWait(minutes) {
  if (minutes == null) return '--';
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Get sorted-and-validated time list for a station/day/direction.
 * Returns array of HH:MM strings.
 */
export function getStationTimes(stationName, dayType, direction) {
  const station = trainSchedules[stationName];
  if (!station) return [];
  const day = station[dayType];
  if (!day) return [];
  const times = day[direction];
  if (!Array.isArray(times)) return [];
  return times
    .filter((t) => TIME_RE.test(t))
    .slice()
    .sort();
}

/**
 * Find the next N trains at a station/direction starting from `nowMinutes`.
 * Wraps to next day if today is exhausted. Each item is
 *   { time: 'HH:MM', minutesUntil: number, isTomorrow: boolean }.
 */
export function findUpcomingTrains(stationName, direction, nowMinutes, count = 3, dayType) {
  const dt = dayType || getDayType();
  const times = getStationTimes(stationName, dt, direction);
  if (!times.length) return [];
  const result = [];
  for (const t of times) {
    const m = timeToMinutes(t);
    if (m == null) continue;
    if (m >= nowMinutes) {
      result.push({ time: t, minutesUntil: m - nowMinutes, isTomorrow: false });
      if (result.length === count) return result;
    }
  }
  // wrap to tomorrow (same day type — best effort if user spans midnight)
  for (const t of times) {
    if (result.length === count) break;
    const m = timeToMinutes(t);
    if (m == null) continue;
    result.push({
      time: t,
      minutesUntil: 24 * 60 - nowMinutes + m,
      isTomorrow: true,
    });
  }
  return result;
}

/**
 * React hook: returns the upcoming trains for a station for both
 * directions, refreshed every `refreshMs` (default 30s). The component
 * receives a stable object so unrelated re-renders are skipped.
 */
export default function useTrainSchedule(stationName, options = {}) {
  const { count = 3, refreshMs = 30 * 1000 } = options;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  return useMemo(() => {
    if (!stationName) {
      return { available: false, dayType: getDayType(now), aLemos: [], aLacroze: [] };
    }
    const dayType = getDayType(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const aLemos = findUpcomingTrains(stationName, 'a_lemos', nowMinutes, count, dayType);
    const aLacroze = findUpcomingTrains(stationName, 'a_lacroze', nowMinutes, count, dayType);
    return {
      available: trainSchedules[stationName] != null,
      dayType,
      aLemos,
      aLacroze,
    };
  }, [stationName, now, count]);
}
