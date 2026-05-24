"use client";

import { useRef, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { TextInput, TextArea, Toggle } from "@/components/admin/shared/Form";
import { IconCheck, IconTrash, IconPlus, IconChevronDown, IconEdit } from "@/components/admin/shared/Icons";
import {
  STOREFRONT_HERO,
  STOREFRONT_COLORWAYS,
  STOREFRONT_STATS,
  STOREFRONT_BROWSE_TILES,
  STOREFRONT_PRODUCT_SECTIONS,
  STOREFRONT_FOOTER,
  COACHING_CTA,
} from "@/lib/mockAdmin";

function SectionCard({ title, description, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
            {title}
          </p>
          {description ? (
            <p className="mt-1 font-body text-[12px] text-[#6b7280]">{description}</p>
          ) : null}
        </div>
        <span
          className="grid size-6 place-items-center text-[#11191f] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <IconChevronDown />
        </span>
      </button>
      {open ? <div className="border-t border-[#f3f4f6] p-5">{children}</div> : null}
    </section>
  );
}

function FieldRow({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SavedPill() {
  return (
    <span className="flex items-center gap-1 font-body text-[12px] text-[#16a34a]">
      <span
        className="grid size-4 place-items-center rounded-full"
        style={{ backgroundColor: "#16a34a" }}
      >
        <IconCheck className="text-white" />
      </span>
      Saved
    </span>
  );
}

function SaveBar({ onSave, saved, onTogglePreview, previewOpen }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#f3f4f6] pt-4">
      <Button size="sm" onClick={onSave}>Save changes</Button>
      {onTogglePreview ? (
        <Button size="sm" variant="secondary" onClick={onTogglePreview}>
          {previewOpen ? "Hide preview" : "Show preview"}
        </Button>
      ) : null}
      {saved ? <SavedPill /> : null}
    </div>
  );
}

function useSavedFlag() {
  const [saved, setSaved] = useState(false);
  function trigger() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return [saved, trigger];
}

// (#20) Wraps a section preview block so every editor has the same chrome:
// a coloured "PREVIEW — UNSAVED" eyebrow + the rendered section.
function PreviewPanel({ open, children }) {
  if (!open) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-[4px] border border-[#dbeafe] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#dbeafe] bg-[#eff6ff] px-4 py-2">
        <span className="font-display text-[10px] font-bold uppercase tracking-[1.2px] text-[#1e3a8a]">
          Preview — unsaved
        </span>
        <span className="font-body text-[11px] text-[#1e3a8a]">
          This is a demo of what the storefront will look like with your current edits.
        </span>
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

// (#2) ImageField — shows the current image preview, lets admin pick a
// new file (URL.createObjectURL preview), edit the path manually, or
// clear it. Pure UI: no real upload.
function ImageField({
  label = "Image",
  value,
  onChange,
  aspectRatio = "16 / 9",
  height = 140,
}) {
  const fileRef = useRef(null);
  const [showPath, setShowPath] = useState(false);

  function pick() {
    if (fileRef.current) fileRef.current.click();
  }

  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange(url);
    e.target.value = "";
  }

  function clear() {
    onChange("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
        {label}
      </span>
      <div
        className="relative w-full overflow-hidden rounded-[2px] border border-[#e5e7eb] bg-[#f3f4f6]"
        style={{ aspectRatio, maxHeight: height }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="absolute inset-0 size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[#9ca3af]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={pick}>
          {value ? "Replace photo" : "Upload photo"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<IconEdit />}
          onClick={() => setShowPath((v) => !v)}
        >
          {showPath ? "Hide path" : "Edit path"}
        </Button>
        {value ? (
          <IconButton label="Clear image" onClick={clear}>
            <IconTrash />
          </IconButton>
        ) : null}
      </div>

      {showPath ? (
        <TextInput
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/home/hero.jpg"
        />
      ) : null}
    </div>
  );
}

// ============================================================
// Preview components — visual approximations of each section as
// they render on the live landing page (src/app/page.js +
// src/components/public/homePage/*). The chrome (dark black bg,
// Zalando display fonts, glass CTA buttons, alternating two-
// column colorways with badge/swatch panel) matches the real
// design so admins can validate edits before clicking Save.
//
// Notes:
//   - Backgrounds are #000 / #0f1112 to match the landing.
//   - Type uses .font-display / .font-body tokens already wired
//     in globals.css (Zalando Sans Expanded / Sans).
//   - Body copy uses fontStretch:"75%" to approximate Zalando
//     Sans Condensed (same trick the landing pages use).
//   - GlassButton-style CTAs are reproduced inline.
// ============================================================

// Glass-style CTA pill used across hero / colorways / stats.
function GlassCtaPill({ children, variant = "dark", className = "" }) {
  const isDark = variant === "dark";
  return (
    <span
      className={
        "relative inline-flex h-10 items-center justify-center overflow-hidden rounded-lg border-l border-t border-white/80 px-5 backdrop-blur-[2px] " +
        className
      }
      style={{
        boxShadow:
          "inset -4.5px -4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
          "inset 4.5px 4.5px 1.5px -5.25px rgba(255,255,255,0.5)," +
          "inset 3px 4.5px 1.5px -3px rgba(179,179,179,0.2)," +
          "inset -3px -4.5px 1.5px -3px #b3b3b3," +
          "inset 0 0 33px 0 rgba(242,242,242,0.5)",
      }}
    >
      {isDark ? (
        <>
          <span className="absolute inset-0 rounded-lg bg-black/35" aria-hidden />
          <span
            className="absolute inset-0 rounded-lg bg-[#1d1d1d] opacity-30"
            style={{ mixBlendMode: "plus-lighter" }}
            aria-hidden
          />
          <span className="absolute inset-0 rounded-lg bg-black/30" aria-hidden />
        </>
      ) : (
        <span className="absolute inset-0 rounded-lg bg-white" aria-hidden />
      )}
      <span
        className={
          "relative font-display text-[13px] font-bold uppercase leading-none " +
          (isDark ? "text-white" : "text-[#11191f]")
        }
      >
        {children}
      </span>
    </span>
  );
}

// Drop-image helper that hides its <img> on broken-image load.
function PreviewImage({ src, alt = "", className = "", style }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

// ── Hero preview (matches HeroSection.jsx desktop layout) ───────────────
function HeroPreview({ hero }) {
  return (
    <div className="w-full overflow-hidden bg-[linear-gradient(180deg,#0f1112_0%,#101011_54.5%,#101013_76.4%,#101014_100%)]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-12 items-center gap-8 px-6 py-12 md:gap-12 md:px-10 md:py-16">
        <div className="col-span-12 flex flex-col items-start md:col-span-7">
          {hero.eyebrow ? (
            <p
              className="font-body text-[11px] uppercase tracking-[0.4em] text-white/60 md:text-[13px]"
              style={{ fontStretch: "75%" }}
            >
              {hero.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 font-display text-[34px] font-bold uppercase leading-[1.05] text-white md:mt-4 md:text-[56px]">
            {hero.title || <span className="text-white/40">Hero title</span>}
          </h1>
          {hero.subtitle ? (
            <p
              className="mt-4 max-w-[440px] font-body text-[14px] leading-[1.6] text-[#d4d4d4] md:mt-5 md:text-[16px]"
              style={{ fontStretch: "75%" }}
            >
              {hero.subtitle}
            </p>
          ) : null}
          {hero.ctaLabel ? (
            <div className="mt-6 md:mt-8">
              <GlassCtaPill variant="dark" className="!w-[220px] md:!w-[240px]">
                {hero.ctaLabel}
              </GlassCtaPill>
            </div>
          ) : null}
        </div>
        <div className="relative col-span-12 h-[260px] w-full overflow-hidden md:col-span-5 md:h-[360px]">
          {hero.image ? (
            <PreviewImage src={hero.image} alt="" className="absolute inset-0 size-full object-contain object-center" />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-white/5 text-white/30">
              <span className="font-body text-[12px]">No image</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Colorway preview (matches ColorwaySection.jsx desktop two-column) ───
function ColorwayPreview({ row }) {
  const main = row.swatches?.[0];
  const swatches = row.multiSwatch ? row.swatches : (main ? [main] : []);
  return (
    <div className="bg-black">
      <div className="mx-auto grid max-w-[1280px] grid-cols-12 items-stretch gap-0 px-6 py-10 md:px-10 md:py-14">
        {/* Image column */}
        <div
          className={
            "relative col-span-12 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#0a0a0a] md:col-span-7 " +
            (row.reversed ? "md:order-2" : "md:order-1")
          }
        >
          {row.image ? (
            <PreviewImage src={row.image} alt={row.imageAlt || ""} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-white/30">
              <span className="font-body text-[12px]">No image</span>
            </div>
          )}
        </div>

        {/* Copy column */}
        <div
          className={
            "col-span-12 mt-6 flex flex-col justify-center md:col-span-5 md:mt-0 md:px-8 " +
            (row.reversed ? "md:order-1" : "md:order-2")
          }
        >
          {row.badge === "UNISEX" ? (
            <span
              className="inline-flex w-fit items-center justify-center rounded-[32px] border border-white/15 bg-white/5 px-3 py-1 font-body text-[11px] uppercase tracking-[0.2em] text-white/80"
              style={{ fontStretch: "75%" }}
            >
              Unisex
            </span>
          ) : (
            <p
              className="font-body text-[11px] uppercase tracking-[0.4em] text-white/50 md:text-[12px]"
              style={{ fontStretch: "75%" }}
            >
              Colorway
            </p>
          )}

          <h3 className="mt-3 font-display text-[28px] font-bold uppercase leading-[1.05] text-white md:mt-4 md:text-[40px]">
            {row.multiSwatch
              ? (swatches.map((s) => s.name).join(" / ") || "—")
              : (main?.name || "—")}
          </h3>

          {swatches.length > 0 ? (
            <div className="mt-5 flex flex-col gap-4 md:mt-7">
              {swatches.map((s, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className="size-10 shrink-0 rounded-[6px] border border-white/10 md:size-12"
                    style={{ background: s.color }}
                  />
                  <div className="flex flex-col">
                    <p className="font-display text-[17px] font-bold leading-tight text-white md:text-[20px]">
                      {s.name}
                    </p>
                    <p
                      className="mt-1 font-body text-[12px] leading-5 text-white/60 md:text-[13px]"
                      style={{ fontStretch: "75%" }}
                    >
                      {s.tagline}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 font-body text-[12px] text-white/40">
              No swatches yet — add one in the editor.
            </p>
          )}

          {row.ctaLabel ? (
            <div className="mt-7 max-w-[240px]">
              <GlassCtaPill variant="light" className="w-full">
                {row.ctaLabel}
              </GlassCtaPill>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Stats preview (matches StatsSection.jsx desktop) ────────────────────
function StatsPreview({ stats }) {
  return (
    <div className="bg-black">
      <div className="mx-auto flex max-w-[1280px] flex-col px-6 py-10 md:px-10 md:py-14">
        <p
          className="font-body text-[11px] uppercase tracking-[0.4em] text-white/50 md:text-[13px]"
          style={{ fontStretch: "75%" }}
        >
          The Fabric
        </p>
        <h2 className="mt-3 font-display text-[28px] font-bold uppercase leading-[1.05] text-white md:mt-4 md:text-[44px]">
          Built for
          <br />
          every rep.
        </h2>
        <p
          className="mt-4 max-w-[480px] font-body text-[14px] leading-[1.6] text-white/60 md:text-[16px]"
          style={{ fontStretch: "75%" }}
        >
          A high-performance blend engineered for stretch, recovery, and breathability — wash after wash.
        </p>

        {(stats || []).length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-5 border-y border-white/10 py-6 md:mt-8 md:grid-cols-4 md:gap-6 md:py-8">
            {stats.map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5">
                <p className="font-display text-[28px] font-bold leading-none text-white md:text-[40px]">
                  {s.value || <span className="text-white/30">—</span>}
                </p>
                <p
                  className="font-body text-[11px] uppercase tracking-[0.15em] text-white/50 md:text-[12px]"
                  style={{ fontStretch: "75%" }}
                >
                  {s.label || <span className="text-white/30">label</span>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 font-body text-[12px] text-white/40">
            No stats yet — add one in the editor.
          </p>
        )}

        <div className="mt-7 max-w-[240px]">
          <GlassCtaPill variant="light" className="w-full">
            SELECT YOUR SIZE
          </GlassCtaPill>
        </div>
      </div>
    </div>
  );
}

// ── Browse-collection preview (matches BrowseCollection.jsx) ────────────
function BrowseTilesPreview({ tiles }) {
  const swatches = ["#ede9dd", "#232323", "#12013f", "#3e0000"];
  return (
    <div className="bg-black">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-10 md:py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[22px] font-bold leading-7 text-white/90 md:text-[36px] md:leading-[1.1]">
            Browse Collection
          </h2>
          <span
            className="hidden font-body text-[12px] uppercase tracking-[0.2em] text-white/70 md:inline-flex"
            style={{ fontStretch: "75%" }}
          >
            View all
          </span>
        </div>
        {(tiles || []).length === 0 ? (
          <p className="mt-6 font-body text-[12px] text-white/40">
            No tiles yet — add one in the editor.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
            {tiles.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 md:gap-3">
                <div
                  className="relative w-full overflow-hidden bg-[#0a0a0a] shadow-[0_0_10px_0_rgba(0,0,0,0.05)]"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  {t.image ? (
                    <PreviewImage src={t.image} alt={t.title || ""} className="absolute inset-0 size-full object-cover" />
                  ) : null}
                  {/* Swatches bottom-left, plus-button bottom-right — matches the
                      real ProductCard chrome so admins recognise the surface. */}
                  <div className="absolute bottom-2 left-2 flex gap-[2px] md:bottom-3 md:left-3 md:gap-1">
                    {swatches.map((c) => (
                      <span
                        key={c}
                        className="block size-2 rounded-[2px] border border-[#11191f]/10 md:size-3"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <span
                    className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-sm border border-white/70 bg-white/30 backdrop-blur-[1.5px] md:bottom-3 md:right-3 md:size-8"
                    aria-hidden
                  >
                    <span className="text-[12px] font-bold leading-none text-white md:text-[14px]">+</span>
                  </span>
                </div>
                <div className="flex items-start justify-between px-1 text-white/90 md:px-0">
                  <div className="flex flex-col gap-[2px]">
                    <p
                      className="font-body text-[12px] font-medium md:text-[14px]"
                      style={{ fontStretch: "75%" }}
                    >
                      {t.title || <span className="text-white/40">Tile title</span>}
                    </p>
                    <p
                      className="font-body text-[10px] text-white/50 md:text-[12px]"
                      style={{ fontStretch: "75%" }}
                    >
                      Soft Cotton
                    </p>
                  </div>
                  <p
                    className="font-body text-[12px] font-semibold md:text-[14px]"
                    style={{ fontStretch: "75%" }}
                  >
                    JOD 30
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product detail marketing sections preview ───────────────────────────
// Single "Crafted to Last"-style centered block per enabled entry, on the
// same black bg the landing's CraftedToLast section uses.
function ProductSectionsPreview({ rows }) {
  const enabled = (rows || []).filter((r) => r.enabled);
  if (enabled.length === 0) {
    return (
      <div className="bg-black px-6 py-10 text-center">
        <p className="font-body text-[12px] text-white/40">
          All sections are hidden — toggle one on to preview.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-black">
      {enabled.map((r) => (
        <section
          key={r.id}
          className="flex w-full flex-col items-center px-6 py-12 text-center md:py-16"
        >
          <p
            className="hidden font-body text-[12px] uppercase tracking-[0.4em] text-white/50 md:block"
            style={{ fontStretch: "75%" }}
          >
            {r.key}
          </p>
          <h2 className="mt-2 font-display text-[24px] font-bold uppercase leading-tight text-white md:mt-5 md:text-[44px] md:leading-[1.1] lg:text-[52px]">
            {r.title}
          </h2>
          <p
            className="mt-3 max-w-[640px] font-body text-[14px] leading-normal text-[#d4d4d4] md:mt-5 md:text-[18px]"
            style={{ fontStretch: "75%" }}
          >
            {r.body}
          </p>
        </section>
      ))}
    </div>
  );
}

// ── Coaching CTA preview (matches OrderSuccessClient.jsx coaching card) ──
function CoachingPreview({ cta }) {
  if (!cta.enabled) {
    return (
      <div className="bg-[#fafafa] p-6 text-center">
        <p className="font-body text-[12px] text-[#6b7280]">
          Coaching card is currently <strong>hidden</strong> from the order success page.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white p-6">
      <div className="flex flex-col gap-4 overflow-hidden rounded-[12px] bg-gradient-to-br from-[#0d4a4a] to-[#11191f] p-6 text-white sm:flex-row sm:items-center sm:gap-6">
        {cta.image ? (
          <div className="relative h-[120px] w-[106px] shrink-0 overflow-hidden rounded-[8px] bg-black/30">
            <PreviewImage src={cta.image} alt="" className="absolute inset-0 size-full object-cover" />
          </div>
        ) : null}
        <div className="flex-1">
          {cta.eyebrow ? (
            <p
              className="font-body text-[11px] uppercase tracking-[0.3em] text-white/70"
              style={{ fontStretch: "75%" }}
            >
              {cta.eyebrow}
            </p>
          ) : null}
          <p className="mt-1 font-display text-[20px] font-bold uppercase tracking-[0.5px] md:text-[22px]">
            {cta.title}
          </p>
          {cta.body ? (
            <p
              className="mt-2 font-body text-[13px] leading-[1.6] text-white/80"
              style={{ fontStretch: "75%" }}
            >
              {cta.body}
            </p>
          ) : null}
          {cta.ctaLabel ? (
            <div className="mt-4">
              <span className="inline-flex h-11 items-center rounded-full bg-white px-6 font-display text-[12px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
                {cta.ctaLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Footer preview (matches Footer.jsx — WHITE bg, dark text) ───────────
function FooterPreview({ footer }) {
  return (
    <div className="bg-white px-6 pb-10 pt-8 text-[#11191f] md:px-10 md:pt-12">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-10 md:gap-y-10">
        {/* Brand column */}
        <div className="flex flex-col gap-5 md:col-span-4">
          <span className="font-display text-[18px] font-bold uppercase tracking-[1px] text-[#11191f]">
            RE
          </span>
          <p
            className="font-body text-[13px] leading-[19px] text-[#232323]/50 md:max-w-[320px]"
            style={{ fontStretch: "75%" }}
          >
            {footer.brandCopy || (
              <span className="text-[#232323]/30">Brand copy goes here.</span>
            )}
          </p>
          {footer.social?.length > 0 ? (
            <div className="flex gap-3">
              {footer.social.map((s) => (
                <span
                  key={s.id}
                  title={s.network}
                  className="grid size-10 place-items-center rounded-full bg-[#11191f] font-display text-[10px] font-bold uppercase text-white"
                >
                  {(s.network || "?").charAt(0)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Link columns */}
        <div className="flex gap-8 md:col-span-4 md:gap-12">
          {(footer.columns || []).map((col) => (
            <div key={col.id} className="flex flex-1 flex-col gap-3">
              <h3 className="font-display text-[11px] font-bold uppercase leading-4 tracking-[0.6px] text-[#11191f]">
                {col.heading || <span className="text-[#232323]/40">Column</span>}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li
                    key={l.id}
                    className="font-body text-[12px] leading-4 text-[#232323]/60"
                    style={{ fontStretch: "75%" }}
                  >
                    {l.label || <span className="text-[#232323]/30">—</span>}
                  </li>
                ))}
                {col.links.length === 0 ? (
                  <li className="font-body text-[11px] text-[#232323]/30">No links</li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter column (presentational only — the form lives in real Footer.jsx) */}
        <div className="flex flex-col gap-3 md:col-span-4">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.6px] text-[#11191f]">
            Stay in the loop
          </h3>
          <p
            className="font-body text-[12px] leading-4 text-[#232323]/50"
            style={{ fontStretch: "75%" }}
          >
            Subscribe for exclusive drops and early access.
          </p>
          <div className="flex gap-2">
            <span className="flex h-10 min-w-0 flex-1 items-center rounded border border-[#11191f] bg-white px-3 font-body text-[12px] text-[#232323]/50">
              Enter your email
            </span>
            <span className="grid h-10 shrink-0 place-items-center rounded bg-[#11191f] px-4 font-display text-[12px] font-bold text-white">
              →
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 border-t border-[#0f0f11]/10 pt-5 md:col-span-12 md:flex-row md:items-center md:justify-between">
          <p
            className="text-center font-body text-[12px] leading-4 text-[#232323]/50 md:text-left"
            style={{ fontStretch: "75%" }}
          >
            © 2026 RE. All rights reserved.
          </p>
          <ul className="flex justify-center gap-4 md:justify-end">
            <li className="font-body text-[12px] text-[#232323]/50" style={{ fontStretch: "75%" }}>Privacy Policy</li>
            <li className="font-body text-[12px] text-[#232323]/50" style={{ fontStretch: "75%" }}>Terms</li>
            <li className="font-body text-[12px] text-[#232323]/50" style={{ fontStretch: "75%" }}>Cookies</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────
function HeroEditor() {
  const [hero, setHero] = useState(STOREFRONT_HERO);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);
  function set(patch) { setHero((h) => ({ ...h, ...patch })); }
  return (
    <SectionCard
      title="Landing Hero"
      description="The first thing customers see on / — eyebrow, headline, subtitle, CTA, and background image."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldRow label="Eyebrow"><TextInput value={hero.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></FieldRow>
        <FieldRow label="CTA Label"><TextInput value={hero.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} /></FieldRow>
        <FieldRow label="Title"><TextInput value={hero.title} onChange={(e) => set({ title: e.target.value })} /></FieldRow>
        <FieldRow label="CTA Link"><TextInput value={hero.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} /></FieldRow>
      </div>
      <div className="mt-3">
        <FieldRow label="Subtitle">
          <TextArea rows={2} value={hero.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
        </FieldRow>
      </div>
      <div className="mt-3">
        <ImageField
          label="Background image"
          value={hero.image}
          onChange={(url) => set({ image: url })}
          aspectRatio="16 / 9"
          height={220}
        />
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <HeroPreview hero={hero} />
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Colorway sections ─────────────────────────────────────────────────────
function ColorwaysEditor() {
  const [rows, setRows] = useState(STOREFRONT_COLORWAYS);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);

  function updateRow(id, patch) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function updateSwatch(rowId, idx, patch) {
    setRows((arr) =>
      arr.map((r) =>
        r.id === rowId
          ? {
              ...r,
              swatches: r.swatches.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
            }
          : r
      )
    );
  }
  function addSwatch(rowId) {
    setRows((arr) =>
      arr.map((r) =>
        r.id === rowId
          ? {
              ...r,
              swatches: [...r.swatches, { color: "#ffffff", name: "New Color", tagline: "" }],
            }
          : r
      )
    );
  }
  function removeSwatch(rowId, idx) {
    setRows((arr) =>
      arr.map((r) =>
        r.id === rowId ? { ...r, swatches: r.swatches.filter((_, i) => i !== idx) } : r
      )
    );
  }
  function addRow() {
    setRows((arr) => [
      ...arr,
      {
        id: `cw-${Date.now()}`,
        image: "",
        imageAlt: "",
        badge: "",
        reversed: false,
        multiSwatch: false,
        ctaLabel: "ADD TO CART",
        swatches: [{ color: "#11191f", name: "New Color", tagline: "" }],
      },
    ]);
  }
  function removeRow(id) {
    setRows((arr) => arr.filter((r) => r.id !== id));
  }

  return (
    <SectionCard
      title="Colorway Sections"
      description="Featured colorway showcases between the hero and the stats. Add as many as you want; the order here is the order on the page."
    >
      <div className="flex flex-col gap-4">
        {rows.map((r, idx) => (
          <div key={r.id} className="rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f]">
                Section {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={r.reversed}
                  onChange={(v) => updateRow(r.id, { reversed: v })}
                  label="Image on right"
                />
                <IconButton label="Remove section" onClick={() => removeRow(r.id)}>
                  <IconTrash />
                </IconButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <ImageField
                  label="Section image"
                  value={r.image}
                  onChange={(url) => updateRow(r.id, { image: url })}
                  aspectRatio="16 / 9"
                  height={220}
                />
              </div>
              <FieldRow label="Image alt"><TextInput value={r.imageAlt} onChange={(e) => updateRow(r.id, { imageAlt: e.target.value })} /></FieldRow>
              <FieldRow label="CTA label"><TextInput value={r.ctaLabel} onChange={(e) => updateRow(r.id, { ctaLabel: e.target.value })} /></FieldRow>
              <FieldRow label="Badge (optional)"><TextInput value={r.badge} onChange={(e) => updateRow(r.id, { badge: e.target.value })} placeholder="UNISEX" /></FieldRow>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Swatches
              </span>
              <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={() => addSwatch(r.id)}>
                Add swatch
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {r.swatches.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-[2px] border border-[#f3f4f6] bg-white p-2">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateSwatch(r.id, i, { color: e.target.value })}
                    className="size-8 cursor-pointer rounded-[2px] border border-[#e5e7eb]"
                  />
                  <TextInput value={s.name} onChange={(e) => updateSwatch(r.id, i, { name: e.target.value })} className="!h-8" placeholder="Color name" />
                  <TextInput value={s.tagline} onChange={(e) => updateSwatch(r.id, i, { tagline: e.target.value })} className="!h-8" placeholder="Tagline" />
                  <IconButton label="Remove swatch" onClick={() => removeSwatch(r.id, i)}>
                    <IconTrash />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={addRow}>
          Add colorway section
        </Button>
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <div className="flex flex-col">
          {rows.map((r) => (
            <ColorwayPreview key={r.id} row={r} />
          ))}
          {rows.length === 0 ? (
            <p className="p-6 text-center font-body text-[12px] text-[#9ca3af]">
              No colorway sections yet — add one to preview.
            </p>
          ) : null}
        </div>
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────
function StatsEditor() {
  const [stats, setStats] = useState(STOREFRONT_STATS);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);
  function update(id, patch) { setStats((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s))); }
  function add() { setStats((arr) => [...arr, { id: `stat-${Date.now()}`, value: "", label: "" }]); }
  function remove(id) { setStats((arr) => arr.filter((s) => s.id !== id)); }
  return (
    <SectionCard
      title="Stats Section"
      description="Numbers shown on the landing page (Happy customers, Rating, etc.)."
    >
      <div className="flex flex-col gap-2">
        {stats.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-2">
            <TextInput value={s.value} onChange={(e) => update(s.id, { value: e.target.value })} className="!h-9 !w-32" placeholder="10K+" />
            <TextInput value={s.label} onChange={(e) => update(s.id, { label: e.target.value })} className="!h-9" placeholder="Happy customers" />
            <IconButton label="Remove stat" onClick={() => remove(s.id)}>
              <IconTrash />
            </IconButton>
          </div>
        ))}
        <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={add}>
          Add stat
        </Button>
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <StatsPreview stats={stats} />
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Browse collection tiles ───────────────────────────────────────────────
function BrowseTilesEditor() {
  const [tiles, setTiles] = useState(STOREFRONT_BROWSE_TILES);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);
  function update(id, patch) { setTiles((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t))); }
  function add() { setTiles((arr) => [...arr, { id: `bt-${Date.now()}`, title: "", image: "", href: "/shop" }]); }
  function remove(id) { setTiles((arr) => arr.filter((t) => t.id !== id)); }
  return (
    <SectionCard
      title="Browse Collection"
      description="Category tiles shown near the bottom of the landing page."
    >
      <div className="flex flex-col gap-2">
        {tiles.map((t) => (
          <div key={t.id} className="grid grid-cols-1 gap-3 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3 md:grid-cols-[180px_1fr_auto]">
            <ImageField
              label="Tile image"
              value={t.image}
              onChange={(url) => update(t.id, { image: url })}
              aspectRatio="3 / 4"
              height={200}
            />
            <div className="flex flex-col gap-2">
              <FieldRow label="Title">
                <TextInput value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} placeholder="Women" />
              </FieldRow>
              <FieldRow label="Link href">
                <TextInput value={t.href} onChange={(e) => update(t.id, { href: e.target.value })} placeholder="/shop?category=women" />
              </FieldRow>
            </div>
            <div className="flex items-start justify-end">
              <IconButton label="Remove tile" onClick={() => remove(t.id)}>
                <IconTrash />
              </IconButton>
            </div>
          </div>
        ))}
        <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={add}>
          Add tile
        </Button>
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <BrowseTilesPreview tiles={tiles} />
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Product detail marketing sections ─────────────────────────────────────
function ProductSectionsEditor() {
  const [rows, setRows] = useState(STOREFRONT_PRODUCT_SECTIONS);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);
  function update(id, patch) { setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  return (
    <SectionCard
      title="Product Page Sections"
      description="Marketing sections rendered on every /products/[slug] page. Toggle visibility and edit copy."
    >
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[12px] font-bold uppercase tracking-[0.8px] text-[#11191f]">
                {r.key}
              </span>
              <Toggle
                checked={r.enabled}
                onChange={(v) => update(r.id, { enabled: v })}
                label={r.enabled ? "Visible" : "Hidden"}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <FieldRow label="Title"><TextInput value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} /></FieldRow>
              <FieldRow label="Body"><TextArea rows={2} value={r.body} onChange={(e) => update(r.id, { body: e.target.value })} /></FieldRow>
            </div>
          </div>
        ))}
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <ProductSectionsPreview rows={rows} />
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function FooterEditor() {
  const [footer, setFooter] = useState(STOREFRONT_FOOTER);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);

  function setBrand(v) { setFooter((f) => ({ ...f, brandCopy: v })); }

  function updateSocial(id, patch) {
    setFooter((f) => ({ ...f, social: f.social.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }
  function addSocial() {
    setFooter((f) => ({ ...f, social: [...f.social, { id: `soc-${Date.now()}`, network: "", url: "" }] }));
  }
  function removeSocial(id) {
    setFooter((f) => ({ ...f, social: f.social.filter((s) => s.id !== id) }));
  }

  function updateColumn(colId, patch) {
    setFooter((f) => ({ ...f, columns: f.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)) }));
  }
  function updateLink(colId, linkId, patch) {
    setFooter((f) => ({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) } : c
      ),
    }));
  }
  function addLink(colId) {
    setFooter((f) => ({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: [...c.links, { id: `l-${Date.now()}`, label: "", href: "" }] } : c
      ),
    }));
  }
  function removeLink(colId, linkId) {
    setFooter((f) => ({
      ...f,
      columns: f.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c
      ),
    }));
  }

  return (
    <SectionCard
      title="Footer"
      description="Brand copy, social links, and footer columns shown across the customer storefront."
      defaultOpen={false}
    >
      <FieldRow label="Brand copy">
        <TextArea rows={2} value={footer.brandCopy} onChange={(e) => setBrand(e.target.value)} />
      </FieldRow>

      <div className="mt-4">
        <p className="mb-2 font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f]">
          Social Links
        </p>
        <div className="flex flex-col gap-2">
          {footer.social.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-2">
              <TextInput value={s.network} onChange={(e) => updateSocial(s.id, { network: e.target.value })} className="!h-9 !w-40" placeholder="Network" />
              <TextInput value={s.url} onChange={(e) => updateSocial(s.id, { url: e.target.value })} className="!h-9" placeholder="https://..." />
              <IconButton label="Remove social" onClick={() => removeSocial(s.id)}>
                <IconTrash />
              </IconButton>
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={addSocial}>
            Add social link
          </Button>
        </div>
      </div>

      {footer.columns.map((col) => (
        <div key={col.id} className="mt-5 border-t border-[#f3f4f6] pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <FieldRow label="Column heading">
              <TextInput value={col.heading} onChange={(e) => updateColumn(col.id, { heading: e.target.value })} className="!w-64" />
            </FieldRow>
            <Button size="sm" variant="secondary" icon={<IconPlus />} onClick={() => addLink(col.id)}>
              Add link
            </Button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {col.links.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-2">
                <TextInput value={l.label} onChange={(e) => updateLink(col.id, l.id, { label: e.target.value })} className="!h-9 !w-56" placeholder="Label" />
                <TextInput value={l.href} onChange={(e) => updateLink(col.id, l.id, { href: e.target.value })} className="!h-9" placeholder="/path" />
                <IconButton label="Remove link" onClick={() => removeLink(col.id, l.id)}>
                  <IconTrash />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      ))}
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <FooterPreview footer={footer} />
      </PreviewPanel>
    </SectionCard>
  );
}

// ── Coaching CTA (#14) ────────────────────────────────────────────────────
function CoachingEditor() {
  const [cta, setCta] = useState(COACHING_CTA);
  const [saved, trigger] = useSavedFlag();
  const [previewOpen, setPreviewOpen] = useState(false);
  function set(patch) { setCta((c) => ({ ...c, ...patch })); }
  return (
    <SectionCard
      title="Coaching Cross-Sell"
      description="The 'Apply for coaching' card shown on /checkout/success. Toggle off to hide it from customers."
      defaultOpen={false}
    >
      <div className="mb-4">
        <Toggle
          checked={cta.enabled}
          onChange={(v) => set({ enabled: v })}
          label={cta.enabled ? "Shown on order success page" : "Hidden from order success page"}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldRow label="Eyebrow"><TextInput value={cta.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></FieldRow>
        <FieldRow label="Title"><TextInput value={cta.title} onChange={(e) => set({ title: e.target.value })} /></FieldRow>
        <FieldRow label="CTA label"><TextInput value={cta.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} /></FieldRow>
        <FieldRow label="CTA link"><TextInput value={cta.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} /></FieldRow>
      </div>
      <div className="mt-3">
        <FieldRow label="Body"><TextArea rows={2} value={cta.body} onChange={(e) => set({ body: e.target.value })} /></FieldRow>
      </div>
      <div className="mt-3">
        <ImageField
          label="Coach photo"
          value={cta.image}
          onChange={(url) => set({ image: url })}
          aspectRatio="3 / 4"
          height={220}
        />
      </div>
      <SaveBar
        onSave={trigger}
        saved={saved}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />
      <PreviewPanel open={previewOpen}>
        <CoachingPreview cta={cta} />
      </PreviewPanel>
    </SectionCard>
  );
}

export default function StorefrontManager() {
  return (
    <div className="flex flex-col gap-4">
      <HeroEditor />
      <ColorwaysEditor />
      <StatsEditor />
      <BrowseTilesEditor />
      <ProductSectionsEditor />
      <CoachingEditor />
      <FooterEditor />
    </div>
  );
}
