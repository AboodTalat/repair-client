// Canonical storefront-content defaults — the SINGLE SOURCE shared by the live
// surfaces (as render-time fallbacks) and the admin Storefront editor (as the
// first-open seed). They mirror the CURRENT hardcoded markup byte-for-byte, so:
//
//   - CMS empty / a field unset  → the surface renders identically to today.
//   - Editor first-open + Save   → writes these same values (no visual "jump").
//
// IMPORTANT: these intentionally do NOT match `mockAdmin.STOREFRONT_*` — that
// mock diverges from the live design (different hero copy/image, different
// stats, different browse tiles, different coaching card). Seeding from the
// mock would change the landing on the first Save, which is exactly what we
// must avoid. When you change a live `homePage/*` component's copy/markup,
// update the matching default here too.
//
// Section keys are snake_case to match the backend `storefront_content` rows
// and `myAppGetStorefrontContent`'s convenience top-level keys.

import { FOOTER_HELP_LINKS } from "@/lib/storeNav";

// ── Hero (HeroSection.jsx) ────────────────────────────────────────────────
// `title` is intentionally empty: the live hero renders a bespoke two-line
// "Step into Energy" heading when no CMS title is set. A non-empty title
// replaces it with a single styled line.
export const HERO_DEFAULT = {
  eyebrow: "New Drop · SS26",
  title: "",
  subtitle: "Premium materials. Precision engineering. Built for thousands of workouts.",
  ctaLabel: "GET YOURS NOW",
  ctaHref: "",
  image: "/home/hero-hoodie.png",
};

// ── Colorways intro (ColorwaysIntro.jsx) ──────────────────────────────────
export const COLORWAYS_INTRO_DEFAULT = {
  eyebrow: "The Collection",
  title: "Tailored to suit all CHARACTERS",
  subtitle: "Four Colorways. One Vision.",
};

// ── Colorway sections (DEFAULT_COLORWAYS in app/page.js) ───────────────────
export const COLORWAYS_DEFAULT = [
  {
    id: "cw-1",
    image: "/home/bright-white.png",
    imageAlt: "Bright White colorway",
    badge: "",
    reversed: false,
    multiSwatch: true,
    ctaLabel: "SELECT YOUR COLOR",
    swatches: [
      { color: "#11191f", name: "Midnight Black", tagline: "Timeless. Versatile. Essential." },
      { color: "#ffffff", name: "Bright White", tagline: "Bold. Modern. Dynamic." },
    ],
  },
  {
    id: "cw-2",
    image: "/home/deep-blue.png",
    imageAlt: "Deep Blue colorway",
    badge: "UNISEX",
    reversed: true,
    multiSwatch: false,
    ctaLabel: "ADD TO CART",
    swatches: [{ color: "#11233f", name: "Deep Blue", tagline: "Pure. Clean. Confident." }],
  },
  {
    id: "cw-3",
    image: "/home/fresh-green.png",
    imageAlt: "Fresh Green colorway",
    badge: "UNISEX",
    reversed: false,
    multiSwatch: false,
    ctaLabel: "ADD TO CART",
    swatches: [{ color: "#a8c0b2", name: "Fresh Green", tagline: "Sleek. Sophisticated. Powerful." }],
  },
];

// ── Crafted to Last (CraftedToLast.jsx) ───────────────────────────────────
export const CRAFTED_TO_LAST_DEFAULT = {
  eyebrow: "Engineered for Movement",
  title: "crafted to last",
  body: "Unleash your potential with our cutting-edge workout apparel, crafted for resilience and comfort.",
};

// ── Stats (StatsSection.jsx STATS) ────────────────────────────────────────
export const STATS_DEFAULT = [
  { id: "stat-1", value: "78%", label: "Recycled Polyester" },
  { id: "stat-2", value: "22%", label: "Premium Elastane" },
  { id: "stat-3", value: "100%", label: "Performance Guaranteed" },
];

// ── Browse Collection tiles (BrowseCollection.jsx PRODUCTS) ────────────────
// The live cards show name + subtitle + price + image and link to a product.
// The decorative swatch row + the "+" → /cart link stay design constants.
export const BROWSE_TILES_DEFAULT = [
  { id: "bt-1", title: "Sweat Pants", subtitle: "Soft Cotton", price: "JOD 30", image: "/home/card-1.png", href: "/products/sweat-pants" },
  { id: "bt-2", title: "Sweat Pants", subtitle: "Soft Cotton", price: "JOD 30", image: "/home/card-2.png", href: "/products/sweat-pants" },
  { id: "bt-3", title: "Sweat Pants", subtitle: "Soft Cotton", price: "JOD 30", image: "/home/card-1.png", href: "/products/sweat-pants" },
  { id: "bt-4", title: "Sweat Pants", subtitle: "Soft Cotton", price: "JOD 30", image: "/home/card-2.png", href: "/products/sweat-pants" },
];

// ── Footer (Footer.jsx) ───────────────────────────────────────────────────
// Only the brand copy, social URLs, and the Help column are CMS-editable. The
// Shop column stays category-driven (footerShopLinks) and the bottom legal bar
// stays FOOTER_LEGAL_LINKS — both are NOT part of this CMS section.
export const FOOTER_DEFAULT = {
  brandCopy:
    "Engineered for performance, designed for life. We create premium athletic wear for the modern mover.",
  social: [
    { id: "soc-1", network: "Instagram", url: "https://instagram.com" },
    { id: "soc-2", network: "Twitter", url: "https://twitter.com" },
  ],
  columns: [
    {
      id: "col-help",
      heading: "Help",
      links: FOOTER_HELP_LINKS.map((l, i) => ({ id: `fh-${i + 1}`, label: l.label, href: l.href })),
    },
  ],
};

// ── Product-page marketing sections (ProductPageClient.jsx) ────────────────
// `key` maps each row to an on-page section. Text bands (stays-dry/move/
// sculpted) are fully CMS-driven (title + body). crafted carries the intro
// title + body but its STATS stay product-driven; colorways/details carry an
// enabled flag + heading override only (their data/items stay product-driven).
export const PRODUCT_SECTIONS_DEFAULT = [
  { id: "pds-crafted", key: "crafted", title: "Crafted to Last", body: "Premium materials. Precision engineering. Built for thousands of workouts.", enabled: true },
  { id: "pds-stays-dry", key: "stays-dry", title: "Stays Dry.\nStays Fresh.", body: "Advanced moisture-wicking technology pulls sweat away from your skin, keeping you dry through the most intense workouts.", enabled: true },
  { id: "pds-move", key: "move", title: "Move Without Limits", body: "Four-way stretch fabric moves with you in every direction. From yoga flows to explosive sprints.", enabled: true },
  { id: "pds-sculpted", key: "sculpted", title: "Sculpted Support", body: "Compression fit that supports your muscles and enhances your natural shape. Feel confident, perform better.", enabled: true },
  { id: "pds-colorways", key: "colorways", title: "Four Colorways. One Vision.", body: "", enabled: true },
  { id: "pds-details", key: "details", title: "The Details", body: "", enabled: true },
];

// ── Coaching cross-sell card (OrderSuccessClient.jsx) ──────────────────────
// Overlays the live card. `eyebrow` defaults empty (the live card has none).
// `ctaHref` empty → the button stays a no-op (current behavior).
export const COACHING_DEFAULT = {
  enabled: true,
  eyebrow: "",
  title: "You've taken the first step!",
  body: "Let's build the routine that gets results with Asaad Hamawi!",
  ctaLabel: "APPLY FOR COACHING",
  ctaHref: "",
  image: "/cart/coaching-model.png",
};

// Convenience map keyed by the backend section name — lets the admin editor
// seed `content[section] ?? STOREFRONT_DEFAULTS[section]` in one place.
export const STOREFRONT_DEFAULTS = {
  hero: HERO_DEFAULT,
  colorways_intro: COLORWAYS_INTRO_DEFAULT,
  colorways: COLORWAYS_DEFAULT,
  crafted_to_last: CRAFTED_TO_LAST_DEFAULT,
  stats: STATS_DEFAULT,
  browse_tiles: BROWSE_TILES_DEFAULT,
  footer: FOOTER_DEFAULT,
  product_sections: PRODUCT_SECTIONS_DEFAULT,
  coaching: COACHING_DEFAULT,
};
