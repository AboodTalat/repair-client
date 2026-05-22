"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import {
  Field,
  NumberInput,
  Select,
  Toggle,
  DateInput,
  Chip,
  SearchInput,
} from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash } from "@/components/admin/shared/Icons";
import {
  DISCOUNTS,
  PRODUCTS,
  MAJOR_CATEGORIES,
  SUB_CATEGORIES,
  formatCurrency,
} from "@/lib/mockAdmin";

const SCOPES = [
  { value: "product", label: "Product" },
  { value: "sub-category", label: "Sub-category" },
  { value: "major-category", label: "Major category" },
];

export default function DiscountManager() {
  const [discounts, setDiscounts] = useState(DISCOUNTS);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(
    () =>
      discounts.filter((d) => {
        if (scope !== "all" && d.scope !== scope) return false;
        if (query && !d.target.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [discounts, query, scope]
  );

  function save(values) {
    if (values.id) {
      setDiscounts((prev) => prev.map((d) => (d.id === values.id ? { ...d, ...values } : d)));
    } else {
      setDiscounts((prev) => [...prev, { ...values, id: `d-${Date.now()}` }]);
    }
    setEditing(null);
  }
  function remove(id) {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    setConfirmDelete(null);
  }

  return (
    <>
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
              target: "",
              type: "percentage",
              amount: 10,
              starts: "",
              ends: "",
              active: true,
            })
          }
        >
          New discount
        </Button>
      </div>

      <DataTable
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
            render: (d) => <span className="font-body text-[13px] font-medium text-[#11191f]">{d.target}</span>,
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
                {d.starts} → {d.ends}
              </span>
            ),
          },
          {
            key: "active",
            label: "Status",
            render: (d) => <StatusBadge status={d.active ? "active" : "inactive"} label={d.active ? "Active" : "Inactive"} />,
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

      <DiscountDrawer editing={editing} onClose={() => setEditing(null)} onSave={save} />

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
          Delete discount on <strong>{confirmDelete?.target}</strong>?
        </p>
      </Modal>
    </>
  );
}

function DiscountDrawer({ editing, onClose, onSave }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (editing) setDraft({ ...editing });
  }, [editing]);

  const targetOptions = useMemo(() => {
    if (draft.scope === "major-category") {
      return MAJOR_CATEGORIES.map((m) => ({ value: m.name, label: m.name }));
    }
    if (draft.scope === "sub-category") {
      return SUB_CATEGORIES.map((s) => {
        const major = MAJOR_CATEGORIES.find((m) => m.id === s.majorId);
        const lab = `${major?.name} · ${s.name}`;
        return { value: lab, label: lab };
      });
    }
    return PRODUCTS.map((p) => ({ value: p.name, label: p.name }));
  }, [draft.scope]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft.id ? "Edit discount" : "New discount"}
      subtitle="Discounts apply automatically — promo codes are configured separately."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </>
      }
    >
      {open ? (
        <div className="flex flex-col gap-4">
          <Field label="Scope" required>
            <Select
              value={draft.scope}
              onChange={(v) => setDraft((d) => ({ ...d, scope: v, target: "" }))}
              options={SCOPES}
            />
          </Field>
          <Field label="Applies to" required>
            <Select
              value={draft.target}
              onChange={(v) => setDraft((d) => ({ ...d, target: v }))}
              options={targetOptions}
              placeholder="Select target..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select
                value={draft.type}
                onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                options={[
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed", label: "Fixed amount" },
                ]}
              />
            </Field>
            <Field label={draft.type === "percentage" ? "Amount %" : "Amount JOD"} required>
              <NumberInput
                value={draft.amount ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, amount: Number(e.target.value) || 0 }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts" required>
              <DateInput value={draft.starts || ""} onChange={(e) => setDraft((d) => ({ ...d, starts: e.target.value }))} />
            </Field>
            <Field label="Ends" required>
              <DateInput value={draft.ends || ""} onChange={(e) => setDraft((d) => ({ ...d, ends: e.target.value }))} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Inactive discounts don't apply even within their valid window.
              </p>
            </div>
            <Toggle checked={!!draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
