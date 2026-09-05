"use client";

// Lightweight presentational table. Caller passes:
//   columns: [{ key, label, align?, width?, render?(row) }]
//   rows:    array of row objects (rendered or .render(row))
//   onRowClick(row): optional
//   empty:   ReactNode shown when rows is empty
//
// When `onRowClick` is supplied the row becomes a real control: focusable, in
// tab order, and activated by Enter or Space. It used to be a bare `<tr onClick>`
// with `cursor-pointer`, which is mouse-only — and on pages where the row opens
// the ONLY place an action can be taken (Stock Alerts opens the drawer that
// holds Notify / Dismiss), that made the entire page unusable without a mouse.
// `aria-keyshortcuts` is deliberately not set; the row announces as a button
// because that is what it behaves like.

export default function DataTable({ columns, rows, onRowClick, empty }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-[4px] border border-dashed border-[#e5e7eb] bg-white px-6 py-16">
        {empty || (
          <p className="font-body text-[13px] text-[#6b7280]">No results</p>
        )}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[4px] border border-[#e5e7eb] bg-white">
      <table className="min-w-full border-collapse">
        <thead className="border-b border-[#e5e7eb] bg-[#fafafa]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                // `className` lets a caller drop a column at a breakpoint
                // (e.g. "hidden sm:table-cell"). Hiding the cell is the only
                // way to reclaim its width — a wrapper inside the cell still
                // reserves the column, which is what pushed Stock Alerts'
                // Status badge off-screen on a phone.
                className={
                  "px-4 py-3 text-left font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280] " +
                  (c.className || "")
                }
                style={{
                  width: c.width,
                  textAlign: c.align || "left",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      // Space scrolls the page by default; Enter and Space are
                      // both what a button responds to, so intercept both.
                      if (e.key === "Enter" || e.key === " ") {
                        if (e.target !== e.currentTarget) return; // let inner controls handle their own keys
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              className={
                "border-b border-[#f3f4f6] last:border-b-0 " +
                (onRowClick
                  ? "cursor-pointer hover:bg-[#fafafa] focus:outline-none focus-visible:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#11191f]"
                  : "")
              }
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={
                    "px-4 py-3 font-body text-[13px] text-[#11191f] " + (c.className || "")
                  }
                  style={{ textAlign: c.align || "left" }}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
