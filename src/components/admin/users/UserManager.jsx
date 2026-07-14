"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Drawer from "@/components/admin/shared/Drawer";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Field, TextInput, Select, Toggle, Chip, SearchInput } from "@/components/admin/shared/Form";
import { IconPlus, IconEdit, IconTrash, IconMail } from "@/components/admin/shared/Icons";
import CountryCodePicker from "@/components/customer/contact/CountryCodePicker";
import { DEFAULT_COUNTRY, phoneLengthFor } from "@/lib/countryCodes";
import { repairCall } from "@/lib/repairAuthedApi";
import { useRepairStore, selectUser } from "@/lib/useRepairStore";
import Link from "next/link";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "delivery", label: "Delivery" },
  { value: "accounting", label: "Accounting" },
  { value: "customer", label: "Customer" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const me = useRepairStore(selectUser);
  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  const fetchUsers = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const input = {};
      if (filters.role && filters.role !== "all") input.role = filters.role;
      if (filters.search) input.search = filters.search;
      const data = await repairCall("myAppAdminListUsers", input, { isQuery: true });
      setUsers(data.users || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchUsers({ role, search: query });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers({ role, search: query });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, role, fetchUsers]);

  async function save(values) {
    setSaving(true);
    try {
      // The Thunder connection only applies to delivery accounts (the backend
      // also enforces this); send false for any other role.
      const thunderConnected = values.role === "delivery" ? !!values.thunder_connected : false;
      if (values.id) {
        await repairCall("myAppAdminUpdateUser", {
          userId: Number(values.id),
          email: values.email,
          phone: values.phone || null,
          role: values.role,
          thunder_connected: thunderConnected,
        }, { isQuery: false });
      } else {
        const phone = buildPhone(values.phoneLocal, values.phoneDial);
        await repairCall("myAppAdminCreateUser", {
          email: values.email,
          phone,
          role: values.role,
          password: values.password,
          is_active: values.is_active ?? true,
          thunder_connected: thunderConnected,
        }, { isQuery: false });
      }
      setEditing(null);
      await fetchUsers({ role, search: query });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    setError(null);
    const newActive = !user.is_active;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: newActive } : u)));
    try {
      await repairCall("myAppAdminToggleUserActive", {
        userId: Number(user.id),
        isActive: newActive,
      }, { isQuery: false });
      await fetchUsers({ role, search: query });
    } catch (err) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u)));
      setError(err?.message || "Failed to update user");
    }
  }

  async function remove(id) {
    setError(null);
    setConfirmDelete(null);
    try {
      await repairCall("myAppAdminDeleteUser", { userId: Number(id) }, { isQuery: false });
      await fetchUsers({ role, search: query });
    } catch (err) {
      setError(err?.message || "Failed to delete user");
    }
  }

  const isSelf = (u) => me && Number(u.id) === Number(me.id);

  return (
    <>
      {error && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{error}</p>
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

  useEffect(() => {
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
  }, [user]);

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
      setError(err?.message || "Something went wrong.");
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

  useEffect(() => {
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
  }, [editing]);

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

      const pw = draft.password || "";
      if (!pw) errs.password = "Password is required.";
      else if (pw.length < 8) errs.password = "Password must be at least 8 characters.";

      const cpw = draft.confirmPassword || "";
      if (!cpw) errs.confirmPassword = "Please confirm the password.";
      else if (pw && cpw !== pw) errs.confirmPassword = "Passwords do not match.";
    } else {
      const phone = (draft.phone || "").trim();
      if (!phone) errs.phone = "Phone number is required.";
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
      const msg = err?.message || "";
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
              <div className="flex items-center justify-between rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] p-3">
                <div>
                  <p className="font-body text-[13px] font-medium text-[#11191f]">Active</p>
                  <p className="font-body text-[11px] text-[#6b7280]">
                    Disabled accounts cannot sign in.
                  </p>
                </div>
                <Toggle checked={!!draft.is_active} onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
              </div>
              <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
                <p className="font-body text-[12px] text-[#1e40af]">
                  A welcome email with the password will be sent to this address on save.
                </p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
