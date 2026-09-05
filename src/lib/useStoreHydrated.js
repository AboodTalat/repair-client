"use client";

import { useSyncExternalStore } from "react";
import { useRepairStore } from "@/lib/useRepairStore";

/**
 * True once the persisted (AES-encrypted localStorage) store has rehydrated.
 *
 * Every surface that reads `authInfo` / `cartInfo` / `wishlistInfo` must wait
 * for this before deciding anything. Without it a returning user is judged
 * signed-out on first paint — the auth guards bounce them to /sign-in, and the
 * cart and wishlist pages flash empty — because the store is still at its
 * initial state when the component first runs.
 *
 * ── Why useSyncExternalStore ────────────────────────────────────────────────
 * This was hand-rolled in 10 places as state + an effect:
 *
 *   const [hydrated, setHydrated] = useState(() => persist.hasHydrated());
 *   useEffect(() => {
 *     const unsub = persist.onFinishHydration(() => setHydrated(true));
 *     if (persist.hasHydrated()) setHydrated(true);   // ← the race patch
 *     return unsub;
 *   }, [hydrated]);
 *
 * The second `hasHydrated()` call is there because hydration can finish between
 * the first render and the effect running — without it the listener is attached
 * too late and never fires, leaving the page gated forever. But it is also a
 * synchronous setState in an effect body (`react-hooks/set-state-in-effect`).
 *
 * `useSyncExternalStore` is the API built for precisely this: it subscribes and
 * then RE-READS the snapshot, so the race the patch existed to cover is closed
 * by the hook itself rather than by a second manual check. No local state, no
 * effect, and nothing left for the rule to flag.
 *
 * The third argument is the server snapshot. It must be `false`: on the server
 * there is no localStorage, so claiming hydration would render the signed-in
 * markup and mismatch the client. Three of the ten copies passed a bare
 * `hasHydrated()` initialiser with no SSR branch; centralising fixes that too.
 */
const subscribe = (onChange) => useRepairStore.persist.onFinishHydration(onChange);
const getSnapshot = () => useRepairStore.persist.hasHydrated();
const getServerSnapshot = () => false;

export default function useStoreHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
