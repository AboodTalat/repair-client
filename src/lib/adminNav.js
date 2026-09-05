"use client";

// Searchable index of admin DESTINATIONS — every console page plus the
// individual settings controls buried inside the Settings page.
//
// This is the half of the TopBar search that needs no network: it's pure string
// matching over a static list, so it resolves on the keystroke rather than after
// the debounce + three resolver round-trips that `adminSearch.js` costs. Keep it
// that way — moving these into the async fan-out would make navigating to
// "Tax Rate" slower than looking up a real order.
//
// Pages come from SideNav's exported SECTIONS so a newly added route is
// searchable without touching this file. Only the sub-page destinations (the
// settings cards) and the keyword synonyms are authored here.
//
// Scope is the ADMIN CONSOLE only. `/r3pr-ledger` (accountant) and
// `/r3pr-dispatch` (delivery) are different role shells behind different role
// gates — indexing them here would offer an admin links into surfaces that
// aren't part of this dashboard.

import { SECTIONS } from "@/components/admin/layout/SideNav";

const PREFIX = "/r3pr-console";

// Synonyms per page, so an admin can search for what they call the thing rather
// than what the nav label happens to say. Keyed by href.
const PAGE_KEYWORDS = {
  [`${PREFIX}/dashboard`]: ["home", "overview", "kpi", "stats", "summary"],
  [`${PREFIX}/categories`]: ["category", "major", "sub", "tree", "collections", "menu", "nav"],
  [`${PREFIX}/products`]: ["product", "catalog", "catalogue", "item", "sku", "variant", "stock", "inventory", "colors", "sizes", "images"],
  [`${PREFIX}/taxonomies`]: ["material", "materials", "fabric", "cotton", "composition", "types"],
  [`${PREFIX}/discounts`]: ["discount", "sale", "offer", "percentage", "banner", "campaign"],
  [`${PREFIX}/promo-codes`]: ["promo", "coupon", "voucher", "code", "discount code"],
  [`${PREFIX}/orders`]: ["order", "purchase", "sales", "checkout", "fulfilment", "fulfillment", "shipping", "delivery", "refund", "cancel", "return"],
  [`${PREFIX}/stock-alerts`]: ["stock", "back in stock", "notify", "waitlist", "out of stock", "restock"],
  [`${PREFIX}/messages`]: ["message", "contact", "inbox", "support", "enquiry", "inquiry", "reply"],
  [`${PREFIX}/users`]: ["user", "customer", "customers", "account", "role", "admin", "staff", "delivery", "accounting", "permission", "password"],
  [`${PREFIX}/settings`]: ["setting", "settings", "config", "configuration", "preferences", "commerce"],
  [`${PREFIX}/reports`]: ["report", "analytics", "revenue", "export", "csv", "performance"],
  [`${PREFIX}/wishlist-insights`]: ["wishlist", "saved", "favourite", "favorite", "insight"],
  [`${PREFIX}/storefront`]: ["storefront", "content", "cms", "landing", "hero", "copy", "homepage", "banner", "footer"],
  [`${PREFIX}/subscribers`]: ["subscriber", "newsletter", "mailing list", "email list", "opt in"],
  [`${PREFIX}/broadcast`]: ["broadcast", "campaign", "bulk email", "newsletter", "send email", "marketing"],
};

// Controls that live INSIDE the Settings page. Without these, an admin looking
// for "tax" or "pickup" gets the Settings page at best and nothing at worst —
// the thing they actually want is a card three screens down.
const SETTINGS_CARDS = [
  { label: "Delivery Fee", keywords: ["delivery", "shipping", "fee", "standard", "cost", "charge"] },
  { label: "Free Delivery", keywords: ["free", "free shipping", "threshold", "minimum", "free delivery"] },
  { label: "Express Shipping", keywords: ["express", "fast", "priority", "next day", "shipping fee"] },
  { label: "Shipping Methods", keywords: ["method", "standard", "express", "pickup", "courier", "eta", "enable"] },
  { label: "Pickup Locations", keywords: ["pickup", "collect", "store", "branch", "address", "hours", "location"] },
  { label: "Tax Rate", keywords: ["tax", "vat", "gst", "rate", "percent", "percentage"] },
  { label: "Payment Methods", keywords: ["payment", "pay", "cod", "cash on delivery", "visa", "mastercard", "card", "apple pay", "google pay", "wallet"] },
  { label: "Low-Stock Banner", keywords: ["low stock", "inventory", "threshold", "warning", "banner", "alert"] },
];

/**
 * Every searchable admin destination, flattened.
 * `section` is the breadcrumb shown in the result row ("Catalog", "Settings", …).
 */
export const ADMIN_DESTINATIONS = [
  ...SECTIONS.flatMap((group) =>
    group.items.map((item) => ({
      href: item.href,
      label: item.label,
      section: group.title,
      keywords: PAGE_KEYWORDS[item.href] || [],
    }))
  ),
  ...SETTINGS_CARDS.map((card) => ({
    href: `${PREFIX}/settings`,
    label: card.label,
    section: "Settings",
    keywords: card.keywords,
  })),
];

const MAX_DESTINATION_RESULTS = 6;

/**
 * Match admin destinations against a term. Pure + synchronous — safe to call on
 * every keystroke.
 *
 * Ranking matters more than it looks: an admin typing "tax" must get the Tax
 * Rate card, not "Taxonomies" (which contains no "tax" in its label — it's
 * surfaced as "Materials" — but would match on a naive keyword sweep). Exact
 * label match wins, then label prefix, then label substring, then a keyword hit,
 * then the section name.
 */
export function searchDestinations(term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return [];

  const scored = [];
  for (const d of ADMIN_DESTINATIONS) {
    const label = d.label.toLowerCase();
    let score = -1;
    if (label === q) score = 0;
    else if (label.startsWith(q)) score = 1;
    else if (label.includes(q)) score = 2;
    else if (d.keywords.some((k) => k === q)) score = 3;
    else if (d.keywords.some((k) => k.startsWith(q))) score = 4;
    else if (d.keywords.some((k) => k.includes(q))) score = 5;
    else if (d.section.toLowerCase().includes(q)) score = 6;
    if (score >= 0) scored.push({ ...d, score });
  }

  // Stable within a score band: ADMIN_DESTINATIONS order is nav order, which is
  // the order an admin already has in their head from the sidebar.
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, MAX_DESTINATION_RESULTS);
}
