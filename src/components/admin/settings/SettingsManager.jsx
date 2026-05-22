"use client";

import { useState } from "react";
import Button from "@/components/admin/shared/Button";
import { Toggle } from "@/components/admin/shared/Form";
import { IconCheck } from "@/components/admin/shared/Icons";

function SavedPill() {
  return (
    <span className="flex items-center gap-1 font-body text-[12px] text-[#16a34a]">
      <span
        className="grid size-4 place-items-center rounded-full"
        style={{ backgroundColor: "#16a34a" }}
      >
        <IconCheck className="text-white" />
      </span>
      Saved
    </span>
  );
}

function JodInput({ value, onChange, disabled, placeholder = "0.00" }) {
  return (
    <div
      className="flex h-10 w-48 items-center rounded-[2px] border border-[#e5e7eb] bg-white transition-colors focus-within:border-[#11191f]"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <span className="shrink-0 px-3 font-body text-[13px] text-[#6b7280]">JOD</span>
      <div className="h-4 w-px bg-[#e5e7eb]" />
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-full flex-1 bg-transparent px-3 font-body text-[14px] text-[#11191f] outline-none placeholder:text-[#9ca3af] disabled:cursor-not-allowed"
        placeholder={placeholder}
      />
    </div>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section className="rounded-[4px] border border-[#e5e7eb] bg-white p-5">
      <p className="font-display text-[14px] font-bold uppercase tracking-[1px] text-[#11191f]">
        {title}
      </p>
      {description ? (
        <p className="mt-1 font-body text-[12px] text-[#6b7280]">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FreeDeliveryCard() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState("200.00");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    if (enabled) {
      const val = parseFloat(threshold);
      if (isNaN(val) || val < 0) {
        setError("Enter a valid amount (0 or more).");
        return;
      }
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsCard
      title="Free Delivery"
      description="When enabled, customers whose cart subtotal reaches the threshold below get free delivery."
    >
      <div className="mb-4">
        <Toggle
          checked={enabled}
          onChange={(v) => { setEnabled(v); setSaved(false); setError(""); }}
          label={enabled ? "Free delivery is active" : "Free delivery is off"}
        />
      </div>

      <div className="border-t border-[#f3f4f6] pt-4">
        <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
          Threshold Amount
        </p>
        <p className="mb-3 font-body text-[12px] text-[#6b7280]">
          The subtotal a customer must reach to qualify for free delivery.
        </p>
        <div className="flex items-center gap-3">
          <JodInput
            value={threshold}
            onChange={(v) => { setThreshold(v); setError(""); setSaved(false); }}
            disabled={!enabled}
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
          {saved ? <SavedPill /> : null}
        </div>
        {error ? (
          <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
        ) : null}
      </div>
    </SettingsCard>
  );
}

function ExpressShippingCard() {
  const [enabled, setEnabled] = useState(true);
  const [fee, setFee] = useState("5.00");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    if (enabled) {
      const val = parseFloat(fee);
      if (isNaN(val) || val < 0) {
        setError("Enter a valid amount (0 or more).");
        return;
      }
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsCard
      title="Express Shipping"
      description="When enabled, customers see the Express Shipping option at checkout for the extra fee below."
    >
      <div className="mb-4">
        <Toggle
          checked={enabled}
          onChange={(v) => { setEnabled(v); setSaved(false); setError(""); }}
          label={enabled ? "Shown to customers" : "Hidden from customers"}
        />
      </div>

      <div className="border-t border-[#f3f4f6] pt-4">
        <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
          Extra Fee
        </p>
        <p className="mb-3 font-body text-[12px] text-[#6b7280]">
          Added to the standard delivery fee when a customer chooses Express Shipping.
        </p>
        <div className="flex items-center gap-3">
          <JodInput
            value={fee}
            onChange={(v) => { setFee(v); setError(""); setSaved(false); }}
            disabled={!enabled}
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
          {saved ? <SavedPill /> : null}
        </div>
        {error ? (
          <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
        ) : null}
      </div>
    </SettingsCard>
  );
}

export default function SettingsManager() {
  return (
    <div className="flex flex-col gap-5">
      <FreeDeliveryCard />
      <ExpressShippingCard />
    </div>
  );
}
