import { useCallback, useEffect, useMemo, useState } from 'react';

function detectPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ios: false, standalone: false, ua: '' };
  }
  const ua = navigator.userAgent || '';
  // iPad on iPadOS 13+ reports as "Macintosh" with touch points; treat that
  // as iOS for our PWA-install gate.
  const ios =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const standalone =
    navigator.standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches);
  return { ios, standalone, ua };
}

const supportsNotifications =
  typeof window !== 'undefined' && 'Notification' in window;

/*
 * Returns a `state` enum the UI can switch on:
 *   'granted'           - user already allowed
 *   'denied'            - user blocked; needs OS-level reset
 *   'default'           - we can call request()
 *   'ios-needs-install' - iOS Safari outside standalone mode; user must
 *                         add the app to the Home Screen first (Apple
 *                         only exposes Notification API to installed
 *                         PWAs since iOS 16.4)
 *   'ios-needs-update'  - iOS but Notification still missing even when
 *                         standalone (pre-iOS 16.4)
 *   'unsupported'       - any other browser without Notification API
 */
export default function useNotificationPermission() {
  const platform = useMemo(detectPlatform, []);

  const computeState = useCallback(() => {
    if (supportsNotifications) {
      return Notification.permission; // 'default' | 'granted' | 'denied'
    }
    if (platform.ios && !platform.standalone) return 'ios-needs-install';
    if (platform.ios && platform.standalone) return 'ios-needs-update';
    return 'unsupported';
  }, [platform]);

  const [state, setState] = useState(computeState);

  // Keep state fresh on focus (user might fix permission in OS settings).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onFocus = () => setState(computeState());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [computeState]);

  const request = useCallback(async () => {
    if (!supportsNotifications) return state;
    try {
      const result = await Notification.requestPermission();
      setState(result);
      return result;
    } catch {
      return Notification.permission;
    }
  }, [state]);

  return {
    state,
    request,
    supported: supportsNotifications,
    isIOS: platform.ios,
    isStandalone: platform.standalone,
    // Back-compat: AlarmsPanel previously used `permission`.
    permission: state,
  };
}
