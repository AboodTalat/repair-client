// Mock data for the delivery role surface under /r3pr-dispatch/*.
// Mirrors the shape of what `myAppListMyDeliveries` / `myAppDeliveryUpdateStatus`
// will eventually return — swap to repairQuery(...) calls when the delivery
// resolvers land. The brief's "Out for Delivery" maps to the server's
// `handed_to_delivery` status; "Failed Delivery" is the new `failed_delivery`
// status (also surfaced in STATUS_TONE additions below).

// "Out for Delivery" is the working state for a delivery account — the order
// has been handed over by an admin (`handed_to_delivery` on the backend) and
// the driver now drives it to its destination. From there it terminates as
// `delivered` or `failed_delivery`.

export const DELIVERY_STATUSES = [
  { key: "handed_to_delivery", label: "Out for Delivery" },
  { key: "delivered",          label: "Delivered" },
  { key: "failed_delivery",    label: "Failed Delivery" },
];

// Filter chips on the dashboard. "all" is the default; "active" collapses
// `handed_to_delivery` (the only in-flight state for a driver).
export const DELIVERY_FILTERS = [
  { key: "active",           label: "Out for Delivery", match: ["handed_to_delivery"] },
  { key: "delivered",        label: "Delivered",        match: ["delivered"] },
  { key: "failed_delivery",  label: "Failed",           match: ["failed_delivery"] },
];

// Reason picker for the "Failed Delivery" flow. Mirrors what real courier
// systems collect when a drop-off can't complete.
export const FAILED_DELIVERY_REASONS = [
  { key: "customer_unavailable", label: "Customer unavailable" },
  { key: "wrong_address",        label: "Wrong / incomplete address" },
  { key: "refused",              label: "Customer refused delivery" },
  { key: "unreachable",          label: "Couldn't reach customer" },
  { key: "damaged_package",      label: "Package damaged in transit" },
  { key: "other",                label: "Other" },
];

// Tone map additions for STATUS_TONE — surfaced via `deliveryTone(status)` so
// callers don't have to import STATUS_TONE here. `failed_delivery` is a NEW
// tone (red, same family as cancelled but distinct enough to read at a glance).
export const DELIVERY_TONE = {
  handed_to_delivery: { bg: "#e0e7ff", fg: "#3730a3", dot: "#4f46e5" },
  delivered:          { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  failed_delivery:    { bg: "#fef2f2", fg: "#b91c1c", dot: "#ef4444" },
};

export function deliveryStatusLabel(key) {
  return DELIVERY_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function deliveryTone(key) {
  return DELIVERY_TONE[key] ?? DELIVERY_TONE.handed_to_delivery;
}

// Mock assigned-orders list — each row has the data the brief's three
// requirements need: customer name + address + items summary + contact info.
// The signed-in delivery driver is `driver@repair.app` (matches the OrderManager
// pattern of using an email as the by-field on history entries).
export const DRIVER = {
  email: "driver@repair.app",
  name:  "Yousef Driver",
  initials: "YD",
  zone:  "Amman · West",
};

export const ASSIGNED_ORDERS = [
  {
    id: "RP-10292",
    customer: { name: "Omar Saleh", email: "omar@example.com", phone: "+962-79-555-0103" },
    items: [
      { product: "Fresh Green Tee", color: "Fresh Green", size: "L", qty: 2, price: 30 },
    ],
    address: "Khalda 17, Amman, Jordan",
    addressNote: "Building 17, 3rd floor, apt 6. Buzzer says 'Saleh'.",
    payment: "paid",
    paymentMethod: "Cash on Delivery",
    codAmount: 64.0,
    status: "handed_to_delivery",
    total: 64.0,
    placed: "2026-05-19 08:51",
    assignedAt: "2026-05-19 10:45",
    history: [
      { at: "2026-05-19 08:51", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 10:11", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 10:45", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
    ],
  },
  {
    id: "RP-10295",
    customer: { name: "Rana Awad", email: "rana@example.com", phone: "+962-79-555-0108" },
    items: [
      { product: "Onyx Joggers", color: "Onyx", size: "M", qty: 1, price: 70 },
      { product: "Bright White Hoodie", color: "Bright White", size: "S", qty: 1, price: 60 },
    ],
    address: "Dabouq Hills 12, Amman, Jordan",
    addressNote: "Gate code 2244. Leave with the guard if not home.",
    payment: "paid",
    paymentMethod: "Visa ending 4242",
    codAmount: 0,
    status: "handed_to_delivery",
    total: 142.30,
    placed: "2026-05-19 11:12",
    assignedAt: "2026-05-19 13:02",
    history: [
      { at: "2026-05-19 11:12", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 12:40", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 13:02", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
    ],
  },
  {
    id: "RP-10296",
    customer: { name: "Tariq Nassar", email: "tariq@example.com", phone: "+962-79-555-0109" },
    items: [
      { product: "Sand Cap", color: "Sand", size: "M", qty: 3, price: 20 },
    ],
    address: "Shmeisani 4, Amman, Jordan",
    addressNote: "",
    payment: "paid",
    paymentMethod: "Cash on Delivery",
    codAmount: 60.0,
    status: "handed_to_delivery",
    total: 60.0,
    placed: "2026-05-19 12:30",
    assignedAt: "2026-05-19 14:10",
    history: [
      { at: "2026-05-19 12:30", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 13:50", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 14:10", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
    ],
  },
  {
    id: "RP-10290",
    customer: { name: "Ali Rashid", email: "ali@example.com", phone: "+962-79-555-0105" },
    items: [{ product: "Sand Cap", color: "Sand", size: "M", qty: 2, price: 20 }],
    address: "Sweifieh 21, Amman, Jordan",
    addressNote: "",
    payment: "paid",
    paymentMethod: "Cash on Delivery",
    codAmount: 39.5,
    status: "delivered",
    total: 39.5,
    placed: "2026-05-18 22:08",
    assignedAt: "2026-05-19 08:00",
    deliveredAt: "2026-05-19 14:18",
    history: [
      { at: "2026-05-18 22:08", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 07:45", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 08:00", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
      { at: "2026-05-19 14:18", from: "handed_to_delivery", to: "delivered", by: "driver@repair.app" },
    ],
  },
  {
    id: "RP-10288",
    customer: { name: "Yara Saad", email: "yara@example.com", phone: "+962-79-555-0107" },
    items: [
      { product: "Bright White Hoodie", color: "Bright White", size: "L", qty: 1, price: 60 },
      { product: "Sand Cap", color: "Sand", size: "M", qty: 1, price: 20 },
    ],
    address: "Tla’ Al-Ali 33, Amman, Jordan",
    addressNote: "",
    payment: "paid",
    paymentMethod: "Visa ending 1881",
    codAmount: 0,
    status: "delivered",
    total: 76.2,
    placed: "2026-05-18 18:20",
    assignedAt: "2026-05-19 09:20",
    deliveredAt: "2026-05-19 14:40",
    history: [
      { at: "2026-05-18 18:20", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 09:00", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 09:20", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
      { at: "2026-05-19 14:40", from: "handed_to_delivery", to: "delivered", by: "driver@repair.app" },
    ],
  },
  {
    id: "RP-10287",
    customer: { name: "Karim Odeh", email: "karim@example.com", phone: "+962-79-555-0110" },
    items: [{ product: "Stone Grey Shorts", color: "Stone Grey", size: "M", qty: 1, price: 40 }],
    address: "Marj Al-Hamam 9, Amman, Jordan",
    addressNote: "",
    payment: "paid",
    paymentMethod: "Cash on Delivery",
    codAmount: 40.0,
    status: "failed_delivery",
    failedReason: "customer_unavailable",
    failedNote: "Knocked twice, no answer. No buzzer.",
    total: 40.0,
    placed: "2026-05-17 16:02",
    assignedAt: "2026-05-18 09:30",
    failedAt: "2026-05-18 15:10",
    history: [
      { at: "2026-05-17 16:02", from: null, to: "processing", by: "system" },
      { at: "2026-05-18 09:00", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-18 09:30", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
      { at: "2026-05-18 15:10", from: "handed_to_delivery", to: "failed_delivery", by: "driver@repair.app", reason: "customer_unavailable" },
    ],
  },
];

// Helpers ----------------------------------------------------------------

export function filterDeliveries(rows, filterKey) {
  if (!filterKey || filterKey === "all") return rows;
  const def = DELIVERY_FILTERS.find((f) => f.key === filterKey);
  if (!def) return rows;
  return rows.filter((r) => def.match.includes(r.status));
}

export function itemsSummary(items) {
  if (!items || items.length === 0) return "—";
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const lead = items[0].product;
  if (items.length === 1) return `${lead} × ${items[0].qty}`;
  return `${lead} + ${items.length - 1} more · ${totalQty} items`;
}

export function findDelivery(id) {
  return ASSIGNED_ORDERS.find((r) => r.id === id) ?? null;
}

export function reasonLabel(key) {
  return FAILED_DELIVERY_REASONS.find((r) => r.key === key)?.label ?? key ?? "—";
}

export function formatJOD(n) {
  return `JOD ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// KPI counts used by the dashboard header. Stays as a function so the page
// recomputes after a status change (when wired to mutable state).
export function deliveryCounts(rows) {
  const c = { active: 0, delivered: 0, failed_delivery: 0 };
  for (const r of rows) {
    if (r.status === "handed_to_delivery") c.active += 1;
    else if (r.status === "delivered")     c.delivered += 1;
    else if (r.status === "failed_delivery") c.failed_delivery += 1;
  }
  return c;
}
