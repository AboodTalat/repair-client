"use client";

/**
 * adminDates — LOCAL calendar-date helpers for every admin/accountant date
 * filter that is computed rather than typed.
 *
 * WHY THIS EXISTS — the bug it replaces.
 * The dashboard, the Reports page and the accountant Overview each carried a
 * verbatim copy of:
 *
 *     new Date().toISOString().slice(0, 10)
 *
 * `toISOString()` converts to UTC first, so that returns the **UTC** calendar
 * date, while an admin reading the report means the day where the shop is.
 * These helpers format from the LOCAL calendar fields (`getFullYear` /
 * `getMonth` / `getDate`) instead, so a preset names the store's calendar day.
 *
 * CORRECTION (Aug 2026 QA pass) — the ORIGINAL rationale here was wrong, and it
 * is worth recording because the mistake is easy to repeat. It claimed MySQL
 * bucketed on Amman dates, "verified: SELECT NOW() returns the same wall-clock
 * time as the Node process". That verification was run over a BARE mysql2
 * connection, which inherits the host zone — the exact trap the root CLAUDE.md
 * documents. Through the APP the session is pinned to `+00:00` (database.ts),
 * so `NOW()` IS `UTC_TIMESTAMP()` and every stored `created_at` is UTC.
 * Measured through the app path, not a probe:
 *
 *     app session time_zone = +00:00,  NOW() = UTC_TIMESTAMP() = 18:17:04
 *     the same instant on the Node process clock = 21:17:04 (+03)
 *
 * So the direction of the original bug was inverted: a UTC-derived `todayISO`
 * never dropped the current day. What was real — and what this file alone could
 * not fix — is that the resolvers took these local strings and compared them
 * against UTC timestamps as if they were UTC. An order placed at 01:00 Amman
 * was charted on the previous day and disappeared whenever it fell on the first
 * day of a chosen range (reproduced: filtering to 18 Aug returned nothing for an
 * order created 2026-08-17 22:00Z = 18 Aug 01:00 Amman).
 *
 * That half is now fixed SERVER-SIDE: `reports.ts` and `finance.ts` convert both
 * the range bounds and the GROUP BY key through `REPORT_TZ_SQL` (helpers.ts,
 * default `+03:00`, override with `REPORT_TIMEZONE`). Local calendar dates are
 * therefore the correct thing for this file to emit — the resolvers now read
 * them as store-calendar dates, which is what they always looked like.
 * If `REPORT_TIMEZONE` is ever changed, these client helpers must follow.
 *
 * NOTE — this is only for dates the CLIENT computes. A date typed into an
 * `<input type="date">` is already a local calendar date and needs no
 * conversion, and `priorRange` in adminReports.js is unaffected: it parses and
 * re-formats through UTC symmetrically, so it only ever shifts a date string
 * by whole days regardless of which calendar produced it.
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** A Date → "YYYY-MM-DD" using its LOCAL calendar fields (never UTC). */
export function toLocalISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today, local. Use for a range's `to` and for an input's `max`. */
export function todayISO() {
  return toLocalISODate(new Date());
}

/** `days` calendar days before today, local. `daysAgoISO(6)` + today = 7 days. */
export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalISODate(d);
}

/** January 1st of the current local year — the YTD preset's lower bound. */
export function startOfYearISO() {
  return `${new Date().getFullYear()}-01-01`;
}

/**
 * Format a server timestamp as a local "YYYY-MM-DD" for display.
 * `new Date(ts).toISOString().slice(0,10)` shows the UTC day, which renders an
 * expiry of "1 Sep 01:00" local as "31 Aug". "" for an unparseable value.
 */
export function formatISODate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toLocalISODate(d);
}
