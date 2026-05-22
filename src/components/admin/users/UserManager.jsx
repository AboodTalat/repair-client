"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Field, TextInput, Select, Toggle, Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconMail } from "@/components/admin/shared/Icons";
import { USERS } from "@/lib/mockAdmin";
import Link from "next/link";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "delivery", label: "Delivery" },
  { value: "accounting", label: "Accounting" },
  { value: "customer", label: "Customer" },
];

export default function UserManager() {
  const [users, setUsers] = useState(USERS);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");
  const [marketingOnly, setMarketingOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (role !== "all" && u.role !== role) return false;
        if (marketingOnly && !u.marketingOptIn) return false;
        if (query) {
          const q = query.toLowerCase();
          if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [users, role, marketingOnly, query]
  );

  const counts = useMemo(() => {
    const c = { all: users.length, admin: 0, delivery: 0, accounting: 0, customer: 0 };
    users.forEach((u) => (c[u.role] = (c[u.role] || 0) + 1));
    return c;
  }, [users]);

  function save(values) {
    if (values.id) {
      setUsers((prev) => prev.map((u) => (u.id === values.id ? { ...u, ...values } : u)));
    } else {
      setUsers((prev) => [
        ...prev,
        { ...values, id: `u-${Date.now()}`, joined: new Date().toISOString().slice(0, 10) },
      ]);
    }
    setEditing(null);
  }
  function toggleActive(id) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  }
  function remove(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setConfirmDelete(null);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={role === "all"} onClick={() => setRole("all")}>
          All <span className="ml-1 text-[10px] opacity-70">{counts.all}</span>
        </Chip>
        {ROLES.map((r) => (
          <Chip key={r.value} active={role === r.value} onClick={() => setRole(r.value)}>
            {r.label} <span className="ml-1 text-[10px] opacity-70">{counts[r.value] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email..." />
        </div>
        <div className="flex items-center gap-3 rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] px-3 py-2">
          <span className="font-body text-[12px] text-[#6b7280]">Marketing opt-in only</span>
          <Toggle checked={marketingOnly} onChange={setMarketingOnly} />
        </div>
        <Link
          href="/r3pr-console/broadcast"
          className="inline-flex items-center gap-2 rounded-[2px] border border-[#e5e7eb] bg-white px-3 py-2 font-body text-[12px] font-medium text-[#11191f] hover:bg-[#f9fafb]"
        >
          <span className="grid size-3.5 place-items-center">
            <IconMail />
          </span>
          Email opted-in
        </Link>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setEditing({
              id: null,
              name: "",
              email: "",
              role: "delivery",
              active: true,
              marketingOptIn: false,
            })
          }
        >
          New account
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            label: "User",
            render: (u) => (
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                  {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] font-medium text-[#11191f]">{u.name}</p>
                  <p className="font-body text-[11px] text-[#6b7280]">{u.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            label: "Role",
            render: (u) => <StatusBadge status={u.role} label={u.role} dot />,
          },
          {
            key: "active",
            label: "Status",
            render: (u) => <StatusBadge status={u.active ? "active" : "inactive"} label={u.active ? "Active" : "Disabled"} />,
          },
          {
            key: "marketingOptIn",
            label: "Marketing",
            align: "center",
            render: (u) => u.marketingOptIn ? (
              <span className="font-body text-[13px] text-[#16a34a]" title="Opted in">✓</span>
            ) : (
              <span className="font-body text-[13px] text-[#d1d5db]" title="Not opted in">—</span>
            ),
          },
          { key: "joined", label: "Joined" },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (u) => (
              <div className="inline-flex items-center gap-2">
                <Toggle checked={u.active} onChange={() => toggleActive(u.id)} />
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => setEditing(u)}
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconEdit />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setConfirmDelete(u)}
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

      <UserDrawer editing={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete account"
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
          Permanently delete <strong>{confirmDelete?.name}</strong> ({confirmDelete?.email})? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function UserDrawer({ editing, onClose, onSave }) {
  const open = !!editing;
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (editing) setDraft({ ...editing });
  }, [editing]);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={draft.id ? "Edit account" : "New account"}
      subtitle="Role-based access — pick the right role for the right surface."
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
          <Field label="Full name" required>
            <TextInput value={draft.name || ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={draft.email || ""}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </Field>
          <Field label="Role" required hint="Determines which dashboards and actions are available.">
            <Select value={draft.role} onChange={(v) => setDraft((d) => ({ ...d, role: v }))} options={ROLES} />
          </Field>
          {!draft.id ? (
            <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
              <p className="font-body text-[12px] text-[#1e40af]">
                A welcome email with a temporary password will be sent to this address on save.
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Disabled accounts cannot sign in.
              </p>
            </div>
            <Toggle checked={!!draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
            <div>
              <p className="font-body text-[13px] font-medium text-[#11191f]">Marketing opt-in</p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Receives news and offers emails.
              </p>
            </div>
            <Toggle checked={!!draft.marketingOptIn} onChange={(v) => setDraft((d) => ({ ...d, marketingOptIn: v }))} />
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
