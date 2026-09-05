// Unit tests for the security-critical auth + cart state machine in
// useRepairStore.js. Needs localStorage + window (for the persist round-trip
// and the BroadcastChannel path); the GraphQL transport is mocked at the
// module seam (@/lib/repairClientApi) so no backend is needed.
//
// This file used to carry a `// @vitest-environment jsdom` docblock. Vitest 4
// removed per-file environment docblocks, so it silently ran in `node` and all
// 18 tests here failed on a missing localStorage. jsdom is now the suite-wide
// default in vitest.config.mjs — do not re-add a docblock, it does nothing.
//
// The behaviours under test are the ones whose regression would silently log a
// user out, lose their cart, or reuse an already-rotated refresh token:
//   • single-flight refresh lock            (double refresh → family revocation)
//   • clearAuth vs handleSessionExpired      (explicit logout wipes cart; forced
//                                             sign-out preserves it)
//   • refreshAuth failure → handleSessionExpired, NOT clearAuth (cart survives)
//   • proactive refresh only near expiry     (peek exp, don't burn tokens)
//   • guest→login cart merge invariant       (one add per line, guestCart emptied)
//   • selectCartCount derivation per mode
//   • AES localStorage encryption round-trip
//   • cross-tab broadcast on mutation, no rebroadcast on the applier path

import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import CryptoJS from "crypto-js";

// ── Mock the GraphQL transport the store calls ────────────────────────────────
// The store imports { graphqlFetch, graphqlFetchWithRetry } from
// @/lib/repairClientApi. refreshAuth() uses graphqlFetch; syncCart / addToCart /
// mergeGuestCartThenSync use graphqlFetchWithRetry.
vi.mock("@/lib/repairClientApi", () => ({
  graphqlFetch: vi.fn(),
  graphqlFetchWithRetry: vi.fn(),
}));

import { graphqlFetch, graphqlFetchWithRetry } from "@/lib/repairClientApi";
import { useRepairStore, selectCartCount } from "@/lib/useRepairStore";

// ── BroadcastChannel stub ─────────────────────────────────────────────────────
// The store caches its channel on the first broadcast in a module-level var we
// can't reset from outside. So install one shared mock class up front; whichever
// test triggers the first broadcast caches an instance of it, and every instance
// posts into the same static array we clear per-test.
class MockBroadcastChannel {
  static posted = [];
  constructor(name) {
    this.name = name;
  }
  postMessage(msg) {
    MockBroadcastChannel.posted.push(msg);
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

beforeAll(() => {
  globalThis.BroadcastChannel = MockBroadcastChannel;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fallback AES key the module uses when NEXT_PUBLIC_STORAGE_SECRET_KEY is unset
// (which it is in the test env). Must match useRepairStore.js exactly.
const SECRET = "repair-store-fallback-key-change-me";
const STORE_KEY = "RepairStore_v1";

// Craft a JWT the client only READS (never verifies). exp is in SECONDS.
function makeJwt(payload) {
  const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg(payload)}.dummy-signature`;
}
const nowSec = () => Math.floor(Date.now() / 1000);

const st = () => useRepairStore.getState();

// Reset all data slices to their documented initial values (no persisted key).
function resetState() {
  useRepairStore.setState({
    authInfo: { isLoggedIn: false, token: null, refreshToken: null, user: null },
    cartInfo: { itemCount: 0, lastSynced: null },
    guestCart: { items: [] },
    wishlistInfo: { productIds: [], lastSynced: null },
    lastOrder: null,
    checkoutInfo: {
      appliedPromoCode: null,
      selectedAddressId: null,
      selectedShippingMethodKey: "standard",
      selectedPaymentMethodId: null,
    },
    paymentCards: [],
    paymentAttempt: null,
    sessionExpired: false,
  });
}

// A fully-populated, logged-in state so wipe-vs-preserve assertions are meaningful.
function populatedLoggedIn() {
  useRepairStore.setState({
    authInfo: { isLoggedIn: true, token: "access-t", refreshToken: "refresh-r", user: { id: 7 } },
    cartInfo: { itemCount: 3, lastSynced: "2026-01-01T00:00:00.000Z" },
    guestCart: { items: [{ product_variant_id: 1, quantity: 2 }] },
    wishlistInfo: { productIds: [10, 20], lastSynced: "2026-01-01T00:00:00.000Z" },
    lastOrder: { order_id: 5, order_number: "ORD-5", total: 99 },
    checkoutInfo: {
      appliedPromoCode: { code: "SAVE" },
      selectedAddressId: "addr-1",
      selectedShippingMethodKey: "express",
      selectedPaymentMethodId: "pay-1",
    },
    paymentCards: [{ id: "card-1", isDefault: true }],
    sessionExpired: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks(); // clears call history, keeps vi.fn implementations resettable
  localStorage.clear();
  MockBroadcastChannel.posted.length = 0;
  resetState();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("refreshAuth — single-flight lock", () => {
  it("shares ONE refresh request across concurrent callers", async () => {
    // Deferred so both callers exist before the fetch resolves.
    let resolveFetch;
    graphqlFetch.mockImplementation(
      () => new Promise((res) => { resolveFetch = res; })
    );
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "old", refreshToken: "r0", user: { id: 1 } },
    });

    const p1 = st().refreshAuth();
    const p2 = st().refreshAuth();

    // Even though two callers raced, the transport fired once.
    expect(graphqlFetch).toHaveBeenCalledTimes(1);

    resolveFetch({ token: "rotated", refresh_token: "r1", user: { id: 1 } });
    const [a, b] = await Promise.all([p1, p2]);

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(a).toBe("rotated");
    expect(b).toBe("rotated"); // both callers get the same rotated token
  });

  it("clears the lock so a later refresh fires a fresh request", async () => {
    graphqlFetch.mockResolvedValue({ token: "t1", refresh_token: "r1", user: { id: 1 } });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "old", refreshToken: "r0", user: { id: 1 } },
    });

    await st().refreshAuth();
    await st().refreshAuth();

    // Sequential (awaited) calls each get their own request — lock released in finally.
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
  });

  it("returns null without hitting the network when there is no refresh token", async () => {
    // A tab that never had a session — must not trigger session-expired UX.
    useRepairStore.setState({
      authInfo: { isLoggedIn: false, token: null, refreshToken: null, user: null },
    });

    const res = await st().refreshAuth();

    expect(res).toBeNull();
    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(st().sessionExpired).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("clearAuth vs handleSessionExpired — wipe scope", () => {
  it("clearAuth wipes EVERYTHING user-scoped and broadcasts auth-cleared", () => {
    populatedLoggedIn();
    MockBroadcastChannel.posted.length = 0;

    st().clearAuth();
    const s = st();

    expect(s.authInfo.isLoggedIn).toBe(false);
    expect(s.authInfo.token).toBeNull();
    expect(s.cartInfo.itemCount).toBe(0);
    expect(s.guestCart.items).toEqual([]);
    expect(s.wishlistInfo.productIds).toEqual([]);
    expect(s.lastOrder).toBeNull();
    expect(s.checkoutInfo.selectedShippingMethodKey).toBe("standard");
    expect(s.checkoutInfo.selectedAddressId).toBeNull();
    expect(s.paymentCards).toEqual([]);

    expect(MockBroadcastChannel.posted.some((m) => m.kind === "auth-cleared")).toBe(true);
  });

  it("handleSessionExpired wipes ONLY auth, preserves cart/wishlist/lastOrder, sets flag", () => {
    populatedLoggedIn();
    MockBroadcastChannel.posted.length = 0;

    st().handleSessionExpired();
    const s = st();

    // Auth gone
    expect(s.authInfo.isLoggedIn).toBe(false);
    expect(s.authInfo.token).toBeNull();
    expect(s.sessionExpired).toBe(true);
    // Checkout selections cleared (stale promos/addresses are bad UX)
    expect(s.checkoutInfo.selectedShippingMethodKey).toBe("standard");
    // Basket DELIBERATELY preserved so the user signs back in and finds it intact
    expect(s.cartInfo.itemCount).toBe(3);
    expect(s.wishlistInfo.productIds).toEqual([10, 20]);
    expect(s.lastOrder).toEqual({ order_id: 5, order_number: "ORD-5", total: 99 });

    expect(MockBroadcastChannel.posted.some((m) => m.kind === "session-expired")).toBe(true);
  });

  it("handleSessionExpired is idempotent — no-op when already expired", () => {
    populatedLoggedIn();
    st().handleSessionExpired();
    MockBroadcastChannel.posted.length = 0;

    st().handleSessionExpired(); // second call

    // No second broadcast (the early-return guard fires).
    expect(MockBroadcastChannel.posted.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("refreshAuth failure → forced sign-out that preserves the cart", () => {
  it("a failed refresh routes through handleSessionExpired (NOT clearAuth)", async () => {
    graphqlFetch.mockRejectedValue(new Error("30-day window elapsed"));
    populatedLoggedIn(); // isLoggedIn + refreshToken + sessionExpired:false

    const res = await st().refreshAuth();
    const s = st();

    expect(res).toBeNull();
    expect(s.authInfo.isLoggedIn).toBe(false);
    expect(s.sessionExpired).toBe(true);
    // The whole point: the basket survives a 30-day rotation timeout.
    expect(s.cartInfo.itemCount).toBe(3);
    expect(s.wishlistInfo.productIds).toEqual([10, 20]);
    expect(s.lastOrder).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("maybeProactiveRefresh — refresh only near expiry", () => {
  it("does NOT refresh a fresh token (>5 min left)", async () => {
    const token = makeJwt({ exp: nowSec() + 3600 });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token, refreshToken: "r", user: { id: 1 } },
    });

    const res = await st().maybeProactiveRefresh();

    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(res).toBe(token); // returns the still-fresh token untouched
  });

  it("refreshes a near-expiry token (<5 min left)", async () => {
    graphqlFetch.mockResolvedValue({ token: "rotated", refresh_token: "r2", user: { id: 1 } });
    const token = makeJwt({ exp: nowSec() + 60 });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token, refreshToken: "r", user: { id: 1 } },
    });

    const res = await st().maybeProactiveRefresh();

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(res).toBe("rotated");
  });

  it("refreshes once when the token exp is unreadable (malformed)", async () => {
    graphqlFetch.mockResolvedValue({ token: "rotated", refresh_token: "r2", user: { id: 1 } });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "not-a-jwt", refreshToken: "r", user: { id: 1 } },
    });

    const res = await st().maybeProactiveRefresh();

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(res).toBe("rotated");
  });

  it("no-ops when there is no session", async () => {
    const res = await st().maybeProactiveRefresh();
    expect(res).toBeNull();
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mergeGuestCartThenSync — guest→login merge invariant", () => {
  it("pushes one add per guest line and empties the guest cart", async () => {
    // Resolves for both myAppAddToCart AND the trailing myAppGetCart.
    graphqlFetchWithRetry.mockResolvedValue({ items: [] });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "t", refreshToken: "r", user: { id: 1 } },
      guestCart: {
        items: [
          { product_variant_id: 11, quantity: 2, product: { base_price: 10 } },
          { product_variant_id: 22, quantity: 1, product: { base_price: 5 } },
        ],
      },
    });

    await st().mergeGuestCartThenSync();

    const addCalls = graphqlFetchWithRetry.mock.calls.filter((c) => c[0] === "myAppAddToCart");
    // Exactly one add per line — no duplication.
    expect(addCalls.length).toBe(2);
    expect(addCalls.map((c) => c[1].productVariantId).sort((a, b) => a - b)).toEqual([11, 22]);
    // The quantity is carried through per line.
    const byVariant = Object.fromEntries(addCalls.map((c) => [c[1].productVariantId, c[1].quantity]));
    expect(byVariant).toEqual({ 11: 2, 22: 1 });

    // INVARIANT: a logged-in user's guestCart ends empty.
    expect(st().guestCart.items).toEqual([]);
  });

  it("clears the guest cart even when there were no guest lines", async () => {
    graphqlFetchWithRetry.mockResolvedValue({ items: [] });
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "t", refreshToken: "r", user: { id: 1 } },
      guestCart: { items: [] },
    });

    await st().mergeGuestCartThenSync();

    expect(st().guestCart.items).toEqual([]);
    expect(graphqlFetchWithRetry.mock.calls.filter((c) => c[0] === "myAppAddToCart").length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("selectCartCount — per-mode derivation", () => {
  it("guest mode sums guestCart quantities", () => {
    useRepairStore.setState({
      authInfo: { isLoggedIn: false, token: null, refreshToken: null, user: null },
      guestCart: { items: [{ quantity: 2 }, { quantity: 3 }] },
      cartInfo: { itemCount: 99, lastSynced: null }, // must be ignored while signed out
    });

    expect(selectCartCount(st())).toBe(5);
  });

  it("logged-in mode uses cartInfo.itemCount and never mirrors the guest count", () => {
    useRepairStore.setState({
      authInfo: { isLoggedIn: true, token: "t", refreshToken: "r", user: { id: 1 } },
      guestCart: { items: [{ quantity: 2 }] }, // stale/leftover — must be ignored
      cartInfo: { itemCount: 7, lastSynced: null },
    });

    expect(selectCartCount(st())).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("persistence — AES localStorage round-trip", () => {
  it("encrypts the snapshot and rehydrates it losslessly", async () => {
    st().setAuthInfo({ token: "jwt-x", refresh_token: "r-secret", user: { id: 42, email: "a@b.c" } });
    await Promise.resolve(); // flush the persist write

    const cipher = localStorage.getItem(STORE_KEY);
    expect(cipher).toBeTruthy();
    // Encrypted at rest — the token must not sit in plaintext.
    expect(cipher).not.toContain("jwt-x");
    expect(cipher).not.toContain("r-secret");

    // Decrypts back to the zustand persist envelope { state, version }.
    const decrypted = CryptoJS.AES.decrypt(cipher, SECRET).toString(CryptoJS.enc.Utf8);
    const parsed = JSON.parse(decrypted);
    expect(parsed.state.authInfo.token).toBe("jwt-x");
    expect(parsed.state.authInfo.user.email).toBe("a@b.c");

    // Clobber in-memory state, restore the captured cipher, rehydrate from it.
    useRepairStore.setState({ authInfo: { isLoggedIn: false, token: null, refreshToken: null, user: null } });
    localStorage.setItem(STORE_KEY, cipher);
    await useRepairStore.persist.rehydrate();

    expect(st().authInfo.token).toBe("jwt-x");
    expect(st().authInfo.refreshToken).toBe("r-secret");
    expect(st().authInfo.user.email).toBe("a@b.c");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("cross-tab BroadcastChannel — post on mutation, silent on apply", () => {
  it("setAuthInfo broadcasts auth-updated with the new authInfo", () => {
    MockBroadcastChannel.posted.length = 0;

    st().setAuthInfo({ token: "t", refresh_token: "r", user: { id: 1 } });

    const msg = MockBroadcastChannel.posted.find((m) => m.kind === "auth-updated");
    expect(msg).toBeTruthy();
    expect(msg.authInfo.token).toBe("t");
    expect(msg.authInfo.isLoggedIn).toBe(true);
  });

  it("applier paths apply state but do NOT rebroadcast (no echo storm)", () => {
    MockBroadcastChannel.posted.length = 0;

    st().applyAuthInfoFromBroadcast({ isLoggedIn: true, token: "tt", refreshToken: "rr", user: { id: 1 } });
    expect(st().authInfo.token).toBe("tt");
    expect(MockBroadcastChannel.posted.length).toBe(0);

    st().applySessionExpiredFromBroadcast();
    expect(st().sessionExpired).toBe(true);
    expect(MockBroadcastChannel.posted.length).toBe(0);
  });
});
