"use client";

import DataTable from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { formatCurrency } from "@/lib/mockAdmin";

export default function RecentOrdersTable({ rows }) {
  return (
    <DataTable
      columns={[
        { key: "id", label: "Order" },
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
          render: (r) => <StatusBadge status={r.status} label={r.status} />,
        },
        { key: "placed", label: "Placed" },
      ]}
      rows={rows}
    />
  );
}
