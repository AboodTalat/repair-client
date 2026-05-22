import { BrandTile, PlusIcon, StarIcon, TrashIcon } from "./AccountIcons";
import { SectionCard, SectionHeader } from "./PersonalInformationCard";

// PAYMENT METHODS section — Figma mobile 79:3679 + desktop 119:5012.

export function MobilePaymentMethodsCard({ methods, onToggleDefault, onAdd, onDelete }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-[4px] bg-white px-4 py-6 shadow-[0px_0px_5px_rgba(0,0,0,0.15)]">
      <header className="flex w-full items-center justify-between">
        <h2 className="font-display text-[12px] font-medium text-[#11191f]">
          PAYMENT METHODS
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="font-display text-[10px] font-bold uppercase text-[#11191f]"
        >
          ADD MORE
        </button>
      </header>

      <ul className="flex w-full flex-col">
        {methods.map((pm, i) => (
          <li key={pm.id} className="w-full">
            {i > 0 ? <hr className="my-3 border-0 border-t border-[#11191f]/10" /> : null}
            <MobilePaymentRow
              method={pm}
              onToggleDefault={onToggleDefault}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobilePaymentRow({ method, onToggleDefault, onDelete }) {
  return (
    <div className="flex w-full items-center gap-3">
      <BrandTile brand={method.brand} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className="flex flex-wrap items-baseline gap-x-1 text-[#11191f]"
          style={{ fontStretch: "75%" }}
        >
          <span className="font-body text-[12px] font-medium">
            {`${capitalize(method.brand)} ending in ${method.last4}`}
          </span>
          {method.isDefault ? (
            <span className="font-body text-[10px] text-[#11191f]/30">(Default)</span>
          ) : null}
        </p>
        <p
          className="font-body text-[10px] text-[#11191f]/50"
          style={{ fontStretch: "75%", fontWeight: 500 }}
        >
          Expiration: {method.expiry}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-pressed={method.isDefault}
          aria-label={method.isDefault ? "Default payment method" : "Set as default"}
          onClick={onToggleDefault ? () => onToggleDefault(method.id) : undefined}
          className="text-[#11191f]"
        >
          <StarIcon filled={method.isDefault} size={20} />
        </button>
        <button
          type="button"
          aria-label="Remove payment method"
          onClick={onDelete ? () => onDelete(method.id) : undefined}
        >
          <TrashIcon size={20} />
        </button>
      </div>
    </div>
  );
}

export function DesktopPaymentMethodsCard({ methods, onToggleDefault, onAdd, onDelete }) {
  return (
    <SectionCard>
      <SectionHeader
        title="Payment Methods"
        action={
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 font-display text-[12px] font-bold uppercase text-[#11191f]"
            style={{ letterSpacing: "0.6px" }}
          >
            <PlusIcon size={12} />
            Add More
          </button>
        }
      />
      <div className="flex w-full flex-col gap-4 p-8">
        {methods.map((pm, i) => (
          <DesktopPaymentRow
            key={pm.id}
            method={pm}
            divider={i < methods.length - 1}
            onToggleDefault={onToggleDefault}
            onDelete={onDelete}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function DesktopPaymentRow({ method, divider, onToggleDefault, onDelete }) {
  return (
    <div
      className={
        "flex w-full items-center justify-between py-4 " +
        (divider ? "border-b border-[#f3f4f6]" : "")
      }
    >
      <div className="flex items-center gap-4">
        <BrandTile brand={method.brand} />
        <div className="flex flex-col gap-[2px]">
          <div className="flex items-center gap-2">
            <span className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
              {`${capitalize(method.brand)} ending in ${method.last4}`}
            </span>
            {method.isDefault ? (
              <span className="rounded-[4px] bg-[#f3f4f6] px-[6px] py-[2px] font-body text-[10px] leading-5 text-[#6b7280]" style={{ fontStretch: "75%", fontWeight: 500 }}>
                Default
              </span>
            ) : null}
          </div>
          <p
            className="font-body text-[12px] leading-4 text-[#9ca3af]"
            style={{ fontStretch: "75%" }}
          >
            Expiration: {method.expiry}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-pressed={method.isDefault}
          aria-label={method.isDefault ? "Default payment method" : "Set as default"}
          onClick={onToggleDefault ? () => onToggleDefault(method.id) : undefined}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#11191f] hover:bg-[#f3f4f6]"
        >
          <StarIcon filled={method.isDefault} size={18} />
        </button>
        <button
          type="button"
          aria-label="Remove payment method"
          onClick={onDelete ? () => onDelete(method.id) : undefined}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3f4f6]"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function capitalize(s) {
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1);
}
