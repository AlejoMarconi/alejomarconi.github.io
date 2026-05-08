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
