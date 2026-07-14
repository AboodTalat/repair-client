"use client";

// PWA + Web Push helpers.
//
// Two SEPARATE PWAs share this origin:
//   • storefront → /sw.js       (scope "/")            — installable only
//   • admin      → /sw-admin.js  (scope "/r3pr-console/") — installable + push
//
// Admin push uses the standard Web Push API + VAPID. The same code path delivers
// to iOS 16.4+ once the console is installed to the home screen (iOS only allows
// push for installed, standalone PWAs — see `pushNeedsInstall()`).

import { repairCall } from "@/lib/repairAuthedApi";
import { useCallback, useEffect, useState } from "react";

const ADMIN_SW_URL = "/sw-admin.js";
const ADMIN_SW_SCOPE = "/r3pr-console/";
const STOREFRONT_SW_URL = "/sw.js";

// ---- environment detection -------------------------------------------------

export function isBrowser() {
  return typeof window !== "undefined";
}

export function pushSupported() {
  return (
    isBrowser() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIOS() {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export function isStandalone() {
  if (!isBrowser()) return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // iOS Safari legacy flag
    window.navigator.standalone === true
  );
}

// iOS refuses Web Push unless the PWA is installed to the home screen (running
// standalone). Everywhere else push works in the browser tab.
export function pushNeedsInstall() {
  return isIOS() && !isStandalone();
}

// ---- service-worker registration -------------------------------------------

export async function registerStorefrontServiceWorker() {
  if (!isBrowser() || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(STOREFRONT_SW_URL, { scope: "/" });
  } catch {
    return null;
  }
}

export async function registerAdminServiceWorker() {
  if (!isBrowser() || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(ADMIN_SW_URL, { scope: ADMIN_SW_SCOPE });
  } catch {
    return null;
  }
}

async function waitUntilActive(reg) {
  if (!reg) return null;
  if (reg.active) return reg;
  const sw = reg.installing || reg.waiting;
  if (!sw) return reg;
  await new Promise((resolve) => {
    const onChange = () => {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", onChange);
        resolve();
      }
    };
    sw.addEventListener("statechange", onChange);
  });
  return reg;
}

// ---- push subscription -----------------------------------------------------

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export async function getAdminPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(ADMIN_SW_SCOPE);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// Request permission (MUST be called from a user gesture), subscribe, and save
// the subscription server-side. Returns { ok, reason? }.
export async function enableAdminPush() {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (pushNeedsInstall()) return { ok: false, reason: "needs-install" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no-vapid-key" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await waitUntilActive(await registerAdminServiceWorker());
  if (!reg) return { ok: false, reason: "no-sw" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  await repairCall(
    "myAppAdminSavePushSubscription",
    { endpoint: json.endpoint, keys: json.keys },
    { isQuery: false }
  );
  return { ok: true };
}

export async function disableAdminPush() {
  const sub = await getAdminPushSubscription();
  if (!sub) return { ok: true };
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore — still remove server-side */
  }
  try {
    await repairCall("myAppAdminDeletePushSubscription", { endpoint }, { isQuery: false });
  } catch {
    /* best-effort */
  }
  return { ok: true };
}

// ---- React hook for the admin push toggle ----------------------------------

export function useAdminPush() {
  const [state, setState] = useState({
    supported: false,
    permission: "default",
    subscribed: false,
    needsInstall: false,
    busy: false,
    error: null,
  });

  // Register the admin SW (installability) + read current push state on mount.
  // Cancelled-flag guarded ONLY (no run-once ref — Strict-Mode-safe).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = pushSupported();
      if (!supported) {
        if (!cancelled) setState((s) => ({ ...s, supported: false }));
        return;
      }
      await registerAdminServiceWorker(); // make the console installable
      const sub = await getAdminPushSubscription();
      if (cancelled) return;
      setState((s) => ({
        ...s,
        supported: true,
        permission: typeof Notification !== "undefined" ? Notification.permission : "default",
        subscribed: !!sub,
        needsInstall: pushNeedsInstall(),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    const res = await enableAdminPush();
    setState((s) => ({
      ...s,
      busy: false,
      subscribed: res.ok ? true : s.subscribed,
      permission: typeof Notification !== "undefined" ? Notification.permission : s.permission,
      needsInstall: pushNeedsInstall(),
      error: res.ok ? null : res.reason,
    }));
    return res;
  }, []);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    await disableAdminPush();
    setState((s) => ({ ...s, busy: false, subscribed: false }));
  }, []);

  return { ...state, enable, disable };
}
