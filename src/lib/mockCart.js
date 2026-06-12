// Mock data + pricing helpers for the /cart page (no backend wiring yet).
// Matches the Figma cart screens (mobile 83:5144, desktop 119:5240).
// Swap to `repairQuery("myAppGetMyCart", ...)` once the storefront list
// resolver lands on cart.ts — the shape below mirrors what the server
// already returns from `myAppCart*` mutations (id + variant + quantity).

const TAX_RATE = 0.09; // 9% on (subtotal + shipping) — Figma 83:5144 shows JOD 17.46 on 186 + 8.

export const FREE_SHIPPING_THRESHOLD = 200; // JOD
export const SHIPPING_FEE = 8; // flat-rate, applied until threshold met

export const CART_ITEMS = [
  {
    id: "ci-1",
    productSlug: "performance-high-rise-leggings",
    name: "Performance High-Rise Leggings",
    variantLabel: "Midnight Black / Medium",
    price: 89.0,
    qty: 1,
    image: "/shop/model-1.png",
  },
  {
    id: "ci-2",
    productSlug: "impact-sports-bra",
    name: "Impact Sports Bra",
    variantLabel: "Midnight Black / Medium",
    price: 45.0,
    qty: 1,
    image: "/shop/model-2.png",
  },
  {
    id: "ci-3",
    productSlug: "aeroflow-training-top",
    name: "AeroFlow Training Top",
    variantLabel: "Storm Gray / Small",
    price: 52.0,
    qty: 1,
    image: "/shop/model-3.png",
  },
];

// Promo codes the chips and Apply button validate against. Real validation
// will go through `myAppValidatePromoCode` on orders.ts once wired.
export const PROMO_CODES = {
  SUMMER25: { code: "SUMMER25", kind: "percent", value: 10 },
  FIRST15: { code: "FIRST15", kind: "percent", value: 15 },
};

export const SUGGESTED_PROMOS = ["SUMMER25", "FIRST15"];

// Customer's saved contact + addresses, surfaced on the /checkout details
// step. Matches Figma 82:3618 mobile (single Home card + ADD NEW CARD
// button) and 119:5592 desktop (multi-card list with at-most-one selection).
// Swap to `repairQuery("myAppGetMyAccount", ...)` + the addresses resolver
// from `addresses.ts` once the customer-scoped account read lands.
export const CHECKOUT_CONTACT = {
  email: "aqeljihad@gmail.com",
  dialCode: "+971",
  phone: "553368602",
};

// Structured fields (country/city/.../apartment) are populated alongside
// the flat `line` string so the AddAddressDrawer can pre-fill correctly
// when the user clicks Edit on the checkout pages — same shape as
// `mockAccount.ADDRESSES`. `line` stays the canonical display string.
export const CHECKOUT_ADDRESSES = [
  {
    id: "addr-home",
    kind: "home",
    label: "Home",
    line: "Abu Dhabi - Alraha Beach, Al Reem Tower, 3rd Floor, 310",
    phone: "+971 553368602",
    isDefault: true,
    country: "United Arab Emirates",
    city: "Abu Dhabi",
    neighborhood: "Alraha Beach",
    street: "Al Reem Tower",
    building: "3rd Floor",
    apartment: "310",
  },
  {
    id: "addr-office",
    kind: "office",
    label: "Office",
    line: "Dubai - Business Bay, The Opus, 12th Floor, Office 1204",
    phone: "+971 501234567",
    isDefault: false,
    country: "United Arab Emirates",
    city: "Dubai",
    neighborhood: "Business Bay",
    street: "The Opus",
    building: "12th Floor",
    apartment: "Office 1204",
  },
];

// Builds the flat `line` string the address cards render from the
// structured fields the AddAddressDrawer returns on submit. Mirrors the
// pattern in customer/account/AccountClient.jsx so the two places stay
// consistent.
export function buildAddressLine(parts) {
  const head =
    parts.country && parts.city ? `${parts.city}` : parts.city || parts.country || "";
  const tail = [parts.neighborhood, parts.street, parts.building, parts.apartment]
    .filter((s) => s && s.trim())
    .join(", ");
  return [head, tail].filter(Boolean).join(" - ");
}

// Delivery/shipping method options shown on /checkout. Prices are picked up
// by `calcTotals` in this file once a checkout-shipping override is plumbed
// in — for now the cart-page free-shipping math stays put (flat JOD 8 until
// 200 threshold). When the backend exposes a shipping-rate resolver, swap
// this list for its output.
export const SHIPPING_METHODS = [
  {
    id: "standard",
    label: "Standard Delivery",
    description: "3-5 business days",
    price: 8,
  },
  {
    id: "express",
    label: "Express Delivery",
    description: "1-2 business days",
    price: 15,
  },
  {
    id: "pickup",
    label: "Store Pickup",
    description: "Available at Amman City Mall",
    price: 0,
  },
];

export const DEFAULT_SHIPPING_METHOD_ID = "standard";

// Saved payment methods rendered on the /checkout/payment step. Matches
// Figma mobile 84:6733 + desktop 119:5877 — the design shows saved cards
// + Apple Pay / Google Pay / Cash on Delivery in a radio list, plus an
// "ADD NEW CARD" muted button below. No card-entry form is rendered in
// the Figma (the Add-New flow lives in a separate sheet/modal not yet
// in scope), so for now `kind === "card"` rows are display-only.
//
// Swap to `repairQuery("myAppListMyPaymentMethods", ...)` once the
// payment-methods backend lands — see repair/CLAUDE.md for the
// Stripe-managed vs local-table decision still pending.
export const PAYMENT_METHODS = [
  {
    id: "pm-visa-4242",
    kind: "card",
    brand: "visa",
    last4: "4242",
    expiry: "04/2025",
    isDefault: true,
  },
  {
    id: "pm-mc-8834",
    kind: "card",
    brand: "mastercard",
    last4: "8834",
    expiry: "09/2024",
  },
  { id: "pm-applepay", kind: "applepay" },
  { id: "pm-gpay", kind: "gpay" },
  { id: "pm-cod", kind: "cod" },
];

export const DEFAULT_PAYMENT_METHOD_ID = "pm-visa-4242";

export function formatJOD(value) {
  // JOD always shows 2 decimals — match `JOD 192.86` from Figma.
  return `JOD ${value.toFixed(2)}`;
}

export function calcSubtotal(items) {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

export function calcDiscount(subtotal, appliedPromo) {
  if (!appliedPromo) return 0;
  // Validated shape from myAppValidatePromoCode (carried over from /cart via the
  // store): discount_type "percentage" | <fixed> + discount_value. Mirrors the
  // server cap in computePromoDiscount (helpers.ts) — clamp to the subtotal.
  if (appliedPromo.discount_type != null) {
    const value = Number(appliedPromo.discount_value) || 0;
    const raw =
      appliedPromo.discount_type === "percentage" ? (subtotal * value) / 100 : value;
    return Math.min(Math.max(0, raw), Math.max(0, subtotal));
  }
  // Legacy mock shape ({ kind: "percent", value }) — the seeded SUMMER25 default.
  if (appliedPromo.kind === "percent") {
    return (subtotal * appliedPromo.value) / 100;
  }
  return appliedPromo.value;
}

export function calcShipping(subtotal) {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

// `taxSettings` is the `tax` slice of myAppGetCommerceSettings ({ rate, inclusive })
// or null. When provided, tax is computed from the LIVE settings, mirroring the
// server's myAppCheckout: levied on the post-promo subtotal only (shipping is
// never taxed), and 0 when prices are tax-inclusive (with the embedded portion
// surfaced as `taxIncludedAmount` for display). When null, it falls back to the
// legacy 9%-on-(subtotal+shipping) mock so any caller that hasn't wired settings
// still renders the Figma numbers. (Shipping is still the flat mock fee — the
// shipping-method/rate wiring is a separate task.)
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function calcTotals(items, appliedPromo, taxSettings = null) {
  const subtotal = calcSubtotal(items);
  const discount = calcDiscount(subtotal, appliedPromo);
  const shipping = calcShipping(subtotal);
  const afterPromo = Math.max(0, round2(subtotal - discount));

  let tax;
  let taxInclusive = false;
  let taxIncludedAmount = 0;
  if (taxSettings) {
    const rate = Number(taxSettings.rate) || 0;
    taxInclusive = !!taxSettings.inclusive;
    // Live: tax on the post-promo subtotal only. Inclusive → not added (0), with
    // the embedded portion derived for the receipt line.
    tax = taxInclusive ? 0 : round2((afterPromo * rate) / 100);
    taxIncludedAmount =
      taxInclusive && rate > 0 ? round2(afterPromo - afterPromo / (1 + rate / 100)) : 0;
  } else {
    // Legacy mock fallback — 9% on (subtotal + shipping).
    tax = round2((subtotal + shipping) * TAX_RATE);
  }

  const total = round2(afterPromo + shipping + tax);
  const itemCount = items.reduce((n, it) => n + it.qty, 0);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  return {
    subtotal,
    discount,
    shipping,
    tax,
    // Tax-inclusive display fields (mirror cartTotals.js) — consumed by the
    // inclusive-aware tax rows on the checkout summary cards.
    taxInclusive,
    taxIncludedAmount,
    total,
    itemCount,
    amountToFreeShipping,
    freeShippingPct: Math.min(
      100,
      Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100),
    ),
  };
}
