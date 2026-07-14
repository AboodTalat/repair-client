"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { registerStorefrontServiceWorker } from "@/lib/pwa";

// The admin console (/r3pr-console) runs its OWN service worker (sw-admin.js,
// registered by the admin TopBar). Keep the two PWAs cleanly separated by not
// registering the storefront worker on the role-console routes.
const CONSOLE_PREFIXES = ["/r3pr-console", "/r3pr-ledger", "/r3pr-dispatch"];

export default function StorefrontPwaRegister() {
  const pathname = usePathname();
  useEffect(() => {
    if (CONSOLE_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    registerStorefrontServiceWorker();
  }, [pathname]);
  return null;
}
