"use client";

/**
 * useRepairStore — global client state for the repair e-commerce storefront.
 *
 * Slices
 * ──────
 *   authInfo      JWT + refresh token + user identity         (persisted, AES-encrypted)
 *   cartInfo      item count + last-synced timestamp          (persisted)
 *   wishlistInfo  product-id list + last-synced timestamp     (persisted)
 *   lastOrder     most recent successfully-placed order       (persisted — order
 *                                                              confirmation page must
 *                                                              survive a refresh)
 *   checkoutInfo  in-progress checkout selections             (NOT persisted — stale
 *                                                              promos and removed
 *                                                              addresses are bad UX)
 *
 * Source of truth
 * ───────────────
 * Cart and wishlist live in the server database.  The store holds a lightweight
 * cache:
 *   cartInfo.itemCount      — sum of all cart-line quantities, for the header badge
 *   wishlistInfo.productIds — product-id list, for instant heart-icon state
 *
 * Both are refreshed from the server via syncCart() / syncWishlist() on:
 *   • app mount (if a token survived the page reload — StoreProvider triggers this)
 *   • after login / signup / Google OAuth (call sites must trigger this — see
 *     `setAuthInfo` JSDoc)
 *
 * Components do optimistic local updates first (incrementCartCount,
 * toggleWishlistItem) and let the next sync reconcile with the server.
 *
 * 401 handling
 * ────────────
 * Access tokens expire after 30 minutes (server-side `ACCESS_TOKEN_TTL = "30m"`).
 * syncCart and syncWishlist use `graphqlFetchWithRetry` which auto-refreshes
 * once on a 401 and retries — so an idle tab still gets fresh counts.  For
 * component-level API calls, use `repairCall` from `@/lib/repairAuthedApi`
 * which wraps the same retry pattern.
 *
 * Proactive refresh
 * ─────────────────
 * `maybeProactiveRefresh()` peeks at the JWT `exp` claim (read-only, no
 * verification — that's the server's job) and triggers a refresh when fewer
 * than `PROACTIVE_REFRESH_WINDOW_SEC` (default 300s) remain.  StoreProvider
 * fires it on tab focus, on network reconnect, and after rehydrate, so a
 * user returning from a slept tab never sees the "first click is slow"
 * round-trip and a critical surface like checkout never opens with a
 * minutes-from-expiry token.
 *
 * Forced sign-out vs explicit sign-out
 * ────────────────────────────────────
 * `handleSessionExpired()` runs when refresh fails (token reuse detected,
 * 30-day refresh window elapsed, account deactivated server-side).  It
 * clears `authInfo` but PRESERVES `cartInfo`, `wishlistInfo`, and
 * `lastOrder` so the user signs back in and finds their basket intact —
 * the next `syncCart()` / `syncWishlist()` after re-auth reconciles with
 * the server.  `sessionExpired` flag is also set so StoreProvider can
 * surface a toast + redirect to `/sign-in?next=...`.
 *
 * `clearAuth()` is the explicit-logout path — when the user clicks Sign
 * Out, the whole user-scoped slice is wiped including cart/wishlist/last
 * order, because the next visitor on this device may be someone else.
 *
 * Persistence
 * ───────────
 * CryptoJS AES-256 encrypts the serialised JSON blob in localStorage under
 * the key "RepairStore_v1".  The key comes from NEXT_PUBLIC_STORAGE_SECRET_KEY
 * (set in .env.local for dev, in the Vercel project env for prod).  This is
 * obfuscation-level protection — the key ships in the JS bundle.  Real
 * security is server-side: refresh tokens are single-use, 30-day TTL, and
 * the server detects and revokes reused tokens.
 *
 * Refresh tokens
 * ──────────────
 * The module-level `_refreshInFlight` lock ensures concurrent callers share
 * one Promise instead of each firing a new request.  A second request would
 * reuse an already-rotated token — the server detects this and revokes the
 * entire token family, silently logging the user out.
 *
 * Refresh tokens are SLIDING on the server — each successful rotation hands
 * back a brand-new 30-day window, so any user who returns within 30 days of
 * their last activity is never logged out.  Only genuinely abandoned
 * sessions ever expire.
 *
 * Cross-tab auth sync
 * ───────────────────
 * Without coordination, tab A refreshing the token would leave tab B holding
 * the old refresh token; tab B's next 401 would refresh too, reusing tab A's
 * already-rotated token, and the server would revoke the whole family —
 * silently logging the user out of both tabs.  `BroadcastChannel("repair-
 * auth")` ships every token update across tabs immediately so they stay in
 * lock-step.  The applier path (`applyAuthInfoFromBroadcast`) does NOT
 * re-broadcast, which prevents echo storms.
 *
 * SSR / hydration
 * ───────────────
 * `skipHydration: true` keeps Zustand off localStorage during SSR and the
 * initial render.  StoreProvider calls `await rehydrate()` inside useEffect
 * so the store rehydrates only client-side, after first paint.  The `await`
 * matters — even with synchronous storage, Zustand's persist middleware
 * applies the rehydrated state inside a `.then()` callback that runs as a
 * microtask.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import CryptoJS from "crypto-js";
import { graphqlFetch, graphqlFetchWithRetry } from "@/lib/repairClientApi";

// ─── Encryption helpers ───────────────────────────────────────────────────────

const SECRET =
  process.env.NEXT_PUBLIC_STORAGE_SECRET_KEY || "repair-store-fallback-key-change-me";

const secureStorage = {
  getItem(key) {
    try {
      const cipher = localStorage.getItem(key);
      if (!cipher) return null;
      const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
      const plain = bytes.toString(CryptoJS.enc.Utf8);
      return plain || null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      const cipher = CryptoJS.AES.encrypt(value, SECRET).toString();
      localStorage.setItem(key, cipher);
    } catch {
      /* quota exceeded or private-browsing write block — silent */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// ─── Initial state ────────────────────────────────────────────────────────────

const initialAuthInfo = {
  isLoggedIn: false,
  token: null,         // JWT — 30-minute expiry (server constant ACCESS_TOKEN_TTL)
  refreshToken: null,  // opaque 64-hex string — 30-day sliding, single-use rotation
  user: null,          // { id, email, role: "customer"|"admin"|"delivery"|"accounting", is_active }
};

// Proactive-refresh window — when the access token has fewer than this many
// seconds left, the next `maybeProactiveRefresh()` call (fired on tab focus,
// network reconnect, post-rehydrate, and before sensitive flows like
// checkout) will rotate it ahead of the first API call.  Five minutes gives
// us a comfortable buffer for a slow refresh round-trip.
const PROACTIVE_REFRESH_WINDOW_SEC = 5 * 60;

const initialCartInfo = {
  itemCount: 0,      // sum of cart-line quantities — header badge (logged-in)
  lastSynced: null,  // ISO timestamp
};

// Guest cart — the local basket for visitors who aren't signed in. Persisted
// (encrypted) so it survives reloads, then merged into the DB on the next login
// (mergeGuestCartThenSync). INVARIANT: a logged-in user's guestCart is always
// empty — the merge clears it unconditionally, so the two cart sources never
// overlap. Each line mirrors a myAppGetCart line so the cart page can use ONE
// render path for both modes.
const initialGuestCart = {
  // [{ id, product_variant_id, quantity, product:{id,name,base_price,effective_price},
  //    color:{id,name,hex_code}|null, size:{id,name}|null, image_url, currency, line_total }]
  items: [],
};

// Sum of guest-cart line quantities — the badge count for signed-out visitors.
function sumGuestQty(items) {
  return Array.isArray(items)
    ? items.reduce((n, i) => n + (Number(i.quantity) || 0), 0)
    : 0;
}

const initialWishlistInfo = {
  productIds: [],    // number[] — instant heart-icon state without a round-trip
  lastSynced: null,
};

// lastOrder is its own top-level slice (not nested in checkoutInfo) so it can
// be persisted independently. The order-confirmation page reads from here.
const initialLastOrder = null; // { order_id, order_number, total } | null

const initialCheckoutInfo = {
  appliedPromoCode: null,                 // { code, discount_type, discount_value, discount_amount, total_after }
  selectedAddressId: null,                // UUID string
  selectedShippingMethodKey: "standard",  // "standard" | "express" | "pickup"
  selectedPaymentMethodId: null,
};

// ─── Single-flight refresh lock (module-level, NOT in Zustand state) ──────────

let _refreshInFlight = null;

// ─── Guest-cart merge lock (module-level, NOT in Zustand state) ───────────────
//
// Holds the in-flight `mergeGuestCartThenSync()` promise while a freshly-logged-
// in user's guest lines are being pushed into the DB cart. The /cart page reads
// it via `awaitCartMerge()` and waits for it before its first `myAppGetCart`, so
// the cart never renders the pre-existing DB cart a beat BEFORE the just-added
// guest product has landed (the login forms fire the merge fire-and-forget and
// redirect immediately, so without this the fetch races the merge). Null when no
// merge is running → `awaitCartMerge()` resolves immediately and the fetch runs
// without delay.
let _cartMergeInFlight = null;

// ─── JWT exp helper ───────────────────────────────────────────────────────────
//
// Reads the `exp` claim from a JWT WITHOUT verifying the signature — the
// server is the only place that can trust this token cryptographically.
// We only use the timestamp to decide whether to fire a refresh, so a
// tampered token just causes one extra round-trip on the next call.

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // base64url → base64 → string → JSON
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function accessTokenSecondsLeft(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return Math.floor(payload.exp - Date.now() / 1000);
}

// ─── BroadcastChannel — cross-tab auth sync ───────────────────────────────────
//
// Without this, tab A refreshing leaves tab B holding the old refresh token;
// B's next 401 refreshes too, reusing A's already-rotated token, and the
// server's reuse-detection revokes the whole family.  We broadcast every
// auth state change so tabs stay in lock-step.
//
// The applier path (applyAuthInfoFromBroadcast / applySessionExpired) does
// NOT re-broadcast, which prevents echo storms when a third tab receives a
// message and updates its own state.

const AUTH_CHANNEL_NAME = "repair-auth";
let _authChannel = null;

function getAuthChannel() {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel !== "function") return null;
  if (_authChannel) return _authChannel;
  try {
    _authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch {
    _authChannel = null;
  }
  return _authChannel;
}

function broadcastAuth(message) {
  const ch = getAuthChannel();
  if (!ch) return;
  try {
    ch.postMessage(message);
  } catch {
    /* channel closed mid-flight — ignore */
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRepairStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      authInfo: { ...initialAuthInfo },
      cartInfo: { ...initialCartInfo },
      guestCart: { items: [] },
      wishlistInfo: { ...initialWishlistInfo },
      // Demo saved payment cards (client-only — { id, brand, last4, expiry,
      // holder, isDefault }; NEVER a full PAN or CVC). Persisted + user-scoped
      // (wiped on logout). A real card vault / payment processor replaces this.
      paymentCards: [],
      lastOrder: initialLastOrder,
      checkoutInfo: { ...initialCheckoutInfo },

      // Transient (NOT persisted) — the most recent DEMO payment-gateway
      // attempt that was declined, consumed by /checkout/failed to show the
      // attempted amount / card last4 / txn id. Set on a simulated decline,
      // cleared on a successful order (clearCheckout). When a real payment
      // gateway lands this is replaced by the processor's rejection payload.
      // { amount, last4, brand, methodLabel, reason, txnId } | null
      paymentAttempt: null,

      // Transient (NOT persisted) — flips true when a refresh fails OR
      // another tab tells us the session is dead.  StoreProvider subscribes
      // to this and surfaces a toast + redirect to /sign-in?next=<here>.
      sessionExpired: false,

      // ── Auth actions ───────────────────────────────────────────────────────

      /**
       * Call after every auth event: login, signup, Google OAuth, token refresh.
       * Expects the shape every repair auth resolver returns:
       *   { token, refresh_token, user: { id, email, role, is_active } }
       *
       * IMPORTANT: this method only updates auth state.  Login flows should
       * also trigger syncCart() and syncWishlist() right after so the badge
       * counts are fresh for the user's session:
       *
       *   const data = await repairCall("myAppLogin", { email, password });
       *   useRepairStore.getState().setAuthInfo(data);
       *   useRepairStore.getState().syncCart();
       *   useRepairStore.getState().syncWishlist();
       */
      setAuthInfo({ token, refresh_token, user }) {
        const next = {
          isLoggedIn: true,
          token,
          refreshToken: refresh_token,
          user,
        };
        set({ authInfo: next, sessionExpired: false });
        // Broadcast so other tabs adopt the same fresh token pair and don't
        // independently try to refresh the now-rotated one.
        broadcastAuth({ kind: "auth-updated", at: Date.now(), authInfo: next });
      },

      /**
       * Apply auth state from a BroadcastChannel message coming from a
       * sibling tab.  Does NOT re-broadcast — that would echo forever in a
       * 3+ tab setup.  Used only by the channel receiver.
       */
      applyAuthInfoFromBroadcast(authInfo) {
        if (!authInfo || typeof authInfo !== "object") return;
        set({ authInfo: { ...initialAuthInfo, ...authInfo }, sessionExpired: false });
      },

      /**
       * Explicit user-initiated logout. Wipes EVERYTHING user-scoped,
       * including cart/wishlist/lastOrder — the next person on this device
       * may not be the same user. Broadcasts so sibling tabs sign out too.
       */
      clearAuth() {
        set({
          authInfo: { ...initialAuthInfo },
          cartInfo: { ...initialCartInfo },
          guestCart: { items: [] },
          wishlistInfo: { ...initialWishlistInfo },
          lastOrder: initialLastOrder,
          checkoutInfo: { ...initialCheckoutInfo },
          paymentCards: [],
          sessionExpired: false,
        });
        broadcastAuth({ kind: "auth-cleared", at: Date.now() });
      },

      /**
       * Forced sign-out (refresh failed, token reuse detected server-side,
       * account deactivated, or 30-day refresh window finally elapsed).
       *
       * Wipes only the auth slice — cart/wishlist/lastOrder stay cached so
       * the user signs back in and their basket is right where they left
       * it.  The next syncCart/syncWishlist after re-auth reconciles with
       * the server.  `sessionExpired` is set so StoreProvider surfaces a
       * toast + redirect to /sign-in?next=<current path>.
       *
       * Also broadcasts so sibling tabs hit the same expired state at the
       * same moment instead of each discovering it independently with their
       * own failed refresh attempt.
       */
      handleSessionExpired() {
        const { authInfo, sessionExpired } = get();
        // Idempotent: avoid re-broadcasting if a sibling tab already pushed
        // this to us, and don't fire if the user wasn't logged in anyway
        // (e.g. background sync race on a fresh tab).
        if (sessionExpired) return;
        if (!authInfo.isLoggedIn) {
          set({ sessionExpired: true });
          return;
        }
        set({
          authInfo: { ...initialAuthInfo },
          checkoutInfo: { ...initialCheckoutInfo },
          sessionExpired: true,
          // cartInfo / wishlistInfo / lastOrder DELIBERATELY preserved.
        });
        broadcastAuth({ kind: "session-expired", at: Date.now() });
      },

      /** Receiver-side mirror of handleSessionExpired — no rebroadcast. */
      applySessionExpiredFromBroadcast() {
        if (get().sessionExpired) return;
        set({
          authInfo: { ...initialAuthInfo },
          checkoutInfo: { ...initialCheckoutInfo },
          sessionExpired: true,
        });
      },

      /** Clear the sessionExpired flag — call after the UI has handled it. */
      clearSessionExpired() {
        set({ sessionExpired: false });
      },

      /**
       * Exchange the stored refresh token for a fresh access + refresh pair.
       *
       * Single-flight: concurrent callers share the same Promise so only one
       * network request fires.  Without this lock a second in-flight 401
       * would reuse an already-rotated token, causing server-side family
       * revocation and a silent logout.
       *
       * `myAppRefreshToken` is a Mutation (revokes old + mints new).  The
       * server's safeParse expects camelCase `refreshToken`.
       *
       * @returns {Promise<string|null>}  New access token on success, null on failure
       */
      async refreshAuth() {
        if (_refreshInFlight) return _refreshInFlight;

        _refreshInFlight = (async () => {
          const { authInfo } = get();
          if (!authInfo.refreshToken) {
            // No refresh token at all — this only happens to a tab that
            // never had a session.  Don't trigger sessionExpired UX since
            // the user wasn't actually signed in.
            return null;
          }

          try {
            const data = await graphqlFetch(
              "myAppRefreshToken",
              { refreshToken: authInfo.refreshToken },
              { token: null, isQuery: false }
            );
            get().setAuthInfo(data);
            return data.token;
          } catch {
            // Refresh failed: 30-day window elapsed, token revoked, account
            // deactivated, or family-revocation hit.  Fall into the forced-
            // sign-out path so cart/wishlist survive and StoreProvider can
            // redirect with ?next=<current page>.
            get().handleSessionExpired();
            return null;
          }
        })();

        try {
          return await _refreshInFlight;
        } finally {
          _refreshInFlight = null;
        }
      },

      /**
       * Refresh the access token if it has fewer than
       * PROACTIVE_REFRESH_WINDOW_SEC seconds left.  Cheap to call — does
       * nothing if the token is still fresh.  Used by StoreProvider on tab
       * focus / network reconnect / post-rehydrate, and by sensitive flows
       * (e.g. opening /checkout/payment) to avoid mid-action 401s.
       *
       * @returns {Promise<string|null>}  Current token after the (possible)
       *                                  refresh, or null if no session.
       */
      async maybeProactiveRefresh() {
        const { authInfo, refreshAuth } = get();
        if (!authInfo.isLoggedIn || !authInfo.token) return null;

        const secondsLeft = accessTokenSecondsLeft(authInfo.token);
        // Unknown exp (malformed token) → safest to refresh once.
        if (secondsLeft == null) return refreshAuth();
        if (secondsLeft > PROACTIVE_REFRESH_WINDOW_SEC) return authInfo.token;

        return refreshAuth();
      },

      /** Read-only helper — seconds until the current access token expires. */
      getAccessTokenSecondsLeft() {
        return accessTokenSecondsLeft(get().authInfo.token);
      },

      // ── Cart actions ───────────────────────────────────────────────────────

      /**
       * Fetch the live cart from the server and update itemCount.
       *
       * Uses graphqlFetchWithRetry so an expired 15-minute access token is
       * transparently refreshed.  All other errors (offline, server down,
       * etc.) are swallowed silently — we keep the cached count rather than
       * blinking it to 0.
       */
      async syncCart() {
        if (!get().authInfo.isLoggedIn) return;

        try {
          const data = await graphqlFetchWithRetry(
            "myAppGetCart",
            {},
            {
              getToken: () => get().authInfo.token,
              refresh: () => get().refreshAuth(),
              isQuery: true,
            }
          );
          const count = Array.isArray(data?.items)
            ? data.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
            : 0;
          set((s) => ({
            cartInfo: { ...s.cartInfo, itemCount: count, lastSynced: new Date().toISOString() },
          }));
        } catch {
          /* offline or refresh-also-failed — keep cached value */
        }
      },

      /** Set exact item count after a full cart fetch outside the store. */
      setCartCount(count) {
        set((s) => ({
          cartInfo: {
            ...s.cartInfo,
            itemCount: Math.max(0, count),
            lastSynced: new Date().toISOString(),
          },
        }));
      },

      /** Optimistic +N immediately after an add-to-cart mutation fires. */
      incrementCartCount(by = 1) {
        set((s) => ({
          cartInfo: { ...s.cartInfo, itemCount: Math.max(0, s.cartInfo.itemCount + by) },
        }));
      },

      /** Optimistic −N immediately after a remove-from-cart mutation fires. */
      decrementCartCount(by = 1) {
        set((s) => ({
          cartInfo: { ...s.cartInfo, itemCount: Math.max(0, s.cartInfo.itemCount - by) },
        }));
      },

      clearCart() {
        set({ cartInfo: { ...initialCartInfo } });
      },

      /** Wipe the guest cart (used by the login-merge; safe to call anytime). */
      clearGuestCart() {
        set({ guestCart: { items: [] } });
      },

      /** Set a guest cart line's quantity (clamped ≥1), recomputing line_total. */
      updateGuestCartItem(variantId, quantity) {
        const q = Math.max(1, Number(quantity) || 1);
        set((s) => ({
          guestCart: {
            items: s.guestCart.items.map((i) => {
              if (Number(i.product_variant_id) !== Number(variantId)) return i;
              const unit = Number(i.product?.effective_price ?? i.product?.base_price ?? 0);
              return { ...i, quantity: q, line_total: Number((unit * q).toFixed(2)) };
            }),
          },
        }));
      },

      /** Remove a guest cart line by its variant id. */
      removeGuestCartItem(variantId) {
        set((s) => ({
          guestCart: {
            items: s.guestCart.items.filter(
              (i) => Number(i.product_variant_id) !== Number(variantId)
            ),
          },
        }));
      },

      /**
       * Unified add-to-cart for both modes.
       *
       *   Logged-in → server upsert via myAppAddToCart (the resolver stock-checks
       *     under FOR UPDATE). Badge is bumped optimistically, reconciled by
       *     syncCart on success, and reverted on failure.
       *   Guest     → the line is stored in the persisted guestCart, summing the
       *     quantity per variant exactly like the server's (user, variant) upsert
       *     so add behavior is identical across modes. Survives reloads and is
       *     merged into the DB on the next login.
       *
       * `line` is built by the caller from the product detail and mirrors a
       * myAppGetCart line so the cart page has ONE render path:
       *   { variantId, quantity, product:{id,name,base_price,effective_price},
       *     color:{id,name,hex_code}|null, size:{id,name}|null, image_url, currency? }
       *
       * Resolves on success; REJECTS with a clean server message on failure
       * (e.g. "Only 2 in stock") so the caller can surface it. Stock is NEVER
       * enforced client-side — the server is the only gate (here + checkout).
       *
       * Uses graphqlFetchWithRetry (not repairCall) to keep the store free of a
       * circular import — same pattern as syncCart.
       */
      async addToCart(line) {
        const variantId = Number(line?.variantId);
        const qty = Math.max(1, Number(line?.quantity) || 1);
        if (!Number.isFinite(variantId)) throw new Error("Invalid item");

        if (get().authInfo.isLoggedIn) {
          get().incrementCartCount(qty); // optimistic badge
          try {
            await graphqlFetchWithRetry(
              "myAppAddToCart",
              { productVariantId: variantId, quantity: qty },
              {
                getToken: () => get().authInfo.token,
                refresh: () => get().refreshAuth(),
                isQuery: false,
              }
            );
            get().syncCart(); // reconcile exact count (fire-and-forget)
            return { ok: true };
          } catch (err) {
            get().decrementCartCount(qty); // revert optimistic bump
            const raw = String(err?.message || "");
            const clean = raw.replace(/^repairClientApi \S+:\s*/, "");
            throw new Error(clean || "Couldn’t add to cart. Please try again.");
          }
        }

        // Guest — upsert into the persisted local cart.
        const unit = Number(line.product?.effective_price ?? line.product?.base_price ?? 0);
        set((s) => {
          const items = [...s.guestCart.items];
          const idx = items.findIndex((i) => Number(i.product_variant_id) === variantId);
          if (idx >= 0) {
            const nextQty = Number(items[idx].quantity) + qty;
            items[idx] = {
              ...items[idx],
              quantity: nextQty,
              line_total: Number((unit * nextQty).toFixed(2)),
            };
          } else {
            items.push({
              id: `guest-${variantId}`,
              product_variant_id: variantId,
              quantity: qty,
              product: line.product ?? null,
              color: line.color ?? null,
              size: line.size ?? null,
              image_url: line.image_url ?? null,
              currency: line.currency ?? "JOD",
              line_total: Number((unit * qty).toFixed(2)),
            });
          }
          return { guestCart: { items } };
        });
        return { ok: true };
      },

      /**
       * Merge the guest cart into the DB at a genuine login point, then
       * reconcile the badge. Call this INSTEAD of syncCart() right after
       * setAuthInfo on login / signup / OAuth — NOT on token refresh (which
       * also calls setAuthInfo).
       *
       * Ordering matters:
       *   1. Seed cartInfo.itemCount from the guest sum SYNCHRONOUSLY — the
       *      moment isLoggedIn flips, selectCartCount switches to
       *      cartInfo.itemCount; seeding avoids a N→0→N badge blink.
       *   2. Push each guest line (parallel; per-line failures swallowed — an
       *      item may have sold out since it was added).
       *   3. Clear the guest cart UNCONDITIONALLY (logged-in ⇒ guestCart empty).
       *   4. syncCart() for the exact server count.
       *
       * Callers fire this WITHOUT awaiting and proceed to redirect; the internal
       * order above is preserved regardless.
       */
      async mergeGuestCartThenSync() {
        // Wrap the merge in a module-level promise the /cart page can await
        // (awaitCartMerge) so its first myAppGetCart runs AFTER the guest lines
        // have landed in the DB — callers fire this fire-and-forget and redirect
        // immediately, so the cart fetch would otherwise race the pushes. The
        // synchronous `setCartCount` seed below still runs before the first
        // await (the IIFE executes synchronously up to `await Promise.all`), so
        // the badge never blinks N→0→N and `_cartMergeInFlight` is always set
        // before this function suspends.
        const run = (async () => {
          const items = get().guestCart.items;
          if (items.length) {
            get().setCartCount(sumGuestQty(items)); // seed → no blink
            const results = await Promise.all(
              items.map(async (it) => {
                try {
                  await graphqlFetchWithRetry(
                    "myAppAddToCart",
                    {
                      productVariantId: Number(it.product_variant_id),
                      quantity: Number(it.quantity) || 1,
                    },
                    {
                      getToken: () => get().authInfo.token,
                      refresh: () => get().refreshAuth(),
                      isQuery: false,
                    }
                  );
                  return { it, keep: false }; // pushed to the DB cart → drop from guest
                } catch (err) {
                  // Distinguish a PERMANENT application rejection (the variant
                  // sold out / no longer exists — message "…myAppAddToCart: …",
                  // no HTTP status) from a TRANSIENT failure (network TypeError,
                  // 5xx, or 401-after-failed-refresh — has a status, or a
                  // non-app-level message). Only drop permanent rejections; KEEP
                  // transient ones in the guest cart so a flaky moment during
                  // login can't silently lose the basket (the next merge retries
                  // them). Previously every failure was swallowed and the guest
                  // cart was cleared unconditionally.
                  const appLevelReject =
                    err?.status == null && /myAppAddToCart:/.test(err?.message || "");
                  return { it, keep: !appLevelReject };
                }
              })
            );
            const leftover = results.filter((r) => r.keep).map((r) => r.it);
            set({ guestCart: { items: leftover } });
          } else {
            set({ guestCart: { items: [] } }); // invariant: logged-in ⇒ no guest cart
          }
          // Badge reconcile — fire-and-forget so the merge promise resolves the
          // moment the DB cart is complete (the point the /cart fetch waits for),
          // not after a second round-trip.
          get().syncCart();
        })();
        _cartMergeInFlight = run;
        try {
          await run;
        } finally {
          if (_cartMergeInFlight === run) _cartMergeInFlight = null;
        }
      },

      // ── Wishlist actions ───────────────────────────────────────────────────

      /**
       * Fetch the live wishlist from the server and update productIds.
       * Same retry semantics as syncCart.
       */
      async syncWishlist() {
        if (!get().authInfo.isLoggedIn) return;

        try {
          const data = await graphqlFetchWithRetry(
            "myAppGetWishlist",
            {},
            {
              getToken: () => get().authInfo.token,
              refresh: () => get().refreshAuth(),
              isQuery: true,
            }
          );
          // Normalize to Number — product_id arrives as a BIGINT (often a
          // string from mysql2), while product.id on the storefront is also
          // raw; coercing both sides here is what makes the heart's
          // `productIds.includes(Number(product.id))` check actually match.
          const ids = Array.isArray(data?.items)
            ? data.items
                .map((item) => Number(item.product_id))
                .filter((id) => Number.isFinite(id))
            : [];
          set({
            wishlistInfo: { productIds: ids, lastSynced: new Date().toISOString() },
          });
        } catch {
          /* offline or refresh-also-failed — keep cached ids */
        }
      },

      /** Overwrite the full product-id list from outside the store. */
      setWishlistIds(ids) {
        set({
          wishlistInfo: {
            productIds: Array.isArray(ids) ? ids : [],
            lastSynced: new Date().toISOString(),
          },
        });
      },

      /**
       * Optimistic heart-toggle (LOCAL only). Adds if absent, removes if
       * present. Ids are normalized to Number so the list stays type-consistent
       * with the storefront's `product.id`. Always follow this with the actual
       * API mutation; revert on error — `toggleWishlist` below does both.
       */
      toggleWishlistItem(productId) {
        const pid = Number(productId);
        if (!Number.isFinite(pid)) return;
        set((s) => {
          const ids = s.wishlistInfo.productIds;
          const next = ids.includes(pid)
            ? ids.filter((id) => id !== pid)
            : [...ids, pid];
          return { wishlistInfo: { ...s.wishlistInfo, productIds: next } };
        });
      },

      /**
       * Server-backed wishlist toggle for logged-in users. Optimistically flips
       * the local heart, persists via myAppToggleWishlist, and reverts the
       * optimistic flip on failure. No-op for guests (wishlist is user-scoped on
       * the server — there's no local wishlist like the guest cart).
       *
       * Uses graphqlFetchWithRetry (not repairCall) to keep the store free of
       * the store→repairAuthedApi→store circular import — same pattern as
       * addToCart / syncCart. We DON'T reconcile against the server's `{added}`
       * boolean: the optimistic flip already matches, and the next syncWishlist
       * is the reconciler. Resolves to the new wishlisted boolean.
       */
      async toggleWishlist(productId) {
        const pid = Number(productId);
        if (!Number.isFinite(pid)) throw new Error("Invalid item");
        if (!get().authInfo.isLoggedIn) return false;

        const willAdd = !get().wishlistInfo.productIds.includes(pid);
        get().toggleWishlistItem(pid); // optimistic
        try {
          await graphqlFetchWithRetry(
            "myAppToggleWishlist",
            { productId: pid },
            {
              getToken: () => get().authInfo.token,
              refresh: () => get().refreshAuth(),
              isQuery: false,
            }
          );
          return willAdd;
        } catch (err) {
          get().toggleWishlistItem(pid); // revert
          const raw = String(err?.message || "");
          const clean = raw.replace(/^repairClientApi \S+:\s*/, "");
          throw new Error(clean || "Couldn’t update wishlist. Please try again.");
        }
      },

      clearWishlist() {
        set({ wishlistInfo: { ...initialWishlistInfo } });
      },

      // ── Last-order actions (persisted) ─────────────────────────────────────

      /**
       * Store the result of myAppCheckout: { order_id, order_number, total }.
       * Persisted so the order-confirmation page survives a refresh.
       */
      setLastPlacedOrder(order) {
        set({ lastOrder: order });
      },

      clearLastOrder() {
        set({ lastOrder: initialLastOrder });
      },

      // ── Saved payment cards (demo; client-only) ────────────────────────────
      //
      // These back the /checkout/payment saved-card list + "Add New Card" flow
      // while there's no real card vault. Only brand/last4/expiry/holder are
      // kept — AddCardDrawer derives those and never returns the full PAN/CVC.

      /** Append a card (first card becomes the default). Returns its id. */
      addPaymentCard(card) {
        const id = card.id ?? `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        set((s) => {
          const isFirst = s.paymentCards.length === 0;
          const entry = {
            id,
            brand: card.brand ?? "unknown",
            last4: card.last4 ?? "",
            expiry: card.expiry ?? "",
            holder: card.holder ?? "",
            isDefault: isFirst,
          };
          return { paymentCards: [...s.paymentCards, entry] };
        });
        return id;
      },

      /** Remove a card; promote a remaining one to default if needed. */
      removePaymentCard(id) {
        set((s) => {
          const remaining = s.paymentCards.filter((c) => c.id !== id);
          const removedDefault = s.paymentCards.find((c) => c.id === id)?.isDefault;
          if (removedDefault && remaining.length && !remaining.some((c) => c.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { paymentCards: remaining };
        });
      },

      /**
       * Set the default card (radio: at most one). Clicking the current default
       * toggles it OFF (no default) — mirrors the address single-default UX.
       */
      setDefaultPaymentCard(id) {
        set((s) => {
          const turningOff = !!s.paymentCards.find((c) => c.id === id)?.isDefault;
          return {
            paymentCards: s.paymentCards.map((c) => ({
              ...c,
              isDefault: turningOff ? false : c.id === id,
            })),
          };
        });
      },

      // ── Checkout actions (in-memory only) ──────────────────────────────────

      /** Store the validated promo result from myAppValidatePromoCode. */
      applyPromoCode(result) {
        set((s) => ({
          checkoutInfo: { ...s.checkoutInfo, appliedPromoCode: result },
        }));
      },

      clearPromoCode() {
        set((s) => ({
          checkoutInfo: { ...s.checkoutInfo, appliedPromoCode: null },
        }));
      },

      setSelectedAddress(id) {
        set((s) => ({
          checkoutInfo: { ...s.checkoutInfo, selectedAddressId: id },
        }));
      },

      /** "standard" | "express" | "pickup" */
      setShippingMethod(key) {
        set((s) => ({
          checkoutInfo: { ...s.checkoutInfo, selectedShippingMethodKey: key },
        }));
      },

      setSelectedPaymentMethod(id) {
        set((s) => ({
          checkoutInfo: { ...s.checkoutInfo, selectedPaymentMethodId: id },
        }));
      },

      /** Wipe in-progress checkout selections + any stale declined-payment
       *  attempt.  Does NOT touch lastOrder. */
      clearCheckout() {
        set({ checkoutInfo: { ...initialCheckoutInfo }, paymentAttempt: null });
      },

      /**
       * Record a DEMO-gateway declined payment so /checkout/failed can show
       * the attempted amount / card last4 / txn id. Transient (not persisted)
       * — a refresh of the failed page falls back to a generic message.
       */
      setPaymentAttempt(attempt) {
        set({ paymentAttempt: attempt });
      },

      clearPaymentAttempt() {
        set({ paymentAttempt: null });
      },

      // ── Global reset ───────────────────────────────────────────────────────

      /**
       * Hard reset: clears every slice AND removes the encrypted localStorage
       * entry.  Use for logout from the UI, or when storage integrity is
       * suspect (e.g. a decryption failure on rehydrate).
       */
      resetStore() {
        set({
          authInfo: { ...initialAuthInfo },
          cartInfo: { ...initialCartInfo },
          guestCart: { items: [] },
          wishlistInfo: { ...initialWishlistInfo },
          lastOrder: initialLastOrder,
          checkoutInfo: { ...initialCheckoutInfo },
          paymentCards: [],
        });
        useRepairStore.persist.clearStorage();
      },

      // ── Read helpers (usable outside React via getState()) ─────────────────

      getAuthInfo: () => get().authInfo,
      getToken: () => get().authInfo.token,
      getCheckoutInfo: () => get().checkoutInfo,
      getLastOrder: () => get().lastOrder,
    }),

    // ── Persist config ──────────────────────────────────────────────────────
    {
      name: "RepairStore_v1",
      storage: createJSONStorage(() => secureStorage),
      // Hydrate manually from StoreProvider (client-only) to avoid SSR mismatch.
      skipHydration: true,
      // Persist auth + caches + the last order receipt.  checkoutInfo is
      // intentionally excluded — stale promo codes / address selections
      // should not survive a page reload.
      partialize: (state) => ({
        authInfo: state.authInfo,
        cartInfo: state.cartInfo,
        guestCart: state.guestCart,
        wishlistInfo: state.wishlistInfo,
        lastOrder: state.lastOrder,
        paymentCards: state.paymentCards,
      }),
    }
  )
);

// ─── Storage-deletion listener ────────────────────────────────────────────────
//
// Detects three scenarios where the persisted key might disappear while the
// app is open:
//   1. Another tab calls localStorage.removeItem / localStorage.clear
//   2. The key was already gone when this tab loaded
//   3. Same-tab deletion by a third-party script
//
// Returns a cleanup function — pass directly to useEffect's return value.

export function initRepairStoreListener() {
  const STORE_KEY = "RepairStore_v1";

  function checkAndReset() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw && useRepairStore.getState().authInfo.isLoggedIn) {
        useRepairStore.getState().resetStore();
      }
    } catch {
      /* localStorage blocked (e.g. strict private browsing) */
    }
  }

  function onStorageEvent(e) {
    if (e.key === null || e.key === STORE_KEY) {
      checkAndReset();
    }
  }

  // ─── BroadcastChannel — cross-tab auth sync ──────────────────────────────
  //
  // Receive auth updates from sibling tabs and mirror them locally without
  // re-broadcasting (the applier paths skip the postMessage step).
  const ch = getAuthChannel();
  function onChannelMessage(e) {
    const msg = e?.data;
    if (!msg || typeof msg !== "object") return;
    const state = useRepairStore.getState();
    switch (msg.kind) {
      case "auth-updated":
        if (msg.authInfo) state.applyAuthInfoFromBroadcast(msg.authInfo);
        break;
      case "auth-cleared":
        // Another tab clicked Sign Out — wipe everything locally too. Must mirror
        // clearAuth() exactly (incl. guestCart) or a sibling-tab logout leaks the
        // local basket on this tab.
        useRepairStore.setState({
          authInfo: { ...initialAuthInfo },
          cartInfo: { ...initialCartInfo },
          guestCart: { items: [] },
          wishlistInfo: { ...initialWishlistInfo },
          lastOrder: initialLastOrder,
          checkoutInfo: { ...initialCheckoutInfo },
          paymentCards: [],
          sessionExpired: false,
        });
        break;
      case "session-expired":
        state.applySessionExpiredFromBroadcast();
        break;
      default:
        break;
    }
  }
  if (ch) ch.addEventListener("message", onChannelMessage);

  checkAndReset();
  const interval = setInterval(checkAndReset, 1000);
  window.addEventListener("storage", onStorageEvent);

  return function cleanup() {
    window.removeEventListener("storage", onStorageEvent);
    clearInterval(interval);
    if (ch) ch.removeEventListener("message", onChannelMessage);
  };
}

// ─── Selector helpers ─────────────────────────────────────────────────────────
//
// Use these inline-friendly selectors in component code:
//
//   const isLoggedIn = useRepairStore(selectIsLoggedIn);
//   const cartCount  = useRepairStore(selectCartCount);
//
// For per-id checks like "is this product wishlisted?", the inline form is
// just as good and avoids the closure-factory dance:
//
//   const isWishlisted = useRepairStore((s) => s.wishlistInfo.productIds.includes(productId));

export const selectIsLoggedIn = (s) => s.authInfo.isLoggedIn;
export const selectUser = (s) => s.authInfo.user;
export const selectToken = (s) => s.authInfo.token;
// Badge count is derived per mode — one source of truth each, so it can't drift
// on rehydrate: the server-synced itemCount when signed in, the guest-cart sum
// otherwise. Returns a primitive (referentially stable → no extra re-renders).
export const selectCartCount = (s) =>
  s.authInfo.isLoggedIn ? s.cartInfo.itemCount : sumGuestQty(s.guestCart.items);
export const selectGuestCartItems = (s) => s.guestCart.items;
export const selectWishlistIds = (s) => s.wishlistInfo.productIds;
export const selectCheckoutInfo = (s) => s.checkoutInfo;
export const selectAppliedPromoCode = (s) => s.checkoutInfo.appliedPromoCode;
export const selectLastPlacedOrder = (s) => s.lastOrder;
export const selectPaymentCards = (s) => s.paymentCards;
export const selectPaymentAttempt = (s) => s.paymentAttempt;
export const selectSessionExpired = (s) => s.sessionExpired;

// Resolves once any in-flight guest-cart merge (mergeGuestCartThenSync) has
// pushed its lines into the DB and cleared the guest cart. The /cart page awaits
// this before its first myAppGetCart so a just-signed-in user sees the merged
// cart (their pre-existing DB lines + the product they added as a guest) instead
// of racing the merge. Resolves immediately when no merge is running. Never
// rejects — a failed merge must not strand the cart page in its loading state.
export function awaitCartMerge() {
  return (_cartMergeInFlight ?? Promise.resolve()).catch(() => {});
}
