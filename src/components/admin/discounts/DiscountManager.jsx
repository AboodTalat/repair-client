"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import {
  Field,
  TextInput,
  TextArea,
  NumberInput,
  Select,
  Toggle,
  DateInput,
  Chip,
  SearchInput,
} from "@/components/admin/shared/Form";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
  IconCheck,
  IconClose,
} from "@/components/admin/shared/Icons";
import { formatCurrency } from "@/lib/mockAdmin";
import { repairCall } from "@/lib/repairAuthedApi";
import { revalidateStorefrontProducts } from "@/lib/productActions";

// A discount changes the PRICE the storefront shows, not just this table — the
// grid, product detail, related row and the category discount banner are all
// server-cached under PRODUCT_CACHE_TAG. Without this bust an admin who added
// or edited a discount kept seeing the old prices for the rest of the ISR
// window no matter how many times they refreshed, because the cache is
// server-side and a browser reload never reaches past it.
// Fire-and-forget: never block the save or surface an error for it.
function bustStorefrontPricing() {
  Promise.resolve(revalidateStorefrontProducts()).catch(() => {});
}

// repairCall throws with a message shaped like "repairClientApi <op>: <server
// message>". Strip the prefix so the admin sees the server's human-readable
// reason (e.g. "starts_at must be before ends_at") rather than the transport's
// internal name. Mirrors cleanErr() in the other admin managers.
function cleanErr(e, fallback) {
  const m = (e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
  return m || fallback;
}

// UI scope values use hyphens; the backend `target_type` enum uses underscores.
// Centralize the translation so the table, filter chips, and the create/update
// payloads can never drift apart.
const SCOPES = [
  { value: "product", label: "Product" },
  { value: "sub-category", label: "Sub-category" },
  { value: "major-category", label: "Major category" },
];

const SCOPE_TO_WIRE = {
  product: "product",
  "sub-category": "sub_category",
  "major-category": "major_category",
};
const WIRE_TO_SCOPE = {
  product: "product",
  sub_category: "sub-category",
  major_category: "major-category",
};

// Product targets are chosen through a category-accordion modal (scales past a
// flat <select> when the catalog is large): the admin drills major → sub, and
// products are fetched per sub-category on demand. `myAppListProducts` caps a
// page at 100, so the modal pulls up to PICKER_SUB_LIMIT per sub and surfaces a
// "refine by search" hint past it; search hits the same resolver with a `search`
// term. The table still renders the resolver's `target_name`, so a target that
// was never loaded into the picker (or later deleted) still displays.
const PICKER_SUB_LIMIT = 100;
const PICKER_SEARCH_LIMIT = 50;

// DATE columns come back as ISO datetime strings. Slice in UTC both for the
// <input type="date"> value and for table display so we never show an
// off-by-one day from local-timezone rendering.
function isoToDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Server item → UI row.
// Product scope carries MANY products (via discount_products): `productTargets`
// is [{id, name|null}] and `productIds` the bare id list. Category scopes keep a
// single targetId + targetName.
function toUiRow(it) {
  const scope = WIRE_TO_SCOPE[it.target_type] ?? "product";
  const productTargets = scope === "product" ? (it.targets || []).map((t) => ({ id: Number(t.id), name: t.name ?? null })) : [];
  return {
    id: Number(it.id),
    scope,
    targetId: it.target_id != null ? Number(it.target_id) : null,
    targetName: it.target_name ?? null,
    productIds: scope === "product" ? (it.product_ids || []).map(Number) : [],
    productTargets,
    type: it.discount_type,
    amount: Number(it.discount_value),
    starts: isoToDateInput(it.starts_at),
    ends: isoToDateInput(it.ends_at),
    active: !!it.is_active,
    // Non-null when an OLDER active discount covers the same target over
    // overlapping dates. Pricing gives that one precedence, so this row is live
    // in the database but charges nobody — it must not read as simply "Active".
    shadowedBy: it.shadowed_by ?? null,
    // Storefront banner opt-in + optional custom copy (migration 0029).
    showBanner: !!it.show_banner,
    bannerHeadline: it.banner_headline ?? "",
    bannerSubtext: it.banner_subtext ?? "",
  };
}

// UI draft → backend payload (shared by create + update).
function toWirePayload(draft) {
  const payload = {
    target_type: SCOPE_TO_WIRE[draft.scope],
    discount_type: draft.type,
    discount_value: Number(draft.amount),
    // Empty string → null so open-ended windows are honored (backend treats a
    // missing start/end as unbounded on that side).
    starts_at: draft.starts ? draft.starts : null,
    ends_at: draft.ends ? draft.ends : null,
    is_active: !!draft.active,
  };
  // Product scope sends the full product id set (the server replaces the join);
  // category scopes send a single target_id.
  if (draft.scope === "product") {
    payload.product_ids = (draft.productIds || []).map(Number);
    // The storefront banner is category-only — never advertise a product-scope
    // discount as a category banner.
    payload.show_banner = false;
    payload.banner_headline = null;
    payload.banner_subtext = null;
  } else {
    payload.target_id = Number(draft.targetId);
    // Storefront banner opt-in + optional custom copy (blank → null).
    payload.show_banner = !!draft.showBanner;
    payload.banner_headline = draft.bannerHeadline?.trim() ? draft.bannerHeadline.trim() : null;
    payload.banner_subtext = draft.bannerSubtext?.trim() ? draft.bannerSubtext.trim() : null;
  }
  if (draft.id) payload.id = Number(draft.id);
  return payload;
}

// Short "Applies to" label for the table.
function targetLabel(row) {
  if (row.scope === "product") {
    const targets = row.productTargets || [];
    if (targets.length === 0) return "(no products)";
    const first = targets[0].name || `#${targets[0].id}`;
    return targets.length === 1 ? first : `${first} +${targets.length - 1} more`;
  }
  if (row.targetName) return row.targetName;
  // No FK on the category target_id — it may have been deleted.
  return `(deleted #${row.targetId ?? "?"})`;
}

export default function DiscountManager() {
  const [discounts, setDiscounts] = useState([]);
  const [majors, setMajors] = useState([]); // { id, name }
  const [subs, setSubs] = useState([]); // { id, name, majorId, majorName }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Succeeded-but-worth-knowing message from the last save (currently: this
  // discount is out-ranked by an older one). Separate from `error` so a save
  // that works is never painted as a failure.
  const [notice, setNotice] = useState(null);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchDiscounts = useCallback(async () => {
    const res = await repairCall("myAppAdminListDiscounts", {}, { isQuery: true });
    setDiscounts((res?.items || []).map(toUiRow));
  }, []);

  const fetchTargets = useCallback(async () => {
    // Category tree (majors + subs) powers BOTH the sub/major-scope <select>s
    // and the product picker's accordion. Admin-inclusive of hidden rows so a
    // discount can target an unpublished product/category. Products themselves
    // are NOT pre-fetched here — the picker loads them per sub-category on
    // demand so this stays cheap with a 1000-product catalog.
    const tree = await repairCall("myAppListCategoriesTree", { includeHidden: true }, { isQuery: true });

    const majorRows = [];
    const subRows = [];
    (tree || []).forEach((m) => {
      majorRows.push({ id: Number(m.id), name: m.name });
      (m.sub_categories || []).forEach((s) => {
        subRows.push({ id: Number(s.id), name: s.name, majorId: Number(m.id), majorName: m.name });
      });
    });
    setMajors(majorRows);
    setSubs(subRows);
  }, []);

  // Mount fetch. The async body is declared INSIDE the effect so no setState
  // runs synchronously in the effect body (react-hooks/set-state-in-effect) —
  // the old `loadAll()` called `setError(null)` before its first await, which
  // is exactly the cascading-render case the rule guards against. `cancelled`
  // flag only, NO run-once ref: pairing the two deadlocks under Strict Mode's
  // double mount and hangs the page on "Loading…" forever (see repair/CLAUDE.md).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([fetchDiscounts(), fetchTargets()]);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) setError(cleanErr(err, "Failed to load discounts"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDiscounts, fetchTargets]);

  const filtered = discounts.filter((d) => {
    if (scope !== "all" && d.scope !== scope) return false;
    if (query) {
      const hay = (d.targetName || "").toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  async function save(draft) {
    const op = draft.id ? "myAppAdminUpdateDiscount" : "myAppAdminCreateDiscount";
    const res = await repairCall(op, toWirePayload(draft), { isQuery: false });
    setEditing(null);
    bustStorefrontPricing();
    await fetchDiscounts();
    // The write succeeded but may not change any price: an older active
    // discount on the same target out-ranks it. Saying nothing here is what
    // made this confusing — the admin got a success toast and an unchanged
    // storefront. Set AFTER fetchDiscounts so the reload can't clear it.
    setNotice(res?.warning || null);
  }

  async function remove(id) {
    try {
      await repairCall("myAppAdminDeleteDiscount", { id: Number(id) }, { isQuery: false });
      setConfirmDelete(null);
      bustStorefrontPricing();
      await fetchDiscounts();
    } catch (err) {
      setConfirmDelete(null);
      setError(cleanErr(err, "Failed to delete discount"));
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
          <p className="font-body text-[13px] text-[#6b7280]">Loading discounts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{error}</p>
        </div>
      )}

      {/* Amber, and dismissible: the save DID succeed, so this is not an error —
          it explains why the storefront price won't move yet. */}
      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-[4px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3"
        >
          <p className="font-body text-[13px] text-[#92400e]">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 font-body text-[12px] font-medium text-[#92400e] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={scope === "all"} onClick={() => setScope("all")}>
          All scopes
        </Chip>
        {SCOPES.map((s) => (
          <Chip key={s.value} active={scope === s.value} onClick={() => setScope(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by target..." />
        </div>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setEditing({
              id: null,
              scope: "product",
              targetId: "",
              productIds: [],
              productTargets: [],
              type: "percentage",
              amount: 10,
              starts: "",
              ends: "",
              active: true,
              showBanner: false,
              bannerHeadline: "",
              bannerSubtext: "",
            })
          }
        >
          New discount
        </Button>
      </div>

      <DataTable
        empty="No discounts yet. Create one to apply automatic pricing on a product or category."
        columns={[
          {
            key: "scope",
            label: "Scope",
            render: (d) => (
              <span className="font-display text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                {SCOPES.find((s) => s.value === d.scope)?.label || d.scope}
              </span>
            ),
          },
          {
            key: "target",
            label: "Applies to",
            render: (d) => (
              <span
                className={
                  "font-body text-[13px] font-medium " +
                  (d.targetName ? "text-[#11191f]" : "text-[#dc2626]")
                }
              >
                {targetLabel(d)}
              </span>
            ),
          },
          {
            key: "type",
            label: "Discount",
            render: (d) => (d.type === "percentage" ? `${d.amount}%` : formatCurrency(d.amount)),
          },
          {
            key: "window",
            label: "Valid",
            render: (d) => (
              <span className="font-body text-[12px] text-[#6b7280]">
                {d.starts || "—"} → {d.ends || "—"}
              </span>
            ),
          },
          {
            key: "active",
            label: "Status",
            render: (d) => (
              <div className="flex flex-col items-start gap-1">
                <StatusBadge
                  status={d.active ? "active" : "inactive"}
                  label={d.active ? "Active" : "Inactive"}
                />
                {/* An active-but-out-ranked discount changes no price. Badging
                    it plain "Active" is the whole reason this was invisible. */}
                {d.active && d.shadowedBy ? (
                  <span
                    className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-body text-[10px] font-medium text-[#92400e]"
                    title={`Discount #${d.shadowedBy.id}${d.shadowedBy.name ? ` (${d.shadowedBy.name})` : ""} — ${d.shadowedBy.discount_value}${d.shadowedBy.discount_type === "percentage" ? "%" : " off"} — covers the same target over the same dates and takes precedence.`}
                  >
                    Not applying · #{d.shadowedBy.id} wins
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (d) => (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => setEditing(d)}
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconEdit />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setConfirmDelete(d)}
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
      />

      <DiscountDrawer
        editing={editing}
        majors={majors}
        subs={subs}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete discount"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="dangerSolid" onClick={() => remove(confirmDelete?.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="font-body text-[13px] text-[#11191f]">
          Delete discount on <strong>{confirmDelete ? targetLabel(confirmDelete) : ""}</strong>?
        </p>
      </Modal>
    </>
  );
}

function validateDraft(draft) {
  const errs = {};
  if (draft.scope === "product") {
    if (!draft.productIds || draft.productIds.length === 0) {
      errs.targetId = "Select at least one product.";
    }
  } else if (draft.targetId === "" || draft.targetId == null) {
    errs.targetId = "Select a target.";
  }
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    errs.amount = "Amount must be a non-negative number.";
  } else if (draft.type === "percentage" && amount > 100) {
    errs.amount = "Percentage cannot exceed 100.";
  }
  if (draft.starts && draft.ends && draft.starts > draft.ends) {
    errs.ends = "End date must be on or after the start date.";
  }
  return errs;
}

function DiscountDrawer({ editing, majors, subs, onClose, onSave }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [drawerError, setDrawerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Seed the form from the row being edited. This is React's documented
  // "adjust state when a prop changes" pattern — compare against the previous
  // prop DURING render and setState there — not a mount/prop effect. An effect
  // would paint one frame with the previous row's values and trips
  // react-hooks/set-state-in-effect; this re-renders before committing, so the
  // drawer never flashes stale data. The `editing !== seededFrom` guard makes
  // the setState calls stop after one extra render pass.
  // `editing` is a fresh object per open, so re-opening the SAME discount still
  // reseeds (an id-based key would not).
  // `prevEditing` tracks the PREVIOUS prop value including null, so closing the
  // drawer (editing → null) resets the tracker. Without that, reopening the
  // same row — `setEditing(d)` hands back the identical object from the
  // `discounts` array — would compare equal and skip the reseed, leaving the
  // previous session's half-typed draft on screen. This mirrors the old
  // `useEffect(..., [editing])` semantics exactly.
  const [prevEditing, setPrevEditing] = useState(null);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setDraft({ ...editing });
      setErrors({});
      setDrawerError(null);
      setPickerOpen(false);
    }
  }

  // React Compiler can pre-evaluate both ternary branches, so guard every
  // draft access with optional chaining even though `open` gates the body.
  // Only category scopes use a <select> (the lists are small); the product
  // scope uses the accordion picker modal below.
  const categoryOptions =
    draft?.scope === "major-category"
      ? majors.map((m) => ({ value: m.id, label: m.name }))
      : subs.map((s) => ({ value: s.id, label: `${s.majorName} · ${s.name}` }));

  async function handleSave() {
    const errs = validateDraft(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setDrawerError(cleanErr(err, "Something went wrong."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft?.id ? "Edit discount" : "New discount"}
      subtitle="Discounts apply automatically — promo codes are configured separately."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {open && editing ? (
        <div className="flex flex-col gap-4">
          {drawerError && (
            <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
              <p className="font-body text-[12px] text-[#dc2626]">{drawerError}</p>
            </div>
          )}

          <Field label="Scope" required>
            <Select
              value={draft?.scope}
              onChange={(v) => {
                // Changing scope invalidates the previously-picked target.
                setDraft((d) => ({ ...d, scope: v, targetId: "", targetName: "" }));
                setErrors((e) => ({ ...e, targetId: "" }));
              }}
              options={SCOPES}
            />
          </Field>

          {draft?.scope === "product" ? (
            <Field label="Applies to" required>
              {(draft?.productTargets || []).length > 0 ? (
                <div className="flex flex-col gap-2 rounded-[2px] border border-[#e5e7eb] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                      {draft.productTargets.length} product{draft.productTargets.length !== 1 ? "s" : ""} selected
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                      Edit selection
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.productTargets.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-[#fafafa] py-1 pl-2.5 pr-1.5 font-body text-[12px] text-[#11191f]"
                      >
                        <span className="max-w-[180px] truncate">{t.name || `#${t.id}`}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${t.name || t.id}`}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              productTargets: d.productTargets.filter((x) => x.id !== t.id),
                              productIds: d.productIds.filter((x) => Number(x) !== t.id),
                            }))
                          }
                          className="grid size-4 place-items-center rounded-full text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#11191f]"
                        >
                          <span className="grid size-3 place-items-center">
                            <IconClose />
                          </span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <Button variant="secondary" icon={<IconPlus />} onClick={() => setPickerOpen(true)}>
                  Choose products
                </Button>
              )}
              {errors.targetId ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.targetId}</span>
              ) : null}
              <span className="font-body text-[11px] text-[#6b7280]">
                Browse by category or search, tick the products this discount applies to.
              </span>
            </Field>
          ) : (
            <Field label="Applies to" required>
              <Select
                value={draft?.targetId ?? ""}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, targetId: v, targetName: "" }));
                  setErrors((e) => ({ ...e, targetId: "" }));
                }}
                options={categoryOptions}
                placeholder="Select target..."
              />
              {errors.targetId ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.targetId}</span>
              ) : null}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select
                value={draft?.type}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, type: v }));
                  setErrors((e) => ({ ...e, amount: "" }));
                }}
                options={[
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed", label: "Fixed amount" },
                ]}
              />
            </Field>
            <Field label={draft?.type === "percentage" ? "Amount %" : "Amount JOD"} required>
              <NumberInput
                value={draft?.amount ?? 0}
                min="0"
                max={draft?.type === "percentage" ? "100" : undefined}
                step="0.01"
                onChange={(e) => {
                  setDraft((d) => ({ ...d, amount: e.target.value }));
                  setErrors((er) => ({ ...er, amount: "" }));
                }}
                className={errors.amount ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {errors.amount ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.amount}</span>
              ) : null}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts" hint="Leave empty for no start limit.">
              <DateInput
                value={draft?.starts || ""}
                onChange={(e) => setDraft((d) => ({ ...d, starts: e.target.value }))}
              />
            </Field>
            <Field label="Ends" hint="Leave empty for no end limit.">
              <DateInput
                value={draft?.ends || ""}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, ends: e.target.value }));
                  setErrors((er) => ({ ...er, ends: "" }));
                }}
                className={errors.ends ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {errors.ends ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.ends}</span>
              ) : null}
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Inactive discounts don&apos;t apply even within their valid window.
              </p>
            </div>
            <Toggle checked={!!draft?.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
          </div>

          {/* Storefront banner — category scopes only. A glossy promo strip with
              a countdown to the end date shows on the shop page for the targeted
              category when this is on. */}
          {draft?.scope !== "product" ? (
            <div className="flex flex-col gap-3 rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-body text-[13px] font-medium text-[#11191f]">Show as storefront banner</p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    Displays a glossy promo strip with a live countdown on this category&apos;s shop page while
                    the discount is active.
                  </p>
                </div>
                <Toggle
                  checked={!!draft?.showBanner}
                  onChange={(v) => setDraft((d) => ({ ...d, showBanner: v }))}
                />
              </div>

              {draft?.showBanner ? (
                <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-3">
                  <Field label="Banner headline" hint="Leave blank to auto-generate (e.g. “20% OFF · Women”).">
                    <TextInput
                      value={draft?.bannerHeadline ?? ""}
                      maxLength={120}
                      placeholder="e.g. Summer Sale is live"
                      onChange={(e) => setDraft((d) => ({ ...d, bannerHeadline: e.target.value }))}
                    />
                  </Field>
                  <Field label="Banner subtext" hint="Optional supporting line.">
                    <TextArea
                      value={draft?.bannerSubtext ?? ""}
                      maxLength={200}
                      rows={2}
                      placeholder="e.g. Up to 20% off every piece in this collection."
                      onChange={(e) => setDraft((d) => ({ ...d, bannerSubtext: e.target.value }))}
                    />
                  </Field>
                  {!draft?.ends ? (
                    <p className="font-body text-[11px] text-[#6b7280]">
                      Tip: set an <strong>Ends</strong> date above so the banner can show a countdown.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <ProductPickerModal
        open={pickerOpen}
        majors={majors}
        subs={subs}
        initialSelected={draft?.scope === "product" ? draft?.productTargets ?? [] : []}
        onClose={() => setPickerOpen(false)}
        onApply={(targets) => {
          setDraft((d) => ({
            ...d,
            productTargets: targets,
            productIds: targets.map((t) => t.id),
          }));
          setErrors((e) => ({ ...e, targetId: "" }));
          setPickerOpen(false);
        }}
      />
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// ProductPickerModal — scalable product chooser for the "product" scope.
// Major → sub accordion; products for a sub load on first expand (cached for
// the modal's lifetime). A search box queries across the whole catalog and
// shows a flat result list instead of the accordion while a term is present.
// Built on myAppListProducts (subCategoryId / search / limit) — no new backend.
// ---------------------------------------------------------------------------
function ProductPickerModal({ open, majors, subs, initialSelected, onClose, onApply }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searching, setSearching] = useState(false);
  const [expandedMajors, setExpandedMajors] = useState(() => new Set());
  const [expandedSubs, setExpandedSubs] = useState(() => new Set());
  const [productsBySub, setProductsBySub] = useState(() => new Map()); // subId → { items, total, error? }
  const [loadingSubs, setLoadingSubs] = useState(() => new Set());
  // Major-level products (majorId → { items, total, error? }). Loaded on expand
  // so products whose category link is the MAJOR — not a sub — are selectable.
  const [productsByMajor, setProductsByMajor] = useState(() => new Map());
  const [loadingMajors, setLoadingMajors] = useState(() => new Set());
  // Working selection — id → name. Seeded from the draft each time the modal
  // opens; only committed to the draft on "Apply".
  const [selected, setSelected] = useState(() => new Map());

  // Reset transient state each time the modal opens so editing starts from the
  // current selection (not whatever was left from a previous open).
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults(null);
      setSearching(false);
      setExpandedMajors(new Set());
      setExpandedSubs(new Set());
      setProductsBySub(new Map());
      setLoadingSubs(new Set());
      setProductsByMajor(new Map());
      setLoadingMajors(new Set());
      setSelected(new Map((initialSelected || []).map((t) => [Number(t.id), t.name ?? null])));
    }
  }, [open, initialSelected]);

  function toggleProduct(id, name) {
    setSelected((prev) => {
      const n = new Map(prev);
      if (n.has(id)) n.delete(id);
      else n.set(id, name ?? null);
      return n;
    });
  }

  // Debounced catalog-wide search. setState happens inside the async callback
  // (not synchronously in the effect body) so the timer drives it.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await repairCall(
          "myAppListProducts",
          { search: q, includeHidden: true, limit: PICKER_SEARCH_LIMIT },
          { isQuery: true }
        );
        if (!cancelled) setSearchResults(normalizePickerItems(res));
      } catch {
        if (!cancelled) setSearchResults({ items: [], total: 0, error: "Search failed" });
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const subsByMajor = new Map();
  subs.forEach((s) => {
    if (!subsByMajor.has(s.majorId)) subsByMajor.set(s.majorId, []);
    subsByMajor.get(s.majorId).push(s);
  });

  // Expanding a major now ALSO loads its products. `myAppListProducts` resolves
  // a majorCategoryId to the union of (primary sub FK ∪ primary major FK ∪ both
  // join tables), so this is the only query that can reach a product whose
  // category link is the major itself — the sub-only accordion never could.
  async function toggleMajor(id) {
    const willOpen = !expandedMajors.has(id);
    setExpandedMajors((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    if (!willOpen) return;
    if (productsByMajor.has(id) || loadingMajors.has(id)) return;
    setLoadingMajors((prev) => new Set(prev).add(id));
    try {
      const res = await repairCall(
        "myAppListProducts",
        { majorCategoryId: id, includeHidden: true, limit: PICKER_SUB_LIMIT },
        { isQuery: true }
      );
      setProductsByMajor((prev) => new Map(prev).set(id, normalizePickerItems(res)));
    } catch (err) {
      setProductsByMajor((prev) =>
        new Map(prev).set(id, { items: [], total: 0, error: err?.message || "Failed to load" })
      );
    } finally {
      setLoadingMajors((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  async function toggleSub(subId) {
    const willOpen = !expandedSubs.has(subId);
    setExpandedSubs((prev) => {
      const n = new Set(prev);
      if (n.has(subId)) n.delete(subId);
      else n.add(subId);
      return n;
    });
    if (!willOpen) return;
    if (productsBySub.has(subId) || loadingSubs.has(subId)) return;
    setLoadingSubs((prev) => new Set(prev).add(subId));
    try {
      const res = await repairCall(
        "myAppListProducts",
        { subCategoryId: subId, includeHidden: true, limit: PICKER_SUB_LIMIT },
        { isQuery: true }
      );
      setProductsBySub((prev) => new Map(prev).set(subId, normalizePickerItems(res)));
    } catch (err) {
      setProductsBySub((prev) =>
        new Map(prev).set(subId, { items: [], total: 0, error: err?.message || "Failed to load" })
      );
    } finally {
      setLoadingSubs((prev) => {
        const n = new Set(prev);
        n.delete(subId);
        return n;
      });
    }
  }

  const showingSearch = query.trim().length >= 2;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose products"
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onApply([...selected].map(([id, name]) => ({ id, name })))}
          >
            {selected.size > 0 ? `Apply ${selected.size} product${selected.size !== 1 ? "s" : ""}` : "Apply"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search all products by name..." />

        <div className="max-h-[55vh] overflow-y-auto rounded-[2px] border border-[#e5e7eb]">
          {showingSearch ? (
            <SearchResultsList
              searching={searching}
              result={searchResults}
              selected={selected}
              onToggle={toggleProduct}
            />
          ) : majors.length === 0 ? (
            <EmptyHint>No categories yet. Create categories and products first.</EmptyHint>
          ) : (
            <ul>
              {majors.map((m) => {
                const open = expandedMajors.has(m.id);
                const list = subsByMajor.get(m.id) || [];
                return (
                  <li key={m.id} className="border-b border-[#f3f4f6] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleMajor(m.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#fafafa]"
                    >
                      <span className="grid size-4 place-items-center text-[#6b7280]">
                        {open ? <IconChevronDown /> : <IconChevronRight />}
                      </span>
                      <span className="font-display text-[12px] font-semibold uppercase tracking-[1px] text-[#11191f]">
                        {m.name}
                      </span>
                      <span className="ml-auto rounded-full bg-[#f3f4f6] px-2 py-0.5 font-body text-[10px] font-medium text-[#6b7280]">
                        {list.length} sub{list.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {open ? (
                      <ul className="bg-[#fafafa]">
                        {/* Products linked to the MAJOR itself (major-primary, or
                            cross-listed into it) — unreachable from any sub row. */}
                        {(() => {
                          const majorData = productsByMajor.get(m.id);
                          const majorLoading = loadingMajors.has(m.id);
                          const subIdSet = new Set(list.map((s) => s.id));
                          const directItems = majorDirectItems(majorData, subIdSet);
                          if (!majorLoading && !majorData?.error && directItems.length === 0) {
                            return null;
                          }
                          return (
                            <li className="border-t border-[#f3f4f6]">
                              <div className="flex items-center gap-2 py-2 pl-8 pr-3">
                                <span className="font-body text-[13px] font-medium text-[#11191f]">
                                  Directly in {m.name}
                                </span>
                                <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 font-body text-[10px] font-medium text-[#1d4ed8]">
                                  not in a sub-category
                                </span>
                              </div>
                              <div className="pb-1 pl-8 pr-2">
                                {majorLoading ? (
                                  <EmptyHint>Loading products...</EmptyHint>
                                ) : majorData?.error ? (
                                  <EmptyHint tone="danger">{majorData.error}</EmptyHint>
                                ) : (
                                  <>
                                    <ProductRows
                                      items={directItems}
                                      selected={selected}
                                      onToggle={toggleProduct}
                                    />
                                    {majorData && majorData.total > majorData.items.length ? (
                                      <p className="px-2 py-1.5 font-body text-[11px] text-[#6b7280]">
                                        Showing the first {majorData.items.length} of{" "}
                                        {majorData.total} in this category — use search to
                                        narrow down.
                                      </p>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })()}

                        {list.length === 0 && !productsByMajor.get(m.id) ? (
                          <li>
                            <EmptyHint>No sub-categories.</EmptyHint>
                          </li>
                        ) : (
                          list.map((s) => {
                            const subOpen = expandedSubs.has(s.id);
                            const data = productsBySub.get(s.id);
                            const isLoading = loadingSubs.has(s.id);
                            return (
                              <li key={s.id} className="border-t border-[#f3f4f6]">
                                <button
                                  type="button"
                                  onClick={() => toggleSub(s.id)}
                                  className="flex w-full items-center gap-2 py-2 pl-8 pr-3 text-left hover:bg-white"
                                >
                                  <span className="grid size-4 place-items-center text-[#6b7280]">
                                    {subOpen ? <IconChevronDown /> : <IconChevronRight />}
                                  </span>
                                  <span className="font-body text-[13px] font-medium text-[#11191f]">
                                    {s.name}
                                  </span>
                                </button>
                                {subOpen ? (
                                  <div className="pb-1 pl-8 pr-2">
                                    {isLoading ? (
                                      <EmptyHint>Loading products...</EmptyHint>
                                    ) : data?.error ? (
                                      <EmptyHint tone="danger">{data.error}</EmptyHint>
                                    ) : !data || data.items.length === 0 ? (
                                      <EmptyHint>No products in this sub-category.</EmptyHint>
                                    ) : (
                                      <>
                                        <ProductRows
                                          items={data.items}
                                          selected={selected}
                                          onToggle={toggleProduct}
                                        />
                                        {data.total > data.items.length ? (
                                          <p className="px-2 py-1.5 font-body text-[11px] text-[#6b7280]">
                                            Showing {data.items.length} of {data.total} — use search to
                                            narrow down.
                                          </p>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                ) : null}
                              </li>
                            );
                          })
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function normalizePickerItems(res) {
  return {
    items: (res?.items || []).map((p) => ({
      id: Number(p.id),
      name: p.name,
      base_price: Number(p.base_price),
      is_visible: p.is_visible !== false,
      // Kept so the major-level group can exclude products that are already
      // reachable under one of that major's sub-category rows — see
      // majorDirectItems(). A product's primary may be a sub OR a major
      // directly (migration 0010), and it can carry extra sub memberships.
      sub_category_id: p.sub_category_id != null ? Number(p.sub_category_id) : null,
      extra_sub_category_ids: (p.extra_sub_category_ids || []).map(Number),
    })),
    total: Number(res?.total ?? (res?.items?.length || 0)),
  };
}

// Products returned for a major that do NOT appear under any of that major's
// sub-category rows — i.e. the ones the sub-only accordion could never reach:
// major-primary products (sub_category_id NULL, migration 0010) and products
// cross-listed into this major via product_major_categories whose own subs
// belong to a different major. Everything else stays under its sub row, so the
// tree remains a clean partition with no duplicate listings.
function majorDirectItems(data, subIdSet) {
  if (!data) return [];
  return data.items.filter((p) => {
    if (p.sub_category_id != null && subIdSet.has(p.sub_category_id)) return false;
    return !(p.extra_sub_category_ids || []).some((id) => subIdSet.has(id));
  });
}

function SearchResultsList({ searching, result, selected, onToggle }) {
  if (searching && !result) return <EmptyHint>Searching...</EmptyHint>;
  if (result?.error) return <EmptyHint tone="danger">{result.error}</EmptyHint>;
  if (!result || result.items.length === 0) return <EmptyHint>No products match that search.</EmptyHint>;
  return (
    <div className="p-2">
      <ProductRows items={result.items} selected={selected} onToggle={onToggle} />
      {result.total > result.items.length ? (
        <p className="px-2 py-1.5 font-body text-[11px] text-[#6b7280]">
          Showing {result.items.length} of {result.total} matches — refine your search.
        </p>
      ) : null}
    </div>
  );
}

function ProductRows({ items, selected, onToggle }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((p) => {
        const isSelected = selected.has(p.id);
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onToggle(p.id, p.name)}
              aria-pressed={isSelected}
              className={
                "flex w-full items-center gap-2 rounded-[2px] px-2 py-2 text-left transition-colors " +
                (isSelected ? "bg-[#eff6ff]" : "hover:bg-white")
              }
            >
              <span
                className={
                  "grid size-4 shrink-0 place-items-center rounded-[3px] border " +
                  (isSelected ? "border-[#1d4ed8] bg-[#1d4ed8] text-white" : "border-[#cbd5e1] text-transparent")
                }
              >
                <span className="grid size-3 place-items-center">
                  <IconCheck />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-body text-[13px] font-medium text-[#11191f]">{p.name}</span>
                  {!p.is_visible ? (
                    <span className="shrink-0 rounded-full bg-[#fef3c7] px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.6px] text-[#92400e]">
                      Hidden
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 font-body text-[12px] text-[#6b7280]">
                {formatCurrency(p.base_price)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyHint({ children, tone = "muted" }) {
  return (
    <p
      className={
        "px-3 py-3 font-body text-[12px] " + (tone === "danger" ? "text-[#dc2626]" : "text-[#6b7280]")
      }
    >
      {children}
    </p>
  );
}
