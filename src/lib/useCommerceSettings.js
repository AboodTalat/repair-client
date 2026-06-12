"use client";

// useCommerceSettings — one-shot client fetch of the public commerce-settings
// bundle (myAppGetCommerceSettings: { shipping, tax, shippingMethods, ... }).
//
// Public resolver, so it works logged-out too (repairCall just omits the auth
// header). Returns `null` until the fetch resolves; callers degrade gracefully
// (no tax / no charges) while it's null. Failures are swallowed — the page
// still renders, the estimate just omits live charges until settings load.
//
// Shared by the /cart-adjacent checkout clients so the tax math matches what
// the server will charge. (The /cart page fetches the same bundle inside
// useCart; this hook is the standalone version for the checkout surfaces.)

import { useEffect, useState } from "react";
import { repairCall } from "@/lib/repairAuthedApi";

export function useCommerceSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    let active = true;
    repairCall("myAppGetCommerceSettings", {}, { isQuery: true })
      .then((d) => active && setSettings(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return settings;
}
