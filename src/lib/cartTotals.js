// Cart totals — mirrors myAppCheckout's money math (Server orders.ts ~399-432)
// for the STANDARD shipping method, so the "Estimated" cart total matches the
// binding number checkout will actually charge.
//
//   afterPromo:          max(0, subtotal - promoDiscount)
//   shipping (standard): free_delivery_enabled && afterPromo >= threshold ? 0 : fee
//   tax:                  inclusive ? 0 : afterPromo * rate/100
//   total:               afterPromo + shipping + tax
//
// Both shipping's free-threshold check and tax are levied on the POST-PROMO
// subtotal (afterPromo) — exactly like myAppCheckout (orders.ts lines 413 + 425):
// shipping is never taxed, and a promo can push the cart below the free-shipping
// threshold (so a fee reappears). Tax always sits on afterPromo only. (The admin
// "apply tax on shipping" toggle was removed; the tax_settings column still
// exists in the DB but is unused.)
//
// `settings` is the myAppGetCommerceSettings payload ({ shipping, tax, ... }) or
// null — null degrades to no shipping / no tax rather than guessing (the cart
// still renders; the estimate just omits charges until settings load).
//
// `promoDiscount` is the SERVER-computed `discount_amount` from
// myAppValidatePromoCode (0 when no promo is applied). We never recompute the
// percent/fixed/cap math here — the server is the single source so the cart
// preview and the final charge always agree; useCart re-validates against the
// server whenever the subtotal settles so this amount stays current.
//
// Tax-inclusive DISPLAY: when tax.inclusive is true the listed prices already
// contain the tax, so NOTHING is added to the total (additive `tax` stays 0 and
// `total` still equals afterPromo+shipping — matching what myAppCheckout records,
// `tax_amount = 0`). For transparency we ALSO derive the tax already embedded in
// afterPromo and expose it as `taxIncludedAmount` (+ `taxInclusive: true`) so the
// cart can show an "incl. tax" line instead of a misleading "JOD 0.00". This
// embedded figure is display-only — it is NOT part of the total.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Effective shipping cost for a given method key, on a given post-promo
// subtotal. Mirrors myAppCheckout exactly (Server orders.ts ~445-460) so the
// cart/checkout preview never disagrees with the final charge:
//   pickup   → always free
//   express  → flat express_shipping_fee
//   standard → standard_delivery_fee, waived when free shipping is enabled and
//              afterPromo clears the threshold
export function shippingForMethod(shipSettings, methodKey, afterPromo) {
  const ship = shipSettings ?? {};
  const key = String(methodKey || "standard").toLowerCase();
  if (key === "pickup") return 0;
  if (key === "express") return round2(Number(ship.express_shipping_fee) || 0);
  const freeEnabled = !!ship.free_delivery_enabled;
  const threshold = Number(ship.free_delivery_threshold) || 0;
  const standardFee = Number(ship.standard_delivery_fee) || 0;
  return round2(freeEnabled && afterPromo >= threshold ? 0 : standardFee);
}

// Build the selectable delivery-method list for the checkout radios from the
// live commerce settings. Only ENABLED methods are returned, each priced for
// the current afterPromo subtotal so the displayed price matches the order
// summary. Express carries a DOUBLE gate — the shipping_methods row must be
// enabled AND shipping.express_shipping_enabled must be true, otherwise
// myAppCheckout rejects it (EXPRESS_SHIPPING_DISABLED). Returns [] until
// settings load.
export function buildDeliveryMethods(settings, afterPromo = 0) {
  const rows = Array.isArray(settings?.shippingMethods) ? settings.shippingMethods : [];
  const ship = settings?.shipping ?? {};
  return rows
    .filter((m) => {
      if (!m?.enabled) return false;
      if (String(m.key).toLowerCase() === "express" && !ship.express_shipping_enabled) return false;
      return true;
    })
    .map((m) => ({
      id: String(m.key).toLowerCase(),
      label: m.name,
      description: m.eta || "",
      price: shippingForMethod(ship, m.key, afterPromo),
    }));
}

export function computeCartTotals(
  items,
  settings,
  subtotalOverride,
  promoDiscount = 0,
  shippingMethodKey = "standard"
) {
  const ship = settings?.shipping ?? {};
  const tax = settings?.tax ?? {};

  const subtotal = round2(
    subtotalOverride != null
      ? subtotalOverride
      : items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
  );

  // Promo discount can never exceed the subtotal (the server caps it the same
  // way — computePromoDiscount in helpers.ts).
  const discount = Math.min(round2(promoDiscount), subtotal);
  const afterPromo = round2(Math.max(0, subtotal - discount));

  const freeEnabled = !!ship.free_delivery_enabled;
  const threshold = Number(ship.free_delivery_threshold) || 0;
  // Shipping for the SELECTED method (defaults to standard, matching /cart's
  // free-shipping estimate). Pickup → 0, express → flat fee, standard → fee
  // waived above the free threshold.
  const shipping = shippingForMethod(ship, shippingMethodKey, afterPromo);

  const rate = Number(tax.rate) || 0;
  const inclusive = !!tax.inclusive;
  // Tax base is the post-promo subtotal only — shipping is never taxed.
  const taxAmount = inclusive ? 0 : round2((afterPromo * rate) / 100);

  // Display-only: the tax already baked into the tax-inclusive afterPromo
  // (taxPortion = base - base/(1+r)). Never added to `total` (the price already
  // contains it).
  const taxIncludedAmount =
    inclusive && rate > 0 ? round2(afterPromo - afterPromo / (1 + rate / 100)) : 0;

  const total = round2(afterPromo + shipping + taxAmount);
  const itemCount = items.reduce((n, i) => n + (Number(i.qty) || 0), 0);

  return {
    subtotal,
    discount, // server-computed promo discount (0 when none) — shows the pill
    afterPromo, // subtotal − discount; the base buildDeliveryMethods prices on
    shipping,
    tax: taxAmount,
    // Tax-inclusive display fields — consumed only by the tax row renderer.
    // Absent on mockCart's calcTotals, so checkout's shared OrderTotalsBlock
    // falls through to the plain "Tax (Estimated)" rendering.
    taxInclusive: inclusive,
    taxIncludedAmount,
    total,
    itemCount,
    // Free-shipping banner inputs — only meaningful when the store offers it.
    // Keyed off afterPromo so the banner and the shipping row never disagree.
    freeShippingEnabled: freeEnabled,
    amountToFreeShipping: freeEnabled ? Math.max(0, round2(threshold - afterPromo)) : 0,
    freeShippingPct:
      freeEnabled && threshold > 0
        ? Math.min(100, Math.round((afterPromo / threshold) * 100))
        : 0,
  };
}
