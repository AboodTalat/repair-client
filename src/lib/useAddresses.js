"use client";

/**
 * useAddresses — data layer for the customer's saved shipping addresses,
 * branching on auth (same shape of split as useCart):
 *
 *   Logged-in → myAppGetMyAddresses on mount; add/edit via
 *               myAppAddAddress / myAppUpdateAddress, then refetch.
 *   Guest     → empty list. A guest has no server row yet; the checkout page
 *               holds the single address they type in local state and persists
 *               it AFTER registration. saveAddress is a no-op for guests.
 *
 * Backend address shape (addresses.ts) is
 *   { id, label, full_name, phone, country, city, neighborhood, street,
 *     building, apartment, is_default }
 * which we project to the display shape the checkout/account cards consume,
 * adding a flat `line` (via buildAddressLine) and a `kind` (derived from the
 * label, since the backend doesn't store one) for the address-type icon.
 *
 * Hydration-gated like useCart so a logged-in user's saved addresses don't
 * flash empty for a frame before the persisted auth state loads.
 */

import { useCallback, useEffect, useState } from "react";
import { useRepairStore, selectIsLoggedIn } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { buildAddressLine } from "@/lib/mockCart";

// Derive the card icon bucket from the free-text label — the backend has no
// `kind` column. Anything that reads like a workplace → office; explicit
// "other" → other; everything else → home (the safe default).
function kindFromLabel(label) {
  const l = String(label ?? "").toLowerCase();
  if (/office|work|company|business/.test(l)) return "office";
  if (/other/.test(l)) return "other";
  return "home";
}

function toDisplay(addr) {
  return {
    id: addr.id,
    label: addr.label ?? "Address",
    kind: kindFromLabel(addr.label),
    full_name: addr.full_name ?? "",
    phone: addr.phone ?? "",
    line: buildAddressLine(addr),
    isDefault: !!addr.is_default,
    // Structured fields kept so the edit drawer pre-fills correctly.
    country: addr.country ?? "",
    city: addr.city ?? "",
    neighborhood: addr.neighborhood ?? "",
    street: addr.street ?? "",
    building: addr.building ?? "",
    apartment: addr.apartment ?? "",
  };
}

export function useAddresses() {
  const isLoggedIn = useRepairStore(selectIsLoggedIn);

  const [hydrated, setHydrated] = useState(() => useRepairStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useRepairStore.persist.onFinishHydration(() => setHydrated(true));
    if (useRepairStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  const [addresses, setAddresses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      const data = await repairCall("myAppGetMyAddresses", {}, { isQuery: true });
      const list = Array.isArray(data?.addresses) ? data.addresses : [];
      setAddresses(list.map(toDisplay));
      setError(null);
    } catch (e) {
      setError(String(e?.message || "").replace(/^repairClientApi \S+:\s*/, "") || "Could not load addresses");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated && isLoggedIn) refetch();
  }, [hydrated, isLoggedIn, refetch]);

  // Persist an address. `id` present → update, else add. Returns the saved
  // entry's id (so the caller can select it) or null on failure.
  const saveAddress = useCallback(
    async (payload, { id } = {}) => {
      const op = id ? "myAppUpdateAddress" : "myAppAddAddress";
      const vars = id ? { id, ...payload } : payload;
      const data = await repairCall(op, vars, { isQuery: false });
      await refetch();
      return data?.address?.id ?? id ?? null;
    },
    [refetch]
  );

  return {
    addresses: isLoggedIn ? addresses : [],
    loading: !hydrated || (isLoggedIn && !loaded),
    error,
    saveAddress,
    refetch,
    clearError: () => setError(null),
  };
}
