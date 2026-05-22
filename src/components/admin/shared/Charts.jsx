"use client";

import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RBarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const FONT = "var(--font-zalando-sans), system-ui";
const AXIS_TICK = { fontSize: 11, fontFamily: FONT, fill: "#9ca3af" };
const GRID_COLOR = "#f3f4f6";

function TooltipBox({ active, payload, label, formatter, labelKey }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[4px] border border-[#e5e7eb] bg-white px-3 py-2 shadow-lg">
      {label ? (
        <p className="mb-1.5 font-body text-[11px] font-medium text-[#6b7280]">{label}</p>
      ) : null}
      {payload.map((entry, i) => (
        <p
          key={i}
          className="font-body text-[12px] font-semibold"
          style={{ color: entry.color }}
        >
          {entry.name && entry.name !== "value" ? `${entry.name}: ` : ""}
          {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// LineChart — multi-series, auto label-thinning, dots hidden for dense data.
// series prop: [{ key, color, name }] — if omitted, defaults to [{ key:"value", color }]
export function LineChart({
  data,
  series,
  height = 240,
  color = "#1d4ed8",
  label = "",
  yFormatter,
}) {
  if (!data?.length) return null;

  const resolvedSeries = series ?? [{ key: "value", color, name: "" }];
  const labelKey = "day" in data[0] ? "day" : "label";
  const showDots = data.length <= 20;

  // Thin X labels so they never collide (target ~10 visible ticks)
  const xInterval =
    data.length > 60
      ? Math.ceil(data.length / 10) - 1
      : data.length > 30
      ? Math.ceil(data.length / 12) - 1
      : data.length > 14
      ? 1
      : 0;

  const fmt = yFormatter ?? ((v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)));
  const showLegend = resolvedSeries.length > 1 && resolvedSeries.some((s) => s.name);

  return (
    <div className="w-full">
      {label ? (
        <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          {label}
        </p>
      ) : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey={labelKey}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={xInterval}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
              width={36}
            />
            <Tooltip
              content={<TooltipBox formatter={yFormatter} />}
              cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
            />
            {showLegend ? (
              <Legend
                wrapperStyle={{ fontFamily: FONT, fontSize: 11, paddingTop: 8 }}
              />
            ) : null}
            {resolvedSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name || s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={showDots ? { r: 3, fill: "#fff", stroke: s.color, strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
              />
            ))}
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// BarChart — vertical (default) or horizontal (set horizontal=true for many categories).
export function BarChart({
  data,
  height = 240,
  color = "#11191f",
  label = "",
  horizontal = false,
  yFormatter,
}) {
  if (!data?.length) return null;

  const fmt = yFormatter ?? ((v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)));

  // Horizontal layout: better for >7 categories or long labels
  if (horizontal) {
    const autoHeight = Math.max(height, data.length * 40);
    return (
      <div className="w-full">
        {label ? (
          <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
            {label}
          </p>
        ) : null}
        <div style={{ height: autoHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <RBarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmt}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip
                content={<TooltipBox formatter={yFormatter} />}
                cursor={{ fill: "#f9fafb" }}
              />
              <Bar dataKey="value" radius={[0, 2, 2, 0]} maxBarSize={22}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color ?? color} />
                ))}
              </Bar>
            </RBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Vertical layout
  const xInterval =
    data.length > 20 ? Math.ceil(data.length / 8) - 1 : data.length > 10 ? 1 : 0;

  return (
    <div className="w-full">
      {label ? (
        <p className="mb-2 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
          {label}
        </p>
      ) : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={xInterval}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
              width={36}
            />
            <Tooltip
              content={<TooltipBox formatter={yFormatter} />}
              cursor={{ fill: "#f9fafb" }}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={36}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? color} />
              ))}
            </Bar>
          </RBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Donut — pie with center label + sidebar legend.
export function Donut({ data, size = 200, label = "" }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={size * 0.3}
            outerRadius={size * 0.46}
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              return (
                <div className="rounded-[4px] border border-[#e5e7eb] bg-white px-3 py-2 shadow-lg">
                  <p
                    className="font-body text-[12px] font-semibold"
                    style={{ color: d.payload?.color }}
                  >
                    {d.name}: {((d.value / total) * 100).toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-body text-[10px] uppercase text-[#6b7280]"
            style={{ letterSpacing: 1 }}
          >
            {label || "Total"}
          </span>
          <span className="font-display text-[16px] font-bold text-[#11191f]">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {data.map((d) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <li
              key={d.label}
              className="flex items-center justify-between gap-3 font-body text-[12px]"
            >
              <span className="inline-flex items-center gap-2 text-[#11191f]">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </span>
              <span className="font-semibold text-[#11191f]">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
