"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import PagedFooter from "@/components/admin/shared/PagedFooter";
import usePagedList from "@/components/admin/shared/usePagedList";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Chip, Field, SearchInput, TextArea } from "@/components/admin/shared/Form";
import { IconEye, IconTrash } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

const STATUSES = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA");
}

// Server rows are snake_case Sequelize instances; the table/drawer below speak
// camelCase + a pre-formatted `date`, so normalise once on the way in.
function normalize(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    date: formatDate(row.created_at),
    replyBody: row.reply_body || null,
    repliedAt: row.replied_at || null,
  };
}

/** Rows per page; the list loads more on demand. */
const PAGE_SIZE = 50;

export default function ContactManager() {
  // Debounced copy of the search box; the paged list refetches when its
  // fetcher identity changes, so debouncing here is what avoids a request
  // per keystroke.
  const [appliedQuery, setAppliedQuery] = useState("");
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0, replied: 0, archived: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState("");
  // usePagedList owns `error` for LOAD failures and clears it at the start of
  // every load. A MUTATION failure needs its own slot: these handlers refresh
  // the list right after a failed write, and that refresh would wipe the
  // message before the admin could read it. Rendered with priority over the
  // load error — it's the one the admin just caused.
  const [actionError, setActionError] = useState(null);

  const mountedRef = useRef(false);
  const debounceRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setAppliedQuery(query);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAppliedQuery(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchPage = useCallback(
    async ({ limit, offset }) => {
      const input = { limit, offset };
      if (statusFilter && statusFilter !== "all") input.status = statusFilter;
      if (appliedQuery) input.search = appliedQuery;
      const data = await repairCall("myAppAdminListContactMessages", input, { isQuery: true });
      // counts is an UNFILTERED per-status breakdown, so it describes the whole
      // table and stays correct on any page.
      const cmap = { unread: 0, read: 0, replied: 0, archived: 0 };
      (data.counts || []).forEach((c) => {
        if (c.status in cmap) cmap[c.status] = Number(c.cnt) || 0;
      });
      cmap.all = cmap.unread + cmap.read + cmap.replied + cmap.archived;
      setCounts(cmap);
      return { items: (data.items || []).map(normalize), total: data?.total };
    },
    [statusFilter, appliedQuery],
  );

  const list = usePagedList({ pageSize: PAGE_SIZE, fetchPage });
  const { items: messages, loading, error, setItems: setMessages } = list;

  // `silent` skips the post-write refetch — see openMessage. The optimistic
  // patch above already shows the new status either way, and the failure path
  // always refetches so a rejected write can never leave a lie on screen.
  async function markAs(id, status, { silent = false } = {}) {
    setActionError(null);
    // Optimistic — reconcile via refetch.
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setViewing((v) => (v?.id === id ? { ...v, status } : v));
    const from = messages.find((m) => m.id === id)?.status;
    try {
      await repairCall(
        "myAppAdminUpdateContactMessageStatus",
        { id: Number(id), status },
        { isQuery: false }
      );
      if (silent) {
        // Keep the chips honest without paying for a refetch.
        if (from && from !== status) {
          setCounts((c) => ({
            ...c,
            [from]: Math.max((c[from] || 0) - 1, 0),
            [status]: (c[status] || 0) + 1,
          }));
        }
        return;
      }
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to update message");
      await list.refresh();
    }
  }

  async function remove(id) {
    setActionError(null);
    setConfirmDelete(null);
    setViewing((v) => (v?.id === id ? null : v));
    try {
      await repairCall("myAppAdminDeleteContactMessage", { id: Number(id) }, { isQuery: false });
      await list.refresh();
    } catch (err) {
      setActionError(err?.message || "Failed to delete message");
    }
  }

  // Throws on failure so the drawer can surface the error inline.
  async function reply(id, replyBody) {
    await repairCall(
      "myAppAdminReplyContactMessage",
      { id: Number(id), replyBody },
      { isQuery: false }
    );
    showToast("Reply sent");
    setViewing((v) => (v?.id === id ? { ...v, status: "replied", replyBody } : v));
    await list.refresh();
  }

  function openMessage(msg) {
    setViewing(msg);
    // Auto-advance unread → read on open. Deliberately `silent`: this is the
    // only markAs call the admin didn't ask for, and refetching on it turned
    // READING a message into a list mutation — the hook always reloads from
    // offset 0, so anyone who had pressed "Load more" lost every page past the
    // first just by opening something. Under the Unread chip it was worse: the
    // row vanished out from under the drawer that was displaying it.
    if (msg.status === "unread") markAs(msg.id, "read", { silent: true });
  }

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-[2px] bg-[#11191f] px-4 py-3 font-body text-[13px] text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {actionError || error ? (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{actionError || error}</p>
        </div>
      ) : null}

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
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or message..." />
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[13px] text-[#6b7280]">Loading messages...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "sender",
              label: "Sender",
              render: (m) => (
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                    {(m.firstName?.[0] || "") + (m.lastName?.[0] || "")}
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
            { key: "date", label: "Received", width: 120 },
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
          rows={messages}
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
      )}

      {!loading && messages.length > 0 ? (
        <PagedFooter
          shown={messages.length}
          total={list.total}
          hasMore={list.hasMore}
          loading={loading}
          loadingMore={list.loadingMore}
          onLoadMore={list.loadMore}
          noun="message"
        />
      ) : null}

      <MessageDrawer
        message={viewing}
        onClose={() => setViewing(null)}
        onMarkAs={markAs}
        onReply={reply}
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

function MessageDrawer({ message, onClose, onMarkAs, onReply, onRequestDelete }) {
  const open = !!message;
  const statusLabel = STATUSES.find((s) => s.value === message?.status)?.label ?? message?.status;

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Reset the composer whenever a different message opens.
  //
  // Render-phase adjustment, not an effect: this is state DERIVED from which
  // message is open, so resetting it in an effect meant one render still showed
  // the previous message's half-typed reply before it cleared. React re-runs the
  // component immediately on a render-phase update, before painting.
  const [composerFor, setComposerFor] = useState(message?.id);
  if (message?.id !== composerFor) {
    setComposerFor(message?.id);
    setReplyText("");
    setReplyError(null);
    setSending(false);
  }

  async function handleSend() {
    const body = replyText.trim();
    if (!body) {
      setReplyError("Please write a reply before sending.");
      return;
    }
    setReplyError(null);
    setSending(true);
    try {
      await onReply(message.id, body);
      setReplyText("");
    } catch (err) {
      setReplyError(err?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={message ? `${message?.firstName} ${message?.lastName}` : ""}
      subtitle={message ? [message?.email, message?.phone].filter(Boolean).join(" · ") : ""}
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
          <Button variant="dangerSolid" onClick={() => onRequestDelete(message?.id)}>
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
            <p className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-[#11191f]">
              {message.message}
            </p>
          </div>

          {message.replyBody ? (
            <div className="rounded-[4px] border border-[#dcfce7] bg-[#f0fdf4] p-4">
              <p className="mb-1 font-body text-[11px] font-semibold uppercase tracking-[1px] text-[#166534]">
                Your reply{message.repliedAt ? ` · ${formatDate(message.repliedAt)}` : ""}
              </p>
              <p className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-[#11191f]">
                {message.replyBody}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(message.status === "unread" || message.status === "read") ? (
              <Button size="sm" variant="secondary" onClick={() => onMarkAs(message.id, "replied")}>
                Mark as Replied
              </Button>
            ) : null}
            {(message.status === "replied" || message.status === "archived") ? (
              <Button size="sm" variant="secondary" onClick={() => onMarkAs(message.id, "read")}>
                Mark as Read
              </Button>
            ) : null}
          </div>

          <div className="border-t border-[#e5e7eb] pt-5">
            <Field
              label={message.replyBody ? "Send another reply" : "Reply to customer"}
              hint={`This emails ${message.email} and marks the message as replied.`}
            >
              <TextArea
                rows={5}
                value={replyText}
                onChange={(e) => { setReplyText(e.target.value); setReplyError(null); }}
                placeholder="Type your reply..."
                maxLength={8000}
              />
            </Field>
            {replyError ? (
              <p className="mt-1 font-body text-[11px] text-[#dc2626]">{replyError}</p>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
