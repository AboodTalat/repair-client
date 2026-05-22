"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_CODES, flagEmoji } from "@/lib/countryCodes";

// Dial-code dropdown anchored to the +XXX cluster inside the phone field.
// Closes on outside-click + Escape. Search filters by country name or dial
// code. Flag emoji comes from `flagEmoji(iso2)` so we don't ship a static
// flag table.

export default function CountryCodePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // autofocus the search field next tick (after the popover paints)
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso2.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 font-display text-[10px] font-medium uppercase text-[rgba(17,25,31,0.5)] outline-none md:text-[12px]"
      >
        <span aria-hidden className="text-[12px] leading-none md:text-[14px]">
          {flagEmoji(value.iso2)}
        </span>
        <span>+{value.dial}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M1 2.5L4 5.5L7 2.5"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-20 flex w-[260px] flex-col rounded-[2px] border border-[#11191f] bg-white shadow-[0_8px_24px_-8px_rgba(17,25,31,0.25)]"
        >
          <div className="border-b border-[#e5e7eb] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH COUNTRY"
              className="h-8 w-full rounded-[2px] border border-[#e5e7eb] bg-transparent px-2 font-display text-[10px] font-medium uppercase tracking-[0.5px] text-[#11191f] placeholder:text-[rgba(17,25,31,0.5)] outline-none focus:border-[#11191f]"
            />
          </div>
          <ul className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 font-display text-[10px] font-medium uppercase text-[rgba(17,25,31,0.5)]">
                No matches
              </li>
            ) : (
              filtered.map((c) => {
                const active = c.iso2 === value.iso2;
                return (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(c);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-display text-[10px] font-medium uppercase text-[#11191f] hover:bg-[#f5f5f5] ${
                        active ? "bg-[#f5f5f5]" : ""
                      }`}
                    >
                      <span aria-hidden className="text-[12px] leading-none">
                        {flagEmoji(c.iso2)}
                      </span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[rgba(17,25,31,0.5)]">
                        +{c.dial}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
