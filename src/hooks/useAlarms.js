import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'urquiza.alarms.v1';

/*
 * Alarm shape:
 *   {
 *     id: string (uuid-ish),
 *     stationName: string,
 *     direction: 'a_lemos' | 'a_lacroze',
 *     minutesBefore: number,  // user input: fire X minutes before the train
 *     trainTime: string,      // 'HH:MM' of the target train (display only)
 *     fireEpoch: number,      // epoch ms when the alarm should ring
 *     fired: boolean,         // already triggered, kept for the user log
 *     createdAt: number,
 *   }
 */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(alarms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  } catch {
    // best effort; ignore quota / private mode errors
  }
}

function vibrate(pattern = [200, 100, 200, 100, 400]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

function showSystemNotification(title, body, tag) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // Prefer the service worker registration so the notification persists
  // when the tab is in background. Fall back to in-page Notification.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.showNotification) {
        reg.showNotification(title, {
          body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag,
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: false,
        });
      } else {
        try {
          new Notification(title, { body, icon: '/logo192.png', tag });
        } catch {
          /* no-op */
        }
      }
    });
  } else {
    try {
      new Notification(title, { body, icon: '/logo192.png', tag });
    } catch {
      /* no-op */
    }
  }
}

let cachedAudio = null;
function getAudio() {
  if (cachedAudio) return cachedAudio;
  try {
    cachedAudio = new Audio(
      // small embedded chime (a bell), base64 wav
      'data:audio/wav;base64,UklGRpgFAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YXQFAAAAAAAA' +
        'A'.repeat(2000),
    );
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
}

function playChime() {
  // Use Web Audio API for a real chime sound (no asset needed)
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.18);
      osc.start(start);
      osc.stop(start + 0.2);
    });
    // close the context after a moment
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // last-resort: try the cached audio (may be silent in some browsers)
    const a = getAudio();
    if (a) a.play().catch(() => {});
  }
}

function fireAlarm(alarm) {
  vibrate();
  playChime();
  const dirLabel = alarm.direction === 'a_lemos' ? 'a Gral. Lemos' : 'a F. Lacroze';
  showSystemNotification(
    `Tren ${dirLabel} en ${alarm.minutesBefore} min`,
    `${alarm.stationName} · sale ${alarm.trainTime}`,
    `alarm-${alarm.id}`,
  );
}

/**
 * Translate a train HH:MM + minutesBefore into the epoch ms when the alarm
 * should fire. If the resulting fire time is in the past, push to the next
 * day so the alarm still rings on the next matching occurrence.
 */
export function computeFireEpoch(trainTime, minutesBefore, now = new Date()) {
  const [h, m] = trainTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let epoch = target.getTime() - minutesBefore * 60 * 1000;
  if (epoch <= now.getTime()) {
    epoch += 24 * 60 * 60 * 1000;
  }
  return epoch;
}

function syncToServiceWorker(alarms) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // .ready resolves only when there's an active worker; this avoids
  // racing the install/activate lifecycle on first load.
  navigator.serviceWorker.ready
    .then((reg) => {
      if (!reg || !reg.active) return;
      reg.active.postMessage({
        type: 'schedule-alarms',
        alarms: alarms.filter((a) => !a.fired),
      });
    })
    .catch(() => {});
}

export default function useAlarms() {
  const [alarms, setAlarms] = useState(() => readStored());
  const tickRef = useRef(null);

  useEffect(() => {
    writeStored(alarms);
    // Push the current pending list to the SW so it can fire timers in
    // background. We do this on every change AND once at mount via the
    // initial render of this effect.
    syncToServiceWorker(alarms);
  }, [alarms]);

  // Re-send to the SW when the page is about to be hidden / closed, so
  // the SW always has the latest schedule before its parent client goes
  // away.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onHide = () => syncToServiceWorker(alarms);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [alarms]);

  // Listen for the SW telling us it already fired an alarm in background.
  // We mark the alarm as fired but skip re-firing in the page tick.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    const onMsg = (event) => {
      if (event.data && event.data.type === 'alarm-fired') {
        setAlarms((prev) =>
          prev.map((a) => (a.id === event.data.id ? { ...a, fired: true } : a)),
        );
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, []);

  // Tick every 15s to evaluate alarms in foreground. If the SW already
  // fired the alarm a while ago (and posted us 'alarm-fired'), we skip
  // re-firing here. Stale alarms (>1 min past) are silently marked fired
  // since the user already got the notification from the SW.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let dirty = false;
      const next = alarms.map((a) => {
        if (!a.fired && a.fireEpoch && a.fireEpoch <= now) {
          if (now - a.fireEpoch < 60 * 1000) {
            fireAlarm(a);
          }
          dirty = true;
          return { ...a, fired: true };
        }
        return a;
      });
      if (dirty) setAlarms(next);
    };
    tick();
    tickRef.current = setInterval(tick, 15 * 1000);
    return () => clearInterval(tickRef.current);
  }, [alarms]);

  const addAlarm = useCallback((alarm) => {
    const enriched = {
      id: uid(),
      fired: false,
      createdAt: Date.now(),
      ...alarm,
    };
    setAlarms((prev) => [...prev, enriched]);
    return enriched.id;
  }, []);

  const removeAlarm = useCallback((id) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearFired = useCallback(() => {
    setAlarms((prev) => prev.filter((a) => !a.fired));
  }, []);

  const testAlarm = useCallback((alarm) => {
    fireAlarm(alarm || {
      id: 'test',
      stationName: 'Prueba',
      direction: 'a_lemos',
      minutesBefore: 0,
      trainTime: '--:--',
    });
  }, []);

  return { alarms, addAlarm, removeAlarm, clearFired, testAlarm };
}
