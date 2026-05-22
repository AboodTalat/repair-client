import PageHeader from "@/components/admin/layout/PageHeader";
import KpiCard from "@/components/admin/shared/KpiCard";
import Button from "@/components/admin/shared/Button";
import RecentOrdersTable from "@/components/admin/dashboard/RecentOrdersTable";
import { LineChart, Donut } from "@/components/admin/shared/Charts";
import {
  IconCart,
  IconUsers,
  IconBox,
  IconAlert,
  IconDownload,
} from "@/components/admin/shared/Icons";
import {
  KPIS,
  SALES_BY_DAY,
  REVENUE_BY_CATEGORY,
  TOP_PRODUCTS,
  RECENT_ORDERS,
  LOW_STOCK,
  formatCurrency,
  formatNumber,
} from "@/lib/mockAdmin";

export const metadata = { title: "Dashboard — Repair Console" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Dashboard"
        description="A snapshot of how the store is performing right now — sales, orders, inventory, and customers."
        actions={
          <>
            <Button variant="secondary" icon={<IconDownload />}>
              Export
            </Button>
            <Button variant="primary">Last 30 days</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={formatCurrency(KPIS.totalSales.value)}
          delta={KPIS.totalSales.delta}
          period={KPIS.totalSales.period}
          icon={<IconCart />}
          accent="#1d4ed8"
        />
        <KpiCard
          label="Active Orders"
          value={formatNumber(KPIS.activeOrders.value)}
          delta={KPIS.activeOrders.delta}
          period={KPIS.activeOrders.period}
          icon={<IconBox />}
          accent="#f59e0b"
        />
        <KpiCard
          label="New Customers"
          value={formatNumber(KPIS.newCustomers.value)}
          delta={KPIS.newCustomers.delta}
          period={KPIS.newCustomers.period}
          icon={<IconUsers />}
          accent="#16a34a"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={formatNumber(KPIS.lowStock.value)}
          delta={KPIS.lowStock.delta}
          period={KPIS.lowStock.period}
          icon={<IconAlert />}
          accent="#dc2626"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
                Sales — last 7 days
              </h2>
              <p className="font-body text-[12px] text-[#6b7280]">
                Daily revenue trend across all channels.
              </p>
            </div>
            <span className="shrink-0 font-display text-[18px] font-bold text-[#11191f] sm:text-[20px]">
              {formatCurrency(SALES_BY_DAY.reduce((s, d) => s + d.value, 0))}
            </span>
          </div>
          <LineChart data={SALES_BY_DAY} height={240} color="#1d4ed8" />
        </section>

        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
              Revenue by category
            </h2>
            <p className="font-body text-[12px] text-[#6b7280]">
              Share of total revenue per major.
            </p>
          </div>
          <Donut data={REVENUE_BY_CATEGORY} size={180} label="JOD" />
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
              Recent orders
            </h2>
            <a
              href="/r3pr-console/orders"
              className="shrink-0 font-body text-[12px] font-medium text-[#1d4ed8] hover:underline"
            >
              View all
            </a>
          </div>
          <RecentOrdersTable rows={RECENT_ORDERS} />
        </section>

        <section className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#11191f] sm:text-[14px]">
              Top-selling products
            </h2>
            <ul className="flex flex-col gap-3">
              {TOP_PRODUCTS.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-[2px] bg-[#f3f4f6] font-display text-[11px] font-bold text-[#11191f]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[13px] font-medium text-[#11191f]">
                      {p.name}
                    </p>
                    <p className="truncate font-body text-[11px] text-[#6b7280]">
                      {formatNumber(p.units)} units · {formatCurrency(p.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-5 place-items-center text-[#dc2626]">
                <IconAlert />
              </span>
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[1.4px] text-[#991b1b]">
                Low stock
              </h2>
            </div>
            <ul className="flex flex-col gap-2">
              {LOW_STOCK.slice(0, 5).map((row, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-[2px] bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[12px] font-medium text-[#11191f]">
                      {row.product}
                    </p>
                    <p className="truncate font-body text-[11px] text-[#6b7280]">{row.variant}</p>
                  </div>
                  <span className="shrink-0 font-display text-[12px] font-bold text-[#dc2626]">
                    {row.qty} / {row.threshold}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
