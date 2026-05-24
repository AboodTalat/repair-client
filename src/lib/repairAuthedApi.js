"use client";

/**
 * repairAuthedApi — single entry point for client-side API calls that need
 * an auth token.  Wires the store's `authInfo.token` and `refreshAuth()`
 * into graphqlFetchWithRetry so callers don't have to plumb either.
 *
 * Why this is a separate file
 * ───────────────────────────
 * Both useRepairStore.js and components need the call helper, but:
 *   useRepairStore.js → repairClientApi.js   (one-way)
 *   repairAuthedApi.js → useRepairStore.js + repairClientApi.js
 *   components → repairAuthedApi.js
 * Putting the high-level wrapper in its own module keeps repairClientApi.js
 * store-free and avoids a circular import.
 *
 * Usage from any client component / event handler
 * ────────────────────────────────────────────────
 *   import { repairCall } from "@/lib/repairAuthedApi";
 *   import { useRepairStore } from "@/lib/useRepairStore";
 *
 *   async function handleAddToCart(variantId) {
 *     try {
 *       // mutations: isQuery: false
 *       await repairCall(
 *         "myAppAddToCart",
 *         { productVariantId: variantId, quantity: 1 },
 *         { isQuery: false }
 *       );
 *       // optimistic local +1, then reconcile with server
 *       useRepairStore.getState().incrementCartCount(1);
 *       useRepairStore.getState().syncCart();
 *     } catch (err) {
 *       // refresh failed or server returned a non-auth error — show to user
 *       console.error(err);
 *     }
 *   }
 *
 * What you get for free
 * ─────────────────────
 *   • 15-minute access-token expiry → transparent refresh + retry, single-
 *     flight-locked so concurrent calls don't trample each other's tokens.
 *   • If the refresh token is also dead, the store auto-logs the user out
 *     (clearAuth) and the original error rethrows so the UI can redirect.
 *   • Detects "Un Authenticated User" application-level failures (which
 *     the server returns as HTTP 200) and treats them as 401.
 */

import { useRepairStore } from "@/lib/useRepairStore";
import { graphqlFetchWithRetry } from "@/lib/repairClientApi";

/**
 * Call any repair GraphQL operation with auto auth + refresh-retry.
 *
 * @param {string}  operationName       Exact resolver name
 * @param {object}  [variables]         Plain object — JSON-encoded into strObjectInput
 * @param {object}  [options]
 * @param {boolean} [options.isQuery]   true → query, false → mutation (default true)
 *
 * @returns {Promise<unknown>}          Parsed serverResponse payload
 */
export function repairCall(operationName, variables = {}, { isQuery = true } = {}) {
  return graphqlFetchWithRetry(operationName, variables, {
    getToken: () => useRepairStore.getState().authInfo.token,
    refresh: () => useRepairStore.getState().refreshAuth(),
    isQuery,
  });
}
