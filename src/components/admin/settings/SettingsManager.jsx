"use client";

import { useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { Toggle, TextInput, NumberInput } from "@/components/admin/shared/Form";
import { IconCheck, IconTrash } from "@/components/admin/shared/Icons";
import {
  PAYMENT_METHOD_SETTINGS,
  TAX_SETTINGS,
  SHIPPING_METHODS,
  PICKUP_LOCATIONS,
} from "@/lib/mockAdmin";

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

function PctInput({ value, onChange, placeholder = "0" }) {
  return (
    <div className="flex h-10 w-32 items-center rounded-[2px] border border-[#e5e7eb] bg-white transition-colors focus-within:border-[#11191f]">
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full flex-1 bg-transparent px-3 font-body text-[14px] text-[#11191f] outline-none placeholder:text-[#9ca3af]"
        placeholder={placeholder}
      />
      <div className="h-4 w-px bg-[#e5e7eb]" />
      <span className="shrink-0 px-3 font-body text-[13px] text-[#6b7280]">%</span>
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

function DeliveryFeeCard() {
  const [fee, setFee] = useState("2.50");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    const val = parseFloat(fee);
    if (isNaN(val) || val < 0) {
      setError("Enter a valid amount (0 or more).");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsCard
      title="Delivery Fee"
      description="The standard delivery fee applied to every order at checkout."
    >
      <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
        Fee Amount
      </p>
      <p className="mb-3 font-body text-[12px] text-[#6b7280]">
        Charged on every order unless free delivery applies.
      </p>
      <div className="flex items-center gap-3">
        <JodInput
          value={fee}
          onChange={(v) => { setFee(v); setError(""); setSaved(false); }}
        />
        <Button size="sm" onClick={handleSave}>Save</Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
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

// (#7) Tax rate card.
function TaxRateCard() {
  const [rate, setRate] = useState(String(TAX_SETTINGS.rate));
  const [inclusive, setInclusive] = useState(TAX_SETTINGS.inclusive);
  const [appliesShipping, setAppliesShipping] = useState(TAX_SETTINGS.appliesToShipping);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    const val = parseFloat(rate);
    if (isNaN(val) || val < 0 || val > 100) {
      setError("Enter a valid rate (0–100).");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsCard
      title="Tax Rate"
      description="Tax applied on every order. Adjust here to roll out a new rate to checkout."
    >
      <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
        Rate
      </p>
      <p className="mb-3 font-body text-[12px] text-[#6b7280]">
        Percentage of the order subtotal (and shipping, if enabled below).
      </p>
      <div className="flex items-center gap-3">
        <PctInput
          value={rate}
          onChange={(v) => { setRate(v); setError(""); setSaved(false); }}
        />
        <Button size="sm" onClick={handleSave}>Save</Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-[#f3f4f6] pt-4">
        <Toggle
          checked={inclusive}
          onChange={(v) => { setInclusive(v); setSaved(false); }}
          label="Prices include tax (tax-inclusive display)"
        />
        <Toggle
          checked={appliesShipping}
          onChange={(v) => { setAppliesShipping(v); setSaved(false); }}
          label="Apply tax on shipping fees"
        />
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

// (#8) Shipping methods + pickup location editor.
function ShippingMethodsCard() {
  const [methods, setMethods] = useState(SHIPPING_METHODS);
  const [locations, setLocations] = useState(PICKUP_LOCATIONS);
  const [saved, setSaved] = useState(false);

  function updateMethod(id, patch) {
    setMethods((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setSaved(false);
  }

  function updateLocation(id, patch) {
    setLocations((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setSaved(false);
  }

  function addLocation() {
    setLocations((arr) => [
      ...arr,
      { id: `loc-${Date.now()}`, name: "New Pickup Location", address: "", hours: "" },
    ]);
    setSaved(false);
  }

  function removeLocation(id) {
    setLocations((arr) => arr.filter((l) => l.id !== id));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const pickupEnabled = methods.find((m) => m.key === "pickup")?.enabled;

  return (
    <SettingsCard
      title="Shipping Methods"
      description="Names + ETA copy shown to customers at checkout. Toggle each method on or off."
    >
      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <div
            key={m.id}
            className="rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-body text-[12px] font-semibold uppercase tracking-[0.5px] text-[#11191f]">
                {m.key === "standard"
                  ? "Standard"
                  : m.key === "express"
                  ? "Express"
                  : "Store Pickup"}
              </span>
              <Toggle
                checked={m.enabled}
                onChange={(v) => updateMethod(m.id, { enabled: v })}
                label={m.enabled ? "Shown" : "Hidden"}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  Display name
                </span>
                <TextInput
                  value={m.name}
                  onChange={(e) => updateMethod(m.id, { name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                  ETA copy
                </span>
                <TextInput
                  value={m.eta}
                  onChange={(e) => updateMethod(m.id, { eta: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {pickupEnabled ? (
        <div className="mt-5 border-t border-[#f3f4f6] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-display text-[12px] font-bold uppercase tracking-[1px] text-[#11191f]">
                Pickup Locations
              </p>
              <p className="font-body text-[11px] text-[#6b7280]">
                Shown when a customer selects Store Pickup at checkout.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addLocation}>
              + Add Location
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {locations.map((l) => (
              <div
                key={l.id}
                className="relative rounded-[2px] border border-[#f3f4f6] bg-white p-3"
              >
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                      Location name
                    </span>
                    <TextInput
                      value={l.name}
                      onChange={(e) => updateLocation(l.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                      Address
                    </span>
                    <TextInput
                      value={l.address}
                      onChange={(e) => updateLocation(l.id, { address: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="font-body text-[10px] font-medium uppercase tracking-[1px] text-[#6b7280]">
                      Opening hours
                    </span>
                    <TextInput
                      value={l.hours}
                      onChange={(e) => updateLocation(l.id, { hours: e.target.value })}
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <IconButton
                    label="Remove location"
                    onClick={() => removeLocation(l.id)}
                  >
                    <IconTrash />
                  </IconButton>
                </div>
              </div>
            ))}
            {locations.length === 0 ? (
              <p className="font-body text-[12px] text-[#6b7280]">
                No pickup locations. Add at least one when Store Pickup is enabled.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3 border-t border-[#f3f4f6] pt-4">
        <Button size="sm" onClick={handleSave}>Save</Button>
        {saved ? <SavedPill /> : null}
      </div>
    </SettingsCard>
  );
}

// (#6) Payment Methods toggle.
function PaymentMethodsCard() {
  const [methods, setMethods] = useState(PAYMENT_METHOD_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setMethods((arr) => arr.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
    setSaved(false);
    setError("");
  }

  function handleSave() {
    if (!methods.some((m) => m.enabled)) {
      setError("At least one payment method must be enabled.");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SettingsCard
      title="Payment Methods"
      description="Toggle which payment methods customers can pick at checkout."
    >
      <div className="flex flex-col gap-3">
        {methods.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-[2px] border border-[#f3f4f6] bg-[#fafafa] p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-body text-[13px] font-semibold text-[#11191f]">
                {m.label}
              </p>
              <p className="truncate font-body text-[12px] text-[#6b7280]">{m.description}</p>
            </div>
            <Toggle
              checked={m.enabled}
              onChange={() => toggle(m.id)}
              label={m.enabled ? "On" : "Off"}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={handleSave}>Save</Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
  );
}

export default function SettingsManager() {
  return (
    <div className="flex flex-col gap-5">
      <DeliveryFeeCard />
      <FreeDeliveryCard />
      <ExpressShippingCard />
      <ShippingMethodsCard />
      <TaxRateCard />
      <PaymentMethodsCard />
    </div>
  );
}
