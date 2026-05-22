"use client";

import { useEffect, useMemo, useState } from "react";
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
import { PROMO_CODES, formatCurrency } from "@/lib/mockAdmin";

export default function PromoManager() {
  const [codes, setCodes] = useState(PROMO_CODES);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    return codes.filter((c) => {
      if (filter === "active" && !c.active) return false;
      if (filter === "expired" && c.active) return false;
      if (query && !c.code.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [codes, query, filter]);

  function save(values) {
    if (values.id) {
      setCodes((prev) => prev.map((c) => (c.id === values.id ? { ...c, ...values } : c)));
    } else {
      setCodes((prev) => [...prev, { ...values, id: `pc-${Date.now()}`, used: 0 }]);
    }
    setEditing(null);
  }

  function remove(id) {
    setCodes((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
  }

  function generateCode() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return "PROMO" + random;
  }

  return (
    <>
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
              usageLimit: 0,
              expires: "",
              active: true,
            })
          }
        >
          New code
        </Button>
      </div>

      <DataTable
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
          { key: "expires", label: "Expires" },
          {
            key: "active",
            label: "Status",
            render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} label={r.active ? "Active" : "Expired"} />,
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

      <PromoDrawer editing={editing} onClose={() => setEditing(null)} onSave={save} onRegen={() => {
        setEditing((d) => ({ ...d, code: generateCode() }));
      }} />

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
          Delete code <strong>{confirmDelete?.code}</strong>? Existing redemptions are preserved in reports.
        </p>
      </Modal>
    </>
  );
}

function PromoDrawer({ editing, onClose, onSave, onRegen }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (editing) setDraft({ ...editing });
  }, [editing]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft.id ? "Edit promo code" : "New promo code"}
      subtitle="Single-use or multi-use, fixed or percentage."
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
          <Field label="Code" required hint="Customers will type this exactly at checkout — keep it short and memorable.">
            <div className="flex gap-2">
              <TextInput
                value={draft.code || ""}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                className="font-display tracking-[1.4px]"
              />
              <Button variant="secondary" onClick={onRegen}>
                Generate
              </Button>
            </div>
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
            <Field label="Minimum order (JOD)" hint="0 = no minimum.">
              <NumberInput
                value={draft.minOrder ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, minOrder: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Usage limit" hint="0 = unlimited.">
              <NumberInput
                value={draft.usageLimit ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, usageLimit: Number(e.target.value) || 0 }))}
              />
            </Field>
          </div>
          <Field label="Expires" hint="Promo cannot be applied after this date.">
            <DateInput value={draft.expires || ""} onChange={(e) => setDraft((d) => ({ ...d, expires: e.target.value }))} />
          </Field>
          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Inactive codes still appear in reports but cannot be redeemed.
              </p>
            </div>
            <Toggle checked={!!draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
