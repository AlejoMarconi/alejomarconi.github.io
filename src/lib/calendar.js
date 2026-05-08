/*
 * Generate an .ics (iCalendar) file for a train alarm and offer it to the
 * device. On iOS, opening an .ics file triggers the "Add to Calendar"
 * flow; iOS Calendar then schedules a system-level reminder that fires
 * reliably even if the PWA is closed and the phone is locked.
 *
 * This is the only way to get truly robust scheduled notifications on
 * iOS PWAs without setting up a Web Push backend.
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Format a Date as 'YYYYMMDDTHHMMSSZ' (UTC) for an iCalendar DTSTAMP.
function toICSUtc(date) {
  return (
    date.getUTCFullYear() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  );
}

// Escape ICS text per RFC5545: backslashes, commas, semicolons, newlines.
function escapeICS(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Build the .ics calendar content for a single alarm.
 * - DTSTART = the train's departure time
 * - VALARM TRIGGER = "-PT{minutesBefore}M" so the OS fires the reminder
 *   `minutesBefore` minutes before DTSTART
 *
 * Date inputs:
 *   alarm.fireEpoch = epoch ms when the alarm SHOULD fire
 *                     (already accounts for minutesBefore + day rollover)
 *   alarm.minutesBefore = how far before the train to alert
 *   trainEpoch = fireEpoch + minutesBefore * 60_000
 */
export function buildAlarmICS(alarm) {
  const trainEpoch = alarm.fireEpoch + alarm.minutesBefore * 60 * 1000;
  const trainStart = new Date(trainEpoch);
  const trainEnd = new Date(trainEpoch + 60 * 1000);
  const stamp = toICSUtc(new Date());
  const dtStart = toICSUtc(trainStart);
  const dtEnd = toICSUtc(trainEnd);
  const uid = `${alarm.id}@urquiza-trenes`;

  const dirLabel =
    alarm.direction === 'a_lemos' ? 'Gral. Lemos' : 'F. Lacroze';
  const summary = `Tren a ${dirLabel} - ${alarm.trainTime}`;
  const description = `Tren del Urquiza saliendo de ${alarm.stationName} hacia ${dirLabel} a las ${alarm.trainTime}.`;

  // RFC5545 recommends folding lines at 75 octets; for short content we
  // skip folding and rely on tolerant parsers (iOS Calendar is fine).
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
    `LOCATION:${escapeICS(`Estación ${alarm.stationName}`)}`,
    'BEGIN:VALARM',
    `TRIGGER:-PT${alarm.minutesBefore}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(`Tren a ${dirLabel} en ${alarm.minutesBefore} min`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // ICS spec calls for CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

function safeFilename(alarm) {
  const direction = alarm.direction === 'a_lemos' ? 'Lemos' : 'Lacroze';
  return `tren-${direction}-${alarm.trainTime.replace(':', '')}.ics`;
}

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
 * a download anchor (desktop fallback).
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

/**
 * Hand the generated .ics to the OS. We try the Web Share API first
 * (gives the user a system sheet to "Add to Calendar"); if that's not
 * available or they cancel, we fall back to a download <a> link.
 *
 * Returns true if we successfully invoked the OS handler, false if
 * everything failed and the user should be informed.
 */
export async function shareAlarmICS(alarm) {
  const ics = buildAlarmICS(alarm);
  const filename = safeFilename(alarm);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], filename, { type: 'text/calendar' });

  // Path 1: native share sheet with files (best on iOS — it offers
  // "Save to Files" and "Calendar")
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({
        files: [file],
        title: 'Agregar tren al Calendario',
        text: 'Importá el evento y iOS te avisará a la hora pactada.',
      });
      return true;
    }
  } catch (err) {
    // user cancelled or share failed; fall through to download
  }

  // Path 2: download via anchor — works on desktop and most mobile
  // browsers. iOS Safari will prompt to add to Calendar when the .ics
  // is opened.
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
