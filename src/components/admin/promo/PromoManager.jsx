"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import {
  Field,
  TextInput,
  NumberInput,
  Toggle,
  Select,
  DateInput,
  Chip,
  SearchInput,
} from "@/components/admin/shared/Form";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCopy,
} from "@/components/admin/shared/Icons";
import { formatCurrency } from "@/lib/mockAdmin";
import { repairCall } from "@/lib/repairAuthedApi";

// DATE columns come back as ISO datetime strings. Slice in UTC for the
// <input type="date"> value so we never show an off-by-one day from
// local-timezone rendering (same convention as DiscountManager).
function isoToDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// A code is "expired" purely from its expiry date — `is_active` is a separate,
// manual flag. Derive expiry client-side so we don't need a server-computed
// column. A null/empty expiry never expires.
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

// Server item → UI row. The backend uses snake_case + different names than the
// old mock (discount_type/discount_value/minimum_order_value/usage_limit/
// used_count/expires_at/is_active); map them once here so the rest of the
// component speaks one shape.
function toUiRow(it) {
  return {
    id: Number(it.id),
    code: it.code,
    type: it.discount_type, // "fixed" | "percentage"
    amount: Number(it.discount_value),
    minOrder: Number(it.minimum_order_value),
    usageType: it.usage_type, // "single" | "multi"
    // usage_limit null = unlimited; keep null (NOT 0 — 0 is a real cap).
    usageLimit: it.usage_limit == null ? null : Number(it.usage_limit),
    used: Number(it.used_count),
    expires: isoToDateInput(it.expires_at),
    active: !!it.is_active,
  };
}

// UI draft → backend payload (shared by create + update).
// CRITICAL mappings:
//   - usageLimit: empty/blank → null (unlimited). NEVER send 0 — the backend
//     rejects usage_limit < 1, so 0 (the "unlimited" sentinel in the old mock)
//     would error on every unlimited code.
//   - `used` is intentionally NOT sent — used_count is append-only via checkout
//     and the backend ignores/forbids it on create+update.
function toWirePayload(draft) {
  const rawLimit = draft.usageLimit;
  const limitNum = rawLimit === "" || rawLimit == null ? null : Number(rawLimit);
  const payload = {
    code: String(draft.code || "").trim(),
    discount_type: draft.type,
    discount_value: Number(draft.amount),
    minimum_order_value: Number(draft.minOrder) || 0,
    usage_type: draft.usageType,
    usage_limit: limitNum && limitNum > 0 ? limitNum : null,
    expires_at: draft.expires ? draft.expires : null,
    is_active: !!draft.active,
  };
  if (draft.id) payload.id = Number(draft.id);
  return payload;
}

function validateDraft(draft) {
  const errs = {};
  if (!String(draft.code || "").trim()) {
    errs.code = "Code is required.";
  }
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    errs.amount = "Amount must be a non-negative number.";
  } else if (draft.type === "percentage" && amount > 100) {
    errs.amount = "Percentage cannot exceed 100.";
  }
  const minOrder = Number(draft.minOrder);
  if (draft.minOrder !== "" && (!Number.isFinite(minOrder) || minOrder < 0)) {
    errs.minOrder = "Minimum order must be a non-negative number.";
  }
  // usage_limit: blank = unlimited (valid). If supplied it must be a positive
  // integer — mirrors the backend guard so the admin sees the error inline
  // before the round-trip.
  if (draft.usageLimit !== "" && draft.usageLimit != null) {
    const n = Number(draft.usageLimit);
    if (!Number.isInteger(n) || n < 1) {
      errs.usageLimit = "Usage limit must be a whole number ≥ 1 (leave blank for unlimited).";
    }
  }
  return errs;
}

export default function PromoManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchCodes = useCallback(async () => {
    const res = await repairCall("myAppAdminListPromoCodes", {}, { isQuery: true });
    setCodes((res?.items || []).map(toUiRow));
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      await fetchCodes();
    } catch (err) {
      setError(err?.message || "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, [fetchCodes]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    return codes.filter((c) => {
      const expired = isExpired(c.expires);
      // Three independent states derived from two fields (is_active + expiry):
      //   active  → flag on AND not past expiry
      //   expired → past its expiry date (regardless of the flag)
      //   (inactive flag with no expiry just isn't "active")
      if (filter === "active" && (!c.active || expired)) return false;
      if (filter === "expired" && !expired) return false;
      if (query && !c.code.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [codes, query, filter]);

  async function save(draft) {
    const op = draft.id ? "myAppAdminUpdatePromoCode" : "myAppAdminCreatePromoCode";
    await repairCall(op, toWirePayload(draft), { isQuery: false });
    setEditing(null);
    await fetchCodes();
  }

  // The backend REFUSES to delete a code that has ever been redeemed (FK from
  // promo_code_usages) and returns a guided "deactivate instead" message. Don't
  // optimistically remove the row — await, keep it on failure, surface the
  // server's message (same posture as DiscountManager.remove).
  async function remove(id) {
    try {
      await repairCall("myAppAdminDeletePromoCode", { id: Number(id) }, { isQuery: false });
      setConfirmDelete(null);
      await fetchCodes();
    } catch (err) {
      setConfirmDelete(null);
      setError(err?.message || "Failed to delete promo code");
    }
  }

  function generateCode() {
    // No Math.random restriction in the browser; keep the original generator.
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return "PROMO" + random;
  }

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
          <p className="font-body text-[13px] text-[#6b7280]">Loading promo codes...</p>
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

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by code..." />
        </div>
        <div className="flex items-center gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          <Chip active={filter === "active"} onClick={() => setFilter("active")}>
            Active
          </Chip>
          <Chip active={filter === "expired"} onClick={() => setFilter("expired")}>
            Expired
          </Chip>
        </div>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setEditing({
              id: null,
              code: generateCode(),
              type: "percentage",
              amount: 10,
              minOrder: 0,
              usageType: "multi",
              usageLimit: "",
              expires: "",
              active: true,
            })
          }
        >
          New code
        </Button>
      </div>

      <DataTable
        empty="No promo codes yet. Create one to offer a checkout discount."
        columns={[
          {
            key: "code",
            label: "Code",
            render: (r) => (
              <div className="flex items-center gap-2">
                <span className="rounded-[2px] bg-[#f3f4f6] px-2 py-1 font-display text-[12px] font-bold tracking-[1.4px] text-[#11191f]">
                  {r.code}
                </span>
                <button
                  type="button"
                  aria-label="Copy code"
                  title="Copy code"
                  onClick={() => navigator.clipboard?.writeText(r.code)}
                  className="grid size-7 place-items-center rounded-[2px] text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#11191f]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconCopy />
                  </span>
                </button>
              </div>
            ),
          },
          {
            key: "type",
            label: "Discount",
            render: (r) => (
              <span className="font-body text-[13px] text-[#11191f]">
                {r.type === "percentage" ? `${r.amount}%` : formatCurrency(r.amount)} off
              </span>
            ),
          },
          {
            key: "usageType",
            label: "Per customer",
            render: (r) => (
              <span className="font-body text-[12px] text-[#6b7280]">
                {r.usageType === "single" ? "Once per customer" : "Unlimited"}
              </span>
            ),
          },
          {
            key: "minOrder",
            label: "Min order",
            align: "right",
            render: (r) => (r.minOrder ? formatCurrency(r.minOrder) : "—"),
          },
          {
            key: "usage",
            label: "Usage",
            render: (r) => {
              const pct = r.usageLimit ? Math.min(100, Math.round((r.used / r.usageLimit) * 100)) : 0;
              return (
                <div className="flex flex-col gap-1">
                  <span className="font-body text-[12px] text-[#11191f]">
                    {r.used}{r.usageLimit ? ` / ${r.usageLimit}` : " (unlimited)"}
                  </span>
                  {r.usageLimit ? (
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-[#f3f4f6]">
                      <span
                        className="block h-full"
                        style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#dc2626" : "#1d4ed8" }}
                      />
                    </span>
                  ) : null}
                </div>
              );
            },
          },
          { key: "expires", label: "Expires", render: (r) => r.expires || "—" },
          {
            key: "active",
            label: "Status",
            render: (r) => {
              const expired = isExpired(r.expires);
              // Expired beats the active flag in the badge — a code past its
              // date won't redeem even if is_active is still true.
              if (expired) return <StatusBadge status="inactive" label="Expired" />;
              return (
                <StatusBadge
                  status={r.active ? "active" : "inactive"}
                  label={r.active ? "Active" : "Inactive"}
                />
              );
            },
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (r) => (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => setEditing(r)}
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconEdit />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setConfirmDelete(r)}
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

      <PromoDrawer
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        onRegen={() => setEditing((d) => (d ? { ...d, code: generateCode() } : d))}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete promo code"
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
          Delete code <strong>{confirmDelete?.code}</strong>? Codes that have already been
          redeemed can&apos;t be deleted — deactivate them instead.
        </p>
      </Modal>
    </>
  );
}

function PromoDrawer({ editing, onClose, onSave, onRegen }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [drawerError, setDrawerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraft({ ...editing });
      setErrors({});
      setDrawerError(null);
    }
  }, [editing]);

  // React Compiler can pre-evaluate both ternary branches, so guard every
  // draft access with optional chaining even though `open` gates the body.
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
      // Surfaces server rejections like "Promo code already exists" (unique
      // constraint) or the percentage/negative guards.
      setDrawerError(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function clearError(key) {
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft?.id ? "Edit promo code" : "New promo code"}
      subtitle="Single-use or multi-use, fixed or percentage."
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
            <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
              <p className="font-body text-[12px] text-[#dc2626]">{drawerError}</p>
            </div>
          )}

          <Field
            label="Code"
            required
            hint="Customers will type this exactly at checkout — keep it short and memorable."
          >
            <div className="flex gap-2">
              <TextInput
                value={draft?.code || ""}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setDraft((d) => ({ ...d, code: v }));
                  clearError("code");
                }}
                className={
                  "font-display tracking-[1.4px] " +
                  (errors.code ? "border-[#dc2626] focus:border-[#dc2626]" : "")
                }
              />
              <Button variant="secondary" onClick={onRegen}>
                Generate
              </Button>
            </div>
            {errors.code ? (
              <span className="font-body text-[11px] text-[#dc2626]">{errors.code}</span>
            ) : null}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select
                value={draft?.type}
                onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                options={[
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed", label: "Fixed amount" },
                ]}
              />
            </Field>
            <Field
              label={draft?.type === "percentage" ? "Amount %" : "Amount JOD"}
              required
            >
              <NumberInput
                value={draft?.amount ?? ""}
                min="0"
                max={draft?.type === "percentage" ? "100" : undefined}
                step="0.01"
                onChange={(e) => {
                  // Store raw string so decimals (e.g. "5.50" for a fixed
                  // currency code) survive — coercion happens in toWirePayload /
                  // validateDraft. Coercing here would eat the trailing dot.
                  setDraft((d) => ({ ...d, amount: e.target.value }));
                  clearError("amount");
                }}
                className={errors.amount ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {errors.amount ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.amount}</span>
              ) : null}
            </Field>
          </div>

          <Field
            label="Redemptions per customer"
            hint="Once per customer = each account can redeem it a single time. Unlimited = no per-customer cap."
          >
            <Select
              value={draft?.usageType}
              onChange={(v) => setDraft((d) => ({ ...d, usageType: v }))}
              options={[
                { value: "multi", label: "Unlimited per customer" },
                { value: "single", label: "Once per customer" },
              ]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum order (JOD)" hint="0 = no minimum.">
              <NumberInput
                value={draft?.minOrder ?? ""}
                min="0"
                step="0.01"
                onChange={(e) => {
                  // Raw string for the same decimal-entry reason as Amount.
                  setDraft((d) => ({ ...d, minOrder: e.target.value }));
                  clearError("minOrder");
                }}
                className={errors.minOrder ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {errors.minOrder ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.minOrder}</span>
              ) : null}
            </Field>
            <Field
              label="Total usage limit"
              hint="Global cap across all customers. Leave blank for unlimited."
            >
              <NumberInput
                value={draft?.usageLimit ?? ""}
                min="1"
                step="1"
                placeholder="Unlimited"
                onChange={(e) => {
                  // Blank stays blank (= unlimited); never coerce to 0.
                  const raw = e.target.value;
                  setDraft((d) => ({ ...d, usageLimit: raw === "" ? "" : Number(raw) }));
                  clearError("usageLimit");
                }}
                className={errors.usageLimit ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {errors.usageLimit ? (
                <span className="font-body text-[11px] text-[#dc2626]">{errors.usageLimit}</span>
              ) : null}
            </Field>
          </div>

          <Field label="Expires" hint="Promo cannot be applied after this date. Blank = never expires.">
            <DateInput
              value={draft?.expires || ""}
              onChange={(e) => setDraft((d) => ({ ...d, expires: e.target.value }))}
            />
          </Field>

          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Inactive codes still appear here but cannot be redeemed at checkout.
              </p>
            </div>
            <Toggle checked={!!draft?.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
          </div>

          {draft?.id ? (
            <p className="font-body text-[11px] text-[#6b7280]">
              Redeemed {draft?.used ?? 0} time{(draft?.used ?? 0) === 1 ? "" : "s"} so far. The
              redemption count is managed automatically at checkout and can&apos;t be edited here.
            </p>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
