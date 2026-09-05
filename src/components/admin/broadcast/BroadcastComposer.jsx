"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Modal from "@/components/admin/shared/Modal";
import { Field, TextInput, TextArea, Chip, Select } from "@/components/admin/shared/Form";
import { IconSend, IconMail } from "@/components/admin/shared/Icons";
import { formatNumber } from "@/lib/mockAdmin";
import { repairCall } from "@/lib/repairAuthedApi";

// Admin Broadcast Email — WIRED TO BACKEND.
//   Q  myAppAdminBroadcastAudienceCounts  → live size of every segment
//   Q  myAppAdminListBroadcasts           → past sends + per-send delivery counts
//   M  myAppAdminBroadcastEmail           → queues the send, returns { queued, audience_size, truncated }
//
// Audiences are the segments the backend can serve truthfully: All customers,
// behavioural segments derived from order history (Active / Lapsed / VIP), and
// the newsletter list (optionally filtered by signup source). There are no
// open/click metrics — the system has no open/click tracking, so showing them
// would be fabricated.

// MIRRORS `BROADCAST_CAP` in resolvers/admin.ts — keep the two in lockstep.
//
// This sat at 500 after the server was raised to 5000, and the drift was not
// cosmetic: it drives the confirm button's label. For a 1,200-person audience
// the admin clicked a button reading "Confirm — send to 500" and the server
// queued all 1,200. A button that understates the size of an irreversible mass
// email is the worst place for a stale constant to live.
const SEND_CAP = 5000;

// Input bounds, mirroring SUBJECT_MAX / BODY_MAX / PREHEADER_MAX in
// resolvers/admin.ts. Unlike the storefront forms, this composer surfaces the
// resolver's real message through `cleanErr`, so the server is doing the
// enforcing — these exist so the admin sees the limit while writing rather than
// after pressing Send on a long message.
const SUBJECT_MAX = 200;
const BODY_MAX = 20000;
const PREHEADER_MAX = 200;

const AUDIENCE_LABELS = {
  customers: "All customers",
  active: "Active",
  lapsed: "Lapsed",
  vip: "VIP",
  subscribers: "Newsletter subscribers",
  all: "Everyone",
};

// Newsletter-subscriber source sub-filter — narrow the broadcast to one signup
// channel. Values mirror the backend SUBSCRIBER_SOURCES (+ "all" = no filter).
const SUBSCRIBER_SOURCES = [
  { value: "all", label: "All sources" },
  { value: "footer", label: "Footer signup" },
  { value: "checkout", label: "Checkout opt-in" },
  { value: "popup", label: "Site popup" },
];

// Personalization merge tokens the backend substitutes per-recipient (see
// resolvers/admin.ts). `userOnly` tokens have no backing data for the newsletter
// `subscribers` audience (that table has no phone column) so they're hidden when
// that audience is selected — never offer a token that resolves to nothing.
const TOKENS = [
  { token: "{{first_name}}", label: "First name" },
  { token: "{{name}}", label: "Full name" },
  { token: "{{email}}", label: "Email" },
  { token: "{{phone}}", label: "Phone", userOnly: true },
  { token: "{{store_url}}", label: "Store link" },
  { token: "{{unsubscribe_url}}", label: "Unsubscribe link" },
];

// Strip the transport's "repairClientApi <op>: " prefix so the admin sees the
// resolver's own message, not the wire wrapper.
function cleanErr(err) {
  return (
    String(err?.message || "").replace(/^repairClientApi[^:]*:\s*/, "") ||
    "Something went wrong, please try again."
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA");
}

// One truthful delivery state per past broadcast, derived from the linked
// email_notifications counts. With no SMTP configured (dev), rows stay pending
// → "Queued"; once a worker/SMTP delivers them they flip to Delivered.
function deliveryState(r) {
  const sent = r.sent_count || 0;
  const failed = r.failed_count || 0;
  const pending = r.pending_count || 0;
  if (failed > 0 && sent === 0 && pending === 0) return { label: "Failed", color: "#b91c1c" };
  if (failed > 0) return { label: "Partial", color: "#b45309" };
  if (sent > 0 && pending === 0) return { label: "Delivered", color: "#15803d" };
  if (pending > 0 && sent === 0 && failed === 0) return { label: "Queued", color: "#6b7280" };
  return { label: "—", color: "#9ca3af" };
}

export default function BroadcastComposer() {
  const [audienceCounts, setAudienceCounts] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [audience, setAudience] = useState("customers");
  const [subscriberSource, setSubscriberSource] = useState("all");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");

  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [toast, setToast] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  // Live email preview — the backend renders the EXACT email a recipient gets
  // (same template + token engine as the real send) so the panel can never drift
  // from the delivered message.
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Tokens to show as insert-chips — drop the user-only ones for the subscribers
  // audience (no phone data for newsletter rows).
  const visibleTokens = useMemo(
    () => TOKENS.filter((t) => !(t.userOnly && audience === "subscribers")),
    [audience]
  );

  const loadHistory = useCallback(async () => {
    const data = await repairCall("myAppAdminListBroadcasts", { limit: 50 }, { isQuery: true });
    setHistory(Array.isArray(data?.items) ? data.items : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      setMetaError("");
      try {
        const [counts, list] = await Promise.all([
          repairCall("myAppAdminBroadcastAudienceCounts", {}, { isQuery: true }),
          repairCall("myAppAdminListBroadcasts", { limit: 50 }, { isQuery: true }),
        ]);
        if (cancelled) return;
        setAudienceCounts(counts || null);
        setHistory(Array.isArray(list?.items) ? list.items : []);
      } catch (err) {
        if (!cancelled) setMetaError(cleanErr(err));
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Debounced live preview — re-render the real email as the admin types /
  // changes audience (the audience affects token sample values + the appended
  // subscriber unsubscribe line). 350ms keeps it responsive without a request
  // per keystroke.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const vars = { subject: subject.trim(), body: body.trim(), preheader: preheader.trim(), audience };
        if (audience === "subscribers" && subscriberSource !== "all") vars.source = subscriberSource;
        const res = await repairCall("myAppAdminPreviewBroadcast", vars, { isQuery: true });
        if (!cancelled) {
          setPreviewHtml(typeof res?.html === "string" ? res.html : "");
          setPreviewSubject(typeof res?.subject === "string" ? res.subject : "");
          setPreviewError("");
        }
      } catch (err) {
        if (!cancelled) setPreviewError(cleanErr(err));
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [subject, body, preheader, audience, subscriberSource]);

  const fmtCount = useCallback(
    (n) => (audienceCounts ? formatNumber(Number(n) || 0) : "…"),
    [audienceCounts]
  );

  const subCounts = useMemo(() => audienceCounts?.subscribers ?? {}, [audienceCounts]);

  const recipientCount = useMemo(() => {
    if (!audienceCounts) return 0;
    if (audience === "subscribers") return Number(subCounts[subscriberSource]) || 0;
    return Number(audienceCounts[audience]) || 0;
  }, [audienceCounts, audience, subscriberSource, subCounts]);

  const AUDIENCES = useMemo(
    () => [
      { value: "customers", label: `All customers (${fmtCount(audienceCounts?.customers)})` },
      { value: "active", label: `Active — ordered in 30 days (${fmtCount(audienceCounts?.active)})` },
      { value: "lapsed", label: `Lapsed — no order in 90 days (${fmtCount(audienceCounts?.lapsed)})` },
      { value: "vip", label: `VIP — top 10% spend (${fmtCount(audienceCounts?.vip)})` },
      { value: "subscribers", label: `Newsletter subscribers (${fmtCount(subCounts.all)})` },
    ],
    [audienceCounts, subCounts.all, fmtCount]
  );

  const willTruncate = recipientCount > SEND_CAP;
  const canSend = !!subject.trim() && !!body.trim() && !!audienceCounts && recipientCount > 0;

  async function send() {
    if (sending) return;
    setSending(true);
    setSendError("");
    try {
      const vars = { subject: subject.trim(), body: body.trim(), preheader: preheader.trim(), audience };
      if (audience === "subscribers" && subscriberSource !== "all") vars.source = subscriberSource;
      const res = await repairCall("myAppAdminBroadcastEmail", vars, { isQuery: false });

      const queued = Number(res?.queued) || 0;
      const size = Number(res?.audience_size) || queued;
      // Quote the SERVER's numbers, never the local constant — the response is
      // authoritative and cannot drift from what was actually queued.
      setToast(
        res?.truncated
          ? `Queued ${formatNumber(queued)} of ${formatNumber(size)} recipients. Send again to reach the remaining ${formatNumber(Math.max(size - queued, 0))}.`
          : `Broadcast queued to ${formatNumber(queued)} recipient${queued === 1 ? "" : "s"}.`
      );
      setConfirm(false);
      setSubject("");
      setPreheader("");
      setBody("");
      await loadHistory();
    } catch (err) {
      setSendError(cleanErr(err));
    } finally {
      setSending(false);
    }
  }

  const visibleHistory = useMemo(() => {
    if (historyFilter === "newsletter") return history.filter((r) => r.target_audience === "subscribers");
    if (historyFilter === "customers") return history.filter((r) => r.target_audience !== "subscribers");
    return history;
  }, [history, historyFilter]);

  const audienceSummary = `${AUDIENCE_LABELS[audience] ?? audience}${
    audience === "subscribers" && subscriberSource !== "all"
      ? ` · ${SUBSCRIBER_SOURCES.find((s) => s.value === subscriberSource)?.label ?? subscriberSource}`
      : ""
  }`;

  return (
    <>
      {toast && (
        <div className="mb-4 rounded-[4px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
          <p className="font-body text-[13px] text-[#15803d]">{toast}</p>
        </div>
      )}
      {metaError && (
        <div className="mb-4 rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="font-body text-[13px] text-[#dc2626]">{metaError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[#11191f] text-white">
                <span className="grid size-5 place-items-center">
                  <IconMail />
                </span>
              </span>
              <div>
                <h2 className="font-display text-[14px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
                  Compose broadcast
                </h2>
                <p className="font-body text-[12px] text-[#6b7280]">
                  Email goes through the queued mailer — recipients see it within minutes.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Audience" required>
                <Select value={audience} onChange={setAudience} options={AUDIENCES} />
              </Field>
              {(audience === "active" || audience === "lapsed" || audience === "vip") && (
                <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
                  <p className="font-body text-[12px] leading-relaxed text-[#1e40af]">
                    {audience === "active" &&
                      "Customers who placed at least one order in the last 30 days. Computed live from order history."}
                    {audience === "lapsed" &&
                      "Customers who have ordered before but not in the last 90 days — a win-back audience. Computed live from order history."}
                    {audience === "vip" &&
                      "The top 10% of paying customers by lifetime spend (cancelled / returned / failed orders excluded). Computed live from order history."}
                  </p>
                </div>
              )}
              {audience === "subscribers" && (
                <div className="flex flex-col gap-3 rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
                  <p className="font-body text-[12px] leading-relaxed text-[#1e40af]">
                    People who joined the newsletter via the storefront — not necessarily customers. Unsubscribed
                    rows are automatically excluded, and a one-click unsubscribe link is added to every send.{" "}
                    <Link
                      href="/r3pr-console/subscribers"
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      Manage subscriber list →
                    </Link>
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#1e3a8a]">
                      Filter by signup source
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBSCRIBER_SOURCES.map((opt) => (
                        <Chip
                          key={opt.value}
                          active={subscriberSource === opt.value}
                          onClick={() => setSubscriberSource(opt.value)}
                        >
                          {opt.label} ({fmtCount(opt.value === "all" ? subCounts.all : subCounts[opt.value])})
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <Field
                label="Subject line"
                required
                hint={`Keep it under 60 characters for best deliverability. ${subject.length}/${SUBJECT_MAX}`}
              >
                <TextInput
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={SUBJECT_MAX}
                  placeholder="Summer 25% Off — Today Only"
                />
              </Field>
              <Field
                label="Preheader"
                hint={`Inbox preview text. Shown next to the subject in most clients. ${preheader.length}/${PREHEADER_MAX}`}
              >
                <TextInput
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  maxLength={PREHEADER_MAX}
                  placeholder="Just a few hours left to grab the warm-weather drop."
                />
              </Field>
              <Field
                label="Message"
                required
                hint={`Plain text — line breaks are preserved in the email. ${formatNumber(body.length)}/${formatNumber(BODY_MAX)}`}
              >
                <TextArea
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={BODY_MAX}
                  placeholder={`Hi there,\n\nWrite something here.\n\n— The Repair team`}
                />
              </Field>
              <div>
                <p className="mb-2 font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
                  Personalisation tokens
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleTokens.map((t) => (
                    <Chip key={t.token} onClick={() => setBody((b) => `${b}${t.token}`)}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
                <p className="mt-2 font-body text-[11px] leading-relaxed text-[#9ca3af]">
                  {"Click a token to add it to the message — they work in the subject line too, and each is filled in per-recipient. "}
                  <em>{"{{first_name}}"}</em>
                  {" / "}
                  <em>{"{{name}}"}</em>
                  {" are derived from the recipient's email (the store doesn't collect a name), falling back to “there”. "}
                  <em>{"{{email}}"}</em>
                  {" and "}
                  <em>{"{{phone}}"}</em>
                  {" use the saved account details"}
                  {audience === "subscribers"
                    ? " (phone isn't offered for newsletter subscribers — that list has no phone number)."
                    : "."}
                  {" "}
                  <em>{"{{store_url}}"}</em>
                  {" links to the storefront and "}
                  <em>{"{{unsubscribe_url}}"}</em>
                  {" becomes the unsubscribe link (added automatically for newsletter sends if you omit it)."}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-[#e5e7eb] pt-4">
              {sendError && (
                <div className="mb-3 rounded-[2px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2">
                  <p className="font-body text-[12px] text-[#dc2626]">{sendError}</p>
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">Will send to</span>
                  <span className="font-display text-[18px] font-bold text-[#11191f]">
                    {audienceCounts ? `${formatNumber(recipientCount)} recipients` : "Loading…"}
                  </span>
                  <span className="mt-0.5 font-body text-[11px] text-[#6b7280]">
                    {`${audienceSummary} · Delivered within minutes`}
                  </span>
                  {willTruncate && (
                    <span className="mt-1 font-body text-[11px] text-[#b45309]">
                      Over {formatNumber(SEND_CAP)} — this send queues the first {formatNumber(SEND_CAP)}; send again to reach the rest.
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    icon={<IconSend />}
                    disabled={!canSend || sending}
                    onClick={() => setConfirm(true)}
                  >
                    Send broadcast
                  </Button>
                  <p className="font-body text-[11px] text-[#9ca3af]">Emails send immediately and cannot be recalled.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="xl:col-span-2">
          <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-[13px] font-bold uppercase tracking-[1.2px] text-[#11191f]">
                Preview
              </h3>
              <span className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-[1px] text-[#6b7280]">
                {previewLoading ? (
                  <>
                    <span className="size-2.5 animate-spin rounded-full border border-[#e5e7eb] border-t-[#11191f]" />
                    Updating…
                  </>
                ) : (
                  <>
                    <span className="size-1.5 rounded-full bg-[#16a34a]" />
                    Exact recipient view
                  </>
                )}
              </span>
            </div>
            <div className="overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-[#fafafa]">
              {/* Inbox-row chrome (the mail-client metadata, not part of the email body). */}
              <div className="border-b border-[#e5e7eb] bg-white px-4 py-3">
                <p className="font-body text-[11px] text-[#6b7280]">From: Repair &lt;hello@repair.app&gt;</p>
                <p className="font-display text-[14px] font-bold text-[#11191f]">
                  {previewSubject || subject || "Subject preview"}
                </p>
                <p className="font-body text-[11px] text-[#6b7280]">{preheader || "Inbox preview text"}</p>
              </div>
              {/* The actual rendered email — same template + tokens a recipient receives. */}
              {previewError ? (
                <div className="bg-white px-5 py-10 text-center">
                  <p className="font-body text-[12px] text-[#dc2626]">{previewError}</p>
                </div>
              ) : (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="h-[620px] w-full border-0 bg-white"
                />
              )}
            </div>
            <p className="mt-2 font-body text-[11px] leading-relaxed text-[#9ca3af]">
              Rendered by the mail server with sample personalisation values — the
              real send fills each token from the recipient&apos;s own details.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-[1.4px] text-[#11191f]">
            Sent broadcasts
          </h2>
          <div className="flex items-center gap-1">
            <Chip active={historyFilter === "all"} onClick={() => setHistoryFilter("all")}>
              All
            </Chip>
            <Chip active={historyFilter === "customers"} onClick={() => setHistoryFilter("customers")}>
              Customers
            </Chip>
            <Chip active={historyFilter === "newsletter"} onClick={() => setHistoryFilter("newsletter")}>
              Newsletter
            </Chip>
          </div>
        </div>
        {loadingMeta ? (
          <div className="grid place-items-center rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-16">
            <div className="flex items-center gap-3">
              <div className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
              <p className="font-body text-[13px] text-[#6b7280]">Loading broadcasts…</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "subject",
                label: "Subject",
                render: (r) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body font-medium text-[#11191f]">{r.subject}</span>
                    <span className="font-body text-[10px] uppercase tracking-[0.8px] text-[#1d4ed8]">
                      {AUDIENCE_LABELS[r.target_audience] ?? r.target_audience}
                      {r.target_audience === "subscribers" && r.target_source ? ` · ${r.target_source}` : ""}
                    </span>
                  </div>
                ),
              },
              {
                key: "sent_by_email",
                label: "Sent by",
                render: (r) => (
                  <span className="font-body text-[12px] text-[#6b7280]">{r.sent_by_email || "—"}</span>
                ),
              },
              {
                key: "recipient_count",
                label: "Recipients",
                align: "right",
                render: (r) => formatNumber(r.recipient_count || 0),
              },
              {
                key: "delivery",
                label: "Delivery",
                render: (r) => {
                  const d = deliveryState(r);
                  return (
                    <span className="font-body text-[12px] font-medium" style={{ color: d.color }}>
                      {d.label}
                    </span>
                  );
                },
              },
              { key: "sent_at", label: "Sent", render: (r) => formatDate(r.sent_at || r.created_at) },
            ]}
            rows={visibleHistory}
            empty={
              <p className="font-body text-[13px] text-[#6b7280]">
                No broadcasts sent yet. Compose one above to reach your audience.
              </p>
            }
          />
        )}
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Review and send"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={sending}>
              Go back and edit
            </Button>
            <Button icon={<IconSend />} onClick={send} disabled={sending}>
              {sending ? "Sending…" : `Confirm — send to ${formatNumber(Math.min(recipientCount, SEND_CAP))}`}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="divide-y divide-[#f3f4f6] rounded-[2px] border border-[#e5e7eb] bg-[#fafafa]">
            <div className="flex items-start justify-between gap-4 px-4 py-2.5">
              <span className="font-body text-[11px] uppercase tracking-[0.8px] text-[#6b7280]">Subject</span>
              <span className="max-w-[60%] text-right font-body text-[12px] font-medium text-[#11191f]">{subject}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="font-body text-[11px] uppercase tracking-[0.8px] text-[#6b7280]">Audience</span>
              <span className="font-body text-[12px] font-medium text-[#11191f]">{audienceSummary}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="font-body text-[11px] uppercase tracking-[0.8px] text-[#6b7280]">Recipients</span>
              <span className="font-display text-[14px] font-bold text-[#11191f]">{formatNumber(recipientCount)}</span>
            </div>
          </div>
          {willTruncate && (
            <p className="rounded-[2px] border border-[#fde68a] bg-[#fffbeb] px-3 py-2 font-body text-[12px] leading-relaxed text-[#92400e]">
              This audience is over the {formatNumber(SEND_CAP)}-recipient cap. Only the first {formatNumber(SEND_CAP)} will be
              queued now — run the broadcast again to reach the remaining {formatNumber(recipientCount - SEND_CAP)}.
            </p>
          )}
          <p className="font-body text-[13px] leading-relaxed text-[#6b7280]">
            Clicking <strong className="text-[#11191f]">Confirm</strong> queues this email for immediate delivery through
            the mailer. <strong className="text-[#11191f]">This cannot be undone</strong> — there is no way to recall a
            broadcast once it is sent.
          </p>
        </div>
      </Modal>
    </>
  );
}
