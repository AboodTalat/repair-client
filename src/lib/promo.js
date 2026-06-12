"use client";

// Promo-code validation — the single client entry point to the backend
// `myAppValidatePromoCode` resolver (orders.ts). Every promo surface (the /cart
// page via useCart, and the /checkout + /checkout/payment pages) funnels through
// here so a code never validates differently across them, and so the discount
// math always comes from the SERVER (no second JS copy of the percent/fixed/cap
// logic that could drift from computePromoDiscount in helpers.ts).
//
// The resolver REQUIRES auth (single-use-per-customer needs a user row), so a
// guest call comes back as a synthesized 401 — callers should short-circuit on
// `isGuest` before calling, but we also translate the 401 to a friendly message
// as a backstop.
//
// Returns a normalized result the callers can store directly:
//   { ok: true,  promo: { code, discount_type, discount_value, discount_amount, total_after } }
//   { ok: false, error: "<reason to show the user>" }
// The shape of `promo` matches the store's `checkoutInfo.appliedPromoCode` slot
// exactly, so callers can `applyPromoCode(promo)` without re-mapping.

import { repairCall } from "@/lib/repairAuthedApi";

function cleanMessage(err) {
  const raw = String(err?.message || "");
  return (
    raw.replace(/^repairClientApi \S+:\s*/, "") || "Something went wrong. Please try again."
  );
}

export async function validatePromoCode(code, cartSubtotal) {
  const trimmed = String(code || "").trim();
  if (!trimmed) return { ok: false, error: "Enter a promo code" };
  try {
    const r = await repairCall(
      "myAppValidatePromoCode",
      { code: trimmed, cartSubtotal: Number(cartSubtotal) || 0 },
      { isQuery: true }
    );
    if (!r?.valid) {
      return { ok: false, error: r?.reason || "That code isn’t valid" };
    }
    return {
      ok: true,
      promo: {
        code: r.code,
        discount_type: r.discount_type,
        discount_value: r.discount_value,
        discount_amount: r.discount_amount,
        total_after: r.total_after,
      },
    };
  } catch (e) {
    if (e?.status === 401) return { ok: false, error: "Sign in to apply a promo code." };
    return { ok: false, error: cleanMessage(e) };
  }
}

// Example promo-code chips for the /cart page. PUBLIC query (works logged-out) —
// the backend `myAppListCartPromoExamples` returns only admin-flagged codes that
// are currently valid (active + not expired + under their usage cap), so a
// customer never sees an example that won't apply. Returns an array of UPPERCASE
// code strings (the chips only render the code; Apply re-validates server-side).
// Swallows errors to an empty list so a transient failure just hides the chips
// rather than surfacing an error on the cart.
export async function fetchCartPromoExamples() {
  try {
    const r = await repairCall("myAppListCartPromoExamples", {}, { isQuery: true });
    const items = Array.isArray(r?.items) ? r.items : [];
    return items
      .map((it) => String(it?.code || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
