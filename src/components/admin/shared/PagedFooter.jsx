"use client";

// The footer every paged admin list renders under its table.
//
// It always states "showing N of TOTAL", including when everything fits on one
// page. That is the point: the previous lists showed a page and said nothing,
// so a truncated list and a complete one looked identical. Saying the count
// unconditionally means an admin can always tell which they're looking at.

import Button from "@/components/admin/shared/Button";

export default function PagedFooter({
  shown,
  total,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
  /** Singular noun, e.g. "product" — pluralised with a trailing "s". */
  noun = "result",
}) {
  const label = total === 1 ? noun : `${noun}s`;
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="font-body text-[12px] text-[#6b7280]">
        {loading
          ? "Loading…"
          : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} ${label}`}
      </p>
      {hasMore ? (
        <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
