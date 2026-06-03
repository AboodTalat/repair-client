// Cart totals — mirrors myAppCheckout's money math (Server orders.ts ~399-432)
// for the STANDARD shipping method with no promo, so the "Estimated" cart total
// matches the binding number checkout will actually charge.
//
//   shipping (standard): free_delivery_enabled && subtotal >= threshold ? 0 : fee
//   tax:                  inclusive ? 0 : taxableBase * rate/100
//                         taxableBase = applies_to_shipping ? subtotal+shipping : subtotal
//   total:               subtotal + shipping + tax
//
// `settings` is the myAppGetCommerceSettings payload ({ shipping, tax, ... }) or
// null — null degrades to no shipping / no tax rather than guessing (the cart
// still renders; the estimate just omits charges until settings load).
//
// Promo is intentionally NOT applied here (discount stays 0) — promo wiring is a
// later pass shared with the checkout flow; see CartPageClient.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function computeCartTotals(items, settings, subtotalOverride) {
  const ship = settings?.shipping ?? {};
  const tax = settings?.tax ?? {};

  const subtotal = round2(
    subtotalOverride != null
      ? subtotalOverride
      : items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
  );

  const freeEnabled = !!ship.free_delivery_enabled;
  const threshold = Number(ship.free_delivery_threshold) || 0;
  const standardFee = Number(ship.standard_delivery_fee) || 0;
  const shipping = round2(freeEnabled && subtotal >= threshold ? 0 : standardFee);

  const rate = Number(tax.rate) || 0;
  const inclusive = !!tax.inclusive;
  const taxableBase = tax.applies_to_shipping ? subtotal + shipping : subtotal;
  const taxAmount = inclusive ? 0 : round2((taxableBase * rate) / 100);

  const total = round2(subtotal + shipping + taxAmount);
  const itemCount = items.reduce((n, i) => n + (Number(i.qty) || 0), 0);

  return {
    subtotal,
    discount: 0, // promo deferred — never apply a fake discount to a real total
    shipping,
    tax: taxAmount,
    total,
    itemCount,
    // Free-shipping banner inputs — only meaningful when the store offers it.
    freeShippingEnabled: freeEnabled,
    amountToFreeShipping: freeEnabled ? Math.max(0, round2(threshold - subtotal)) : 0,
    freeShippingPct:
      freeEnabled && threshold > 0
        ? Math.min(100, Math.round((subtotal / threshold) * 100))
        : 0,
  };
}
