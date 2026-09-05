"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell, IconSearch, IconChevronDown, IconClose } from "@/components/admin/shared/Icons";
import NotificationPanel from "@/components/admin/layout/NotificationPanel";
import { useRepairStore } from "@/lib/useRepairStore";
import { repairCall } from "@/lib/repairAuthedApi";
import { fetchAdminNotifications, markAdminNotificationsRead } from "@/lib/adminNotifications";
import { searchAdmin, sectionHref, MIN_SEARCH_LEN } from "@/lib/adminSearch";
import { searchDestinations } from "@/lib/adminNav";
import { useAdminPush } from "@/lib/pwa";

// Debounce for the global search. Every keystroke past MIN_SEARCH_LEN costs
// three resolver round-trips, and myAppAdminListUsers writes an audit row per
// call, so this is a cost control as much as a UX one.
const SEARCH_DEBOUNCE_MS = 300;

// How often the bell polls the backend for new notifications. Kept modest — the
// real-time channel will be PWA web-push; this interval is just so the badge
// stays reasonably fresh while an admin sits on a page.
const NOTIFICATION_POLL_MS = 60000;

// The users model has no display name — derive a friendly identity from the
// signed-in account's email local-part (same approach as the delivery surface).
function identityFromUser(user) {
  const email = user?.email || "";
  const local = email.split("@")[0] || "admin";
  const parts = local.split(/[._-]/).filter(Boolean);
  const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2) || "AD").toUpperCase();
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || "Admin";
  const role = (user?.role || "admin").toUpperCase();
  return { initials, name, role };
}

// Results dropdown for the global search. Grouped by domain, each group capped
// with a "View all N" row that hands off to the section page carrying the term.
// There are no per-record admin routes, so a row click goes to the same place
// as its group header — the value of the row is recognition, not deep-linking.
function SearchResults({ term, pages, results, searching, onGoToSection, onGoToPage, variant = "dropdown" }) {
  const groups = [
    { key: "products", label: "Products", rows: results?.products || [] },
    { key: "orders", label: "Orders", rows: results?.orders || [] },
    { key: "customers", label: "Customers", rows: results?.customers || [] },
  ].filter((g) => g.rows.length > 0);

  // Nothing at all — only say so once the network groups have settled, since the
  // pages group resolves instantly and the others arrive later. The message has
  // to mention pages too, or a live page match would sit under a "no matches"
  // line.
  const nothingAnywhere = (pages?.length ?? 0) === 0 && results?.empty && !searching;

  // Full-screen (mobile) drops the popover chrome — it IS the screen.
  const shell =
    variant === "sheet"
      ? "flex-1 overflow-y-auto"
      : "absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[70vh] overflow-y-auto rounded-[4px] border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(17,25,31,0.12)]";

  return (
    <div className={shell}>
      {/* Pages & settings — local, synchronous, so it renders before the
          network groups have even been requested. */}
      {pages && pages.length > 0 ? (
        <div className="border-b border-[#f3f4f6]">
          <div className="px-4 pb-1 pt-3">
            <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              Pages &amp; settings
            </span>
          </div>
          <ul>
            {pages.map((d) => (
              <li key={`page-${d.section}-${d.label}`}>
                <button
                  type="button"
                  onClick={() => onGoToPage(d.href)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-[#f7f7f8]"
                >
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] text-[#11191f]">
                    {d.label}
                  </span>
                  <span className="shrink-0 font-body text-[12px] text-[#6b7280]">{d.section}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {searching && !results ? (
        <p className="px-4 py-3 font-body text-[12px] text-[#6b7280]">Searching…</p>
      ) : null}

      {nothingAnywhere ? (
        <p className="px-4 py-3 font-body text-[12px] text-[#6b7280]">
          Nothing matches “{term}” — no pages, products, orders or customers.
        </p>
      ) : null}

      {groups.map((g) => (
        <div key={g.key} className="border-b border-[#f3f4f6] last:border-b-0">
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
              {g.label}
            </span>
            <button
              type="button"
              onClick={() => onGoToSection(g.key)}
              className="font-body text-[11px] font-medium text-[#1d4ed8] hover:underline"
            >
              View all {results.totals[g.key]} →
            </button>
          </div>
          <ul>
            {g.rows.map((row) => (
              <li key={`${g.key}-${row.id}`}>
                <button
                  type="button"
                  onClick={() => onGoToSection(g.key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-[#f7f7f8]"
                >
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] text-[#11191f]">
                    {g.key === "products" ? row.name : null}
                    {g.key === "orders" ? row.number : null}
                    {g.key === "customers" ? row.email : null}
                    {g.key === "products" && row.hidden ? (
                      <span className="ml-2 font-body text-[11px] text-[#9ca3af]">Hidden</span>
                    ) : null}
                    {g.key === "customers" && row.inactive ? (
                      <span className="ml-2 font-body text-[11px] text-[#9ca3af]">Inactive</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-body text-[12px] text-[#6b7280]">
                    {g.key === "products" ? `JOD ${row.price}` : null}
                    {g.key === "orders" ? `${row.status} · JOD ${row.total}` : null}
                    {g.key === "customers" ? row.role : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function TopBar({ onOpenSidebar }) {
  const router = useRouter();
  const user = useRepairStore((s) => s.authInfo.user);
  const { initials, name, role } = identityFromUser(user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState({ unreadCount: 0, notifications: [] });
  const push = useAdminPush();

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // ---- Global search -----------------------------------------------------
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Mobile: the bar has no room for an input, so search lives behind an icon
  // that opens a full-screen sheet. Same term/results/handlers as desktop — only
  // the presentation differs.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const mobileInputRef = useRef(null);
  // Monotonic request id. Without it, a slow response for "me" can land after
  // the fast one for "men" and overwrite the newer results with older ones.
  const searchSeq = useRef(0);

  // Fetch the notification feed on mount and poll it. Guarded by a `cancelled`
  // flag ONLY — deliberately NOT paired with a run-once ref, which deadlocks
  // under React Strict Mode's mount→unmount→remount (documented in the repair
  // conventions). The double-mount fires two idempotent reads; the first is
  // ignored, the second resolves normally.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const d = await fetchAdminNotifications();
        if (!cancelled) setNotifData(d);
      } catch {
        // Poll failures are non-fatal — keep the last good state.
      }
    }
    load();
    const timer = setInterval(load, NOTIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Toggle the bell. Opening it refetches fresh, then marks everything read for
  // THIS admin (per-admin watermark) so the badge clears — other admins keep
  // their own unread state.
  async function toggleNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next) return;
    try {
      const d = await fetchAdminNotifications();
      setNotifData(d);
      await markAdminNotificationsRead();
      setNotifData((prev) => ({
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch {
      // best-effort — the badge will reconcile on the next poll
    }
  }

  async function handleSignOut() {
    setProfileOpen(false);
    const refreshToken = useRepairStore.getState().authInfo.refreshToken;
    try {
      if (refreshToken) await repairCall("myAppLogout", { refreshToken });
    } catch {
      // Server-side revoke is best-effort; clearAuth always runs.
    }
    useRepairStore.getState().clearAuth();
    router.push("/sign-in");
  }

  // Close notification panel on outside click.
  useEffect(() => {
    if (!notifOpen) return;
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  // Debounced global search. Every setState happens INSIDE the timer callback
  // or a promise continuation — never synchronously in the effect body, which
  // is the cascading-render pattern this codebase lints against. Clearing on a
  // too-short term is handled in the change handler (an event handler) rather
  // than here, for the same reason.
  useEffect(() => {
    const q = term.trim();
    if (q.length < MIN_SEARCH_LEN) return;
    const timer = setTimeout(async () => {
      const seq = ++searchSeq.current;
      setSearching(true);
      try {
        const r = await searchAdmin(q);
        // Drop a response that a newer keystroke has already superseded.
        if (searchSeq.current === seq) setResults(r);
      } catch {
        if (searchSeq.current === seq) setResults(null);
      } finally {
        if (searchSeq.current === seq) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  function handleTermChange(v) {
    setTerm(v);
    const q = v.trim();
    if (q.length < MIN_SEARCH_LEN) {
      // Invalidate any in-flight request so its late response can't repopulate
      // a dropdown the admin has just cleared.
      searchSeq.current += 1;
      setResults(null);
      setSearching(false);
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  }

  // Routes + settings cards. Pure string matching, so it runs on the keystroke
  // rather than waiting out the debounce the three network groups need.
  const pages = useMemo(
    () => (term.trim().length >= MIN_SEARCH_LEN ? searchDestinations(term) : []),
    [term]
  );

  // EVERY navigation path must go through this. On mobile the sheet covers the
  // viewport, so leaving it open means the admin lands on the new page with a
  // white overlay on top of it and no obvious way back.
  function closeSearch() {
    setSearchOpen(false);
    setMobileSearchOpen(false);
  }

  function goToPage(href) {
    closeSearch();
    router.push(href);
  }

  // Enter jumps to the section with the most relevant hit, carrying the term.
  function handleSearchKeyDown(e) {
    if (e.key === "Escape") {
      closeSearch();
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "Enter") return;
    const q = term.trim();
    if (q.length < MIN_SEARCH_LEN) return;
    // Pages win the tie. Someone typing "tax" wants the Tax Rate setting, not a
    // product that happens to have "tax" in its name — and the pages group is
    // the only one guaranteed to have resolved by the time Enter is pressed.
    if (pages.length > 0) {
      goToPage(pages[0].href);
      return;
    }
    const first =
      (results?.products?.length && "products") ||
      (results?.orders?.length && "orders") ||
      (results?.customers?.length && "customers") ||
      "products";
    closeSearch();
    router.push(sectionHref(first, q));
  }

  function goToSection(group) {
    closeSearch();
    router.push(sectionHref(group, term.trim()));
  }

  // Mobile sheet: lock body scroll (same behaviour as AdminShell's off-canvas
  // drawer) and focus the input so the keyboard opens straight away. The focus
  // call is a DOM effect, not setState, so it's fine in an effect body.
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileInputRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSearchOpen]);

  // Close search results on outside click. Desktop only — the mobile sheet
  // covers the viewport, so there is no "outside" to click; it closes via the X,
  // Escape, or any navigation.
  useEffect(() => {
    if (!searchOpen) return;
    function handleOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [searchOpen]);

  // Close profile dropdown on outside click.
  useEffect(() => {
    if (!profileOpen) return;
    function handleOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[#e5e7eb] bg-white px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-[2px] border border-[#e5e7eb] text-[#11191f] hover:bg-[#f3f4f6] lg:hidden"
      >
        <span className="grid size-4 place-items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div ref={searchRef} className="relative hidden flex-1 max-w-md md:block">
        <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
          <IconSearch />
        </span>
        <input
          type="text"
          value={term}
          onChange={(e) => handleTermChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => { if (term.trim().length >= MIN_SEARCH_LEN) setSearchOpen(true); }}
          placeholder="Search products, orders, customers..."
          aria-label="Search products, orders and customers"
          className="h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] pl-9 pr-3 font-body text-[13px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] focus:bg-white"
        />
        {searchOpen ? (
          <SearchResults
            term={term.trim()}
            pages={pages}
            results={results}
            searching={searching}
            onGoToSection={goToSection}
            onGoToPage={goToPage}
          />
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Mobile search trigger — the inline input above is md+ only. */}
        <button
          type="button"
          aria-label="Search"
          onClick={() => setMobileSearchOpen(true)}
          className="grid size-9 place-items-center rounded-[2px] border border-[#e5e7eb] text-[#11191f] transition-colors hover:bg-[#f3f4f6] md:hidden"
        >
          <span className="grid size-4 place-items-center">
            <IconSearch />
          </span>
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifications}
            className={
              "relative grid size-9 place-items-center rounded-[2px] border transition-colors " +
              (notifOpen
                ? "border-[#11191f] bg-[#f3f4f6] text-[#11191f]"
                : "border-[#e5e7eb] text-[#11191f] hover:bg-[#f3f4f6]")
            }
          >
            <span className="grid size-4 place-items-center">
              <IconBell />
            </span>
            {notifData.unreadCount > 0 ? (
              <span
                className="absolute right-1 top-1 grid min-w-[14px] place-items-center rounded-full px-0.5 font-body font-bold text-white"
                style={{
                  backgroundColor: "#dc2626",
                  fontSize: "8px",
                  lineHeight: "14px",
                }}
              >
                {notifData.unreadCount > 99 ? "99+" : notifData.unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen ? (
            <NotificationPanel
              notifications={notifData.notifications}
              push={push}
              onClose={() => setNotifOpen(false)}
            />
          ) : null}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-[2px] border border-[#e5e7eb] pl-1 pr-2 hover:bg-[#f3f4f6]"
          >
            <span className="grid size-7 place-items-center rounded-[2px] bg-[#11191f] font-display text-[12px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left font-body sm:flex sm:flex-col">
              <span className="text-[12px] font-semibold leading-none text-[#11191f]">{name}</span>
              <span className="text-[10px] uppercase tracking-[1px] text-[#6b7280]">{role}</span>
            </span>
            <span className="grid size-4 place-items-center text-[#6b7280]">
              <IconChevronDown />
            </span>
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-11 z-30 w-48 rounded-[2px] border border-[#e5e7eb] bg-white py-1 shadow-lg">
              {/* Identity header (name + role) so the menu still identifies who's
                  signed in now that the My profile / Settings stubs are gone. */}
              <div className="border-b border-[#e5e7eb] px-4 py-2">
                <p className="truncate font-body text-[12px] font-semibold text-[#11191f]">{name}</p>
                <p className="truncate font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">{role}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left font-body text-[12px] text-[#dc2626] hover:bg-[#fef2f2]"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile full-screen search sheet. Rendered inside the header so it
          shares the search state with the desktop input — only one of the two
          is ever visible, so there's no duplicate-input problem. */}
      {mobileSearchOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#e5e7eb] px-4">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
                <IconSearch />
              </span>
              <input
                ref={mobileInputRef}
                type="text"
                value={term}
                onChange={(e) => handleTermChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, products, orders…"
                aria-label="Search the admin console"
                className="h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-[#fafafa] pl-9 pr-3 font-body text-[13px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] focus:bg-white"
              />
            </div>
            <button
              type="button"
              aria-label="Close search"
              onClick={closeSearch}
              className="grid size-9 shrink-0 place-items-center rounded-[2px] border border-[#e5e7eb] text-[#11191f] hover:bg-[#f3f4f6]"
            >
              <span className="grid size-4 place-items-center">
                <IconClose />
              </span>
            </button>
          </div>

          {term.trim().length >= MIN_SEARCH_LEN ? (
            <SearchResults
              term={term.trim()}
              pages={pages}
              results={results}
              searching={searching}
              onGoToSection={goToSection}
              onGoToPage={goToPage}
              variant="sheet"
            />
          ) : (
            <p className="px-4 py-4 font-body text-[12px] text-[#6b7280]">
              Search pages, settings, products, orders and customers.
            </p>
          )}
        </div>
      ) : null}
    </header>
  );
}
