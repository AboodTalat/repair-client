"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { repairCall } from "@/lib/repairAuthedApi";
import { useRepairStore } from "@/lib/useRepairStore";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// Quick-add dialog triggered by the plus button on ProductCard.
//   Mobile (Figma 7:1358 → node 12:2286): BOTTOM-ANCHORED CARD —
//     w:361 (clamped to viewport-32 on narrow screens), anchored 24px above
//     the viewport bottom, padding:24, borderRadius:8,
//     gap:24 between header/body/footer; gap:12 between body sections.
//     No product image on mobile. Sections (gap:8 between title and body):
//       COLOR  — swatches (24x24, 1px subtle border; selected: 2px #11191F border)
//       SIZE   — chips S/M/L/XL (24x24) / XXL (28x24); active = #11191F bg, white text
//       QUANTITY — [−ghost] [number input 48x24] [+filled] all h:24, borderRadius:2,
//                   outline 1px #11191F inset. The + button is filled (#11191F bg).
//     Footer: full-width ADD TO CART, h:40, padding:8, borderRadius:4,
//             #11191F bg, white 12px Zalando Sans Expanded Bold (700).
//   Desktop (Figma 120:7368): right-side drawer pinned to viewport edge —
//     w:387, full height, padding:24, gap:24 between sections.
//     Sections (gap:8 between title and body, except product which uses gap:16):
//       Product — image (aspect 326/489, bg #f5f5f5, soft shadow) + below it
//                 a row with title (16px Medium Expanded) / subtitle (16px
//                 Condensed Regular rgba(17,25,31,0.5)) and price (16px
//                 SemiBold Expanded) on the right.
//       COLOR — 32x32 swatches, radius 3, 1.5px subtle border; selected: 3px #11191F border
//       SIZE  — 32x32 chips (XXL ≈ 38x32), radius 3, 1.5px #11191F border; active = filled #11191F + white
//       QUANTITY — [−] [number 64x32] [+filled] all h:32, radius 3, 1.5px border
//     Footer: ADD TO CART full-width, h:48, radius:4, #11191F bg, 14px Expanded Bold white.
//     No header divider, no sticky footer with border — clean spacing.

export default function AddToCartDrawer({ open, product, onClose, onAdd }) {
  // Hold the last non-null product so it keeps rendering while the drawer
  // animates out — the parent clears `product` the moment it closes.
  // Derived state, not a ref: a ref written and read during render is torn by
  // concurrent rendering and StrictMode's double invoke (react-hooks/refs).
  // Updating state during render in response to a changed prop is the
  // documented React pattern for exactly this.
  const [lastProduct, setLastProduct] = useState(product);
  if (product && product !== lastProduct) setLastProduct(product);

  const { render, dataState } = useDelayedUnmount(open && Boolean(product), 320);
  if (!render || !lastProduct) return null;

  return (
    <DialogBody
      // Key by product id so switching products gives a fresh mount — selection
      // + fetched detail reset for free, no synchronous state-reset in the effect.
      key={lastProduct.id}
      product={lastProduct}
      onClose={onClose}
      onAdd={onAdd}
      dataState={dataState}
    />
  );
}

function DialogBody({ product, onClose, onAdd, dataState }) {
  const productId = product.id;

  // The card-list data the drawer opens on carries colors (hexes) + price +
  // image, but NO sizes and NO variants — so the real SIZE / per-color stock /
  // variant id have to come from the product detail. myAppGetProductDetail is a
  // public query, so this works logged-out. Fetched once per opened product;
  // the drawer renders instantly on card data and the options populate async.
  const [detail, setDetail] = useState(null); // { colors, sizes, available:Set, variantId:Map }
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [colorId, setColorId] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    // Initial state is already loading/empty (this component is keyed by product
    // id, so each product gets a fresh mount). `active` aborts the state write if
    // the drawer unmounts before the request resolves.
    let active = true;

    repairCall("myAppGetProductDetail", { productId }, { isQuery: true })
      .then((data) => {
        if (!active) return;
        if (!data || data.id == null) {
          setStatus("error");
          return;
        }
        const proj = projectDetail(data);
        // No usable colors/sizes → treat as error rather than render an empty,
        // un-addable drawer. NEVER fall back to mock sizes: a mock size could
        // point at a SKU that doesn't exist and can't resolve a variant.
        if (!proj.colors.length || !proj.sizes.length) {
          setStatus("error");
          return;
        }
        setDetail(proj);
        // Default the selected color to the swatch the card opened on (matched
        // by hex), falling back to the first available color.
        const openedHex = String(product.colors?.[0] ?? "").toLowerCase();
        const match = proj.colors.find((c) => String(c.hex).toLowerCase() === openedHex);
        setColorId((match ?? proj.colors[0]).id);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [productId, product.colors]);

  // Availability + variant resolution are keyed by color_id|size_id — matching
  // the variant shape and the eventual myAppAddToCart payload (never size-name).
  const isAvailable = (sid) =>
    colorId != null && Boolean(detail?.available.has(`${colorId}|${sid}`));

  function chooseColor(cid) {
    setColorId(cid);
    // A color change can invalidate the chosen size (that color may not offer
    // it, or it's out of stock there) — clear it so the user re-picks.
    if (sizeId != null && !detail?.available.has(`${cid}|${sizeId}`)) {
      setSizeId(null);
    }
  }

  const variantId =
    colorId != null && sizeId != null ? detail?.variantId.get(`${colorId}|${sizeId}`) ?? null : null;
  const canAdd =
    status === "ready" && colorId != null && sizeId != null && variantId != null && isAvailable(sizeId);

  async function handleAdd() {
    if (!canAdd || adding) return; // guard against double-submit on a slow round trip

    // Build a full cart line (mirrors a myAppGetCart line) from the card data
    // + fetched detail, so the store can persist it for a guest AND the cart
    // page can render both modes with one shape.
    const c = detail.colors.find((x) => x.id === colorId);
    const s = detail.sizes.find((x) => x.id === sizeId);
    const line = {
      variantId,
      quantity: qty,
      product: {
        id: product.id,
        name: product.name,
        base_price: product.price,
        effective_price: product.salePrice ?? product.price,
      },
      color: c ? { id: c.id, name: c.name, hex_code: c.hex } : null,
      size: s ? { id: s.id, name: s.name } : null,
      image_url: product.image,
      currency: product.currency,
    };

    setAdding(true);
    setAddError(null);
    try {
      // Guest → localStorage; signed-in → myAppAddToCart (server stock-checks).
      await useRepairStore.getState().addToCart(line);
      onAdd?.(); // success banner in the parent
      onClose?.();
    } catch (err) {
      // e.g. "Only 2 in stock" — stock can move between the detail fetch and now.
      setAddError(err?.message || "Couldn’t add to cart. Please try again.");
      setAdding(false);
    }
  }

  return (
    <>
      {/* Backdrop — Figma rgba(17,25,31,0.50), animated fade */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        data-state={dataState}
        className="drawer-backdrop fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(17,25,31,0.50)" }}
      />

      {/* MOBILE: bottom-anchored card (Figma 7:1358 → node 12:2286) — w:361, padding:24, gap:24 */}
      <aside
        role="dialog"
        aria-label={`Add ${product.name} to cart`}
        data-state={dataState}
        className="bottom-card fixed left-0 right-0 mx-auto bottom-6 z-50 flex w-[361px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex-col gap-6 overflow-y-auto bg-white shadow-xl md:hidden"
        style={{ borderRadius: 8, padding: 24 }}
      >
        <MobileHeader onClose={onClose} />

        {/* Body — gap 12 between sections (Color / Size / Quantity) */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <MobileColorSection
            status={status}
            colors={detail?.colors}
            value={colorId}
            onChange={chooseColor}
          />
          <MobileSizeSection
            status={status}
            sizes={detail?.sizes}
            value={sizeId}
            onChange={setSizeId}
            isAvailable={isAvailable}
          />
          <MobileQuantitySection value={qty} onChange={setQty} />
        </div>

        {/* Footer — ADD TO CART, h:40, borderRadius:4, 12px Bold */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          {addError && <AddError message={addError} />}
          <button
            type="button"
            disabled={!canAdd || adding}
            onClick={handleAdd}
            className="font-display grid flex-1 place-items-center transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{
              height: 40,
              padding: 8,
              backgroundColor: "#11191F",
              borderRadius: 4,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            {adding ? "ADDING…" : "ADD TO CART"}
          </button>
        </div>
      </aside>

      {/* DESKTOP: floating right-side card — Figma 120:7368.
          NOT flush to the viewport edge: 32px margin top/bottom/right,
          fully rounded corners (8px), w=384 (w-96), p=24, gap-6, bg-white.
          Backdrop scrim sits behind it. Sections (gap-6): Product (image +
          title/subtitle/price row) → COLOR → SIZE → QUANTITY → ADD TO CART
          button (h:48, full inner width, rounded:4). */}
      <aside
        role="dialog"
        aria-label={`Add ${product.name} to cart`}
        data-state={dataState}
        className="right-drawer drawer-scroll fixed right-8 top-8 bottom-8 z-50 hidden w-[387px] flex-col overflow-y-auto bg-white shadow-2xl md:flex"
        style={{ padding: 24, gap: 24, borderRadius: 8 }}
      >
        <DesktopHeader onClose={onClose} />

        <div className="flex flex-1 flex-col" style={{ gap: 24 }}>
          {/* Product: image (Figma 326/489 aspect) + title/subtitle/price row */}
          <section className="flex flex-col" style={{ gap: 16 }}>
            <div
              className="relative w-full overflow-hidden bg-[#f5f5f5]"
              style={{
                aspectRatio: "326 / 489",
                boxShadow: "0 0 18.523px 0 rgba(0,0,0,0.05)",
              }}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="339px"
                className="object-cover"
              />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col" style={{ gap: 4 }}>
                <h3
                  className="font-display"
                  style={{
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: "24px",
                    color: "#11191F",
                    margin: 0,
                  }}
                >
                  {product.name}
                </h3>
                <p
                  className="font-body"
                  style={{
                    fontWeight: 400,
                    fontSize: 16,
                    lineHeight: "20px",
                    color: "rgba(17,25,31,0.5)",
                    fontStretch: "75%",
                    margin: 0,
                  }}
                >
                  {product.subtitle}
                </p>
              </div>
              <p
                className="font-display"
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  lineHeight: "24px",
                  color: "#11191F",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {product.currency} {product.salePrice ?? product.price}
              </p>
            </div>
          </section>

          <DesktopColorSection
            status={status}
            colors={detail?.colors}
            value={colorId}
            onChange={chooseColor}
          />
          <DesktopSizeSection
            status={status}
            sizes={detail?.sizes}
            value={sizeId}
            onChange={setSizeId}
            isAvailable={isAvailable}
          />
          <DesktopQuantitySection value={qty} onChange={setQty} />
        </div>

        {/* ADD TO CART: h:48, full inner width (= 339px), rounded:4.
            Disabled until a size is selected / while a request is in flight. */}
        {addError && <AddError message={addError} />}
        <button
          type="button"
          disabled={!canAdd || adding}
          onClick={handleAdd}
          className="font-display grid place-items-center transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            width: "100%",
            height: 48,
            padding: 8,
            backgroundColor: "#11191F",
            borderRadius: 4,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {adding ? "ADDING…" : "ADD TO CART"}
        </button>
      </aside>
    </>
  );
}

/* ---------- desktop pieces (Figma 120:7368) ---------- */

function DesktopHeader({ onClose }) {
  return (
    <header className="flex items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "0.02em",
        }}
      >
        ADD ITEM TO CART
      </h2>
      {/* 24x24 outlined square with X icon (= rotated +). */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="grid place-items-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 2,
          border: "1px solid #11191F",
          backgroundColor: "transparent",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#11191F"
          strokeWidth="1.5"
          width="14"
          height="14"
          aria-hidden
        >
          <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

function DesktopSectionTitle({ children }) {
  return (
    <p
      className="font-body"
      style={{
        fontWeight: 400,
        fontSize: 14,
        lineHeight: 1,
        color: "rgba(17,25,31,0.8)",
        fontStretch: "75%",
        margin: 0,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </p>
  );
}

function DesktopColorSection({ status, colors, value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>COLOR</DesktopSectionTitle>
      {status === "loading" ? (
        <OptionSkeleton size={32} count={3} />
      ) : status === "error" ? (
        <OptionError />
      ) : (
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          {(colors ?? []).map((c) => {
            const active = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                title={c.name}
                aria-pressed={active}
                onClick={() => onChange(c.id)}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: c.hex,
                  borderRadius: 3,
                  border: active
                    ? "3px solid #11191F"
                    : "1.5px solid rgba(17,25,31,0.10)",
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function DesktopSizeSection({ status, sizes, value, onChange, isAvailable }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>SIZE</DesktopSectionTitle>
      {status === "loading" ? (
        <OptionSkeleton size={32} count={4} />
      ) : status === "error" ? (
        <OptionError />
      ) : (
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {(sizes ?? []).map((s) => {
            const active = value === s.id;
            const avail = isAvailable(s.id);
            // XXL is wider in Figma (37.333px ≈ 38).
            const w = s.name.length >= 3 ? 38 : 32;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!avail}
                onClick={() => onChange(s.id)}
                title={avail ? undefined : "Out of stock"}
                aria-label={avail ? s.name : `${s.name} (out of stock)`}
                className="font-body grid place-items-center transition-colors disabled:cursor-not-allowed"
                style={{
                  width: w,
                  height: 32,
                  backgroundColor: active ? "#11191F" : "#ffffff",
                  color: active ? "#ffffff" : "#11191F",
                  borderRadius: 3,
                  border: "1.5px solid #11191F",
                  fontWeight: 500,
                  fontSize: 16,
                  fontStretch: "75%",
                  lineHeight: 1,
                  opacity: avail ? 1 : 0.35,
                  textDecoration: avail ? "none" : "line-through",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DesktopQuantitySection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <DesktopSectionTitle>QUANTITY</DesktopSectionTitle>
      <div className="flex items-center" style={{ gap: 8 }}>
        {/* Minus — 32x32, white bg, 1.5px #11191F border, horizontal stroke */}
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="grid place-items-center"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#ffffff",
            borderRadius: 3,
            border: "1.5px solid #11191F",
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
            <line x1="9" y1="16" x2="23" y2="16" stroke="#11191F" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {/* Number — w:64, h:32, 1.5px border, Zalando Sans Condensed Medium 16px */}
        <div
          className="font-body grid place-items-center"
          style={{
            width: 64,
            height: 32,
            paddingLeft: 8,
            paddingRight: 8,
            backgroundColor: "#ffffff",
            borderRadius: 3,
            border: "1.5px solid #11191F",
            color: "#11191F",
            fontWeight: 500,
            fontSize: 16,
            fontStretch: "75%",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {/* Plus — 32x32, #11191F bg, white plus icon */}
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(value + 1)}
          className="grid place-items-center"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#11191F",
            borderRadius: 3,
            border: "1.5px solid #11191F",
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
            <line x1="9" y1="16" x2="23" y2="16" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="9" x2="16" y2="23" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}

/* ---------- mobile pieces (Figma 7:1358) ---------- */

function MobileHeader({ onClose }) {
  return (
    <header className="flex items-center justify-between">
      <h2
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: "#11191F",
          margin: 0,
          lineHeight: 1,
        }}
      >
        ADD ITEM TO CART
      </h2>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="relative grid place-items-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 2,
          outline: "1px solid #11191F",
          outlineOffset: "-1px",
          backgroundColor: "transparent",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#11191F" strokeWidth="1.5" width="24" height="24" aria-hidden>
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </header>
  );
}

function MobileSectionTitle({ children }) {
  return (
    <p
      className="font-body"
      style={{
        fontWeight: 400,
        fontSize: 12,
        fontStretch: "75%",
        color: "rgba(17,25,31,0.80)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function MobileColorSection({ status, colors, value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>COLOR</MobileSectionTitle>
      {status === "loading" ? (
        <OptionSkeleton size={24} count={3} />
      ) : status === "error" ? (
        <OptionError />
      ) : (
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          {(colors ?? []).map((c) => {
            const active = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                title={c.name}
                aria-pressed={active}
                onClick={() => onChange(c.id)}
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: c.hex,
                  borderRadius: 2,
                  border: active
                    ? "2px solid #11191F"
                    : "1px solid rgba(17,25,31,0.10)",
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function MobileSizeSection({ status, sizes, value, onChange, isAvailable }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>SIZE</MobileSectionTitle>
      {status === "loading" ? (
        <OptionSkeleton size={24} count={4} />
      ) : status === "error" ? (
        <OptionError />
      ) : (
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {(sizes ?? []).map((s) => {
            const active = value === s.id;
            const avail = isAvailable(s.id);
            return (
              <button
                key={s.id}
                type="button"
                disabled={!avail}
                onClick={() => onChange(s.id)}
                title={avail ? undefined : "Out of stock"}
                aria-label={avail ? s.name : `${s.name} (out of stock)`}
                className="font-body grid place-items-center transition-colors disabled:cursor-not-allowed"
                style={{
                  width: s.name.length >= 3 ? 28 : 24,
                  height: 24,
                  backgroundColor: active ? "#11191F" : "#ffffff",
                  color: active ? "#ffffff" : "#11191F",
                  borderRadius: 2,
                  outline: "1px solid #11191F",
                  outlineOffset: "-1px",
                  fontWeight: 500,
                  fontSize: 12,
                  fontStretch: "75%",
                  lineHeight: 1,
                  opacity: avail ? 1 : 0.35,
                  textDecoration: avail ? "none" : "line-through",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MobileQuantitySection({ value, onChange }) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <MobileSectionTitle>QUANTITY</MobileSectionTitle>
      <div className="flex items-center" style={{ gap: 8 }}>
        {/* − ghost button (Figma: 12x1.5px stroke at y=12) */}
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <line x1="6" y1="12" x2="18" y2="12" stroke="#11191F" strokeWidth="1.5" />
          </svg>
        </button>
        {/* number display 48x24 */}
        <div
          className="font-body grid place-items-center"
          style={{
            width: 48,
            height: 24,
            paddingLeft: 6,
            paddingRight: 6,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
            color: "#11191F",
            fontWeight: 500,
            fontSize: 12,
            fontStretch: "75%",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {/* + filled button (Figma: 12x1.5px horizontal + 12x1.5px vertical white strokes) */}
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(value + 1)}
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            backgroundColor: "#11191F",
            borderRadius: 2,
            outline: "1px solid #11191F",
            outlineOffset: "-1px",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
            <line x1="6" y1="12" x2="18" y2="12" stroke="#FFFFFF" strokeWidth="1.5" />
            <line x1="12" y1="6" x2="12" y2="18" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </section>
  );
}

/* ---------- detail projection + option states ---------- */

// Project the raw myAppGetProductDetail blob down to exactly what the drawer
// needs — deliberately NOT mapDetailToProduct (that's server-coupled and pulls
// settings / related / crafted-to-last we don't want here).
//   colors    → [{ id, name, hex }]  (only colors that carry a hex to render)
//   sizes     → [{ id, name }]       (already sorted by sort_order server-side)
//   available → Set<"colorId|sizeId"> for variants with stock > 0
//   variantId → Map<"colorId|sizeId", variantId> for the add payload
function projectDetail(detail) {
  const colors = (Array.isArray(detail.colors) ? detail.colors : [])
    .map((c) => ({ id: Number(c.id), name: c.name, hex: c.hex_code }))
    .filter((c) => c.hex);
  const sizes = (Array.isArray(detail.sizes) ? detail.sizes : []).map((s) => ({
    id: Number(s.id),
    name: s.name,
  }));
  const available = new Set();
  const variantId = new Map();
  for (const v of Array.isArray(detail.variants) ? detail.variants : []) {
    const key = `${Number(v.color_id)}|${Number(v.size_id)}`;
    variantId.set(key, Number(v.id));
    if (v.available || Number(v.quantity) > 0) available.add(key);
  }
  return { colors, sizes, available, variantId };
}

// Greyed placeholder chips shown while the detail fetch is in flight. We never
// flash real-looking (mock) options here — an un-resolvable size must not be
// pickable, so the loading state is visibly inert.
function OptionSkeleton({ size, count }) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            width: size,
            height: size,
            borderRadius: size >= 32 ? 3 : 2,
            backgroundColor: "rgba(17,25,31,0.08)",
          }}
        />
      ))}
    </div>
  );
}

function OptionError() {
  return (
    <p
      className="font-body"
      style={{
        fontWeight: 400,
        fontSize: 12,
        fontStretch: "75%",
        color: "rgba(17,25,31,0.5)",
        margin: 0,
        lineHeight: 1.4,
      }}
    >
      Couldn’t load options. Please close and try again.
    </p>
  );
}

// Inline failure message for the ADD action (e.g. stock moved since the drawer
// opened — "Only 2 in stock"). role=alert so it's announced to screen readers.
function AddError({ message }) {
  return (
    <p
      role="alert"
      className="font-body"
      style={{
        fontWeight: 500,
        fontSize: 12,
        fontStretch: "75%",
        color: "#a50013",
        margin: 0,
        lineHeight: 1.4,
      }}
    >
      {message}
    </p>
  );
}

