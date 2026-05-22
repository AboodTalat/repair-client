"use client";

// Lightweight presentational table. Caller passes:
//   columns: [{ key, label, align?, width?, render?(row) }]
//   rows:    array of row objects (rendered or .render(row))
//   onRowClick(row): optional
//   empty:   ReactNode shown when rows is empty

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
                className="px-4 py-3 text-left font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]"
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
              className={
                "border-b border-[#f3f4f6] last:border-b-0 " +
                (onRowClick ? "cursor-pointer hover:bg-[#fafafa]" : "")
              }
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-4 py-3 font-body text-[13px] text-[#11191f]"
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
