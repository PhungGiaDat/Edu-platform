/**
 * Web Push service — iOS home-screen PWA aware (iOS 16.4+).
 *
 * iOS constraints handled here:
 * - Push only works in the INSTALLED standalone PWA → isStandalonePwa()
 *   gates the whole flow; browser-tab users get the install guide instead.
 * - Permission prompt must originate from a user gesture → callers invoke
 *   requestPermissionAndSubscribe() from a click handler.
 * - userVisibleOnly: true is mandatory.
 */
import { request } from './apiClient';

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    false
  );
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/** Permission state, guarding browsers without the API (iOS in-tab). */
export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Full subscribe flow. MUST be called from a user-gesture handler.
 * Returns a result the settings page can render.
 */
export async function requestPermissionAndSubscribe(
  userAgent?: string,
): Promise<{ success: boolean; reason?: string }> {
  if (!notificationsSupported()) return { success: false, reason: 'unsupported' };
  if (isIosLikeBrowserButNotInstalled()) {
    return { success: false, reason: 'needs-home-screen-install' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return { success: false, reason: 'permission-denied' };

  const resp = await request('/api/v1/notifications/vapid-key', { method: 'GET' }) as { public_key?: string };
  if (!resp.public_key) return { success: false, reason: 'server-not-configured' };
  const appServerKey = urlBase64ToUint8Array(resp.public_key);

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as BufferSource,
    }));

  const json = subscription.toJSON() as {
    endpoint: string;
    keys?: { p256dh: string; auth: string };
  };
  if (!json.keys) return { success: false, reason: 'subscribe-failed' };

  await request('/api/v1/notifications/subscribe', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys_p256dh: json.keys.p256dh,
      keys_auth: json.keys.auth,
      user_agent: userAgent ?? navigator.userAgent.slice(0, 512),
    },
  });

  return { success: true };
}

/** Remove the subscription server-side and locally. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!notificationsSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await request('/api/v1/notifications/unsubscribe', {
      method: 'POST',
      body: { endpoint: subscription.endpoint },
    });
  } finally {
    await subscription.unsubscribe();
  }
}

/** iOS Safari (non-installed) cannot do push — needs the home-screen PWA. */
function isIosLikeBrowserButNotInstalled(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  return isIos && !isStandalonePwa();
}
