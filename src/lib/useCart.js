"use client";

/**
 * useCart — single data layer for the /cart page, branching on auth:
 *
 *   Guest      → reads/writes the persisted guestCart slice in the store
 *                (synchronous; survives reloads; merged to the DB on login).
 *   Logged-in  → reads myAppGetCart and mutates via myAppUpdateCartItem /
 *                myAppRemoveCartItem, with optimistic UI reconciled by a refetch.
 *
 * Both modes are projected to ONE display shape so the presentational cart
 * components have a single render path:
 *   { id, variantId, name, variantLabel, image, price, qty, maxQty }
 *
 * Totals mirror myAppCheckout (see cartTotals.js) using live commerce settings,
 * so the cart estimate matches what checkout will charge.
 *
 * Hydration: the store rehydrates client-side after first paint, so we gate on
 * persist.hasHydrated() — otherwise a logged-in user (or a guest with a saved
 * cart) would flash "empty" for a frame before the persisted state loads.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRepairStore,
  selectIsLoggedIn,
  selectGuestCartItems,
  selectAppliedPromoCode,
  awaitCartMerge,
} from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { computeCartTotals } from "@/lib/cartTotals";
import { validatePromoCode } from "@/lib/promo";
import useStoreHydrated from "@/lib/useStoreHydrated";

const PROMO_REVALIDATE_MS = 400;

const PLACEHOLDER_IMAGE = "/shop/model-1.png";
const QTY_DEBOUNCE_MS = 350;

// Server (myAppGetCart) / guest line → the display shape the UI consumes.
function toDisplay(line) {
  const price = Number(line.product?.effective_price ?? line.product?.base_price ?? 0);
  const variantLabel = [line.color?.name, line.size?.name].filter(Boolean).join(" / ");
  return {
    id: line.id, // DB cart-row id, or `guest-<variantId>`
    variantId: Number(line.product_variant_id),
    name: line.product?.name ?? "Item",
    variantLabel,
    image: line.image_url || PLACEHOLDER_IMAGE,
    price,
    qty: Number(line.quantity) || 1,
    maxQty: line.in_stock_quantity != null ? Number(line.in_stock_quantity) : null,
  };
}

function cleanMessage(err) {
  const raw = String(err?.message || "");
  return raw.replace(/^repairClientApi \S+:\s*/, "") || "Something went wrong. Please try again.";
}

export function useCart({ shippingMethodKey = "standard" } = {}) {
  const isLoggedIn = useRepairStore(selectIsLoggedIn);
  const guestItems = useRepairStore(selectGuestCartItems);

  // Wait for the persisted store to rehydrate before deciding what to show.
  const hydrated = useStoreHydrated();

  // Logged-in server cart.
  const [serverItems, setServerItems] = useState([]);
  const [serverSubtotal, setServerSubtotal] = useState(null);
  // First-order welcome discount eligibility — read FRESH from myAppGetCart each
  // fetch (server-authoritative), never from the persisted store flag, so the
  // 10%-off preview line can't outlive the discount it represents.
  const [serverWelcomeEligible, setServerWelcomeEligible] = useState(false);
  const [loaded, setLoaded] = useState(false); // first server fetch resolved
  const [error, setError] = useState(null);

  // Live commerce settings for the totals math (public; works logged-out too).
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

  // Full (re)fetch — `silent` keeps the list visible during a mutation reconcile
  // instead of flipping back to the loading state.
  const refetch = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const data = await repairCall("myAppGetCart", {}, { isQuery: true });
        const lines = Array.isArray(data?.items) ? data.items : [];
        setServerItems(lines.map(toDisplay));
        setServerSubtotal(Number(data?.subtotal) || 0);
        setServerWelcomeEligible(!!data?.welcome_discount_eligible);
        setError(null);
      } catch (e) {
        if (!silent) setError(cleanMessage(e));
      } finally {
        setLoaded(true);
      }
    },
    []
  );

  // Fetch the server cart once the store says we're logged in (and hydrated).
  // No need to reset `loaded` here: a guest already has loaded=false, and
  // isLoggedIn only flips true via login-from-guest, so loading stays true
  // through the first fetch on its own.
  //
  // Wait out any in-flight guest-cart merge first: when a guest signs in from
  // the cart CTA, the login form fires mergeGuestCartThenSync() fire-and-forget
  // and redirects here immediately, so an unguarded fetch would race the merge
  // and render the pre-existing DB cart WITHOUT the product the user just added
  // as a guest. awaitCartMerge() resolves the moment those lines have landed
  // (or immediately when no merge is running, so a normal visit is unaffected).
  // `.finally` (not `.then`) so a failed merge still triggers the fetch instead
  // of leaving the page stuck in `loading`.
  useEffect(() => {
    if (!hydrated || !isLoggedIn) return undefined;
    let active = true;
    awaitCartMerge().finally(() => {
      if (active) refetch();
    });
    return () => {
      active = false;
    };
  }, [hydrated, isLoggedIn, refetch]);

  const qtyTimers = useRef({});

  const items = isLoggedIn ? serverItems : guestItems.map(toDisplay);
  // Loading = store not hydrated yet, or logged-in and the first fetch is pending.
  const loading = !hydrated || (isLoggedIn && !loaded);

  const updateQty = useCallback(
    (item, nextQty) => {
      const q = Math.max(1, Number(nextQty) || 1);
      if (q === item.qty) return;

      if (!isLoggedIn) {
        useRepairStore.getState().updateGuestCartItem(item.variantId, q);
        return;
      }

      // Optimistic: update the line + nudge the subtotal so the order total
      // tracks immediately; the debounced server write reconciles the truth.
      const delta = q - item.qty;
      setServerItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty: q } : x)));
      setServerSubtotal((prev) =>
        prev == null ? prev : Math.round((prev + delta * item.price) * 100) / 100
      );

      // Debounce per line — myAppUpdateCartItem writes an ABSOLUTE quantity, so
      // rapid +/+/+ would otherwise fire N racing calls; send only the latest.
      clearTimeout(qtyTimers.current[item.id]);
      qtyTimers.current[item.id] = setTimeout(async () => {
        try {
          await repairCall(
            "myAppUpdateCartItem",
            { cartItemId: item.id, quantity: q },
            { isQuery: false }
          );
          await refetch({ silent: true });
          useRepairStore.getState().syncCart();
        } catch (e) {
          setError(cleanMessage(e)); // e.g. "Only 2 in stock"
          await refetch({ silent: true }); // restore authoritative qty
        }
      }, QTY_DEBOUNCE_MS);
    },
    [isLoggedIn, refetch]
  );

  const removeItem = useCallback(
    async (item) => {
      if (!isLoggedIn) {
        useRepairStore.getState().removeGuestCartItem(item.variantId);
        return;
      }
      // Optimistic removal + subtotal adjust; reconcile on the server response.
      setServerItems((prev) => prev.filter((x) => x.id !== item.id));
      setServerSubtotal((prev) =>
        prev == null ? prev : Math.round((prev - item.price * item.qty) * 100) / 100
      );
      try {
        await repairCall(
          "myAppRemoveCartItem",
          { cartItemId: item.id },
          { isQuery: false }
        );
        useRepairStore.getState().syncCart();
      } catch (e) {
        setError(cleanMessage(e));
        await refetch({ silent: true });
      }
    },
    [isLoggedIn, refetch]
  );

  // ---- Promo code -------------------------------------------------------
  // The applied promo lives in the store (checkoutInfo.appliedPromoCode) so it
  // carries to /checkout for free. We thread its SERVER-computed discount_amount
  // into the totals math (computeCartTotals applies it on the post-promo base).
  const appliedPromo = useRepairStore(selectAppliedPromoCode);
  const [promoError, setPromoError] = useState("");

  const totals = computeCartTotals(
    items,
    settings,
    isLoggedIn ? serverSubtotal : null,
    appliedPromo?.discount_amount ?? 0,
    shippingMethodKey,
    // Guests can't earn it until they register at checkout, so only honour the
    // server-provided eligibility for a logged-in cart.
    isLoggedIn ? serverWelcomeEligible : false
  );

  // Plain functions (recreated each render) so they always close over the
  // current subtotal — they're only invoked from event handlers, never compared
  // by identity, so no useCallback is needed.
  const applyPromo = async (code) => {
    if (!isLoggedIn) return { ok: false, error: "Sign in to apply a promo code." };
    // Welcome discount and promo codes can't be combined — block early with the
    // same message the server returns (defence-in-depth; the UI also hides the
    // promo input while the welcome discount is active).
    if (serverWelcomeEligible) {
      return {
        ok: false,
        error: "Promo codes can't be combined with your first-order welcome discount.",
      };
    }
    const res = await validatePromoCode(code, totals.subtotal);
    if (res.ok) {
      useRepairStore.getState().applyPromoCode(res.promo);
      setPromoError("");
    }
    return res;
  };

  const clearPromo = () => {
    useRepairStore.getState().clearPromoCode();
    setPromoError("");
  };

  // Re-validate against the server whenever the subtotal settles (debounced) so
  // the discount tracks qty changes AND a min-order / usage-limit failure drops
  // the promo with its reason — using the server's math, never a JS copy.
  const appliedCode = appliedPromo?.code ?? null;
  const promoSubtotal = totals.subtotal;
  useEffect(() => {
    // No promo re-validation while the welcome discount is active (they can't
    // be combined; the totals already zero the promo). Also drop any stale
    // applied promo so it doesn't linger in the store.
    if (serverWelcomeEligible && isLoggedIn) {
      if (appliedCode) useRepairStore.getState().clearPromoCode();
      return undefined;
    }
    if (!appliedCode || !isLoggedIn) return undefined;
    let active = true;
    const t = setTimeout(async () => {
      const res = await validatePromoCode(appliedCode, promoSubtotal);
      if (!active) return;
      if (res.ok) {
        useRepairStore.getState().applyPromoCode(res.promo);
        setPromoError("");
      } else {
        useRepairStore.getState().clearPromoCode();
        setPromoError(res.error);
      }
    }, PROMO_REVALIDATE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [appliedCode, promoSubtotal, isLoggedIn, serverWelcomeEligible]);

  return {
    items,
    loading,
    error,
    isGuest: !isLoggedIn,
    totals,
    updateQty,
    removeItem,
    clearError: () => setError(null),
    appliedPromo,
    applyPromo,
    clearPromo,
    promoError,
    clearPromoError: () => setPromoError(""),
  };
}
