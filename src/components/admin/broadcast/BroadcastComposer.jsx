"use client";

import { useState } from "react";
import Button from "@/components/admin/shared/Button";
import DataTable from "@/components/admin/shared/DataTable";
import Modal from "@/components/admin/shared/Modal";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import { Field, TextInput, TextArea, Chip, Select } from "@/components/admin/shared/Form";
import { IconSend, IconMail } from "@/components/admin/shared/Icons";
import { BROADCAST_HISTORY, MARKETING_OPT_IN_COUNT, formatNumber } from "@/lib/mockAdmin";

const AUDIENCE_LABELS = {
  all: "All customers",
  active: "Active",
  vip: "VIP",
  inactive: "Lapsed",
  marketing: "Marketing",
};

const AUDIENCES = [
  { value: "all", label: "All customers (1,842)" },
  { value: "active", label: "Active in last 30 days (954)" },
  { value: "vip", label: "VIP — top 10% spend (184)" },
  { value: "inactive", label: "Lapsed — no order in 90 days (412)" },
  { value: "marketing", label: "Marketing subscribers (1,203)" },
];

export default function BroadcastComposer() {
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(BROADCAST_HISTORY);
  const [historyFilter, setHistoryFilter] = useState("all");

  const recipientCount =
    audience === "all" ? 1842 :
    audience === "active" ? 954 :
    audience === "vip" ? 184 :
    audience === "marketing" ? MARKETING_OPT_IN_COUNT :
    412;

  function send() {
    const entry = {
      id: `b-${Date.now()}`,
      subject,
      sent: new Date().toISOString().replace("T", " ").slice(0, 16),
      recipients: recipientCount,
      audience,
      status: "delivered",
      openRate: null,
      clickRate: null,
    };
    setSent((prev) => [entry, ...prev]);
    setSubject("");
    setPreheader("");
    setBody("");
    setConfirm(false);
  }

  const visibleHistory =
    historyFilter === "marketing" ? sent.filter((r) => r.audience === "marketing") : sent;

  return (
    <>
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
                <Select
                  value={audience}
                  onChange={setAudience}
                  options={AUDIENCES}
                />
              </Field>
              {audience === "marketing" && (
                <div className="rounded-[2px] border border-[#dbeafe] bg-[#eff6ff] p-3">
                  <p className="font-body text-[12px] text-[#1e40af]">
                    Sending to <strong>{formatNumber(MARKETING_OPT_IN_COUNT)}</strong> customers who opted in to{" "}
                    <em>"Email me with news and offers"</em> at checkout. These subscribers have consented to promotional emails.
                  </p>
                </div>
              )}
              <Field label="Subject line" required hint="Keep it under 60 characters for best deliverability.">
                <TextInput
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summer 25% Off — Today Only"
                />
              </Field>
              <Field label="Preheader" hint="Inbox preview text. Shown next to the subject in most clients.">
                <TextInput
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Just a few hours left to grab the warm-weather drop."
                />
              </Field>
              <Field label="Message" required hint="Plain text — line breaks become paragraphs in the email.">
                <TextArea
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Hi {{first_name}},\n\nWrite something here.\n\n— The Repair team`}
                />
              </Field>
              <div>
                <p className="mb-2 font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
                  Personalisation tokens
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip onClick={() => setBody((b) => b + " {{first_name}}")}>{`Insert {{first_name}}`}</Chip>
                  <Chip onClick={() => setBody((b) => b + " {{store_url}}")}>{`Insert {{store_url}}`}</Chip>
                  <Chip onClick={() => setBody((b) => b + " {{unsubscribe_url}}")}>{`Insert {{unsubscribe_url}}`}</Chip>
                </div>
                <p className="mt-2 font-body text-[11px] text-[#9ca3af]">
                  {"Click a token to insert it at the end of your message. Each token is replaced with the recipient’s actual data before the email is sent — e.g. "}
                  <em>{"{{first_name}}"}</em>
                  {" becomes the customer’s first name."}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-[#e5e7eb] pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-body text-[11px] uppercase tracking-[1px] text-[#6b7280]">
                    Will send to
                  </span>
                  <span className="font-display text-[18px] font-bold text-[#11191f]">
                    {formatNumber(recipientCount)} recipients
                  </span>
                  <span className="mt-0.5 font-body text-[11px] text-[#6b7280]">
                    {`${AUDIENCE_LABELS[audience] ?? audience} · Delivered within minutes`}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="group relative">
                      <Button variant="secondary">Save as draft</Button>
                      <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden w-52 rounded-[2px] border border-[#e5e7eb] bg-white p-2 shadow-sm group-hover:block">
                        <p className="font-body text-[11px] leading-relaxed text-[#6b7280]">
                          Saves your subject and message so you can return to it later. Drafts are not sent until you click <strong>Send broadcast</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="group relative">
                      <Button
                        icon={<IconSend />}
                        disabled={!subject || !body}
                        onClick={() => setConfirm(true)}
                      >
                        Send broadcast
                      </Button>
                      {(!subject || !body) && (
                        <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden w-52 rounded-[2px] border border-[#e5e7eb] bg-white p-2 shadow-sm group-hover:block">
                          <p className="font-body text-[11px] leading-relaxed text-[#6b7280]">
                            Fill in a subject line and message body before sending.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="font-body text-[11px] text-[#9ca3af]">
                    Emails send immediately and cannot be recalled.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="xl:col-span-2">
          <div className="rounded-[4px] border border-[#e5e7eb] bg-white p-6">
            <h3 className="mb-4 font-display text-[13px] font-bold uppercase tracking-[1.2px] text-[#11191f]">
              Preview
            </h3>
            <div className="overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-[#fafafa]">
              <div className="border-b border-[#e5e7eb] bg-white px-4 py-3">
                <p className="font-body text-[11px] text-[#6b7280]">
                  From: Repair &lt;hello@repair.app&gt;
                </p>
                <p className="font-display text-[14px] font-bold text-[#11191f]">
                  {subject || "Subject preview"}
                </p>
                <p className="font-body text-[11px] text-[#6b7280]">
                  {preheader || "Preheader preview"}
                </p>
              </div>
              <div className="grid place-items-center bg-[#11191f] py-8 text-white">
                <span className="font-display text-[20px] font-bold uppercase tracking-[2px]">
                  REPAIR
                </span>
              </div>
              <div className="whitespace-pre-wrap bg-white p-5 font-body text-[13px] leading-relaxed text-[#11191f]">
                {body ||
                  "Your message will appear here as you type."}
              </div>
              <div className="border-t border-[#e5e7eb] bg-white px-5 py-3 text-center font-body text-[10px] text-[#6b7280]">
                You're receiving this because you signed up at repair.app · Unsubscribe
              </div>
            </div>
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
            <Chip active={historyFilter === "marketing"} onClick={() => setHistoryFilter("marketing")}>
              Marketing campaigns
            </Chip>
          </div>
        </div>
        <DataTable
          columns={[
            {
              key: "subject",
              label: "Subject",
              render: (r) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-body font-medium text-[#11191f]">{r.subject}</span>
                  {r.audience === "marketing" && (
                    <span className="font-body text-[10px] uppercase tracking-[0.8px] text-[#1d4ed8]">
                      Marketing opt-in
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "audience",
              label: "Audience",
              render: (r) => (
                <span className="font-body text-[12px] text-[#6b7280]">
                  {AUDIENCE_LABELS[r.audience] ?? r.audience}
                </span>
              ),
            },
            { key: "recipients", label: "Recipients", align: "right", render: (r) => formatNumber(r.recipients) },
            {
              key: "openRate",
              label: "Open rate",
              align: "right",
              render: (r) =>
                r.openRate != null ? (
                  <span className="font-body text-[13px] text-[#11191f]">{`${r.openRate}%`}</span>
                ) : (
                  <span className="font-body text-[12px] text-[#9ca3af]">Pending</span>
                ),
            },
            {
              key: "clickRate",
              label: "Click rate",
              align: "right",
              render: (r) =>
                r.clickRate != null ? (
                  <span className="font-body text-[13px] text-[#11191f]">{`${r.clickRate}%`}</span>
                ) : (
                  <span className="font-body text-[12px] text-[#9ca3af]">Pending</span>
                ),
            },
            { key: "status", label: "Status", render: (r) => <StatusBadge status="delivered" label={r.status} /> },
            { key: "sent", label: "Sent" },
          ]}
          rows={visibleHistory}
        />
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Review and send"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Go back and edit
            </Button>
            <Button icon={<IconSend />} onClick={send}>
              Confirm — send to {formatNumber(recipientCount)}
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
              <span className="font-body text-[12px] font-medium text-[#11191f]">{AUDIENCE_LABELS[audience] ?? audience}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="font-body text-[11px] uppercase tracking-[0.8px] text-[#6b7280]">Recipients</span>
              <span className="font-display text-[14px] font-bold text-[#11191f]">{formatNumber(recipientCount)}</span>
            </div>
          </div>
          <p className="font-body text-[13px] leading-relaxed text-[#6b7280]">
            Clicking <strong className="text-[#11191f]">Confirm</strong> will queue this email for immediate delivery through the mailer.
            Recipients will receive it within minutes. <strong className="text-[#11191f]">This cannot be undone</strong> — there is no way to cancel or recall a broadcast once it is sent.
          </p>
        </div>
      </Modal>
    </>
  );
}
