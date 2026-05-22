"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import {
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Toggle,
  Select,
  Chip,
  SearchInput,
} from "@/components/admin/shared/Form";
import {
  IconPlus,
  IconClose,
  IconCheck,
  IconEdit,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconAlert,
  IconFilter,
  IconChevronDown,
} from "@/components/admin/shared/Icons";
import {
  PRODUCTS,
  SUB_CATEGORIES,
  MAJOR_CATEGORIES,
  COLORS,
  SIZES,
  formatCurrency,
  formatNumber,
} from "@/lib/mockAdmin";

const LABEL_OPTIONS = [
  "Best Seller",
  "Most Popular",
  "New Arrival",
  "Low Stock",
  "Limited",
];

function formatComposition(rows) {
  return (rows || [])
    .filter((r) => r.pct > 0 && r.material.trim())
    .map((r) => `${r.pct}% ${r.material.trim()}`)
    .join(" • ");
}

export default function ProductManager() {
  const [products, setProducts] = useState(PRODUCTS);
  const [colors, setColors] = useState(COLORS);
  const [sizes, setSizes] = useState(SIZES);
  const [query, setQuery] = useState("");
  const [majorId, setMajorId] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function addColor(color) {
    setColors((prev) => [...prev, color]);
  }
  function removeColor(id) {
    setColors((prev) => prev.filter((c) => c.id !== id));
  }
  function addSize(size) {
    setSizes((prev) => [...prev, size]);
  }
  function removeSize(id) {
    setSizes((prev) => prev.filter((s) => s.id !== id));
  }

  const subById = useMemo(() => {
    const m = new Map();
    SUB_CATEGORIES.forEach((s) => m.set(s.id, s));
    return m;
  }, []);
  const majorById = useMemo(() => {
    const m = new Map();
    MAJOR_CATEGORIES.forEach((mc) => m.set(mc.id, mc));
    return m;
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (majorId) {
        const sub = subById.get(p.subId);
        if (!sub || sub.majorId !== majorId) return false;
      }
      if (visibility === "visible" && !p.visible) return false;
      if (visibility === "hidden" && p.visible) return false;
      return true;
    });
  }, [products, query, majorId, visibility, subById]);

  function saveProduct(values) {
    if (values.id) {
      setProducts((prev) => prev.map((p) => (p.id === values.id ? { ...p, ...values } : p)));
    } else {
      setProducts((prev) => [...prev, { ...values, id: `p-${Date.now()}` }]);
    }
    setEditing(null);
  }
  function removeProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
  }

  return (
    <>
      <ColorPanel colors={colors} onAdd={addColor} onRemove={removeColor} />
      <SizePanel sizes={sizes} onAdd={addSize} onRemove={removeSize} />

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by product name..."
          />
        </div>
        <Select
          className="md:w-48"
          value={majorId}
          onChange={setMajorId}
          options={[
            { value: "", label: "All categories" },
            ...MAJOR_CATEGORIES.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <div className="flex items-center gap-2">
          <Chip active={visibility === "all"} onClick={() => setVisibility("all")}>
            All
          </Chip>
          <Chip active={visibility === "visible"} onClick={() => setVisibility("visible")}>
            Visible
          </Chip>
          <Chip active={visibility === "hidden"} onClick={() => setVisibility("hidden")}>
            Hidden
          </Chip>
        </div>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setEditing({
              id: null,
              name: "",
              subtitle: "",
              subtitleMode: "text",
              composition: [],
              subId: SUB_CATEGORIES[0]?.id,
              price: 0,
              visible: true,
              labels: [],
              materials: { recycledPolyester: 0, premiumElastane: 0, performanceGuaranteed: 100 },
              description: "",
              details: [
                { title: "Lightweight Construction", desc: "Barely-there feel at just 180g. Engineered to disappear on your body." },
                { title: "High-Waisted Design", desc: "Stays in place. No rolling. No slipping. Just pure focus." },
                { title: "Sustainable Materials", desc: "Made with 78% recycled polyester. Performance meets responsibility." },
              ],
              productColors: [],
              productSizes: [],
              colorImages: {},
              variants: [],
              totalStock: 0,
            })
          }
        >
          New Product
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            label: "Product",
            render: (p) => (
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-[2px] bg-[#f3f4f6] font-display text-[10px] font-bold uppercase tracking-[1px] text-[#11191f]">
                  {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                    {p.name}
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    {p.labels.length ? p.labels.join(" · ") : "No labels"}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "category",
            label: "Category",
            render: (p) => {
              const sub = subById.get(p.subId);
              const major = sub ? majorById.get(sub.majorId) : null;
              return (
                <span className="font-body text-[12px] text-[#6b7280]">
                  {major?.name} · {sub?.name}
                </span>
              );
            },
          },
          {
            key: "price",
            label: "Price",
            align: "right",
            render: (p) => formatCurrency(p.price),
          },
          {
            key: "totalStock",
            label: "Stock",
            align: "right",
            render: (p) => {
              const low = p.totalStock <= 15;
              return (
                <span
                  className="inline-flex items-center gap-1.5 font-body text-[12px]"
                  style={{ color: low ? "#dc2626" : "#11191f" }}
                >
                  {low ? (
                    <span className="grid size-3 place-items-center">
                      <IconAlert />
                    </span>
                  ) : null}
                  {formatNumber(p.totalStock)}
                </span>
              );
            },
          },
          {
            key: "visible",
            label: "Visibility",
            render: (p) => (
              <StatusBadge status={p.visible ? "active" : "inactive"} label={p.visible ? "Visible" : "Hidden"} />
            ),
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (p) => (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label={p.visible ? "Hide product" : "Show product"}
                  onClick={() =>
                    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)))
                  }
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    {p.visible ? <IconEye /> : <IconEyeOff />}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => setEditing(p)}
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconEdit />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setConfirmDelete(p)}
                  className="grid size-8 place-items-center rounded-[2px] text-[#dc2626] hover:bg-[#fef2f2]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconTrash />
                  </span>
                </button>
              </div>
            ),
          },
        ]}
        rows={filtered}
        empty={
          <div className="flex flex-col items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-[#f3f4f6] text-[#6b7280]">
              <span className="grid size-4 place-items-center">
                <IconFilter />
              </span>
            </span>
            <p className="font-body text-[13px] text-[#11191f]">No products match your filters.</p>
            <p className="font-body text-[11px] text-[#6b7280]">Try adjusting search or category.</p>
          </div>
        }
      />

      <ProductDrawer
        editing={editing}
        colors={colors}
        sizes={sizes}
        onClose={() => setEditing(null)}
        onSave={saveProduct}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete product"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="dangerSolid" onClick={() => removeProduct(confirmDelete?.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This will remove the product and all of its variants from the storefront.
        </p>
      </Modal>
    </>
  );
}


// Module-level cache — one network request per browser session regardless of how many
// times the panel mounts/unmounts. _colorLibraryPromise prevents duplicate in-flight fetches.
let _colorLibrary = null;
let _colorLibraryPromise = null;

function loadColorLibrary() {
  if (_colorLibrary) return Promise.resolve(_colorLibrary);
  if (!_colorLibraryPromise) {
    _colorLibraryPromise = fetch("https://api.color.pizza/v1/")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { _colorLibrary = data.colors || []; return _colorLibrary; })
      .catch(() => { _colorLibraryPromise = null; return []; });
  }
  return _colorLibraryPromise;
}

function ColorPanel({ colors, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);

  // — Search
  const [searchQuery, setSearchQuery] = useState("");
  // deferredQuery lags behind searchQuery — React renders the input update first,
  // then schedules the expensive 30k-item filter as a lower-priority update.
  const deferredQuery = useDeferredValue(searchQuery);
  const isSearchStale = searchQuery !== deferredQuery;
  const [libraryLoaded, setLibraryLoaded] = useState(() => !!_colorLibrary);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(new Set());

  // — Manual input
  const [input, setInput] = useState("");
  const [hex, setHex] = useState("#5c6ac4");
  const [apiName, setApiName] = useState("");
  const [colorName, setColorName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [parseError, setParseError] = useState(false);
  const resolveRef = useRef(null);

  const paletteHexSet = useMemo(
    () => new Set(colors.map((c) => c.hex.toLowerCase())),
    [colors]
  );

  // Fetch the full ~30k color library once on first open, then filter client-side
  useEffect(() => {
    if (!open || _colorLibrary) return;
    setLibraryLoading(true);
    setLibraryError(false);
    loadColorLibrary()
      .then((lib) => { if (lib.length) setLibraryLoaded(true); else setLibraryError(true); })
      .catch(() => setLibraryError(true))
      .finally(() => setLibraryLoading(false));
  }, [open]);

  // Filter runs against deferredQuery, not searchQuery — React defers this work
  // so the input stays responsive even as it re-renders 200 result cards.
  const searchResults = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (q.length < 2 || !_colorLibrary) return [];
    return _colorLibrary.filter((c) => c.name.toLowerCase().includes(q));
  // libraryLoaded is a trigger dep so this recomputes after the one-time fetch lands
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, libraryLoaded]);

  function addFromSearch({ name, hex: colorHex }) {
    const h = (colorHex.startsWith("#") ? colorHex : "#" + colorHex).toLowerCase();
    if (paletteHexSet.has(h)) return;
    onAdd({ id: `c-${Date.now()}`, name, hex: h });
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.add(h);
      setTimeout(() => setRecentlyAdded((p) => { const n = new Set(p); n.delete(h); return n; }), 2000);
      return next;
    });
  }

  // Manual input helpers
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
  }

  function resolveInputToHex(raw) {
    const s = raw.trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(s)) return lower;
    if (/^#[0-9a-f]{3}$/i.test(s))
      return "#" + lower[1]+lower[1] + lower[2]+lower[2] + lower[3]+lower[3];
    if (/^[0-9a-f]{6}$/i.test(s)) return "#" + lower;
    if (/^[0-9a-f]{3}$/i.test(s))
      return "#" + lower[0]+lower[0] + lower[1]+lower[1] + lower[2]+lower[2];
    const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) return rgbToHex(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
    const bareRgb = s.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (bareRgb) {
      const [r, g, b] = [+bareRgb[1], +bareRgb[2], +bareRgb[3]];
      if (r <= 255 && g <= 255 && b <= 255) return rgbToHex(r, g, b);
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000000";
      ctx.fillStyle = lower;
      const computed = ctx.fillStyle;
      if (computed !== "#000000" || lower === "black") {
        if (computed.startsWith("#")) return computed;
        const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) return rgbToHex(+m[1], +m[2], +m[3]);
      }
    } catch { /* SSR — ignore */ }
    return null;
  }

  async function fetchColorInfo(hexColor) {
    setResolving(true);
    try {
      const clean = hexColor.replace("#", "");
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://www.thecolorapi.com/id?hex=${clean}`, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return;
      const data = await res.json();
      const name = data.name?.value || "";
      setApiName(name);
      setColorName(name);
    } catch { /* network error */ }
    finally { setResolving(false); }
  }

  function scheduleResolve(hexColor) {
    clearTimeout(resolveRef.current);
    resolveRef.current = setTimeout(() => fetchColorInfo(hexColor), 500);
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setInput(val);
    if (!val.trim()) { setParseError(false); return; }
    const resolved = resolveInputToHex(val);
    if (resolved) {
      setHex(resolved);
      setParseError(false);
      scheduleResolve(resolved);
    } else {
      setParseError(true);
    }
  }

  function handlePickerChange(e) {
    const h = e.target.value;
    setHex(h);
    setInput(h);
    setParseError(false);
    scheduleResolve(h);
  }

  function handleAdd() {
    const name = colorName.trim();
    if (!name) return;
    onAdd({ id: `c-${Date.now()}`, name, hex });
    setInput("");
    setApiName("");
    setColorName("");
  }

  return (
    <div className="mb-4 overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {colors.slice(0, 7).map((c) => (
              <span key={c.id} title={c.name} className="size-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c.hex }} />
            ))}
            {colors.length > 7 ? (
              <span className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#f3f4f6] font-body text-[8px] text-[#6b7280]">
                +{colors.length - 7}
              </span>
            ) : null}
          </div>
          <div className="text-left">
            <p className="font-body text-[13px] font-medium text-[#11191f]">Product Colors</p>
            <p className="font-body text-[11px] text-[#6b7280]">
              {colors.length} color{colors.length !== 1 ? "s" : ""} · used across all inventory variants
            </p>
          </div>
        </div>
        <span className="grid size-5 place-items-center text-[#6b7280] transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <IconChevronDown />
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-5 border-t border-[#e5e7eb] p-4">

          {/* ── Current palette ── */}
          {colors.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-[#e5e7eb] py-6 text-center font-body text-[12px] text-[#9ca3af]">
              No colors yet — search or enter one below.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {colors.map((c) => (
                <div key={c.id} className="group relative flex flex-col items-center gap-1.5 rounded-[3px] border border-[#e5e7eb] bg-white p-2">
                  <span className="w-full rounded-[2px] border border-[#e5e7eb]" style={{ backgroundColor: c.hex, aspectRatio: "1 / 1" }} />
                  <div className="w-full min-w-0 text-center">
                    <p className="truncate font-body text-[10px] font-medium leading-snug text-[#11191f]">{c.name}</p>
                    <p className="font-body tabular-nums text-[9px] uppercase text-[#9ca3af]">{c.hex}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => onRemove(c.id)}
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-[2px] bg-white/90 text-[#dc2626] shadow-sm transition-opacity hover:bg-[#fef2f2] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  >
                    <span className="grid size-3 place-items-center"><IconClose /></span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Search ── */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Search colors
              </p>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`"black", "navy blue", "coral", "sage green"…`}
              />
            </div>

            {libraryLoading ? (
              <p className="font-body text-[12px] text-[#9ca3af]">Loading color library…</p>
            ) : libraryError ? (
              <p className="font-body text-[12px] text-[#dc2626]">
                Couldn't load the color library. Check your connection or enter a value manually below.
              </p>
            ) : searchResults.length > 0 ? (
              <>
                <p className="font-body text-[11px] text-[#6b7280]">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{deferredQuery.trim()}&rdquo; · click any swatch to add
                </p>
                <div
                  className="overflow-y-auto rounded-[3px] border border-[#e5e7eb] bg-[#fafafa] p-2 transition-opacity"
                  style={{ maxHeight: 300, opacity: isSearchStale ? 0.5 : 1 }}
                >
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                    {searchResults.map((result) => {
                      const h = (result.hex.startsWith("#") ? result.hex : "#" + result.hex).toLowerCase();
                      const inPalette = paletteHexSet.has(h);
                      const justAdded = recentlyAdded.has(h);
                      return (
                        <button
                          key={result.hex}
                          type="button"
                          title={inPalette ? `${result.name} — already in palette` : `Add "${result.name}"`}
                          disabled={inPalette}
                          onClick={() => addFromSearch(result)}
                          className="group relative flex flex-col items-center gap-1 rounded-[2px] border border-[#e5e7eb] bg-white p-1.5 transition-shadow hover:border-[#11191f] hover:shadow-sm disabled:cursor-default"
                        >
                          <span
                            className="w-full rounded-[1px] border border-black/[0.06]"
                            style={{ backgroundColor: h, aspectRatio: "1 / 1" }}
                          />
                          <p className="w-full truncate text-center font-body text-[9px] leading-tight text-[#11191f]">
                            {result.name}
                          </p>

                          {/* State overlays */}
                          {justAdded ? (
                            <span className="absolute inset-0 flex items-center justify-center rounded-[2px] bg-white/80">
                              <span className="grid size-6 place-items-center rounded-full bg-[#16a34a] text-white">
                                <span className="grid size-3.5 place-items-center"><IconCheck /></span>
                              </span>
                            </span>
                          ) : inPalette ? (
                            <span className="absolute inset-0 flex items-center justify-center rounded-[2px] bg-white/70">
                              <span className="grid size-6 place-items-center rounded-full bg-[#e5e7eb] text-[#6b7280]">
                                <span className="grid size-3.5 place-items-center"><IconCheck /></span>
                              </span>
                            </span>
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center rounded-[2px] bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="grid size-6 place-items-center rounded-full bg-white text-[#11191f]">
                                <span className="grid size-3.5 place-items-center"><IconPlus /></span>
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : deferredQuery.trim().length >= 2 && !libraryLoading ? (
              <p className="font-body text-[12px] text-[#9ca3af]">
                No colors found for "{deferredQuery.trim()}" — try a different term or enter a value manually.
              </p>
            ) : null}
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e5e7eb]" />
            <span className="font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">or enter a specific value</span>
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          {/* ── Manual input ── */}
          <div className="rounded-[3px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Hex code, RGB or color name">
                  <TextInput
                    placeholder="#f5f5f4  ·  255, 245, 244  ·  coral"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                  />
                </Field>
                {parseError ? (
                  <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">
                    Use a hex (#f5f5f4), RGB (255, 245, 244) or CSS color name (coral).
                  </p>
                ) : null}
              </div>
              <div className="relative shrink-0" title="Pick color visually">
                <div className="h-10 w-14 rounded-[2px] border-2 border-[#e5e7eb]" style={{ backgroundColor: hex }} />
                <input type="color" value={hex} onChange={handlePickerChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </div>
            </div>

            <div className="mt-4 flex items-start gap-4">
              <span className="mt-6 size-16 shrink-0 rounded-[3px] border border-[#e5e7eb] shadow-sm" style={{ backgroundColor: hex }} />
              <div className="flex-1 flex flex-col gap-1.5">
                {resolving ? (
                  <p className="font-body text-[11px] text-[#9ca3af]">Identifying color…</p>
                ) : apiName ? (
                  <p className="font-body text-[11px] text-[#6b7280]">
                    Closest match: <span className="font-medium text-[#11191f]">{apiName}</span>
                  </p>
                ) : (
                  <p className="font-body text-[11px] text-[#9ca3af]">Enter a value above or use the swatch picker.</p>
                )}
                <Field label="Display name">
                  <TextInput
                    placeholder="e.g. Coral Pink"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4">
              <Button icon={<IconPlus />} onClick={handleAdd} disabled={!colorName.trim()}>
                Add to palette
              </Button>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}

const ALPHA_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const NUMERIC_SIZE_PRESETS = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50"];

function SizePanel({ sizes, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("alpha");
  const [customInput, setCustomInput] = useState("");

  const sizeLabels = useMemo(() => new Set(sizes.map((s) => s.label)), [sizes]);
  const presets = mode === "alpha" ? ALPHA_SIZE_PRESETS : NUMERIC_SIZE_PRESETS;

  function addPreset(label) {
    if (sizeLabels.has(label)) return;
    onAdd({ id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label });
  }

  function addCustom() {
    const label = customInput.trim();
    if (!label || sizeLabels.has(label)) return;
    onAdd({ id: `s-${Date.now()}`, label });
    setCustomInput("");
  }

  const HEADER_LIMIT = 6;
  const overflowCount = sizes.length - HEADER_LIMIT;

  return (
    <div className="mb-4 overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {sizes.length > 0 ? (
            <div className="flex items-center gap-1">
              {sizes.slice(0, HEADER_LIMIT).map((s) => (
                <span
                  key={s.id}
                  className="inline-flex h-5 items-center rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2 font-body text-[10px] font-medium text-[#11191f]"
                >
                  {s.label}
                </span>
              ))}
              {overflowCount > 0 ? (
                <span className="inline-flex h-5 items-center rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2 font-body text-[10px] text-[#6b7280]">
                  +{overflowCount}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="text-left">
            <p className="font-body text-[13px] font-medium text-[#11191f]">Product Sizes</p>
            <p className="font-body text-[11px] text-[#6b7280]">
              {sizes.length} size{sizes.length !== 1 ? "s" : ""} · used in inventory grid
            </p>
          </div>
        </div>
        <span
          className="grid size-5 place-items-center text-[#6b7280] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <IconChevronDown />
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-[#e5e7eb] p-4">

          {/* ── Current sizes ── */}
          {sizes.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-[#e5e7eb] py-6 text-center font-body text-[12px] text-[#9ca3af]">
              No sizes yet — pick from presets or add a custom size below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-white py-1 pl-3 pr-1 font-body text-[12px] font-medium text-[#11191f]"
                >
                  {s.label}
                  <button
                    type="button"
                    aria-label={`Remove ${s.label}`}
                    onClick={() => onRemove(s.id)}
                    className="grid size-4 place-items-center rounded-full text-[#6b7280] transition-colors hover:bg-[#fef2f2] hover:text-[#dc2626]"
                  >
                    <span className="grid size-3 place-items-center">
                      <IconClose />
                    </span>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ── Quick add ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                Quick add
              </p>
              <div className="flex items-center gap-1">
                <Chip active={mode === "alpha"} onClick={() => setMode("alpha")}>Letter</Chip>
                <Chip active={mode === "numeric"} onClick={() => setMode("numeric")}>Number</Chip>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((label) => {
                const inList = sizeLabels.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={inList}
                    onClick={() => addPreset(label)}
                    className={
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-body text-[12px] font-medium transition-colors " +
                      (inList
                        ? "cursor-default border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af]"
                        : "border-[#e5e7eb] bg-white text-[#11191f] hover:border-[#11191f] hover:bg-[#f3f4f6]")
                    }
                  >
                    {inList ? (
                      <span className="grid size-3 place-items-center text-[#16a34a]">
                        <IconCheck />
                      </span>
                    ) : null}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e5e7eb]" />
            <span className="font-body text-[11px] uppercase tracking-[1px] text-[#9ca3af]">or add a custom size</span>
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          {/* ── Custom input ── */}
          <div className="flex gap-2">
            <TextInput
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={mode === "alpha" ? "e.g. 4XL, Petite, One Size…" : "e.g. 52, 54, 32x30…"}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            />
            <Button
              variant="secondary"
              disabled={!customInput.trim() || sizeLabels.has(customInput.trim())}
              onClick={addCustom}
            >
              Add
            </Button>
          </div>

        </div>
      ) : null}
    </div>
  );
}

function ProductDrawer({ editing, colors, sizes, onClose, onSave }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  const [tab, setTab] = useState("details");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editing) {
      const variants = editing.variants || [];
      const usedColorNames = new Set(variants.map((v) => v.color));
      const usedSizeLabels = new Set(variants.map((v) => v.size));
      setDraft({
        ...editing,
        subtitleMode: editing.composition?.length ? "composition" : "text",
        productColors: editing.productColors ??
          colors.filter((c) => usedColorNames.has(c.name)).map((c) => c.id),
        productSizes: editing.productSizes ??
          sizes.filter((s) => usedSizeLabels.has(s.label)).map((s) => s.id),
        colorImages: editing.colorImages ?? {},
        materials: {
          recycledPolyester: String(editing.materials?.recycledPolyester ?? 0),
          premiumElastane: String(editing.materials?.premiumElastane ?? 0),
          performanceGuaranteed: String(editing.materials?.performanceGuaranteed ?? 100),
        },
      });
      setTab("details");
      setErrors({});
    }
  }, [editing, colors, sizes]);

  function toggleLabel(label) {
    setDraft((d) => {
      const has = (d.labels || []).includes(label);
      return {
        ...d,
        labels: has ? d.labels.filter((l) => l !== label) : [...(d.labels || []), label],
      };
    });
  }

  function toggleProductColor(colorId) {
    setDraft((d) => {
      const has = (d.productColors || []).includes(colorId);
      const color = colors.find((c) => c.id === colorId);
      if (has) {
        const remaining = (d.productColors || []).filter((id) => id !== colorId);
        const variants = (d.variants || []).filter((v) => v.color !== color?.name);
        return { ...d, productColors: remaining, variants };
      }
      return { ...d, productColors: [...(d.productColors || []), colorId] };
    });
    clearError("productColors");
  }

  function toggleProductSize(sizeId) {
    setDraft((d) => {
      const has = (d.productSizes || []).includes(sizeId);
      const size = sizes.find((s) => s.id === sizeId);
      if (has) {
        const remaining = (d.productSizes || []).filter((id) => id !== sizeId);
        const variants = (d.variants || []).filter((v) => v.size !== size?.label);
        return { ...d, productSizes: remaining, variants };
      }
      return { ...d, productSizes: [...(d.productSizes || []), sizeId] };
    });
    clearError("productSizes");
  }

  function setVariantQty(color, size, qty) {
    setDraft((d) => {
      const variants = (d.variants || []).filter((v) => !(v.color === color && v.size === size));
      const total = qty > 0 ? [...variants, { color, size, qty }] : variants;
      const totalStock = total.reduce((s, v) => s + v.qty, 0);
      return { ...d, variants: total, totalStock };
    });
  }

  function getQty(color, size) {
    return (draft.variants || []).find((v) => v.color === color && v.size === size)?.qty ?? 0;
  }

  function validate() {
    const errs = {};

    // Details tab
    if (!draft.name?.trim()) errs.name = "Product name is required.";
    if (draft.subtitleMode !== "composition" && !draft.subtitle?.trim()) errs.subtitle = "Subtitle is required.";
    if (!draft.price || draft.price <= 0) errs.price = "Price must be greater than 0.";

    if (draft.subtitleMode === "composition") {
      const comp = draft.composition || [];
      if (comp.length === 0) {
        errs.composition = "Add at least one material row.";
      } else if (comp.some((r) => !r.material?.trim())) {
        errs.composition = "Each material row needs a name.";
      } else {
        const total = comp.reduce((s, r) => s + (r.pct || 0), 0);
        if (total !== 100) errs.composition = `Percentages must total 100% (currently ${total}%).`;
      }
    }

    const mat = draft.materials || {};
    const matTotal = Number(mat.recycledPolyester || 0) + Number(mat.premiumElastane || 0) + Number(mat.performanceGuaranteed || 0);
    if (matTotal !== 100) errs.materials = `Percentages must total 100% (currently ${matTotal}%).`;

    const details = draft.details || [];
    if (details.length < 3) {
      errs.details = `Add at least 3 product details (${details.length}/3 added).`;
    } else if (details.some((d) => !d.title?.trim())) {
      errs.details = "Each detail entry needs a title.";
    }

    // Media tab
    if ((draft.productColors || []).length === 0) errs.productColors = "Select at least one color.";
    if ((draft.productSizes || []).length === 0) errs.productSizes = "Select at least one size.";

    const colorImages = draft.colorImages || {};
    const colorsWithoutImages = (draft.productColors || []).filter((id) => !(colorImages[id] > 0));
    if (colorsWithoutImages.length > 0) errs.colorImages = "Upload at least one photo for every selected color.";

    // Inventory tab
    const selectedColors = (draft.productColors || [])
      .map((id) => colors.find((c) => c.id === id)).filter(Boolean);
    const selectedSizes = (draft.productSizes || [])
      .map((id) => sizes.find((s) => s.id === id)).filter(Boolean);
    if (selectedColors.length > 0 && selectedSizes.length > 0) {
      const hasEmpty = selectedColors.some((c) =>
        selectedSizes.some((s) => getQty(c.name, s.label) < 1)
      );
      if (hasEmpty) errs.inventory = "Every color × size combination must have a quantity of at least 1.";
    }

    return errs;
  }

  function clearError(key) {
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function addColorImage(colorId) {
    setDraft((d) => ({
      ...d,
      colorImages: { ...(d.colorImages || {}), [colorId]: ((d.colorImages || {})[colorId] || 0) + 1 },
    }));
    clearError("colorImages");
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.name || errs.subtitle || errs.price || errs.composition || errs.materials || errs.details) {
        setTab("details");
      } else if (errs.productColors || errs.productSizes || errs.colorImages) {
        setTab("media");
      } else if (errs.inventory) {
        setTab("inventory");
      }
      return;
    }
    setErrors({});
    const mat = draft.materials || {};
    onSave({
      ...draft,
      materials: {
        recycledPolyester: Number(mat.recycledPolyester) || 0,
        premiumElastane: Number(mat.premiumElastane) || 0,
        performanceGuaranteed: Number(mat.performanceGuaranteed) || 0,
      },
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      title={draft.id ? "Edit product" : "New product"}
      subtitle={draft.id ? draft.name : "Add a new product to the catalog"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save product</Button>
        </>
      }
    >
      {open ? (
        <>
          <div className="mb-5 border-b border-[#e5e7eb]">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { key: "details", hasError: !!(errors.name || errors.subtitle || errors.price || errors.composition || errors.materials || errors.details) },
                { key: "media", hasError: !!(errors.productColors || errors.productSizes || errors.colorImages) },
                { key: "inventory", hasError: !!errors.inventory },
                { key: "labels", hasError: false },
              ].map(({ key: t, hasError }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    "relative -mb-px inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 font-display text-[12px] font-semibold uppercase tracking-[1.2px] transition-colors " +
                    (tab === t
                      ? "text-[#11191f] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#11191f]"
                      : "text-[#6b7280] hover:text-[#11191f]")
                  }
                >
                  {t}
                  {hasError ? <span className="size-1.5 rounded-full bg-[#dc2626]" /> : null}
                </button>
              ))}
            </div>
          </div>

          {tab === "details" ? (
            <div className="flex flex-col gap-4">
              <Field label="Name" required>
                <TextInput
                  value={draft.name || ""}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, name: e.target.value }));
                    clearError("name");
                  }}
                  style={errors.name ? { borderColor: "#dc2626" } : undefined}
                />
                {errors.name ? <p className="font-body text-[11px] text-[#dc2626]">{errors.name}</p> : null}
              </Field>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-body text-[11px] font-medium text-[#11191f]">Subtitle</span>
                  <div className="flex items-center gap-1">
                    <Chip
                      active={draft.subtitleMode !== "composition"}
                      onClick={() => setDraft((d) => ({ ...d, subtitleMode: "text" }))}
                    >
                      Text
                    </Chip>
                    <Chip
                      active={draft.subtitleMode === "composition"}
                      onClick={() => setDraft((d) => ({ ...d, subtitleMode: "composition" }))}
                    >
                      Composition
                    </Chip>
                  </div>
                </div>
                {draft.subtitleMode !== "composition" ? (
                  <>
                    <TextInput
                      placeholder="e.g. Women's performance hoodie"
                      value={draft.subtitle || ""}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, subtitle: e.target.value }));
                        clearError("subtitle");
                      }}
                      style={errors.subtitle ? { borderColor: "#dc2626" } : undefined}
                    />
                    {errors.subtitle ? <p className="mt-1 font-body text-[11px] text-[#dc2626]">{errors.subtitle}</p> : null}
                  </>
                ) : (
                  <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3 flex flex-col gap-3">
                    <div className="flex h-10 items-center rounded-[2px] border border-[#e5e7eb] bg-white px-3">
                      <span className="font-body text-[12px] text-[#11191f]">
                        {formatComposition(draft.composition) || (
                          <span className="text-[#9ca3af]">80% nylon • 20% spandex</span>
                        )}
                      </span>
                    </div>
                    {(draft.composition || []).length === 0 ? (
                      <p className="rounded-[2px] border border-dashed border-[#e5e7eb] bg-white px-3 py-3 text-center font-body text-[12px] text-[#6b7280]">
                        Add materials below to build the composition string.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {(draft.composition || []).map((row, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <div className="w-20 shrink-0">
                              <NumberInput
                                min="0"
                                max="100"
                                value={row.pct}
                                onChange={(e) => {
                                  setDraft((d) => {
                                    const next = [...(d.composition || [])];
                                    next[i] = { ...next[i], pct: Number(e.target.value) || 0 };
                                    return { ...d, composition: next, subtitle: formatComposition(next) };
                                  });
                                  clearError("composition");
                                }}
                              />
                            </div>
                            <span className="font-body text-[12px] text-[#6b7280]">%</span>
                            <TextInput
                              placeholder="e.g. nylon"
                              value={row.material}
                              onChange={(e) => {
                                setDraft((d) => {
                                  const next = [...(d.composition || [])];
                                  next[i] = { ...next[i], material: e.target.value };
                                  return { ...d, composition: next, subtitle: formatComposition(next) };
                                });
                                clearError("composition");
                              }}
                            />
                            <button
                              type="button"
                              aria-label="Remove material"
                              onClick={() =>
                                setDraft((d) => {
                                  const next = (d.composition || []).filter((_, j) => j !== i);
                                  return { ...d, composition: next, subtitle: formatComposition(next) };
                                })
                              }
                              className="grid size-9 shrink-0 place-items-center rounded-[2px] text-[#dc2626] hover:bg-[#fef2f2]"
                            >
                              <span className="grid size-4 place-items-center">
                                <IconTrash />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<IconPlus />}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          composition: [...(d.composition || []), { pct: 0, material: "" }],
                        }))
                      }
                    >
                      Add material
                    </Button>
                  </div>
                )}

                {errors.composition ? (
                  <p className="mt-1 font-body text-[11px] text-[#dc2626]">{errors.composition}</p>
                ) : null}

                {/* Storefront preview */}
                <div className="mt-2 rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
                  <p className="mb-3 font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                    Storefront preview
                  </p>
                  <div className="flex flex-wrap gap-6">
                    {/* Mobile card label row */}
                    <div className="flex flex-col gap-1.5">
                      <p className="font-body text-[9px] uppercase tracking-[0.8px] text-[#9ca3af]">Mobile</p>
                      <div className="flex w-[120px] items-start justify-between gap-2 rounded-[2px] border border-[#e5e7eb] bg-white px-2 py-2">
                        <div className="flex min-w-0 flex-col" style={{ gap: 2 }}>
                          <p
                            className="font-body truncate text-[12px] font-medium leading-[14px] text-[#11191f]"
                            style={{ fontStretch: "75%" }}
                          >
                            {draft.name || <span className="text-[#d1d5db]">Product name</span>}
                          </p>
                          <p
                            className="font-body truncate text-[10px] leading-[12px]"
                            style={{ fontStretch: "75%", color: draft.subtitle ? "rgba(17,25,31,0.5)" : "#d1d5db" }}
                          >
                            {draft.subtitle || "Subtitle"}
                          </p>
                        </div>
                        <p
                          className="font-body shrink-0 whitespace-nowrap text-right text-[12px] font-semibold leading-[14px] text-[#11191f]"
                          style={{ fontStretch: "75%" }}
                        >
                          JOD {draft.price ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Desktop card label row */}
                    <div className="flex flex-col gap-1.5">
                      <p className="font-body text-[9px] uppercase tracking-[0.8px] text-[#9ca3af]">Desktop</p>
                      <div className="flex items-start justify-between gap-4 rounded-[2px] border border-[#e5e7eb] bg-white px-3 py-2">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="font-display text-[16px] font-medium leading-6 text-[#11191f]">
                            {draft.name || <span className="text-[#d1d5db]">Product name</span>}
                          </p>
                          <p
                            className="font-body text-[16px] leading-5"
                            style={{ fontStretch: "75%", color: draft.subtitle ? "#78716c" : "#d1d5db" }}
                          >
                            {draft.subtitle || "Subtitle"}
                          </p>
                        </div>
                        <p
                          className="font-display shrink-0 whitespace-nowrap text-[16px] font-semibold leading-6 text-[#11191f]"
                        >
                          JOD {draft.price ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Sub-category" required>
                  <Select
                    value={draft.subId}
                    onChange={(v) => setDraft((d) => ({ ...d, subId: v }))}
                    options={SUB_CATEGORIES.map((s) => ({
                      value: s.id,
                      label: `${MAJOR_CATEGORIES.find((m) => m.id === s.majorId)?.name} · ${s.name}`,
                    }))}
                  />
                </Field>
                <Field label="Price (JOD)" required>
                  <NumberInput
                    min="0"
                    step="0.01"
                    value={draft.price ?? ""}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }));
                      clearError("price");
                    }}
                    style={errors.price ? { borderColor: "#dc2626" } : undefined}
                  />
                  {errors.price ? <p className="font-body text-[11px] text-[#dc2626]">{errors.price}</p> : null}
                </Field>
              </div>
              <Field label="Description">
                <TextArea
                  rows={4}
                  value={draft.description || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </Field>

              <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
                <p className="mb-3 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Material percentages
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <Field label="Recycled polyester">
                    <NumberInput
                      min="0"
                      max="100"
                      value={draft.materials?.recycledPolyester ?? ""}
                      onChange={(e) => {
                        setDraft((d) => ({
                          ...d,
                          materials: { ...d.materials, recycledPolyester: e.target.value },
                        }));
                        clearError("materials");
                      }}
                    />
                  </Field>
                  <Field label="Premium elastane">
                    <NumberInput
                      min="0"
                      max="100"
                      value={draft.materials?.premiumElastane ?? ""}
                      onChange={(e) => {
                        setDraft((d) => ({
                          ...d,
                          materials: { ...d.materials, premiumElastane: e.target.value },
                        }));
                        clearError("materials");
                      }}
                    />
                  </Field>
                  <Field label="Performance guaranteed">
                    <NumberInput
                      min="0"
                      max="100"
                      value={draft.materials?.performanceGuaranteed ?? ""}
                      onChange={(e) => {
                        setDraft((d) => ({
                          ...d,
                          materials: { ...d.materials, performanceGuaranteed: e.target.value },
                        }));
                        clearError("materials");
                      }}
                    />
                  </Field>
                </div>
                {errors.materials ? (
                  <p className="mt-2 font-body text-[11px] text-[#dc2626]">{errors.materials}</p>
                ) : null}
              </div>

              <div className="rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                      Product details
                    </p>
                    <p className="mt-0.5 font-body text-[11px] text-[#6b7280]">
                      Minimum 3 — {(draft.details || []).length}/3 added.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<IconPlus />}
                    onClick={() => {
                      setDraft((d) => ({
                        ...d,
                        details: [...(d.details || []), { title: "", desc: "" }],
                      }));
                      clearError("details");
                    }}
                  >
                    Add detail
                  </Button>
                </div>
                {errors.details ? (
                  <p className="mb-2 font-body text-[11px] text-[#dc2626]">{errors.details}</p>
                ) : null}
                {(draft.details || []).length === 0 ? (
                  <p className="rounded-[2px] border border-dashed border-[#e5e7eb] bg-white px-3 py-3 text-center font-body text-[12px] text-[#6b7280]">
                    e.g. lightweight construction · soft-touch fabric · reinforced knees
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(draft.details || []).map((det, i) => (
                      <li
                        key={i}
                        className="flex flex-col gap-2 rounded-[2px] border border-[#e5e7eb] bg-white p-3"
                      >
                        <div className="flex items-center gap-2">
                          <TextInput
                            placeholder="Title (e.g. Lightweight construction)"
                            value={det.title}
                            style={errors.details && !det.title?.trim() ? { borderColor: "#dc2626" } : undefined}
                            onChange={(e) => {
                              setDraft((d) => {
                                const next = [...d.details];
                                next[i] = { ...next[i], title: e.target.value };
                                return { ...d, details: next };
                              });
                              clearError("details");
                            }}
                          />
                          <button
                            type="button"
                            aria-label="Remove detail"
                            onClick={() => {
                              setDraft((d) => ({
                                ...d,
                                details: d.details.filter((_, j) => j !== i),
                              }));
                              clearError("details");
                            }}
                            className="grid size-9 shrink-0 place-items-center rounded-[2px] text-[#dc2626] hover:bg-[#fef2f2]"
                          >
                            <span className="grid size-4 place-items-center">
                              <IconTrash />
                            </span>
                          </button>
                        </div>
                        <TextArea
                          rows={2}
                          placeholder="Description"
                          value={det.desc}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.details];
                              next[i] = { ...next[i], desc: e.target.value };
                              return { ...d, details: next };
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-white p-3">
                <div>
                  <p className="font-body text-[13px] font-medium text-[#11191f]">
                    Visible on storefront
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    Hide while you draft, show when ready to sell.
                  </p>
                </div>
                <Toggle
                  checked={!!draft.visible}
                  onChange={(v) => setDraft((d) => ({ ...d, visible: v }))}
                />
              </div>
            </div>
          ) : null}

          {tab === "media" ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Available Colors
                </span>
                <p className="font-body text-[11px] text-[#6b7280]">
                  Colors shown on the storefront. Each selected color gets its own photo set below.
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const active = (draft.productColors || []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleProductColor(c.id)}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[12px] font-medium transition-colors"
                        style={{
                          borderColor: active ? "#11191f" : "#e5e7eb",
                          backgroundColor: active ? "#11191f" : "#ffffff",
                          color: active ? "#ffffff" : "#11191f",
                        }}
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: c?.hex, border: "1px solid rgba(0,0,0,0.15)" }}
                        />
                        {c?.name}
                      </button>
                    );
                  })}
                </div>
                {errors.productColors ? (
                  <p className="font-body text-[11px] text-[#dc2626]">{errors.productColors}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Available Sizes
                </span>
                <p className="font-body text-[11px] text-[#6b7280]">
                  Sizes shown on the storefront. Inventory is managed per selected size in the Inventory tab.
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const active = (draft.productSizes || []).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleProductSize(s.id)}
                        className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[2px] border px-3 font-body text-[12px] font-medium transition-colors"
                        style={{
                          borderColor: active ? "#11191f" : "#e5e7eb",
                          backgroundColor: active ? "#11191f" : "#ffffff",
                          color: active ? "#ffffff" : "#11191f",
                        }}
                      >
                        {s?.label}
                      </button>
                    );
                  })}
                </div>
                {errors.productSizes ? (
                  <p className="font-body text-[11px] text-[#dc2626]">{errors.productSizes}</p>
                ) : null}
              </div>

              <div className="h-px bg-[#e5e7eb]" />

              {errors.colorImages ? (
                <p className="-mt-2 font-body text-[11px] text-[#dc2626]">{errors.colorImages}</p>
              ) : null}

              {(draft.productColors || []).length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-[2px] border border-dashed border-[#e5e7eb] py-10 text-center">
                  <svg className="size-8 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <p className="font-body text-[12px] text-[#6b7280]">
                    Select at least one color above to add photos.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {(draft.productColors || []).map((colorId) => {
                    const color = colors.find((c) => c.id === colorId);
                    const imageCount = (draft.colorImages || {})[colorId] || 0;
                    const missingImage = errors.colorImages && imageCount === 0;
                    return (
                      <div key={colorId} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3.5 rounded-full border border-[#e5e7eb]"
                              style={{ backgroundColor: color?.hex }}
                            />
                            <span className="font-body text-[12px] font-medium text-[#11191f]">
                              {color?.name}
                            </span>
                          </div>
                          {imageCount > 0 ? (
                            <span className="font-body text-[11px] text-[#6b7280]">{imageCount} photo{imageCount !== 1 ? "s" : ""}</span>
                          ) : null}
                        </div>
                        <div
                          className="flex flex-col items-center gap-3 rounded-[2px] border border-dashed bg-[#fafafa] px-6 py-8 text-center"
                          style={{ borderColor: missingImage ? "#dc2626" : "#e5e7eb" }}
                        >
                          <svg className="size-8 text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <div className="flex flex-col gap-1">
                            <p className="font-body text-[12px] font-medium text-[#11191f]">
                              Drop photos here
                            </p>
                            <p className="font-body text-[11px] text-[#6b7280]">
                              JPG, PNG, WebP — max 4 MB each
                            </p>
                          </div>
                          <Button variant="secondary" icon={<IconPlus />} onClick={() => addColorImage(colorId)}>
                            Choose photos
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {tab === "inventory" ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Colors
                </span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const active = (draft.productColors || []).includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleProductColor(c.id)}
                        className="flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-[12px] font-medium transition-colors"
                        style={{
                          borderColor: active ? "#11191f" : "#e5e7eb",
                          backgroundColor: active ? "#11191f" : "#ffffff",
                          color: active ? "#ffffff" : "#11191f",
                        }}
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: c?.hex, border: "1px solid rgba(0,0,0,0.15)" }}
                        />
                        {c?.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Sizes
                </span>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const active = (draft.productSizes || []).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleProductSize(s.id)}
                        className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-[2px] border px-3 font-body text-[12px] font-medium transition-colors"
                        style={{
                          borderColor: active ? "#11191f" : "#e5e7eb",
                          backgroundColor: active ? "#11191f" : "#ffffff",
                          color: active ? "#ffffff" : "#11191f",
                        }}
                      >
                        {s?.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-[#e5e7eb]" />

              {errors.inventory ? (
                <p className="-mt-2 font-body text-[11px] text-[#dc2626]">{errors.inventory}</p>
              ) : null}

              {(draft.productColors || []).length === 0 || (draft.productSizes || []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-[2px] border border-dashed border-[#e5e7eb] py-10 text-center">
                  <p className="font-body text-[12px] text-[#6b7280]">
                    Select at least one color and one size above to manage inventory.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-[2px] border border-[#e5e7eb] bg-white">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-[#fafafa]">
                        <tr>
                          <th className="px-3 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                            Color
                          </th>
                          {(draft.productSizes || []).map((sizeId) => {
                            const s = sizes.find((sz) => sz.id === sizeId);
                            return (
                              <th
                                key={sizeId}
                                className="px-3 py-2 text-center font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]"
                              >
                                {s?.label}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {(draft.productColors || []).map((colorId) => {
                          const c = colors.find((cl) => cl.id === colorId);
                          return (
                            <tr key={colorId} className="border-t border-[#f3f4f6]">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="size-4 rounded-full border border-[#e5e7eb]"
                                    style={{ backgroundColor: c?.hex }}
                                  />
                                  <span className="font-body text-[12px] text-[#11191f]">{c?.name}</span>
                                </div>
                              </td>
                              {(draft.productSizes || []).map((sizeId) => {
                                const s = sizes.find((sz) => sz.id === sizeId);
                                return (
                                  <td key={sizeId} className="px-2 py-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={getQty(c?.name, s?.label) || ""}
                                      onChange={(e) => {
                                        setVariantQty(c?.name, s?.label, Number(e.target.value) || 0);
                                        clearError("inventory");
                                      }}
                                      className="h-9 w-full rounded-[2px] border bg-white px-2 text-center font-body text-[12px] outline-none focus:border-[#11191f]"
                                      style={{ borderColor: errors.inventory && !getQty(c?.name, s?.label) ? "#dc2626" : "#e5e7eb" }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
                    <span className="font-body text-[12px] text-[#6b7280]">Total stock</span>
                    <span className="font-display text-[14px] font-bold text-[#11191f]">
                      {(draft.variants || []).reduce((s, v) => s + v.qty, 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {tab === "labels" ? (
            <div className="flex flex-col gap-4">
              <p className="font-body text-[12px] text-[#6b7280]">
                Labels appear as badges on the storefront. Use sparingly — too many badges and they lose meaning.
              </p>
              <div className="flex flex-wrap gap-2">
                {LABEL_OPTIONS.map((lab) => (
                  <Chip
                    key={lab}
                    active={(draft.labels || []).includes(lab)}
                    onClick={() => toggleLabel(lab)}
                  >
                    {lab}
                  </Chip>
                ))}
              </div>
              <Field label="Low-stock alert threshold" hint="Trigger admin alerts when total stock falls below this.">
                <NumberInput
                  min="0"
                  value={draft.lowStockThreshold ?? 10}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, lowStockThreshold: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
            </div>
          ) : null}
        </>
      ) : null}
    </Drawer>
  );
}
