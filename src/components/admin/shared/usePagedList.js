"use client";

// Shared paging for every admin list.
//
// The backend resolvers all accept `limit`/`offset` and return a full-table
// `total`, but most admin pages were sending neither — so each rendered the
// server's DEFAULT page (25 for stock alerts, 100 for products and users) and
// stopped, with nothing on screen to say the list was cut off. An admin looking
// at 100 of 4,000 products has no way to tell. This hook makes "ask for a page,
// know the real total, fetch the next one" the single obvious way to build a
// list here, so that class of silent truncation can't come back one page at a
// time.
//
// Usage:
//   const list = usePagedList({
//     pageSize: 50,
//     fetchPage: useCallback(async ({ limit, offset, signal }) => {
//       const data = await repairCall("myAppAdminListX", { ...filters, limit, offset });
//       return { items: data.items, total: data.total };
//     }, [filters]),
//   });
//
// `fetchPage` MUST be memoised on its filter inputs — the hook refetches from
// offset 0 whenever its identity changes, which is exactly the desired
// behaviour when a filter or search term changes.
//
// The returned `error` is for LOAD failures only, and this hook deliberately
// does NOT expose `setError`. Consumers keep MUTATION errors in their own
// `actionError` state: `load()` clears the error on every run, and these
// managers refresh right after a failed write, so routing an action error
// through here would wipe it before the admin could read it. Exposing the
// setter to "fix" a missing-setter crash reintroduces exactly that silent
// wipe — add local state in the component instead.

import { useCallback, useEffect, useRef, useState } from "react";

export default function usePagedList({ pageSize = 50, fetchPage, enabled = true }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Guards against an out-of-order response overwriting a newer one — a slow
  // first-page request resolving after the user has already typed a narrower
  // search would otherwise repopulate the list with stale rows.
  const requestId = useRef(0);

  const load = useCallback(
    async ({ offset = 0, append = false } = {}) => {
      if (!enabled) return;
      const id = ++requestId.current;
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const res = await fetchPage({ limit: pageSize, offset });
        if (id !== requestId.current) return;
        const next = Array.isArray(res?.items) ? res.items : [];
        setItems((prev) => (append ? [...prev, ...next] : next));
        // Fall back to what we can see when the endpoint reports no total, so
        // "Load more" simply stops rather than looping on an unknown count.
        setTotal(Number.isFinite(Number(res?.total)) ? Number(res.total) : offset + next.length);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err?.message || "Failed to load");
        if (!append) setItems([]);
      } finally {
        if (id === requestId.current) {
          append ? setLoadingMore(false) : setLoading(false);
        }
      }
    },
    [fetchPage, pageSize, enabled],
  );

  // Reload from the first page whenever the query changes.
  //
  // Kicked off in a microtask rather than called straight from the effect body:
  // `load` flips the loading flag synchronously, and doing that during the
  // effect triggers a second render pass before the request has even started.
  // The `cancelled` guard stops a request being issued at all when the filters
  // change again within the same tick.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load({ offset: 0, append: false });
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const loadMore = useCallback(() => load({ offset: items.length, append: true }), [load, items.length]);
  const refresh = useCallback(() => load({ offset: 0, append: false }), [load]);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore: items.length < total,
    loadMore,
    refresh,
    /** Apply a local edit without refetching (e.g. after a status toggle). */
    setItems,
    setTotal,
  };
}
