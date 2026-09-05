"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { repairCall } from "@/lib/repairAuthedApi";
import ProductCard from "@/components/customer/shop/ProductCard";
import useDelayedUnmount from "@/lib/useDelayedUnmount";

// myAppListProducts item → ProductCard prop shape (client-side counterpart of
// shopCatalog.js's server mapper; kept inline so this client component doesn't
// pull in the server-only repairApi module). primary_image is an object
// { url, color_id } — read `.url` (see reference_repair_listproducts_shape).
const PLACEHOLDER_IMAGE = "/shop/model-1.png";
function toCard(item) {
  const price = Number(item.base_price);
  const effective = Number(item.effective_price);
  const salePrice = Number.isFinite(effective) && effective < price ? effective : null;
  return {
    id: item.id,
    name: item.name,
    subtitle: item.material || "",
    price,
    salePrice,
    currency: "JOD",
    colors: Array.isArray(item.colors) ? item.colors : [],
    colorImages: (Array.isArray(item.color_images) ? item.color_images : [])
      .map((c) => ({
        hex: c.hex,
        colorId: c.color_id,
        images: (Array.isArray(c.images) ? c.images : []).filter(Boolean),
      }))
      .filter((c) => c.images.length > 0),
    image: item.primary_image?.url || PLACEHOLDER_IMAGE,
    labels: Array.isArray(item.labels) ? item.labels : [],
  };
}

const SEARCH_DEBOUNCE_MS = 250;

// Search overlay — opens when the user taps the search icon in ShopHeader.
//
// Mobile (Figma 39:1525 + 39:1953):
//   Full-screen white surface (md:hidden). 40px outlined input at the top,
//   "MOST POPULAR" / "RESULTS" rows below (56x84 thumb + title/subtitle +
//   4 swatches + price right-aligned). No-results state surfaces a centered
//   message + "YOU MIGHT LIKE" suggestions.
//
// Desktop (Figma 120:5217):
//   Fixed overlay slotted below the 80px sticky ShopHeader (hidden md:block).
//   - 1px #11191F outlined search bar, radius 8, 25px L/R + 17px T/B padding,
//     soft 4/12 shadow. Input is Zalando Sans Expanded Bold 18px uppercase
//     #11191F; a 15x20 X button on the right closes the overlay.
//   - "SEARCH RESULTS" (or "MOST POPULAR" when the query is empty) heading
//     in Zalando Sans Expanded SemiBold 18px / 28px / 0.45px tracking.
//   - 4-col grid (24px gap) of DesktopCard, reusing ProductCard so swatches,
//     quick-add glass button, and pricing all stay consistent with /shop.
//   - No-results state mirrors the mobile pattern: centered "NO PRODUCTS
//     WERE FOUND" message + "YOU MIGHT LIKE" grid of 4 suggestions.
//
// Both variants share linear fade in/out (240ms) via `.search-overlay`.

export default function SearchOverlay({ open, onClose }) {
  const { render, dataState } = useDelayedUnmount(open, 240);
  if (!render) return null;
  return <Body onClose={onClose} dataState={dataState} />;
}

function Body({ onClose, dataState }) {
  const mobileInputRef = useRef(null);
  const desktopInputRef = useRef(null);
  const [query, setQuery] = useState("");

  // Live data from the `repair` sub-server (myAppListProducts — public, works
  // logged-out). `popular` (empty-query default) is fetched once; `results` is
  // the debounced server-side search. No mock fallback.
  const [popular, setPopular] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();

  // Most-popular slice — newest products (the list resolver orders by created_at
  // DESC). Fetched once on open; backs the empty-query state + "YOU MIGHT LIKE".
  useEffect(() => {
    let active = true;
    repairCall("myAppListProducts", { limit: 8 }, { isQuery: true })
      .then((d) => {
        if (active) setPopular((Array.isArray(d?.items) ? d.items : []).map(toCard));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Debounced server search — one request per pause in typing, not per keystroke.
  // `active` drops a stale response if the query changed before it resolved.
  useEffect(() => {
    if (!trimmed) return undefined;
    // setLoading runs in the debounce callback, not the effect body — a search
    // that is still being typed has not started yet, so flipping the spinner on
    // synchronously here also made the "no results" copy flash between
    // keystrokes.
    let active = true;
    const t = setTimeout(() => {
      setLoading(true);
      repairCall("myAppListProducts", { search: trimmed, limit: 12 }, { isQuery: true })
        .then((d) => {
          if (!active) return;
          setResults((Array.isArray(d?.items) ? d.items : []).map(toCard));
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [trimmed]);

  // What each surface renders: search results when querying, else the popular
  // slice. Suggestions for the no-results state come from the popular pool.
  const mobileProducts = trimmed ? results : popular;
  const desktopGrid = trimmed ? results.slice(0, 12) : popular.slice(0, 8);
  const suggestions = popular.slice(0, 4);

  // Autofocus the input on mount + lock body scroll for the lifetime of the
  // overlay so the page underneath doesn't move. Pick which input to focus
  // based on the active breakpoint — only one variant is visible at a time.
  useEffect(() => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    (isDesktop ? desktopInputRef : mobileInputRef).current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <MobileBody
        dataState={dataState}
        onClose={onClose}
        query={query}
        setQuery={setQuery}
        inputRef={mobileInputRef}
        trimmed={trimmed}
        loading={loading}
        results={mobileProducts}
        suggestions={suggestions}
      />
      <DesktopBody
        dataState={dataState}
        onClose={onClose}
        query={query}
        setQuery={setQuery}
        inputRef={desktopInputRef}
        trimmed={trimmed}
        loading={loading}
        grid={desktopGrid}
        suggestions={suggestions}
      />
    </>
  );
}

function MobileBody({
  dataState,
  onClose,
  query,
  setQuery,
  inputRef,
  trimmed,
  loading,
  results,
  suggestions,
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      data-state={dataState}
      className="search-overlay fixed inset-0 z-50 flex flex-col bg-white md:hidden"
      style={{
        paddingTop: "max(16px, env(safe-area-inset-top))",
      }}
    >
      {/* Close row — Figma 39:1525 doesn't show one (the iOS Safari chrome
          provides back nav). For a real app, surface a back arrow at the top
          left so the overlay is dismissable on screens without browser chrome. */}
      <div className="flex items-center px-4" style={{ height: 32, marginBottom: 8 }}>
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="grid size-6 place-items-center"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#11191F"
            strokeWidth="1.6"
            width="20"
            height="20"
            aria-hidden
          >
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Search input — 40h, 1px outline #11191F, radius 6 */}
      <div className="px-4">
        <div
          className="flex items-center bg-white"
          style={{
            height: 40,
            paddingLeft: 8,
            paddingRight: 8,
            gap: 8,
            borderRadius: 6,
            border: "1px solid #11191F",
          }}
        >
          <Image src="/shop/icon-search.svg" alt="" width={20} height={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="search-overlay-input flex-1 bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-zalando-expanded)",
              // Figma 39:1953 — typed text is Bold (700); placeholder stays
              // Regular (400) via the ::placeholder rule in globals.css.
              fontWeight: 700,
              fontSize: 12,
              color: "#11191F",
              lineHeight: 1,
              border: "none",
              padding: 0,
              minWidth: 0,
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="grid place-items-center"
              style={{ width: 20, height: 20 }}
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
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 24, paddingLeft: 16, paddingRight: 16 }}
      >
        {trimmed && results.length === 0 ? (
          loading ? (
            <SearchingHint />
          ) : (
            <NoResultsBody suggestions={suggestions} onClose={onClose} />
          )
        ) : (
          <ResultsBody
            title={trimmed ? "RESULTS" : "MOST POPULAR"}
            products={results}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function DesktopBody({
  dataState,
  onClose,
  query,
  setQuery,
  inputRef,
  trimmed,
  loading,
  grid,
  suggestions,
}) {
  // Only treat as "no results" once the request has settled, so the empty-state
  // copy doesn't flash mid-search.
  const noResults = trimmed && !loading && grid.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      data-state={dataState}
      // Slotted under the 80px sticky ShopHeader so the header stays visible
      // and the overlay covers the rest of the viewport (including any
      // footer area). z-20 sits below the header's z-30 — the two never
      // overlap because of top:80px, but keeping it lower is safer in case
      // a future sticky-shadow lift bumps the header z-index.
      className="search-overlay fixed inset-x-0 z-20 hidden bg-white md:block"
      style={{ top: 80, bottom: 0, overflowY: "auto" }}
    >
      <div
        className="mx-auto flex w-full flex-col"
        style={{
          maxWidth: 1440,
          paddingTop: 96,
          paddingBottom: 64,
          paddingLeft: 32,
          paddingRight: 32,
          gap: 64,
          minHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Search Bar — Figma 120:5474. 1px #11191F outline, radius 8,
            17px T/B + 25px L/R padding, soft shadow. */}
        <div
          className="flex w-full items-center bg-white"
          style={{
            borderRadius: 8,
            border: "1px solid #11191F",
            paddingTop: 17,
            paddingBottom: 17,
            paddingLeft: 25,
            paddingRight: 25,
            boxShadow: "0px 4px 12px 0px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ paddingRight: 16, display: "flex", alignItems: "center" }}>
            <Image src="/shop/icon-search.svg" alt="" width={20} height={20} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="search-overlay-input flex-1 bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-zalando-expanded)",
              fontWeight: 700,
              fontSize: 18,
              color: "#11191F",
              lineHeight: "normal",
              textTransform: "uppercase",
              border: "none",
              padding: 0,
              minWidth: 0,
            }}
          />
          {/* Figma 120:5481 — close X button (15w x 20h SVG) sits at the
              right of the bar and dismisses the overlay. */}
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="grid place-items-center"
            style={{ width: 15, height: 20, marginLeft: 8 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#11191F"
              strokeWidth="1.6"
              width="15"
              height="20"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Results section — Figma 120:5231 */}
        <div className="flex w-full flex-col" style={{ gap: 32 }}>
          <DesktopHeading>{trimmed ? "SEARCH RESULTS" : "MOST POPULAR"}</DesktopHeading>

          {noResults ? (
            <DesktopNoResults suggestions={suggestions} onClose={onClose} />
          ) : trimmed && loading && grid.length === 0 ? (
            <SearchingHint />
          ) : (
            <DesktopGrid products={grid} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// Brief in-flight state while a search request is pending — keeps the
// no-results copy from flashing before the response lands.
function SearchingHint() {
  return (
    <div className="flex items-center justify-center" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <span
        style={{
          fontFamily: "var(--font-zalando-expanded)",
          fontWeight: 500,
          fontSize: 12,
          color: "rgba(17,25,31,0.5)",
          letterSpacing: "0.02em",
        }}
      >
        Searching…
      </span>
    </div>
  );
}

function DesktopHeading({ children }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-zalando-expanded)",
        fontWeight: 600,
        fontSize: 18,
        lineHeight: "28px",
        letterSpacing: "0.45px",
        textTransform: "uppercase",
        color: "#11191F",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function DesktopGrid({ products, onClose }) {
  // 4-col grid, 24px gap — matches Figma 120:5235. Closing the overlay when
  // the user clicks through a card keeps focus + scroll on the destination
  // page (Link won't navigate until after onClick runs).
  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 24,
      }}
    >
      {products.map((p) => (
        <div key={p.id} onClickCapture={onClose}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

function DesktopNoResults({ suggestions, onClose }) {
  return (
    <div className="flex w-full flex-col" style={{ gap: 32 }}>
      <p
        style={{
          fontFamily: "var(--font-zalando-expanded)",
          fontWeight: 500,
          fontSize: 16,
          color: "#11191F",
          margin: 0,
          lineHeight: 1.4,
          textAlign: "center",
          letterSpacing: "0.02em",
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        NO PRODUCTS WERE FOUND
        <br />
        TRY SEARCHING FOR SOMETHING ELSE.
      </p>
      <div className="flex w-full flex-col" style={{ gap: 32 }}>
        <DesktopHeading>YOU MIGHT LIKE</DesktopHeading>
        <DesktopGrid products={suggestions} onClose={onClose} />
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-zalando-expanded)",
        fontWeight: 500,
        fontSize: 14,
        color: "#11191F",
        margin: 0,
        lineHeight: 1,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </p>
  );
}

function ResultsList({ products, onClose }) {
  return (
    <div className="flex flex-col" style={{ gap: 16, paddingLeft: 8, paddingRight: 8 }}>
      {products.map((p) => (
        <ResultRow key={p.id} product={p} onClose={onClose} />
      ))}
    </div>
  );
}

function ResultsBody({ title, products, onClose }) {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div
        className="flex items-center justify-between"
        style={{ paddingLeft: 8, paddingRight: 8 }}
      >
        <SectionTitle>{title}</SectionTitle>
      </div>
      <ResultsList products={products} onClose={onClose} />
    </div>
  );
}

// Figma 39:1953 — no-results layout:
//   "RESULTS" title (no count) → centered message → "YOU MIGHT LIKE" + 4 cards.
function NoResultsBody({ suggestions, onClose }) {
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* RESULTS title (no count) */}
      <div
        className="flex items-center justify-between"
        style={{ paddingLeft: 8, paddingRight: 8 }}
      >
        <SectionTitle>RESULTS</SectionTitle>
      </div>

      {/* Centered empty message — Zalando Sans Expanded Medium 12px #11191F */}
      <div
        className="flex flex-col items-center"
        style={{ paddingTop: 16, paddingBottom: 24, paddingLeft: 8, paddingRight: 8 }}
      >
        <p
          style={{
            fontFamily: "var(--font-zalando-expanded)",
            fontWeight: 500,
            fontSize: 12,
            color: "#11191F",
            margin: 0,
            lineHeight: 1.4,
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          NO PRODUCTS WERE FOUND
          <br />
          TRY SEARCHING FOR SOMETHING ELSE.
        </p>
      </div>

      {/* YOU MIGHT LIKE — 4 suggested products */}
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div
          className="flex items-center justify-between"
          style={{ paddingLeft: 8, paddingRight: 8 }}
        >
          <SectionTitle>YOU MIGHT LIKE</SectionTitle>
        </div>
        <ResultsList products={suggestions} onClose={onClose} />
      </div>
    </div>
  );
}

function ResultRow({ product, onClose }) {
  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onClose}
      className="flex items-center"
      style={{ gap: 8 }}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-[#f5f5f5]"
        style={{
          width: 56,
          height: 84,
          boxShadow: "0px 0px 10px 0px rgba(0,0,0,0.05)",
        }}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 items-start" style={{ gap: 35, paddingLeft: 4 }}>
        <div className="flex flex-1 flex-col" style={{ gap: 8, minWidth: 0 }}>
          <div className="flex flex-col" style={{ gap: 2 }}>
            <p
              style={{
                fontFamily: "var(--font-zalando-sans)",
                fontStretch: "75%",
                fontWeight: 500,
                fontSize: 14,
                color: "#11191F",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </p>
            <p
              style={{
                fontFamily: "var(--font-zalando-sans)",
                fontStretch: "75%",
                fontWeight: 400,
                fontSize: 12,
                color: "rgba(17,25,31,0.5)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {product.subtitle}
            </p>
          </div>
          <div className="flex items-center" style={{ gap: 4 }}>
            {product.colors.slice(0, 4).map((hex) => (
              <span
                key={hex}
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: hex,
                  borderRadius: 3,
                  border: "0.75px solid rgba(17,25,31,0.10)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        </div>
        <p
          style={{
            fontFamily: "var(--font-zalando-sans)",
            fontStretch: "75%",
            fontWeight: 600,
            fontSize: 14,
            color: "#11191F",
            margin: 0,
            textAlign: "right",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {product.currency} {product.salePrice ?? product.price}
        </p>
      </div>
    </Link>
  );
}
