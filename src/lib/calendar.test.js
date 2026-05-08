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
