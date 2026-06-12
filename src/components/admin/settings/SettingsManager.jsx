"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button, { IconButton } from "@/components/admin/shared/Button";
import { Toggle, TextInput } from "@/components/admin/shared/Form";
import { IconCheck, IconTrash } from "@/components/admin/shared/Icons";
import { repairCall } from "@/lib/repairAuthedApi";

// repairCall throws on blnRequestSuccessful:false with a message shaped like
// "repairClientApi <op>: <server message>". Strip the prefix so the card shows
// the human-readable server validation string (e.g. "rate must be between 0 and 100").
function cleanErr(e, fallback) {
  const m = (e?.message || "").replace(/^repairClientApi \S+:\s*/, "");
  return m || fallback;
}

// Server returns DECIMAL columns as JS numbers; format for the money inputs.
function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

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

// (#1) Standard delivery fee — patches the shipping_settings singleton.
function DeliveryFeeCard({ shipping }) {
  const [fee, setFee] = useState(() => money(shipping?.standard_delivery_fee));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const val = parseFloat(fee);
    if (isNaN(val) || val < 0) {
      setError("Enter a valid amount (0 or more).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await repairCall(
        "myAppAdminUpdateShippingSettings",
        { standard_delivery_fee: val },
        { isQuery: false }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save the delivery fee."));
    } finally {
      setSaving(false);
    }
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
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
  );
}

// (#2) Free-delivery threshold — patches the shipping_settings singleton.
function FreeDeliveryCard({ shipping }) {
  const [enabled, setEnabled] = useState(() => !!shipping?.free_delivery_enabled);
  const [threshold, setThreshold] = useState(() => money(shipping?.free_delivery_threshold));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    let val = 0;
    if (enabled) {
      val = parseFloat(threshold);
      if (isNaN(val) || val < 0) {
        setError("Enter a valid amount (0 or more).");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const payload = { free_delivery_enabled: enabled };
      if (enabled) payload.free_delivery_threshold = val;
      await repairCall("myAppAdminUpdateShippingSettings", payload, { isQuery: false });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save free-delivery settings."));
    } finally {
      setSaving(false);
    }
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
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {saved ? <SavedPill /> : null}
        </div>
        {error ? (
          <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
        ) : null}
      </div>
    </SettingsCard>
  );
}

// (#3) Express shipping — patches the shipping_settings singleton.
function ExpressShippingCard({ shipping }) {
  const [enabled, setEnabled] = useState(() => !!shipping?.express_shipping_enabled);
  const [fee, setFee] = useState(() => money(shipping?.express_shipping_fee));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    let val = 0;
    if (enabled) {
      val = parseFloat(fee);
      if (isNaN(val) || val < 0) {
        setError("Enter a valid amount (0 or more).");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const payload = { express_shipping_enabled: enabled };
      if (enabled) payload.express_shipping_fee = val;
      await repairCall("myAppAdminUpdateShippingSettings", payload, { isQuery: false });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save express-shipping settings."));
    } finally {
      setSaving(false);
    }
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
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {saved ? <SavedPill /> : null}
        </div>
        {error ? (
          <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
        ) : null}
      </div>
    </SettingsCard>
  );
}

// (#4) Tax rate — patches the tax_settings singleton.
function TaxRateCard({ tax }) {
  const [rate, setRate] = useState(() => String(tax?.rate ?? 0));
  const [inclusive, setInclusive] = useState(() => !!tax?.inclusive);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const val = parseFloat(rate);
    if (isNaN(val) || val < 0 || val > 100) {
      setError("Enter a valid rate (0–100).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await repairCall(
        "myAppAdminUpdateTaxSettings",
        { rate: val, inclusive },
        { isQuery: false }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save the tax rate."));
    } finally {
      setSaving(false);
    }
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
        Percentage of the order subtotal.
      </p>
      <div className="flex items-center gap-3">
        <PctInput
          value={rate}
          onChange={(v) => { setRate(v); setError(""); setSaved(false); }}
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 border-t border-[#f3f4f6] pt-4">
        <Toggle
          checked={inclusive}
          onChange={(v) => { setInclusive(v); setSaved(false); }}
          label="Prices include tax (tax-inclusive display)"
        />
        <p className="font-body text-[12px] leading-[18px] text-[#6b7280]">
          {inclusive
            ? "On: your product prices already include tax, so nothing extra is added at checkout — the total stays the price the customer sees. The cart shows the tax portion already contained in the price (for the receipt), not an added charge."
            : "Off: prices are tax-exclusive. Tax is calculated on the subtotal and added on top at checkout, so the total is higher than the listed prices."}
        </p>
      </div>
    </SettingsCard>
  );
}

// (#5) Shipping methods + pickup locations.
// Methods are updated row-by-row via myAppAdminUpdateShippingMethod (only the
// changed rows are sent). Pickup locations are diffed against the loaded set:
// new rows (temp `loc-` ids) → create, existing → update, dropped → delete.
// After the batch we resync from the server so created rows pick up real ids.
function ShippingMethodsCard({ methods: initialMethods, locations: initialLocations, refresh }) {
  const mapMethods = (rows) =>
    (rows || []).map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name ?? "",
      eta: m.eta ?? "",
      enabled: !!m.enabled,
    }));
  const mapLocations = (rows) =>
    (rows || []).map((l) => ({
      id: l.id,
      name: l.name ?? "",
      address: l.address ?? "",
      hours: l.hours ?? "",
    }));

  const [methods, setMethods] = useState(() => mapMethods(initialMethods));
  const [origMethods, setOrigMethods] = useState(() => mapMethods(initialMethods));
  const [locations, setLocations] = useState(() => mapLocations(initialLocations));
  const [origLocationIds, setOrigLocationIds] = useState(() =>
    (initialLocations || []).map((l) => String(l.id))
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateMethod(id, patch) {
    setMethods((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setSaved(false);
    setError("");
  }

  function updateLocation(id, patch) {
    setLocations((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setSaved(false);
    setError("");
  }

  function addLocation() {
    setLocations((arr) => [
      ...arr,
      { id: `loc-${Date.now()}`, name: "", address: "", hours: "" },
    ]);
    setSaved(false);
    setError("");
  }

  function removeLocation(id) {
    setLocations((arr) => arr.filter((l) => l.id !== id));
    setSaved(false);
    setError("");
  }

  // Re-read the bundle so newly-created locations show real ids and the diff
  // baselines reset. Used both after success and after a partial failure so the
  // UI always reflects committed server state.
  async function resync() {
    const fresh = await refresh();
    setMethods(mapMethods(fresh?.shippingMethods));
    setOrigMethods(mapMethods(fresh?.shippingMethods));
    setLocations(mapLocations(fresh?.pickupLocations));
    setOrigLocationIds((fresh?.pickupLocations || []).map((l) => String(l.id)));
  }

  async function handleSave() {
    // Pickup locations are only managed while Store Pickup is enabled — their
    // editor is hidden otherwise, so a hidden blank row must not block the save.
    const pickupOn = methods.some((m) => m.key === "pickup" && m.enabled);

    if (pickupOn) {
      for (const l of locations) {
        if (!l.name.trim() || !l.address.trim()) {
          setError("Each pickup location needs a name and an address.");
          return;
        }
      }
    }
    setError("");
    setSaving(true);
    try {
      // 1) Changed shipping methods only.
      for (const m of methods) {
        const o = origMethods.find((x) => String(x.id) === String(m.id));
        if (!o || o.name !== m.name || o.eta !== m.eta || o.enabled !== m.enabled) {
          await repairCall(
            "myAppAdminUpdateShippingMethod",
            { id: m.id, name: m.name.trim(), eta: m.eta.trim(), enabled: m.enabled },
            { isQuery: false }
          );
        }
      }

      if (pickupOn) {
        // 2) Deleted pickup locations (loaded ids no longer present).
        const currentRealIds = new Set(
          locations.map((l) => String(l.id)).filter((id) => !id.startsWith("loc-"))
        );
        for (const oid of origLocationIds) {
          if (!currentRealIds.has(oid)) {
            await repairCall("myAppAdminDeletePickupLocation", { id: oid }, { isQuery: false });
          }
        }

        // 3) Create new + update existing locations.
        for (const l of locations) {
          const payload = {
            name: l.name.trim(),
            address: l.address.trim(),
            hours: l.hours.trim() || null,
          };
          if (String(l.id).startsWith("loc-")) {
            await repairCall("myAppAdminCreatePickupLocation", payload, { isQuery: false });
          } else {
            await repairCall(
              "myAppAdminUpdatePickupLocation",
              { id: l.id, ...payload },
              { isQuery: false }
            );
          }
        }
      }

      await resync();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save shipping methods."));
      // Some operations may have committed before the failure — resync so the
      // UI reflects the true server state.
      try { await resync(); } catch { /* keep current view */ }
    } finally {
      setSaving(false);
    }
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
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
  );
}

// (#6) Payment methods — bulk toggle via myAppAdminUpdatePaymentMethodSettings.
function PaymentMethodsCard({ methods: initialMethods }) {
  const [methods, setMethods] = useState(() =>
    (initialMethods || []).map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name ?? "",
      enabled: !!m.enabled,
    }))
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setMethods((arr) => arr.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    if (!methods.some((m) => m.enabled)) {
      setError("At least one payment method must be enabled.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await repairCall(
        "myAppAdminUpdatePaymentMethodSettings",
        { methods: methods.map((m) => ({ id: m.id, enabled: m.enabled })) },
        { isQuery: false }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save payment methods."));
    } finally {
      setSaving(false);
    }
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
                {m.name}
              </p>
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
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved ? <SavedPill /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
  );
}

// (#7) Low-stock banner — patches the inventory_settings singleton. One
// store-wide threshold drives the product-page "N items left" banner; 0 hides
// it everywhere. There is no separate on/off toggle by design — the number IS
// the switch (0 = off).
function LowStockBannerCard({ inventory }) {
  const [threshold, setThreshold] = useState(() =>
    String(inventory?.low_stock_threshold ?? 0)
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const val = parseInt(threshold, 10);
    if (isNaN(val) || val < 0) {
      setError("Enter a whole number (0 or more).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await repairCall(
        "myAppAdminUpdateInventorySettings",
        { low_stock_threshold: val },
        { isQuery: false }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(cleanErr(e, "Failed to save the low-stock setting."));
    } finally {
      setSaving(false);
    }
  }

  const num = parseInt(threshold, 10);
  const hidden = !isNaN(num) && num === 0;

  return (
    <SettingsCard
      title="Low-Stock Banner"
      description="A 'N items left in stock' banner on the product page, shown once a shopper selects a size when that size's remaining stock is at or below the number below."
    >
      <p className="mb-1 font-body text-[11px] font-medium uppercase tracking-[1px] text-[#11191f]">
        Threshold
      </p>
      <p className="mb-3 font-body text-[12px] text-[#6b7280]">
        The banner appears when the selected size&apos;s stock is between 1 and
        this number. Set to 0 to hide the banner everywhere.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-32 items-center rounded-[2px] border border-[#e5e7eb] bg-white transition-colors focus-within:border-[#11191f]">
          <input
            type="number"
            min="0"
            step="1"
            value={threshold}
            onChange={(e) => {
              setThreshold(e.target.value);
              setError("");
              setSaved(false);
            }}
            className="h-full flex-1 bg-transparent px-3 font-body text-[14px] text-[#11191f] outline-none placeholder:text-[#9ca3af]"
            placeholder="0"
          />
          <div className="h-4 w-px bg-[#e5e7eb]" />
          <span className="shrink-0 px-3 font-body text-[13px] text-[#6b7280]">
            units
          </span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved ? <SavedPill /> : null}
      </div>
      {hidden ? (
        <p className="mt-1.5 font-body text-[11px] text-[#6b7280]">
          Banner is currently hidden (threshold 0).
        </p>
      ) : null}
      {error ? (
        <p className="mt-1.5 font-body text-[11px] text-[#dc2626]">{error}</p>
      ) : null}
    </SettingsCard>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center rounded-[4px] border border-[#e5e7eb] bg-white p-10">
      <span className="size-5 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#11191f]" />
      <span className="ml-3 font-body text-[13px] text-[#6b7280]">Loading settings…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-[4px] border border-[#fecaca] bg-[#fef2f2] p-5">
      <p className="font-body text-[13px] text-[#dc2626]">{message}</p>
      <div className="mt-3">
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

export default function SettingsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // No synchronous setState before the first await — `loading` already starts
  // true on mount, and the retry handler below resets it from a click handler.
  const load = useCallback(async () => {
    try {
      const res = await repairCall("myAppGetCommerceSettings", {}, { isQuery: true });
      setData(res);
      setError(null);
    } catch (e) {
      setError(cleanErr(e, "Failed to load settings."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  // Silent re-read used by the shipping-methods card after a save so newly
  // created pickup locations get real ids — without flipping the page-level
  // loading spinner (which would discard unsaved drafts in the other cards).
  const refresh = useCallback(async () => {
    const res = await repairCall("myAppGetCommerceSettings", {}, { isQuery: true });
    setData(res);
    return res;
  }, []);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      <DeliveryFeeCard shipping={data.shipping} />
      <FreeDeliveryCard shipping={data.shipping} />
      <ExpressShippingCard shipping={data.shipping} />
      <ShippingMethodsCard
        methods={data.shippingMethods}
        locations={data.pickupLocations}
        refresh={refresh}
      />
      <TaxRateCard tax={data.tax} />
      <PaymentMethodsCard methods={data.paymentMethods} />
      <LowStockBannerCard inventory={data.inventory} />
    </div>
  );
}
