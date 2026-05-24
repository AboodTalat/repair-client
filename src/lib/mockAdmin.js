// Mock admin data. Mirrors the shape of what the repair sub-server's named
// resolvers will eventually return — swap to repairQuery(...) calls when the
// admin resolvers are wired up. Pure JS, no imports, safe to consume from
// both server and client components.

export const KPIS = {
  totalSales: { value: 184_320, delta: 12.4, period: "vs last 30 days" },
  activeOrders: { value: 86, delta: -3.2, period: "currently in pipeline" },
  newCustomers: { value: 312, delta: 18.7, period: "this month" },
  lowStock: { value: 14, delta: 0, period: "variants under threshold" },
};

export const SALES_BY_DAY = [
  { day: "Mon", value: 4200 },
  { day: "Tue", value: 5100 },
  { day: "Wed", value: 4700 },
  { day: "Thu", value: 6300 },
  { day: "Fri", value: 8200 },
  { day: "Sat", value: 9400 },
  { day: "Sun", value: 7100 },
];

// 30-day sales series for the reports page (Apr 21 – May 20 2026).
// Each row carries `current` (this period) and `prev` (same 30 days a month prior)
// so ReportsView can render a comparison line without a separate API call.
export const SALES_SERIES_30 = [
  { day: "Apr 21", current: 5200, prev: 4900 },
  { day: "Apr 22", current: 4800, prev: 5100 },
  { day: "Apr 23", current: 5600, prev: 5300 },
  { day: "Apr 24", current: 6100, prev: 5800 },
  { day: "Apr 25", current: 7800, prev: 7200 },
  { day: "Apr 26", current: 9200, prev: 8400 },
  { day: "Apr 27", current: 8400, prev: 7900 },
  { day: "Apr 28", current: 5400, prev: 5100 },
  { day: "Apr 29", current: 5000, prev: 4700 },
  { day: "Apr 30", current: 5900, prev: 5500 },
  { day: "May 1",  current: 6400, prev: 6100 },
  { day: "May 2",  current: 8100, prev: 7600 },
  { day: "May 3",  current: 9800, prev: 9000 },
  { day: "May 4",  current: 8900, prev: 8200 },
  { day: "May 5",  current: 5600, prev: 5200 },
  { day: "May 6",  current: 5200, prev: 4900 },
  { day: "May 7",  current: 6100, prev: 5700 },
  { day: "May 8",  current: 6600, prev: 6200 },
  { day: "May 9",  current: 8500, prev: 7800 },
  { day: "May 10", current: 10200, prev: 9300 },
  { day: "May 11", current: 9100, prev: 8500 },
  { day: "May 12", current: 5800, prev: 5400 },
  { day: "May 13", current: 5400, prev: 5000 },
  { day: "May 14", current: 6300, prev: 5900 },
  { day: "May 15", current: 6900, prev: 6400 },
  { day: "May 16", current: 8800, prev: 8100 },
  { day: "May 17", current: 10600, prev: 9700 },
  { day: "May 18", current: 9400, prev: 8700 },
  { day: "May 19", current: 6200, prev: 5700 },
  { day: "May 20", current: 5800, prev: 5300 },
];

// 30-day customer sign-ups series (same date range as SALES_SERIES_30).
export const SIGNUPS_SERIES_30 = [
  { day: "Apr 21", current: 12, prev: 10 },
  { day: "Apr 22", current: 10, prev: 11 },
  { day: "Apr 23", current: 14, prev: 12 },
  { day: "Apr 24", current: 15, prev: 13 },
  { day: "Apr 25", current: 20, prev: 17 },
  { day: "Apr 26", current: 24, prev: 20 },
  { day: "Apr 27", current: 22, prev: 19 },
  { day: "Apr 28", current: 13, prev: 11 },
  { day: "Apr 29", current: 11, prev: 10 },
  { day: "Apr 30", current: 14, prev: 13 },
  { day: "May 1",  current: 16, prev: 14 },
  { day: "May 2",  current: 21, prev: 18 },
  { day: "May 3",  current: 26, prev: 22 },
  { day: "May 4",  current: 23, prev: 20 },
  { day: "May 5",  current: 14, prev: 12 },
  { day: "May 6",  current: 12, prev: 11 },
  { day: "May 7",  current: 16, prev: 14 },
  { day: "May 8",  current: 17, prev: 15 },
  { day: "May 9",  current: 22, prev: 19 },
  { day: "May 10", current: 28, prev: 24 },
  { day: "May 11", current: 25, prev: 22 },
  { day: "May 12", current: 15, prev: 13 },
  { day: "May 13", current: 13, prev: 11 },
  { day: "May 14", current: 17, prev: 15 },
  { day: "May 15", current: 18, prev: 16 },
  { day: "May 16", current: 23, prev: 20 },
  { day: "May 17", current: 29, prev: 25 },
  { day: "May 18", current: 26, prev: 23 },
  { day: "May 19", current: 18, prev: 15 },
  { day: "May 20", current: 16, prev: 14 },
];

export const REVENUE_BY_CATEGORY = [
  { label: "Hoodies", value: 48_200, color: "#1d4ed8" },
  { label: "T-Shirts", value: 32_800, color: "#0ea5e9" },
  { label: "Shorts", value: 21_400, color: "#10b981" },
  { label: "Joggers", value: 19_600, color: "#f59e0b" },
  { label: "Accessories", value: 9_100, color: "#a855f7" },
];

export const TOP_PRODUCTS = [
  { id: "p-1", name: "Bright White Hoodie", units: 312, revenue: 18_720 },
  { id: "p-2", name: "Deep Blue Pullover", units: 264, revenue: 15_840 },
  { id: "p-3", name: "Fresh Green Tee", units: 230, revenue: 6_900 },
  { id: "p-4", name: "Stone Grey Shorts", units: 198, revenue: 7_920 },
  { id: "p-5", name: "Sand Cap", units: 142, revenue: 2_840 },
];

export const RECENT_ORDERS = [
  { id: "RP-10293", customer: "Lina Haddad", total: 124.5, status: "prepared", placed: "2026-05-19 09:14" },
  { id: "RP-10292", customer: "Omar Saleh", total: 64.0, status: "handed_to_delivery", placed: "2026-05-19 08:51" },
  { id: "RP-10291", customer: "Maya Khoury", total: 219.9, status: "processing", placed: "2026-05-19 08:32" },
  { id: "RP-10290", customer: "Ali Rashid", total: 39.5, status: "delivered", placed: "2026-05-18 22:08" },
  { id: "RP-10289", customer: "Noor Zaid", total: 188.7, status: "cancelled", placed: "2026-05-18 19:44" },
  { id: "RP-10288", customer: "Yara Saad", total: 76.2, status: "delivered", placed: "2026-05-18 18:20" },
];

export const LOW_STOCK = [
  { product: "Bright White Hoodie", variant: "S / White", qty: 3, threshold: 10 },
  { product: "Bright White Hoodie", variant: "M / White", qty: 4, threshold: 10 },
  { product: "Deep Blue Pullover", variant: "L / Navy", qty: 2, threshold: 8 },
  { product: "Stone Grey Shorts", variant: "M / Stone", qty: 1, threshold: 10 },
  { product: "Fresh Green Tee", variant: "XL / Sage", qty: 5, threshold: 12 },
];

export const MAJOR_CATEGORIES = [
  { id: "mc-1", name: "Women", slug: "women", visible: true, productCount: 48, order: 1 },
  { id: "mc-2", name: "Men", slug: "men", visible: true, productCount: 53, order: 2 },
  { id: "mc-3", name: "Kids", slug: "kids", visible: true, productCount: 21, order: 3 },
  { id: "mc-4", name: "Sale", slug: "sale", visible: true, productCount: 19, order: 4 },
  { id: "mc-5", name: "Archive", slug: "archive", visible: false, productCount: 7, order: 5 },
];

export const SUB_CATEGORIES = [
  { id: "sc-1", majorId: "mc-1", name: "Hoodies", slug: "hoodies", visible: true, productCount: 14, order: 1 },
  { id: "sc-2", majorId: "mc-1", name: "T-Shirts", slug: "tees", visible: true, productCount: 18, order: 2 },
  { id: "sc-3", majorId: "mc-1", name: "Shorts", slug: "shorts", visible: true, productCount: 9, order: 3 },
  { id: "sc-4", majorId: "mc-1", name: "Joggers", slug: "joggers", visible: false, productCount: 7, order: 4 },
  { id: "sc-5", majorId: "mc-2", name: "Hoodies", slug: "hoodies", visible: true, productCount: 16, order: 1 },
  { id: "sc-6", majorId: "mc-2", name: "T-Shirts", slug: "tees", visible: true, productCount: 22, order: 2 },
  { id: "sc-7", majorId: "mc-2", name: "Shorts", slug: "shorts", visible: true, productCount: 8, order: 3 },
  { id: "sc-8", majorId: "mc-2", name: "Joggers", slug: "joggers", visible: true, productCount: 7, order: 4 },
  { id: "sc-9", majorId: "mc-3", name: "T-Shirts", slug: "tees", visible: true, productCount: 11, order: 1 },
  { id: "sc-10", majorId: "mc-3", name: "Hoodies", slug: "hoodies", visible: true, productCount: 10, order: 2 },
  { id: "sc-11", majorId: "mc-4", name: "Hoodies", slug: "hoodies", visible: true, productCount: 9, order: 1 },
  { id: "sc-12", majorId: "mc-4", name: "T-Shirts", slug: "tees", visible: true, productCount: 10, order: 2 },
];

export const COLORS = [
  { id: "c-1", name: "Bright White", hex: "#f5f5f4" },
  { id: "c-2", name: "Deep Blue", hex: "#1e3a8a" },
  { id: "c-3", name: "Fresh Green", hex: "#22c55e" },
  { id: "c-4", name: "Stone Grey", hex: "#a8a29e" },
  { id: "c-5", name: "Onyx", hex: "#111111" },
  { id: "c-6", name: "Sand", hex: "#d6c7a3" },
];

export const SIZES = [
  { id: "s-1", label: "XS" },
  { id: "s-2", label: "S" },
  { id: "s-3", label: "M" },
  { id: "s-4", label: "L" },
  { id: "s-5", label: "XL" },
  { id: "s-6", label: "XXL" },
];

export const PRODUCTS = [
  {
    id: "p-1",
    name: "Bright White Hoodie",
    subtitle: "72% recycled polyester • 8% premium elastane",
    composition: [{ pct: 72, material: "recycled polyester" }, { pct: 8, material: "premium elastane" }],
    subId: "sc-1",
    price: 60,
    visible: true,
    labels: ["Best Seller", "Most Popular"],
    materials: { recycledPolyester: 72, premiumElastane: 8, performanceGuaranteed: 100 },
    description: "A heavyweight hoodie cut from recycled fleece, built to outlast the trend cycle.",
    details: [
      { title: "Lightweight construction", desc: "Engineered for breathability without sacrificing warmth." },
      { title: "Anti-pill finish", desc: "Holds its shape and surface through 50+ home washes." },
    ],
    images: 4,
    variants: [
      { color: "Bright White", size: "S", qty: 3 },
      { color: "Bright White", size: "M", qty: 4 },
      { color: "Bright White", size: "L", qty: 22 },
      { color: "Bright White", size: "XL", qty: 18 },
    ],
    totalStock: 47,
  },
  {
    id: "p-2",
    name: "Deep Blue Pullover",
    subtitle: "65% recycled polyester • 10% premium elastane",
    composition: [{ pct: 65, material: "recycled polyester" }, { pct: 10, material: "premium elastane" }],
    subId: "sc-5",
    price: 60,
    visible: true,
    labels: ["Best Seller"],
    materials: { recycledPolyester: 65, premiumElastane: 10, performanceGuaranteed: 100 },
    description: "Premium midweight pullover with a clean silhouette.",
    details: [{ title: "Premium elastane blend", desc: "Retains shape across long wear days." }],
    images: 3,
    variants: [
      { color: "Deep Blue", size: "M", qty: 14 },
      { color: "Deep Blue", size: "L", qty: 2 },
      { color: "Deep Blue", size: "XL", qty: 11 },
    ],
    totalStock: 27,
  },
  {
    id: "p-3",
    name: "Fresh Green Tee",
    subtitle: "80% recycled polyester • 5% premium elastane",
    composition: [{ pct: 80, material: "recycled polyester" }, { pct: 5, material: "premium elastane" }],
    subId: "sc-6",
    price: 30,
    visible: true,
    labels: ["New Arrival"],
    materials: { recycledPolyester: 80, premiumElastane: 5, performanceGuaranteed: 95 },
    description: "Soft-touch tee in a refreshing sage hue.",
    details: [{ title: "Soft-touch fabric", desc: "Hand-feel that holds across washes." }],
    images: 2,
    variants: [
      { color: "Fresh Green", size: "S", qty: 19 },
      { color: "Fresh Green", size: "M", qty: 24 },
      { color: "Fresh Green", size: "L", qty: 12 },
      { color: "Fresh Green", size: "XL", qty: 5 },
    ],
    totalStock: 60,
  },
  {
    id: "p-4",
    name: "Stone Grey Shorts",
    subtitle: "Four-way stretch training shorts",
    composition: [],
    subId: "sc-7",
    price: 40,
    visible: true,
    labels: ["Low Stock"],
    materials: { recycledPolyester: 70, premiumElastane: 12, performanceGuaranteed: 100 },
    description: "Tailored training shorts with a four-way stretch.",
    details: [{ title: "Four-way stretch", desc: "Move freely in any direction." }],
    images: 2,
    variants: [
      { color: "Stone Grey", size: "S", qty: 8 },
      { color: "Stone Grey", size: "M", qty: 1 },
      { color: "Stone Grey", size: "L", qty: 6 },
    ],
    totalStock: 15,
  },
  {
    id: "p-5",
    name: "Sand Cap",
    subtitle: "100% recycled polyester",
    composition: [{ pct: 100, material: "recycled polyester" }],
    subId: "sc-2",
    price: 20,
    visible: true,
    labels: [],
    materials: { recycledPolyester: 100, premiumElastane: 0, performanceGuaranteed: 90 },
    description: "Unstructured 6-panel cap with curved brim.",
    details: [{ title: "Adjustable strap", desc: "One-size-fits-most webbing back." }],
    images: 1,
    variants: [
      { color: "Sand", size: "M", qty: 60 },
    ],
    totalStock: 60,
  },
  {
    id: "p-6",
    name: "Onyx Joggers",
    subtitle: "68% recycled polyester • 14% premium elastane",
    composition: [{ pct: 68, material: "recycled polyester" }, { pct: 14, material: "premium elastane" }],
    subId: "sc-8",
    price: 70,
    visible: false,
    labels: ["Most Popular"],
    materials: { recycledPolyester: 68, premiumElastane: 14, performanceGuaranteed: 100 },
    description: "Tapered joggers with reinforced knees.",
    details: [{ title: "Reinforced knees", desc: "Built for high-mileage wear." }],
    images: 3,
    variants: [
      { color: "Onyx", size: "M", qty: 9 },
      { color: "Onyx", size: "L", qty: 14 },
      { color: "Onyx", size: "XL", qty: 7 },
    ],
    totalStock: 30,
  },
];

export const ORDERS = [
  {
    id: "RP-10293",
    customer: { name: "Lina Haddad", email: "lina@example.com", phone: "+962-79-555-0102" },
    items: [
      { product: "Bright White Hoodie", color: "Bright White", size: "M", qty: 1, price: 60 },
      { product: "Sand Cap", color: "Sand", size: "M", qty: 1, price: 20 },
      { product: "Stone Grey Shorts", color: "Stone Grey", size: "L", qty: 1, price: 40 },
    ],
    address: "Rainbow St 42, Amman, Jordan",
    payment: "paid",
    status: "prepared",
    total: 124.5,
    placed: "2026-05-19 09:14",
    history: [
      { at: "2026-05-19 09:14", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 10:05", from: "processing", to: "prepared", by: "admin@repair.app" },
    ],
  },
  {
    id: "RP-10292",
    customer: { name: "Omar Saleh", email: "omar@example.com", phone: "+962-79-555-0103" },
    items: [{ product: "Fresh Green Tee", color: "Fresh Green", size: "L", qty: 2, price: 30 }],
    address: "Khalda 17, Amman, Jordan",
    payment: "paid",
    status: "handed_to_delivery",
    total: 64.0,
    placed: "2026-05-19 08:51",
    history: [
      { at: "2026-05-19 08:51", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 10:11", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 10:45", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
    ],
  },
  {
    id: "RP-10291",
    customer: { name: "Maya Khoury", email: "maya@example.com", phone: "+962-79-555-0104" },
    items: [
      { product: "Deep Blue Pullover", color: "Deep Blue", size: "L", qty: 3, price: 60 },
      { product: "Sand Cap", color: "Sand", size: "M", qty: 2, price: 20 },
    ],
    address: "Abdoun Circle 8, Amman, Jordan",
    payment: "pending",
    status: "processing",
    total: 219.9,
    placed: "2026-05-19 08:32",
    history: [{ at: "2026-05-19 08:32", from: null, to: "processing", by: "system" }],
  },
  {
    id: "RP-10290",
    customer: { name: "Ali Rashid", email: "ali@example.com", phone: "+962-79-555-0105" },
    items: [{ product: "Sand Cap", color: "Sand", size: "M", qty: 2, price: 20 }],
    address: "Sweifieh 21, Amman, Jordan",
    payment: "paid",
    status: "delivered",
    total: 39.5,
    placed: "2026-05-18 22:08",
    history: [
      { at: "2026-05-18 22:08", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 07:45", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 08:00", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
      { at: "2026-05-19 14:18", from: "handed_to_delivery", to: "delivered", by: "delivery@repair.app" },
    ],
  },
  {
    id: "RP-10289",
    customer: { name: "Noor Zaid", email: "noor@example.com", phone: "+962-79-555-0106" },
    items: [{ product: "Onyx Joggers", color: "Onyx", size: "L", qty: 2, price: 70 }],
    address: "Jabal Amman 14, Amman, Jordan",
    payment: "refunded",
    status: "cancelled",
    total: 188.7,
    placed: "2026-05-18 19:44",
    history: [
      { at: "2026-05-18 19:44", from: null, to: "processing", by: "system" },
      { at: "2026-05-18 20:01", from: "processing", to: "cancelled", by: "noor@example.com" },
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
    payment: "paid",
    status: "delivered",
    total: 76.2,
    placed: "2026-05-18 18:20",
    history: [
      { at: "2026-05-18 18:20", from: null, to: "processing", by: "system" },
      { at: "2026-05-19 09:00", from: "processing", to: "prepared", by: "admin@repair.app" },
      { at: "2026-05-19 09:20", from: "prepared", to: "handed_to_delivery", by: "admin@repair.app" },
      { at: "2026-05-19 14:40", from: "handed_to_delivery", to: "delivered", by: "delivery@repair.app" },
    ],
  },
];

export const PROMO_CODES = [
  {
    id: "pc-1",
    code: "WELCOME10",
    type: "percentage",
    amount: 10,
    minOrder: 50,
    usageLimit: 1000,
    used: 312,
    expires: "2026-12-31",
    active: true,
  },
  {
    id: "pc-2",
    code: "SUMMER25",
    type: "percentage",
    amount: 25,
    minOrder: 100,
    usageLimit: 500,
    used: 198,
    expires: "2026-08-31",
    active: true,
  },
  {
    id: "pc-3",
    code: "FREESHIP",
    type: "fixed",
    amount: 5,
    minOrder: 0,
    usageLimit: 0,
    used: 1043,
    expires: "2026-06-30",
    active: true,
  },
  {
    id: "pc-4",
    code: "WINTERBYE",
    type: "fixed",
    amount: 15,
    minOrder: 80,
    usageLimit: 200,
    used: 200,
    expires: "2026-02-28",
    active: false,
  },
];

export const DISCOUNTS = [
  {
    id: "d-1",
    scope: "product",
    target: "Bright White Hoodie",
    type: "percentage",
    amount: 20,
    starts: "2026-05-01",
    ends: "2026-05-31",
    active: true,
  },
  {
    id: "d-2",
    scope: "sub-category",
    target: "Men · Hoodies",
    type: "percentage",
    amount: 15,
    starts: "2026-05-10",
    ends: "2026-06-10",
    active: true,
  },
  {
    id: "d-3",
    scope: "major-category",
    target: "Sale",
    type: "percentage",
    amount: 30,
    starts: "2026-05-15",
    ends: "2026-05-30",
    active: true,
  },
  {
    id: "d-4",
    scope: "product",
    target: "Onyx Joggers",
    type: "fixed",
    amount: 10,
    starts: "2026-04-01",
    ends: "2026-04-30",
    active: false,
  },
];

export const USERS = [
  { id: "u-1", name: "Sarah Admin", email: "admin@repair.app", role: "admin", active: true, joined: "2025-09-12", marketingOptIn: false },
  { id: "u-2", name: "Karim Logistics", email: "delivery@repair.app", role: "delivery", active: true, joined: "2025-10-02", marketingOptIn: false },
  { id: "u-3", name: "Hala Books", email: "accounting@repair.app", role: "accounting", active: true, joined: "2025-11-19", marketingOptIn: false },
  { id: "u-4", name: "Lina Haddad", email: "lina@example.com", role: "customer", active: true, joined: "2026-01-04", marketingOptIn: true },
  { id: "u-5", name: "Omar Saleh", email: "omar@example.com", role: "customer", active: true, joined: "2026-02-22", marketingOptIn: true },
  { id: "u-6", name: "Maya Khoury", email: "maya@example.com", role: "customer", active: false, joined: "2026-03-15", marketingOptIn: false },
  { id: "u-7", name: "Ali Rashid", email: "ali@example.com", role: "customer", active: true, joined: "2026-04-09", marketingOptIn: true },
  { id: "u-8", name: "Yara Saad", email: "yara@example.com", role: "customer", active: true, joined: "2026-05-01", marketingOptIn: true },
];

// Aggregate for BroadcastComposer audience label — reflects the full customer base,
// not just the seed rows above.
export const MARKETING_OPT_IN_COUNT = 1203;

export const BROADCAST_HISTORY = [
  { id: "b-1", subject: "Summer 25% Off — Today Only", sent: "2026-05-10 10:00", recipients: 1842, audience: "all", status: "delivered", openRate: 42.3, clickRate: 8.7 },
  { id: "b-2", subject: "New Arrivals: Bright White Collection", sent: "2026-04-28 09:30", recipients: 1760, audience: "all", status: "delivered", openRate: 38.1, clickRate: 6.2 },
  { id: "b-3", subject: "We're Hiring Delivery Partners", sent: "2026-04-12 14:15", recipients: 1690, audience: "all", status: "delivered", openRate: 29.5, clickRate: 3.1 },
  { id: "b-4", subject: "Exclusive Offer for Subscribers", sent: "2026-05-05 11:00", recipients: 1203, audience: "marketing", status: "delivered", openRate: 51.2, clickRate: 14.6 },
  { id: "b-5", subject: "Your Early Access Is Here", sent: "2026-04-20 09:00", recipients: 1189, audience: "marketing", status: "delivered", openRate: 48.7, clickRate: 11.3 },
];

export const CONTACT_MESSAGES = [
  {
    id: "cm-1",
    firstName: "Sara",
    lastName: "Ahmed",
    email: "sara.ahmed@example.com",
    phone: "+962 79 123 4567",
    message: "Hello, I placed an order two weeks ago (order #1234) and have not received it yet. I have tried reaching out by email but have not heard back. Could you please look into this for me? I am starting to get worried.",
    date: "2026-05-19",
    status: "unread",
  },
  {
    id: "cm-2",
    firstName: "Khalid",
    lastName: "Mansour",
    email: "khalid.mansour@example.com",
    phone: "+962 77 456 7890",
    message: "I received my order yesterday but one of the items was the wrong size. I ordered a Large but received a Medium. I would like to exchange it. What is the return process? Please advise.",
    date: "2026-05-18",
    status: "unread",
  },
  {
    id: "cm-3",
    firstName: "Nour",
    lastName: "Hassan",
    email: "nour.hassan@example.com",
    phone: "+962 78 987 6543",
    message: "I have a question about your return policy. The website says 14 days but I saw something else on social media. Can you clarify? I want to return a jacket I bought last week.",
    date: "2026-05-17",
    status: "read",
  },
  {
    id: "cm-4",
    firstName: "Ahmad",
    lastName: "Zreiqat",
    email: "ahmad.zreiqat@example.com",
    phone: "+962 79 321 0987",
    message: "Just wanted to say your new Bright White collection is absolutely stunning. I bought three pieces and the quality exceeded my expectations. Keep up the great work!",
    date: "2026-05-16",
    status: "replied",
  },
  {
    id: "cm-5",
    firstName: "Lina",
    lastName: "Barakat",
    email: "lina.barakat@example.com",
    phone: "+962 77 654 3210",
    message: "Hi, I am trying to complete a purchase but the checkout page keeps showing an error. I have tried two different cards and both are valid. Please help, I really want to place this order.",
    date: "2026-05-15",
    status: "replied",
  },
  {
    id: "cm-6",
    firstName: "Omar",
    lastName: "Khalil",
    email: "omar.khalil@example.com",
    phone: "+962 78 111 2233",
    message: "Do you offer corporate bulk orders? We are looking to purchase uniforms for a team of 40 people. If so, is there a discount available for large quantities? Please contact me.",
    date: "2026-05-13",
    status: "read",
  },
  {
    id: "cm-7",
    firstName: "Reem",
    lastName: "Najjar",
    email: "reem.najjar@example.com",
    phone: "+962 79 444 5566",
    message: "My promo code SUMMER25 is not working at checkout. The site says it is invalid but I received it in your newsletter this morning. Can you please fix this or send me a new code?",
    date: "2026-05-12",
    status: "replied",
  },
  {
    id: "cm-8",
    firstName: "Fadi",
    lastName: "Touma",
    email: "fadi.touma@example.com",
    phone: "+962 77 778 8990",
    message: "Wanted to ask about delivery to Aqaba. Your website shows Amman and Zarqa but I do not see Aqaba listed. Do you ship there? If yes, what is the estimated delivery time and cost?",
    date: "2026-05-10",
    status: "archived",
  },
  {
    id: "cm-9",
    firstName: "Maya",
    lastName: "Issa",
    email: "maya.issa@example.com",
    phone: "+962 78 222 3344",
    message: "I signed up for your newsletter but have not received anything yet. It has been three days. Please check my subscription. My email is maya.issa@example.com.",
    date: "2026-05-08",
    status: "archived",
  },
];

export const STOCK_ALERTS = [
  {
    id: "sa-1",
    customer: { name: "Rania Khalil", email: "rania.k@example.com" },
    product: "Bright White Hoodie",
    color: "Bright White",
    size: "S",
    requestedAt: "2026-05-20",
    status: "pending",
  },
  {
    id: "sa-2",
    customer: { name: "Tarek Nasser", email: "tarek.n@example.com" },
    product: "Onyx Joggers",
    color: "Onyx",
    size: "S",
    requestedAt: "2026-05-20",
    status: "pending",
  },
  {
    id: "sa-3",
    customer: { name: "Dina Farouk", email: "dina.f@example.com" },
    product: "Deep Blue Pullover",
    color: "Deep Blue",
    size: "S",
    requestedAt: "2026-05-19",
    status: "pending",
  },
  {
    id: "sa-4",
    customer: { name: "Sami Houri", email: "sami.h@example.com" },
    product: "Stone Grey Shorts",
    color: "Stone Grey",
    size: "XS",
    requestedAt: "2026-05-18",
    status: "pending",
  },
  {
    id: "sa-5",
    customer: { name: "Lara Bitar", email: "lara.b@example.com" },
    product: "Fresh Green Tee",
    color: "Fresh Green",
    size: "XS",
    requestedAt: "2026-05-17",
    status: "notified",
  },
  {
    id: "sa-6",
    customer: { name: "Ziad Mansour", email: "ziad.m@example.com" },
    product: "Bright White Hoodie",
    color: "Bright White",
    size: "XS",
    requestedAt: "2026-05-16",
    status: "notified",
  },
  {
    id: "sa-7",
    customer: { name: "Hana Ayyoub", email: "hana.a@example.com" },
    product: "Sand Cap",
    color: "Sand",
    size: "S",
    requestedAt: "2026-05-14",
    status: "dismissed",
  },
  {
    id: "sa-8",
    customer: { name: "Firas Khoury", email: "firas.k@example.com" },
    product: "Onyx Joggers",
    color: "Onyx",
    size: "XS",
    requestedAt: "2026-05-12",
    status: "dismissed",
  },
];

export const ORDER_STATUSES = [
  { key: "processing", label: "Processing" },
  { key: "prepared", label: "Prepared" },
  { key: "handed_to_delivery", label: "With Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

export const STATUS_TONE = {
  pending: { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
  processing: { bg: "#dbeafe", fg: "#1e40af", dot: "#1d4ed8" },
  prepared: { bg: "#ccfbf1", fg: "#065f46", dot: "#0d9488" },
  handed_to_delivery: { bg: "#e0e7ff", fg: "#3730a3", dot: "#4f46e5" },
  dispatched: { bg: "#e0e7ff", fg: "#3730a3", dot: "#4f46e5" },
  delivered: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  cancelled: { bg: "#fee2e2", fg: "#991b1b", dot: "#dc2626" },
  returned: { bg: "#f3e8ff", fg: "#6b21a8", dot: "#a855f7" },
  paid: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  refunded: { bg: "#fee2e2", fg: "#991b1b", dot: "#dc2626" },
  active: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  inactive: { bg: "#f4f4f5", fg: "#52525b", dot: "#71717a" },
  admin: { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
  delivery: { bg: "#dbeafe", fg: "#1e40af", dot: "#1d4ed8" },
  accounting: { bg: "#f3e8ff", fg: "#6b21a8", dot: "#a855f7" },
  customer: { bg: "#f4f4f5", fg: "#52525b", dot: "#71717a" },
  unread: { bg: "#dbeafe", fg: "#1e40af", dot: "#1d4ed8" },
  read: { bg: "#f4f4f5", fg: "#52525b", dot: "#71717a" },
  replied: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  archived: { bg: "#f1f5f9", fg: "#94a3b8", dot: "#cbd5e1" },
  notified: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  dismissed: { bg: "#f1f5f9", fg: "#94a3b8", dot: "#cbd5e1" },
  unsubscribed: { bg: "#f1f5f9", fg: "#64748b", dot: "#94a3b8" },
};

export function formatCurrency(n) {
  return `JOD ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(n) {
  return Number(n).toLocaleString("en-US");
}

// ------------------------------------------------------------------
// Filter taxonomies (#1): Materials + Types used by the /shop filter
// drawer. Editing these here drives both the admin Taxonomies page and
// the storefront filter facets — keep one list, not two.

export const MATERIALS = [
  { id: "mat-1", name: "Cotton" },
  { id: "mat-2", name: "Polyester" },
  { id: "mat-3", name: "Nylon" },
  { id: "mat-4", name: "Spandex" },
  { id: "mat-5", name: "Elastane" },
];

// (Note) Product "type" is intentionally NOT a separate taxonomy — the
// customer-facing type facet on /shop is the product's sub-category. The
// admin manages sub-categories on the Categories page; the Taxonomies
// page renders a read-only view of them as the "Product Types" reference.

// ------------------------------------------------------------------
// Curated collections (#4): the special tabs on /shop that aren't
// regular major categories — Sale / Just Dropped (weekly + monthly) /
// Discover All featured. A product can belong to many collections.

export const COLLECTIONS = [
  { id: "col-sale", name: "Sale", description: "Featured in the Sale tab and shown with the sale price." },
  { id: "col-jd-weekly", name: "Just Dropped — This Week", description: "Surfaces in Just Dropped > This week." },
  { id: "col-jd-monthly", name: "Just Dropped — This Month", description: "Surfaces in Just Dropped > This month." },
  { id: "col-discover", name: "Featured on Discover All", description: "Promoted to the top of Discover All." },
];

// ------------------------------------------------------------------
// Newsletter subscribers (#10) — mock list. Status: active | unsubscribed.

export const NEWSLETTER_SUBSCRIBERS = [
  { id: "sub-1", email: "ella.m@gmail.com",    signedUp: "2026-05-19 14:02", status: "active",       source: "footer" },
  { id: "sub-2", email: "noah.k@outlook.com",  signedUp: "2026-05-18 09:31", status: "active",       source: "checkout" },
  { id: "sub-3", email: "salma.h@gmail.com",   signedUp: "2026-05-17 22:10", status: "active",       source: "footer" },
  { id: "sub-4", email: "tarek.b@example.com", signedUp: "2026-05-16 11:48", status: "unsubscribed", source: "footer" },
  { id: "sub-5", email: "leila.f@gmail.com",   signedUp: "2026-05-15 08:55", status: "active",       source: "popup" },
  { id: "sub-6", email: "rami.j@outlook.com",  signedUp: "2026-05-14 19:22", status: "active",       source: "checkout" },
  { id: "sub-7", email: "sara.q@example.com",  signedUp: "2026-05-13 17:04", status: "active",       source: "footer" },
  { id: "sub-8", email: "khaled.n@gmail.com",  signedUp: "2026-05-12 13:11", status: "active",       source: "popup" },
  { id: "sub-9", email: "huda.a@gmail.com",    signedUp: "2026-05-11 10:33", status: "unsubscribed", source: "footer" },
  { id: "sub-10", email: "omar.t@example.com", signedUp: "2026-05-10 08:18", status: "active",       source: "footer" },
  { id: "sub-11", email: "yasmin.r@gmail.com", signedUp: "2026-05-09 21:50", status: "active",       source: "checkout" },
  { id: "sub-12", email: "fadi.s@example.com", signedUp: "2026-05-08 14:42", status: "active",       source: "footer" },
];

// ------------------------------------------------------------------
// Storefront content (#11): every hardcoded marketing surface lives
// here so the admin page can drive what customers see. Mock-only —
// frontend reads at module level; admin writes update local useState.

export const STOREFRONT_HERO = {
  eyebrow: "ENGINEERED FOR PERFORMANCE",
  title: "MOVE WITHOUT LIMITS",
  subtitle: "Premium athletic wear engineered for every workout.",
  ctaLabel: "EXPLORE COLLECTION",
  ctaHref: "/shop",
  image: "/home/hero.jpg",
};

export const STOREFRONT_COLORWAYS = [
  {
    id: "cw-1",
    image: "/home/bright-white.png",
    imageAlt: "Bright White colorway",
    badge: "",
    reversed: false,
    multiSwatch: true,
    ctaLabel: "SELECT YOUR COLOR",
    swatches: [
      { color: "#11191f", name: "Midnight Black", tagline: "Timeless. Versatile. Essential." },
      { color: "#ffffff", name: "Bright White", tagline: "Bold. Modern. Dynamic." },
    ],
  },
  {
    id: "cw-2",
    image: "/home/deep-blue.png",
    imageAlt: "Deep Blue colorway",
    badge: "UNISEX",
    reversed: true,
    multiSwatch: false,
    ctaLabel: "ADD TO CART",
    swatches: [{ color: "#11233f", name: "Deep Blue", tagline: "Pure. Clean. Confident." }],
  },
  {
    id: "cw-3",
    image: "/home/fresh-green.png",
    imageAlt: "Fresh Green colorway",
    badge: "UNISEX",
    reversed: false,
    multiSwatch: false,
    ctaLabel: "ADD TO CART",
    swatches: [{ color: "#a8c0b2", name: "Fresh Green", tagline: "Sleek. Sophisticated. Powerful." }],
  },
];

export const STOREFRONT_STATS = [
  { id: "stat-1", value: "10K+",  label: "Happy customers" },
  { id: "stat-2", value: "4.9/5", label: "Average rating" },
  { id: "stat-3", value: "98%",   label: "Repeat orders" },
  { id: "stat-4", value: "24h",   label: "Avg. dispatch" },
];

export const STOREFRONT_BROWSE_TILES = [
  { id: "bt-1", title: "Women",   image: "/home/bright-white.png", href: "/shop?category=women" },
  { id: "bt-2", title: "Men",     image: "/home/deep-blue.png",    href: "/shop?category=men" },
  { id: "bt-3", title: "Sale",    image: "/home/fresh-green.png",  href: "/shop?category=sale" },
];

// Product detail marketing sections that today are hardcoded in
// ProductPageClient.jsx (Crafted to Last, Stays Dry, Move Without
// Limits, Sculpted Support, Four Colorways, The Details). Admin can
// toggle visibility per-section and edit the headline/body copy.
export const STOREFRONT_PRODUCT_SECTIONS = [
  { id: "pds-1", key: "crafted",    title: "Crafted to Last",        body: "Premium materials engineered for the long run.",        enabled: true },
  { id: "pds-2", key: "stays-dry",  title: "Stays Dry. Stays Fresh.", body: "Moisture-wicking fabric that breathes through the hardest sets.", enabled: true },
  { id: "pds-3", key: "move",       title: "Move Without Limits",    body: "Four-way stretch that moves in every direction.",       enabled: true },
  { id: "pds-4", key: "sculpted",   title: "Sculpted Support",        body: "Compression that contours without constricting.",      enabled: true },
  { id: "pds-5", key: "colorways",  title: "Four Colorways. One Vision.", body: "Pick the palette that matches the way you train.", enabled: true },
  { id: "pds-6", key: "details",    title: "The Details",            body: "The little decisions that add up to a piece you reach for.", enabled: true },
];

export const STOREFRONT_FOOTER = {
  brandCopy: "Engineered for performance, designed for life. We create premium athletic wear for the modern mover.",
  social: [
    { id: "soc-1", network: "Instagram", url: "https://instagram.com/repair" },
    { id: "soc-2", network: "Twitter",   url: "https://twitter.com/repair" },
    { id: "soc-3", network: "Facebook",  url: "https://facebook.com/repair" },
  ],
  columns: [
    { id: "col-shop", heading: "Shop", links: [
      { id: "l-1", label: "New Arrivals",  href: "/shop?category=just-dropped" },
      { id: "l-2", label: "Best Sellers",  href: "/shop?category=discover-all" },
      { id: "l-3", label: "Men",            href: "/shop?category=men" },
      { id: "l-4", label: "Women",          href: "/shop?category=women" },
      { id: "l-5", label: "Accessories",    href: "/shop?category=discover-all&sub=accessories" },
    ]},
    { id: "col-help", heading: "Help", links: [
      { id: "l-6", label: "Shipping & Returns", href: "/help/shipping" },
      { id: "l-7", label: "FAQ",                 href: "/help/faq" },
      { id: "l-8", label: "Size Guide",          href: "/help/sizes" },
      { id: "l-9", label: "Contact Us",          href: "/contact" },
      { id: "l-10", label: "Track Order",        href: "/account/orders" },
    ]},
  ],
};

// ------------------------------------------------------------------
// Coaching cross-sell (#14) shown on /checkout/success.

export const COACHING_CTA = {
  enabled: true,
  eyebrow: "TRAIN WITH AN EXPERT",
  title: "APPLY FOR COACHING",
  body: "1:1 programming from elite athletes. Limited slots open monthly.",
  ctaLabel: "APPLY FOR COACHING",
  ctaHref: "https://repair.app/coaching",
  image: "/cart/coaching-model.png",
};

// ------------------------------------------------------------------
// Wishlist insights (#15): aggregate "most wishlisted" view for admin.
// Mocked here; production should derive from a wishlist count query.

export const WISHLIST_INSIGHTS = [
  { id: "wi-1", productId: "p-1", product: "Bright White Hoodie", wishlistCount: 184, addedLast7Days: 42, inStock: true,  variantsLow: 0 },
  { id: "wi-2", productId: "p-6", product: "Onyx Joggers",        wishlistCount: 162, addedLast7Days: 38, inStock: false, variantsLow: 0 },
  { id: "wi-3", productId: "p-2", product: "Deep Blue Pullover",  wishlistCount: 141, addedLast7Days: 29, inStock: true,  variantsLow: 1 },
  { id: "wi-4", productId: "p-4", product: "Stone Grey Shorts",   wishlistCount: 119, addedLast7Days: 26, inStock: true,  variantsLow: 1 },
  { id: "wi-5", productId: "p-3", product: "Fresh Green Tee",     wishlistCount: 92,  addedLast7Days: 18, inStock: true,  variantsLow: 0 },
  { id: "wi-6", productId: "p-5", product: "Sand Cap",            wishlistCount: 64,  addedLast7Days: 12, inStock: true,  variantsLow: 0 },
];

// ------------------------------------------------------------------
// Settings additions (#6, #7, #8).

export const PAYMENT_METHOD_SETTINGS = [
  { id: "pm-visa",      label: "Visa / Mastercard", description: "Major credit and debit cards.", enabled: true },
  { id: "pm-apple",     label: "Apple Pay",          description: "Tap to pay on supported devices.", enabled: true },
  { id: "pm-google",    label: "Google Pay",         description: "Tap to pay on supported devices.", enabled: true },
  { id: "pm-cod",       label: "Cash on Delivery",   description: "Pay the courier at delivery.",     enabled: true },
];

export const TAX_SETTINGS = {
  rate: 9,
  inclusive: false,
  appliesToShipping: true,
};

export const SHIPPING_METHODS = [
  { id: "sm-standard", key: "standard", name: "Standard Delivery", eta: "3–5 business days", enabled: true,  removable: false },
  { id: "sm-express",  key: "express",  name: "Express Shipping",   eta: "1–2 business days", enabled: true,  removable: false },
  { id: "sm-pickup",   key: "pickup",   name: "Store Pickup",        eta: "Ready in 24 hours", enabled: true,  removable: false },
];

export const PICKUP_LOCATIONS = [
  { id: "loc-1", name: "Abdoun Flagship Store", address: "Abdoun Circle, Building 4, Amman, Jordan", hours: "Sun–Thu 10:00–22:00, Fri–Sat 14:00–22:00" },
];
