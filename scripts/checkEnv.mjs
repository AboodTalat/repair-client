#!/usr/bin/env node
/**
 * Pre-build environment verification for the storefront.
 *
 *   node scripts/checkEnv.mjs            # report, exit 0
 *   node scripts/checkEnv.mjs --strict   # exit 1 on ERROR
 *
 * --strict is implied when VERCEL_ENV=production or NODE_ENV=production.
 *
 * NEXT_PUBLIC_ values are baked into the client bundle at BUILD time, so a
 * wrong one cannot be fixed by restarting — it needs a rebuild. That is why
 * this runs in `prebuild` rather than at boot.
 *
 * Never prints a value. Key names and verdicts only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGV = process.argv.slice(2);
const STRICT = ARGV.includes("--strict") || process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

// Next.js loads .env.local itself; do it here too so a local run sees the same
// values the build will.
const ENV_PATH = path.join(ROOT, ".env.local");
let envFileText = null;
if (fs.existsSync(ENV_PATH) && !ARGV.includes("--no-dotenv")) {
  envFileText = fs.readFileSync(ENV_PATH, "utf8");
  const { default: dotenv } = await import("dotenv").catch(() => ({ default: null }));
  if (dotenv) dotenv.config({ path: ENV_PATH });
  else {
    for (const line of envFileText.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const findings = [];
const ERROR = (id, message, fix) => findings.push({ level: "ERROR", id, message, fix });
const WARN = (id, message, fix) => findings.push({ level: "WARN", id, message, fix });
const env = (k) => {
  const v = process.env[k];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

const LOOPBACK = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;

// ---------------------------------------------------------------------------
// 1. GraphQL endpoint. repairClientApi.js falls back to the RELATIVE path
//    "/repair/graphql", which on a Vercel deployment resolves against the Next
//    app's own origin — where no such route exists. Unset in production means
//    every browser call 404s, on a build that looks successful.
// ---------------------------------------------------------------------------
const gql = env("NEXT_PUBLIC_REPAIR_GRAPHQL_URL");
if (!gql) {
  ERROR(
    "gql.unset",
    'NEXT_PUBLIC_REPAIR_GRAPHQL_URL is not set. The client falls back to the relative path "/repair/graphql", which on a deployed frontend points at the Next app itself — every browser request 404s.',
    "Set it to the absolute backend URL, e.g. https://api.example.com/repair/graphql",
  );
} else {
  let u = null;
  try { u = new URL(gql); } catch { /* relative */ }
  if (!u) {
    ERROR("gql.relative", "NEXT_PUBLIC_REPAIR_GRAPHQL_URL is a relative path, which resolves against the frontend's own origin rather than the backend.", "Use an absolute https:// URL.");
  } else {
    if (LOOPBACK.test(u.hostname)) ERROR("gql.localhost", "NEXT_PUBLIC_REPAIR_GRAPHQL_URL points at localhost. It is baked into the browser bundle, so every visitor's browser would call their own machine.", "Set it to the public backend origin.");
    else if (u.protocol !== "https:") ERROR("gql.insecure", "NEXT_PUBLIC_REPAIR_GRAPHQL_URL is not https. Browsers block mixed content from an https page.", "Use https://");
    if (!u.pathname.endsWith("/graphql")) WARN("gql.path", 'NEXT_PUBLIC_REPAIR_GRAPHQL_URL does not end in "/graphql". The UploadThing endpoint is derived from it by replacing that suffix, so uploads will point somewhere unintended.', "End the URL with /repair/graphql");
    if (!u.pathname.includes("/repair")) WARN("gql.prefix", 'NEXT_PUBLIC_REPAIR_GRAPHQL_URL does not contain "/repair". The store sub-server is mounted at /repair — /form/graphql is the other product.', "Use /repair/graphql");
  }
}

const api = env("REPAIR_API_URL");
if (api) {
  try {
    const u = new URL(api);
    if (LOOPBACK.test(u.hostname)) ERROR("api.localhost", "REPAIR_API_URL points at localhost. Server-rendered pages would fetch from the deployment's own container and render empty.", "Set it to the backend origin, or unset it to reuse NEXT_PUBLIC_REPAIR_GRAPHQL_URL.");
  } catch {
    ERROR("api.invalid", "REPAIR_API_URL is not a valid absolute URL.", "Use an absolute https:// URL, or unset it.");
  }
}

// ---------------------------------------------------------------------------
// 2. localStorage encryption key. Placeholder values are read from the shipped
//    example file rather than guessed, so this stays correct if the example
//    changes.
// ---------------------------------------------------------------------------
const placeholders = new Set(["change-me", "changeme", "todo", "xxx"]);
try {
  const ex = fs.readFileSync(path.join(ROOT, ".env.local.example"), "utf8");
  for (const line of ex.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (m && m[2].trim()) placeholders.add(m[2].trim().replace(/^["']|["']$/g, ""));
  }
} catch { /* example file optional */ }

const storageKey = env("NEXT_PUBLIC_STORAGE_SECRET_KEY");
if (!storageKey) {
  ERROR("storageKey.unset", "NEXT_PUBLIC_STORAGE_SECRET_KEY is not set.", `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
} else if (placeholders.has(storageKey)) {
  ERROR(
    "storageKey.placeholder",
    "NEXT_PUBLIC_STORAGE_SECRET_KEY is still the placeholder value shipped in .env.local.example, so every environment using the default can decrypt every other environment's stored snapshot.",
    "Generate a distinct random value per environment.",
  );
} else if (storageKey.length < 16) {
  WARN("storageKey.short", `NEXT_PUBLIC_STORAGE_SECRET_KEY is only ${storageKey.length} characters.`, "Use a long random string.");
}

// ---------------------------------------------------------------------------
// 3. ISR — the e2e config sets this to "0" to make assertions deterministic.
//    Shipping that to production disables caching for every visitor.
// ---------------------------------------------------------------------------
if (STRICT && env("NEXT_PUBLIC_STOREFRONT_REVALIDATE") === "0") {
  ERROR("isr.disabled", 'NEXT_PUBLIC_STOREFRONT_REVALIDATE is "0", which disables incremental static regeneration. That is the end-to-end test setting — in production every storefront request re-renders and re-queries.', "Unset it, or set a positive number of seconds.");
}

// ---------------------------------------------------------------------------
// 4. Secrets that do not belong in a frontend deployment.
// ---------------------------------------------------------------------------
const FRONTEND_READS = new Set([
  "NEXT_PUBLIC_REPAIR_GRAPHQL_URL", "NEXT_PUBLIC_STORAGE_SECRET_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_STOREFRONT_REVALIDATE", "NEXT_DIST_DIR", "REPAIR_API_URL",
]);
const SECRETISH = /(PASS|PASSWORD|SECRET|TOKEN|_KEY|APIKEY|PRIVATE)/i;

if (envFileText) {
  const keys = [];
  const counts = new Map();
  for (const line of envFileText.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!m) continue;
    keys.push(m[1]);
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  const dupes = [...counts].filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) ERROR("env.duplicate", `.env.local defines these keys more than once: ${dupes.join(", ")}. The last occurrence wins, so an edit near the top silently does nothing.`, "Keep one definition per key.");

  const strays = keys.filter((k) => !FRONTEND_READS.has(k));
  const secrets = strays.filter((k) => SECRETISH.test(k) && !k.startsWith("NEXT_PUBLIC_"));
  if (secrets.length) {
    ERROR(
      "env.strandedSecret",
      `.env.local carries credentials no frontend code reads: ${secrets.join(", ")}. They are backend values; keeping them here widens the blast radius of the frontend deployment for no benefit.`,
      "Remove them from the frontend environment — they belong only in Server/.env.",
    );
  }
  const rest = strays.filter((k) => !secrets.includes(k));
  if (rest.length) WARN("env.unread", `.env.local sets keys no frontend code reads: ${rest.join(", ")}.`, "Remove them, or correct the spelling.");

  const publicSecrets = keys.filter((k) => k.startsWith("NEXT_PUBLIC_") && /(PASS|PASSWORD|_SECRET$|PRIVATE)/i.test(k));
  if (publicSecrets.length) ERROR("env.publicSecret", `These are NEXT_PUBLIC_ and therefore shipped in the browser bundle, where anyone can read them: ${publicSecrets.join(", ")}.`, "Drop the NEXT_PUBLIC_ prefix and read them server-side only.");
}

// ---------------------------------------------------------------------------
const errors = findings.filter((f) => f.level === "ERROR");
const warns = findings.filter((f) => f.level === "WARN");

if (ARGV.includes("--json")) {
  console.log(JSON.stringify({ strict: STRICT, errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  const C = process.stdout.isTTY ? { r: "\x1b[31m", y: "\x1b[33m", g: "\x1b[32m", d: "\x1b[2m", x: "\x1b[0m" } : { r: "", y: "", g: "", d: "", x: "" };
  console.log(`\nStorefront environment check — ${STRICT ? "STRICT (build gate)" : "advisory"}\n`);
  for (const f of [...errors, ...warns]) {
    console.log(`${f.level === "ERROR" ? `${C.r}ERROR${C.x}` : `${C.y}WARN ${C.x}`}  ${C.d}[${f.id}]${C.x} ${f.message}`);
    console.log(f.fix ? `       ${C.d}fix:${C.x} ${f.fix}\n` : "");
  }
  if (!findings.length) console.log(`${C.g}All checks passed.${C.x}\n`);
  else console.log(`${errors.length} error(s), ${warns.length} warning(s).\n`);
}

process.exit(STRICT && errors.length ? 1 : 0);
