"use client";

import { useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconEye, IconTrash } from "@/components/admin/shared/Icons";
import { CONTACT_MESSAGES } from "@/lib/mockAdmin";

const STATUSES = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

export default function ContactManager() {
  const [messages, setMessages] = useState(CONTACT_MESSAGES);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(
    () =>
      messages.filter((m) => {
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        if (query) {
          const q = query.toLowerCase();
          const name = `${m.firstName} ${m.lastName}`.toLowerCase();
          if (!name.includes(q) && !m.email.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [messages, statusFilter, query]
  );

  const counts = useMemo(() => {
    const c = { all: messages.length, unread: 0, read: 0, replied: 0, archived: 0 };
    messages.forEach((m) => { c[m.status] = (c[m.status] || 0) + 1; });
    return c;
  }, [messages]);

  function markAs(id, status) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setViewing((v) => (v?.id === id ? { ...v, status } : v));
  }

  function remove(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setConfirmDelete(null);
    setViewing((v) => (v?.id === id ? null : v));
  }

  function openMessage(msg) {
    const next = msg.status === "unread" ? { ...msg, status: "read" } : msg;
    if (msg.status === "unread") markAs(msg.id, "read");
    setViewing(next);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          All <span className="ml-1 text-[10px] opacity-70">{counts.all}</span>
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s.value} active={statusFilter === s.value} onClick={() => setStatusFilter(s.value)}>
            {s.label} <span className="ml-1 text-[10px] opacity-70">{counts[s.value] || 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-4 rounded-[4px] border border-[#e5e7eb] bg-white p-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email..." />
      </div>

      <DataTable
        columns={[
          {
            key: "sender",
            label: "Sender",
            render: (m) => (
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                  {m.firstName[0]}{m.lastName[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="font-body text-[11px] text-[#6b7280]">{m.email}</p>
                  {m.phone ? (
                    <p className="font-body text-[11px] text-[#9ca3af]">{m.phone}</p>
                  ) : null}
                </div>
              </div>
            ),
          },
          {
            key: "message",
            label: "Message",
            render: (m) => (
              <p className="max-w-[320px] truncate font-body text-[13px] text-[#6b7280]">
                {m.message}
              </p>
            ),
          },
          {
            key: "date",
            label: "Received",
            width: 120,
          },
          {
            key: "status",
            label: "Status",
            width: 110,
            render: (m) => (
              <StatusBadge
                status={m.status}
                label={STATUSES.find((s) => s.value === m.status)?.label ?? m.status}
              />
            ),
          },
          {
            key: "actions",
            label: "",
            align: "right",
            width: 96,
            render: (m) => (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  aria-label="View message"
                  onClick={(e) => { e.stopPropagation(); openMessage(m); }}
                  className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                >
                  <span className="grid size-4 place-items-center">
                    <IconEye />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete message"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(m); }}
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
        onRowClick={openMessage}
        empty={
          <div className="flex flex-col items-center gap-2">
            <p className="font-body text-[13px] text-[#6b7280]">No messages found</p>
            {(query || statusFilter !== "all") ? (
              <p className="font-body text-[11px] text-[#9ca3af]">
                Try clearing the search or filter.
              </p>
            ) : null}
          </div>
        }
      />

      <MessageDrawer
        message={viewing}
        onClose={() => setViewing(null)}
        onMarkAs={markAs}
        onRequestDelete={(id) => {
          setViewing(null);
          setConfirmDelete(messages.find((m) => m.id === id) ?? null);
        }}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete message"
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
          Permanently delete the message from{" "}
          <strong>{confirmDelete?.firstName} {confirmDelete?.lastName}</strong>? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function MessageDrawer({ message, onClose, onMarkAs, onRequestDelete }) {
  const open = !!message;
  const statusLabel = STATUSES.find((s) => s.value === message?.status)?.label ?? message?.status;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={message ? `${message?.firstName} ${message?.lastName}` : ""}
      subtitle={
        message
          ? [message?.email, message?.phone].filter(Boolean).join(" · ")
          : ""
      }
      width={560}
      footer={
        <>
          {message?.status !== "archived" ? (
            <Button variant="secondary" onClick={() => onMarkAs(message?.id, "archived")}>
              Archive
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onMarkAs(message?.id, "read")}>
              Unarchive
            </Button>
          )}
          <Button
            variant="dangerSolid"
            onClick={() => onRequestDelete(message?.id)}
          >
            Delete
          </Button>
        </>
      }
    >
      {open && message ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={message.status} label={statusLabel} />
            <span className="font-body text-[12px] text-[#6b7280]">{message.date}</span>
          </div>

          <div className="rounded-[4px] border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="font-body text-[13px] leading-relaxed text-[#11191f]">
              {message.message}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(message.status === "unread" || message.status === "read") ? (
              <Button size="sm" onClick={() => onMarkAs(message.id, "replied")}>
                Mark as Replied
              </Button>
            ) : null}
            {message.status === "replied" || message.status === "archived" ? (
              <Button size="sm" variant="secondary" onClick={() => onMarkAs(message.id, "read")}>
                Mark as Read
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
