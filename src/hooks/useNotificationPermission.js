import { useCallback, useEffect, useState } from 'react';

const supportsNotifications =
  typeof window !== 'undefined' && 'Notification' in window;

export default function useNotificationPermission() {
  const [permission, setPermission] = useState(() =>
    supportsNotifications ? Notification.permission : 'unsupported',
  );

  // Re-read on focus so external changes (settings) reflect.
  useEffect(() => {
    if (!supportsNotifications) return undefined;
    const onFocus = () => setPermission(Notification.permission);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const request = useCallback(async () => {
    if (!supportsNotifications) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return Notification.permission;
    }
  }, []);

  return { permission, request, supported: supportsNotifications };
}
