"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import PagedFooter from "@/components/admin/shared/PagedFooter";
import usePagedList from "@/components/admin/shared/usePagedList";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Field, TextInput, Select, Toggle, Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconMail } from "@/components/admin/shared/Icons";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { DEFAULT_COUNTRY, phoneLengthFor } from "@/lib/countryCodes";
import { repairCall } from "@/lib/repairAuthedApi";
import { useSearchParams } from "next/navigation";
import { useRepairStore, selectUser } from "@/lib/useRepairStore";
import Link from "next/link";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "delivery", label: "Delivery" },
  { value: "accounting", label: "Accounting" },
  { value: "customer", label: "Customer" },
];

// Mirrors ADMIN_EMAIL_RE in the backend auth.ts — keep the two in lockstep.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mirrors normalizeAdminPhone in the backend auth.ts — keep the two in lockstep.
// Deliberately country-agnostic: the per-country digit rules live in the create
// form's country picker, and bare digits are allowed so rows stored before that
// picker existed stay editable.
const PHONE_RE = /^\+?\d{7,15}$/;

// repairCall throws with a message shaped like "repairClientApi <op>: <server
// message>". Strip the prefix so the admin sees the server's own reason (e.g.
// "Please enter a valid email address"). Mirrors the other admin managers.
function cleanErr(e, fallback) {
  const m = (e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
  return m || fallback;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA");
}

function initials(email) {
  if (!email) return "?";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function stripPhone(localDigits, dialCode) {
  return localDigits
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .replace(new RegExp(`^${dialCode}`), "");
}

function buildPhone(localDigits, dialCode) {
  if (!localDigits) return null;
  const stripped = stripPhone(localDigits, dialCode);
  if (!stripped) return null;
  return `+${dialCode}${stripped}`;
}

/** Rows per page; the list loads more on demand. */
const PAGE_SIZE = 50;

export default function UserManager() {
  // Debounced copy of the search box — the paged list refetches when its
  // fetcher identity changes, so this is what avoids a request per keystroke.
  // Seeded from `?q=` so the TopBar global search can hand off a term and land
  // on a pre-filtered list. Read during the useState initializer (not a mount
  // effect) — an effect here would be a `set-state-in-effect` lint error and
  // would flash the unfiltered list for one frame first.
  const initialQ = useSearchParams().get("q") || "";
  const [appliedQuery, setAppliedQuery] = useState(initialQ);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState(initialQ);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  // MUTATION errors live here, separate from usePagedList's `error`, which is
  // for LOAD failures only and is cleared by every refetch. The toggle and
  // delete handlers below used to call a `setError` that was never declared in
  // this component (the only one in the file belongs to ResetPasswordModal), so
  // both threw `ReferenceError: setError is not defined` on their first line —
  // inside an async function, so the rejection was unhandled and nothing
  // surfaced. Neither action worked at all and neither said so: the toggle
  // snapped back, and Delete left its confirm modal sitting open. Verified in
  // the browser before the fix.
  const [actionError, setActionError] = useState(null);

  const me = useRepairStore(selectUser);
  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

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
      if (role && role !== "all") input.role = role;
      if (appliedQuery) input.search = appliedQuery;
      const data = await repairCall("myAppAdminListUsers", input, { isQuery: true });
      return { items: data.users || [], total: data?.total };
    },
    [role, appliedQuery],
  );

  const list = usePagedList({ pageSize: PAGE_SIZE, fetchPage });
  const { items: users, total, loading, error, setItems: setUsers } = list;

  async function save(values) {
    setSaving(true);
    try {
      // The Thunder connection only applies to delivery accounts (the backend
      // also enforces this); send false for any other role.
      const thunderConnected = values.role === "delivery" ? !!values.thunder_connected : false;
      if (values.id) {
        await repairCall("myAppAdminUpdateUser", {
          userId: Number(values.id),
          // TRIMMED before the wire. validate() checks a trimmed COPY, so an
          // address pasted with a trailing space passed validation and was then
          // stored padded — and myAppLogin matches the stored string exactly,
          // so that account could never sign in again.
          email: (values.email || "").trim(),
          phone: (values.phone || "").trim() || null,
          role: values.role,
          thunder_connected: thunderConnected,
        }, { isQuery: false });
      } else {
        const phone = buildPhone(values.phoneLocal, values.phoneDial);
        // Omitting `password` entirely is what selects the backend's setup-link
        // branch: it mints a single-use password_reset_tokens row and emails a
        // link so the user picks their own, and the admin never learns the
        // credential. Sending one instead puts the plaintext password in the
        // welcome email. Don't send `password: ""` — the resolver branches on
        // truthiness, so an empty string takes the link path by accident rather
        // than by intent, which is a bad thing to leave resting on coercion.
        await repairCall("myAppAdminCreateUser", {
          email: (values.email || "").trim(),
          phone,
          role: values.role,
          ...(values.pwMode === "set" ? { password: values.password } : {}),
          is_active: values.is_active ?? true,
          thunder_connected: thunderConnected,
        }, { isQuery: false });
      }
      setEditing(null);
      await list.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    setActionError(null);
    const newActive = !user.is_active;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: newActive } : u)));
    try {
      await repairCall("myAppAdminToggleUserActive", {
        userId: Number(user.id),
        isActive: newActive,
      }, { isQuery: false });
      // No refresh on success. The optimistic patch above is already the whole
      // change, and `usePagedList.refresh()` reloads from offset 0 — so on a
      // long list an admin who had pressed "Load more" lost every page past the
      // first as a side effect of flipping one switch. The failure path below
      // still reverts, so a rejected write can't leave a lie on screen.
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u)));
      setActionError(cleanErr(err, "Failed to update user"));
    }
  }

  async function remove(id) {
    setActionError(null);
    setNotice(null);
    setConfirmDelete(null);
    try {
      // The resolver has TWO outcomes and the response is the only thing that
      // distinguishes them: a user with order history is DEACTIVATED instead of
      // deleted (orders.user_id is ON DELETE RESTRICT). The result used to be
      // discarded, so that case looked like a failed delete — the row was still
      // there after the refresh, with nothing saying why.
      const res = await repairCall("myAppAdminDeleteUser", { userId: Number(id) }, { isQuery: false });
      await list.refresh();
      setNotice(res?.message || "User deleted");
    } catch (err) {
      setActionError(cleanErr(err, "Failed to delete user"));
    }
  }

  const isSelf = (u) => me && Number(u.id) === Number(me.id);

  return (
    <>
      {/* Load failure. Passed through cleanErr like every other message on this
          page — the raw value carries repairCall's `repairClientApi <op>:`
          prefix, so a dead session rendered as
          "repairClientApi myAppAdminListUsers: Un Authenticated User". */}
      {error && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{cleanErr({ message: error }, "Failed to load users")}</p>
        </div>
      )}

      {actionError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{actionError}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setActionError(null)}
            className="font-body text-[12px] text-[#dc2626] underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
          <p className="font-body text-[13px] text-[#166534]">{notice}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
            className="font-body text-[12px] text-[#166534] underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={role === "all"} onClick={() => setRole("all")}>
          All {role === "all" && <span className="ml-1 text-[10px] opacity-70">{total}</span>}
        </Chip>
        {ROLES.map((r) => (
          <Chip key={r.value} active={role === r.value} onClick={() => setRole(r.value)}>
            {r.label} {role === r.value && <span className="ml-1 text-[10px] opacity-70">{total}</span>}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-[4px] border border-[#e5e7eb] bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by email or phone..." />
        </div>
        <Link
          href="/r3pr-console/broadcast"
          className="inline-flex items-center gap-2 rounded-[2px] border border-[#e5e7eb] bg-white px-3 py-2 font-body text-[12px] font-medium text-[#11191f] hover:bg-[#f9fafb]"
        >
          <span className="grid size-3.5 place-items-center">
            <IconMail />
          </span>
          Broadcast email
        </Link>
        <Button
          icon={<IconPlus />}
          onClick={() =>
            setEditing({
              id: null,
              email: "",
              phoneLocal: "",
              phoneDial: DEFAULT_COUNTRY.dial,
              phoneIso2: DEFAULT_COUNTRY.iso2,
              phoneCountry: DEFAULT_COUNTRY,
              role: "delivery",
              is_active: true,
              pwMode: "link",
              password: "",
              confirmPassword: "",
            })
          }
        >
          New account
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
          <div className="flex items-center gap-3">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
            <p className="font-body text-[13px] text-[#6b7280]">Loading users...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "email",
              label: "User",
              render: (u) => (
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#11191f] font-display text-[11px] font-bold uppercase text-white">
                    {initials(u.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-body text-[13px] font-medium text-[#11191f]">{u.email}</p>
                    {u.phone && <p className="font-body text-[11px] text-[#6b7280]">{u.phone}</p>}
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
              key: "is_active",
              label: "Status",
              render: (u) => <StatusBadge status={u.is_active ? "active" : "inactive"} label={u.is_active ? "Active" : "Disabled"} />,
            },
            { key: "created_at", label: "Joined", render: (u) => formatDate(u.created_at) },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (u) => (
                <div className="inline-flex items-center gap-2">
                  {!isSelf(u) && (
                    <Toggle checked={u.is_active} onChange={() => toggleActive(u)} />
                  )}
                  <button
                    type="button"
                    aria-label="Reset password"
                    title="Reset password"
                    onClick={() => {
                      setNotice(null);
                      setResetting(u);
                    }}
                    className="grid size-8 place-items-center rounded-[2px] text-[#11191f] hover:bg-[#f3f4f6]"
                  >
                    <span className="grid size-4 place-items-center">
                      <KeyIcon />
                    </span>
                  </button>
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
                  {!isSelf(u) && (
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
                  )}
                </div>
              ),
            },
          ]}
          rows={users}
        />
      )}

      {!loading && users.length > 0 ? (
        <PagedFooter
          shown={users.length}
          total={total}
          hasMore={list.hasMore}
          loading={loading}
          loadingMore={list.loadingMore}
          onLoadMore={list.loadMore}
          noun="user"
        />
      ) : null}

      <UserDrawer
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        saving={saving}
        isSelf={editing && me && Number(editing.id) === Number(me.id)}
      />

      <ResetPasswordModal
        user={resetting}
        onClose={() => setResetting(null)}
        onDone={(msg) => {
          setResetting(null);
          setNotice(msg);
        }}
      />

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
          Permanently delete <strong>{confirmDelete?.email}</strong>? If this user has order history, the account will be deactivated instead.
        </p>
      </Modal>
    </>
  );
}

function EyeOpen() {
  return (
    <svg viewBox="0 0 18 16" fill="none" className="size-4" aria-hidden>
      <path d="M1.5 8S5 3.5 9 3.5 16.5 8 16.5 8 13 12.5 9 12.5 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="9" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function EyeClosed() {
  return (
    <svg viewBox="0 0 18 16" fill="none" className="size-4" aria-hidden>
      <path d="M1 1l16 14M9 3.5c4 0 7.5 4.5 7.5 4.5s-.85 1.1-2.2 2.3M6.5 4.5C4.4 5.6 1.5 8 1.5 8s3.5 4.5 7.5 4.5c1 0 1.95-.2 2.8-.55M7.2 6.2A2.3 2.3 0 009 10.5c.55 0 1.05-.2 1.45-.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="size-4" aria-hidden>
      <circle cx="6" cy="6" r="3.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.3 8.3l6 6M12.3 12.3l1.6-1.6M11 11l1.6-1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Admin password-reset dialog. Two modes ("offer both"):
//   • link → myAppAdminSendPasswordReset (user picks their own password)
//   • set  → myAppAdminSetUserPassword (admin sets it directly)
// React-Compiler note: every `user?.x` access is optional-chained and the body
// is gated `{open && user ? … : null}` because the compiler can pre-evaluate
// both ternary branches during memoization analysis (see repair/CLAUDE.md).
function ResetPasswordModal({ user, onClose, onDone }) {
  const open = !!user;
  const [mode, setMode] = useState("link");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset the modal whenever it opens on a different user. This is React's
  // documented "adjust state when a prop changes" pattern — compare against the
  // previous prop DURING render — not a prop effect. An effect would paint one
  // frame carrying the PREVIOUS user's half-typed password before clearing it,
  // and trips react-hooks/set-state-in-effect. Tracking `prevUser` including
  // null means closing the modal resets the tracker, so reopening on the same
  // user still clears. Same shape as DiscountManager's drawer seeding.
  const [prevUser, setPrevUser] = useState(null);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setMode("link");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
      setBusy(false);
      setError(null);
      setFieldErrors({});
    }
  }

  async function submit() {
    if (!user) return;
    setError(null);

    if (mode === "set") {
      const errs = {};
      if (!password) errs.password = "Password is required.";
      else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
      if (!confirmPassword) errs.confirmPassword = "Please confirm the password.";
      else if (password && confirmPassword !== password) errs.confirmPassword = "Passwords do not match.";
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }

    setBusy(true);
    try {
      if (mode === "link") {
        await repairCall("myAppAdminSendPasswordReset", { userId: Number(user.id) }, { isQuery: false });
        onDone(`Password reset link sent to ${user.email}.`);
      } else {
        await repairCall("myAppAdminSetUserPassword", { userId: Number(user.id), password }, { isQuery: false });
        onDone(`Password updated for ${user.email}. A notification email was sent — share the new password with them directly.`);
      }
    } catch (err) {
      setError(cleanErr(err, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Working..." : mode === "link" ? "Send reset link" : "Set password"}
          </Button>
        </>
      }
    >
      {open && user ? (
        <div className="flex flex-col gap-4">
          <p className="font-body text-[13px] text-[#11191f]">
            Reset the password for <strong>{user?.email}</strong>.
          </p>

          {error && (
            <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
              <p className="font-body text-[12px] text-[#dc2626]">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Chip active={mode === "link"} onClick={() => setMode("link")}>
              Email a reset link
            </Chip>
            <Chip active={mode === "set"} onClick={() => setMode("set")}>
              Set a new password
            </Chip>
          </div>

          {mode === "link" ? (
            <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
              <p className="font-body text-[12px] text-[#1e40af]">
                We&apos;ll email {user?.email} a single-use link (valid 1 hour) so they can choose their own new password. You never see the password, and their active sessions stay signed in until the reset completes.
              </p>
            </div>
          ) : (
            <>
              <Field label="New password" required>
                <PasswordField
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((x) => ({ ...x, password: undefined }));
                  }}
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
                {fieldErrors.password && (
                  <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.password}</span>
                )}
              </Field>
              <Field label="Confirm password" required>
                <PasswordField
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((x) => ({ ...x, confirmPassword: undefined }));
                  }}
                  visible={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
                {fieldErrors.confirmPassword && (
                  <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.confirmPassword}</span>
                )}
              </Field>
              <div className="rounded-[2px] border border-[#fef3c7] bg-[#fffbeb] p-3">
                <p className="font-body text-[12px] text-[#92400e]">
                  The account&apos;s active sessions will be signed out. Share the new password with the user directly — the notification email won&apos;t include it.
                </p>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
  return (
    <div className="relative">
      <TextInput
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 grid size-5 place-items-center text-[#6b7280] hover:text-[#11191f]"
      >
        {visible ? <EyeClosed /> : <EyeOpen />}
      </button>
    </div>
  );
}

function UserDrawer({ editing, onClose, onSave, saving, isSelf }) {
  const open = !!editing;
  const isNew = open && !editing?.id;
  const [draft, setDraft] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [drawerError, setDrawerError] = useState(null);

  // Seed the form from the account being edited — compared DURING render rather
  // than in a prop effect, for the same reasons as the reset modal above: an
  // effect paints one frame holding the previous account's values (visibly
  // wrong in a drawer showing someone's email) and trips
  // react-hooks/set-state-in-effect. `prevEditing` tracks null too, so closing
  // and reopening the same row still reseeds instead of keeping a stale draft.
  const [prevEditing, setPrevEditing] = useState(null);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setDraft({
        ...editing,
        phoneLocal: editing.phoneLocal ?? "",
        phoneDial: editing.phoneDial ?? DEFAULT_COUNTRY.dial,
        phoneIso2: editing.phoneIso2 ?? DEFAULT_COUNTRY.iso2,
        phoneCountry: editing.phoneCountry ?? DEFAULT_COUNTRY,
        password: "",
        confirmPassword: "",
      });
      setShowPassword(false);
      setShowConfirm(false);
      setFieldErrors({});
      setDrawerError(null);
    }
  }

  const phoneLen = phoneLengthFor(draft.phoneIso2 || DEFAULT_COUNTRY.iso2);
  const phoneInputMax = phoneLen.max + 1;

  function handleCountryChange(c) {
    const next = phoneLengthFor(c.iso2);
    setDraft((d) => ({
      ...d,
      phoneCountry: c,
      phoneDial: c.dial,
      phoneIso2: c.iso2,
      phoneLocal: (d.phoneLocal || "").slice(0, next.max + 1),
    }));
    setFieldErrors((e) => ({ ...e, phone: undefined }));
  }

  function handlePhoneChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, phoneInputMax);
    setDraft((d) => ({ ...d, phoneLocal: digits }));
    setFieldErrors((e) => ({ ...e, phone: undefined }));
  }

  function handlePhoneKeyDown(e) {
    if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }

  function clearFieldError(field) {
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};

    const email = (draft.email || "").trim();
    if (!email) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) errs.email = "Please enter a valid email address.";

    if (isNew) {
      const localDigits = (draft.phoneLocal || "").replace(/\D/g, "");
      if (!localDigits) {
        errs.phone = "Phone number is required.";
      } else {
        const stripped = stripPhone(localDigits, draft.phoneDial);
        if (!stripped) {
          errs.phone = "Phone number is required.";
        } else {
          const { min, max } = phoneLengthFor(draft.phoneIso2);
          if (stripped.length < min || stripped.length > max) {
            const expected = min === max ? `${min} digits` : `${min}–${max} digits`;
            errs.phone = `Phone must be ${expected} for the selected country.`;
          }
        }
      }

      // Only validated on the "set a password now" branch — the setup-link
      // branch deliberately sends no password at all.
      if (draft.pwMode === "set") {
        const pw = draft.password || "";
        if (!pw) errs.password = "Password is required.";
        else if (pw.length < 8) errs.password = "Password must be at least 8 characters.";

        const cpw = draft.confirmPassword || "";
        if (!cpw) errs.confirmPassword = "Please confirm the password.";
        else if (pw && cpw !== pw) errs.confirmPassword = "Passwords do not match.";
      }
    } else {
      // Edit mode has a plain text field rather than the create form's country
      // picker, and used to check only that it was non-empty — so an admin could
      // save "hello world" as someone's phone, and the server stored it (it
      // trimmed and length-capped, nothing more). That column is a unique
      // login-adjacent key, the driver's tel: link, and what the Thunder courier
      // integration reformats at dispatch. Mirrors the backend rule now: E.164,
      // or bare digits for rows that predate the picker.
      const phone = (draft.phone || "").trim();
      if (!phone) errs.phone = "Phone number is required.";
      else if (!PHONE_RE.test(phone)) errs.phone = "Enter a valid phone number, e.g. +962791234567.";
    }

    if (!draft.role) errs.role = "Role is required.";

    return errs;
  }

  async function handleSave() {
    setDrawerError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await onSave(draft);
    } catch (err) {
      const msg = cleanErr(err, "");
      const lower = msg.toLowerCase();
      if (lower.includes("email") && lower.includes("already")) {
        setFieldErrors((e) => ({ ...e, email: "This email is already registered." }));
      } else if (lower.includes("phone") && lower.includes("already")) {
        setFieldErrors((e) => ({ ...e, phone: "This phone number is already registered." }));
      } else {
        setDrawerError(msg || "Something went wrong.");
      }
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isNew ? "New account" : "Edit account"}
      subtitle="Role-based access — pick the right role for the right surface."
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
      {open ? (
        <div className="flex flex-col gap-4">
          {drawerError && (
            <div className="rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
              <p className="font-body text-[12px] text-[#dc2626]">{drawerError}</p>
            </div>
          )}

          <Field label="Email" required>
            <TextInput
              type="email"
              value={draft.email || ""}
              onChange={(e) => {
                setDraft((d) => ({ ...d, email: e.target.value }));
                clearFieldError("email");
              }}
              className={fieldErrors.email ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
            />
            {fieldErrors.email && (
              <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.email}</span>
            )}
          </Field>

          {isNew ? (
            <Field label="Phone number" required>
              <div
                className={`flex h-10 w-full items-center rounded-[2px] border bg-white transition-colors focus-within:border-[#11191f] ${
                  fieldErrors.phone ? "border-[#dc2626]" : "border-[#e5e7eb]"
                }`}
              >
                <div className="flex shrink-0 items-center pl-3">
                  <CountryCodePicker
                    value={draft.phoneCountry || DEFAULT_COUNTRY}
                    onChange={handleCountryChange}
                  />
                  <span aria-hidden className="ml-2 h-4 w-px shrink-0 bg-[#e5e7eb]" />
                </div>
                <input
                  type="tel"
                  value={draft.phoneLocal || ""}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={phoneInputMax}
                  placeholder="Phone number"
                  className="h-full flex-1 bg-transparent px-3 font-body text-[14px] text-[#11191f] placeholder:text-[#9ca3af] outline-none"
                />
              </div>
              {fieldErrors.phone && (
                <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.phone}</span>
              )}
            </Field>
          ) : (
            <Field label="Phone" required>
              <TextInput
                type="tel"
                value={draft.phone || ""}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, phone: e.target.value }));
                  clearFieldError("phone");
                }}
                className={fieldErrors.phone ? "border-[#dc2626] focus:border-[#dc2626]" : ""}
              />
              {fieldErrors.phone && (
                <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.phone}</span>
              )}
            </Field>
          )}

          <Field label="Role" required hint="Determines which dashboards and actions are available.">
            <Select
              value={draft.role}
              onChange={(v) => {
                setDraft((d) => ({ ...d, role: v }));
                clearFieldError("role");
              }}
              options={ROLES}
              disabled={isSelf}
            />
            {fieldErrors.role && (
              <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.role}</span>
            )}
          </Field>
          {isSelf && (
            <div className="rounded-[2px] border border-[#fef3c7] bg-[#fffbeb] p-3">
              <p className="font-body text-[12px] text-[#92400e]">
                You cannot change your own role.
              </p>
            </div>
          )}

          {draft.role === "delivery" ? (
            <Field
              label="Thunder courier"
              hint="Mark this delivery account as the external Thunder courier."
            >
              <Toggle
                checked={!!draft.thunder_connected}
                onChange={(v) => setDraft((d) => ({ ...d, thunder_connected: v }))}
                label="Connect to Thunder delivery"
              />
            </Field>
          ) : null}

          {isNew ? (
            <>
              {/* Two ways for the new account to get a password, and they are
                  not equivalent. The link path emails a single-use setup link
                  and the admin never learns the credential; the direct path puts
                  the plaintext password in the welcome email. The backend has
                  supported both since it was written, but this drawer required a
                  password, so the safer branch was unreachable and every account
                  created here had its password mailed in the clear — while the
                  sibling "Reset password" modal took the opposite care, sending a
                  notify-only email precisely so no credential goes out by mail.
                  Link is the default; the direct path stays for handing someone
                  a password in person. */}
              <Field label="Password setup" hint="How this person gets their first password.">
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={draft.pwMode !== "set"}
                    onClick={() => {
                      setDraft((d) => ({ ...d, pwMode: "link" }));
                      clearFieldError("password");
                      clearFieldError("confirmPassword");
                    }}
                  >
                    Email a setup link
                  </Chip>
                  <Chip active={draft.pwMode === "set"} onClick={() => setDraft((d) => ({ ...d, pwMode: "set" }))}>
                    Set a password now
                  </Chip>
                </div>
              </Field>

              {draft.pwMode === "set" ? (
                <>
                  <Field label="Password" required>
                    <PasswordField
                      value={draft.password || ""}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, password: e.target.value }));
                        clearFieldError("password");
                      }}
                      visible={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                    />
                    {fieldErrors.password && (
                      <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.password}</span>
                    )}
                  </Field>
                  <Field label="Confirm password" required>
                    <PasswordField
                      value={draft.confirmPassword || ""}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, confirmPassword: e.target.value }));
                        clearFieldError("confirmPassword");
                      }}
                      visible={showConfirm}
                      onToggle={() => setShowConfirm((v) => !v)}
                    />
                    {fieldErrors.confirmPassword && (
                      <span className="font-body text-[11px] text-[#dc2626]">{fieldErrors.confirmPassword}</span>
                    )}
                  </Field>
                </>
              ) : null}

              <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
                <div>
                  <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    Disabled accounts cannot sign in.
                  </p>
                </div>
                <Toggle checked={!!draft.is_active} onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
              </div>

              {draft.pwMode === "set" ? (
                <div className="rounded-[2px] border border-[#fef3c7] bg-[#fffbeb] p-3">
                  <p className="font-body text-[12px] text-[#92400e]">
                    The welcome email will contain this password in plain text. Prefer &ldquo;Email a setup link&rdquo; unless you are handing it over in person.
                  </p>
                </div>
              ) : (
                <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
                  <p className="font-body text-[12px] text-[#1e40af]">
                    A welcome email with a single-use setup link (valid 1 hour) will be sent to this address on save, so they choose their own password. You never see it.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
