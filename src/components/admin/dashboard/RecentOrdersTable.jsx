"use client";

import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { formatCurrency } from "@/lib/mockAdmin";

// Recent-orders feed for the dashboard. Rows come shaped by
// `src/lib/adminDashboard.js` (order_number, customer name, display status key
// + resolved label). Kept as a client child so the server dashboard page can
// hand it plain `rows={…}` without passing column render functions across the
// server→client boundary (see the convention note in repair/CLAUDE.md).
export default function RecentOrdersTable({ rows }) {
  return (
    <DataTable
      columns={[
        {
          key: "id",
          label: "Order",
          render: (r) => (
            <a
              href="/r3pr-console/orders"
              className="font-medium text-[#1d4ed8] hover:underline"
            >
              {r.id}
            </a>
          ),
        },
        { key: "customer", label: "Customer" },
        {
          key: "total",
          label: "Total",
          align: "right",
          render: (r) => formatCurrency(r.total),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusBadge status={r.status} label={r.statusLabel || r.status} />,
        },
        { key: "placed", label: "Placed" },
      ]}
      rows={rows}
    />
  );
}
