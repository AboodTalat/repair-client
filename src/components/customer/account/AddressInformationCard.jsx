import {
  BuildingIcon,
  HomeIcon,
  LocationIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "./AccountIcons";
import { SectionCard, SectionHeader } from "./PersonalInformationCard";

// ADDRESS INFORMATION section — Figma mobile 79:4151 + desktop 119:5064.

function AddressKindIcon({ kind, size = 20 }) {
  if (kind === "office") return <BuildingIcon size={size} />;
  if (kind === "other") return <LocationIcon size={size} />;
  return <HomeIcon size={size} />;
}

export function MobileAddressInformationCard({
  addresses,
  onToggleDefault,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <section className="flex w-full flex-col gap-3 rounded-[4px] bg-white px-4 py-6 shadow-[0px_0px_5px_rgba(0,0,0,0.15)]">
      <header className="flex w-full items-center justify-between">
        <h2 className="font-display text-[12px] font-medium text-[#11191f]">
          ADDRESS INFORMATION
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
        {addresses.map((addr, i) => (
          <li key={addr.id} className="w-full">
            {i > 0 ? <hr className="my-3 border-0 border-t border-[#11191f]/10" /> : null}
            <MobileAddressRow
              address={addr}
              onToggleDefault={onToggleDefault}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MobileAddressRow({ address, onToggleDefault, onEdit, onDelete }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#f0f0f0] text-[#11191f]">
          <AddressKindIcon kind={address.kind} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="flex items-baseline gap-1 text-[#11191f]"
            style={{ fontStretch: "75%" }}
          >
            <span className="font-body text-[12px] font-medium">{address.label}</span>
            {address.isDefault ? (
              <span className="font-body text-[10px] text-[#11191f]/30">(Default)</span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-pressed={address.isDefault}
            aria-label={address.isDefault ? "Default address" : "Set as default"}
            onClick={onToggleDefault ? () => onToggleDefault(address.id) : undefined}
            className="text-[#11191f]"
          >
            <StarIcon filled={address.isDefault} size={20} />
          </button>
          <button
            type="button"
            aria-label="Remove address"
            onClick={onDelete ? () => onDelete(address.id) : undefined}
            className="text-[#11191f]"
          >
            <TrashIcon size={20} />
          </button>
        </div>
      </div>
      <div
        className="flex w-full flex-col gap-1 font-body text-[10px] text-[#11191f]/50"
        style={{ fontStretch: "75%", fontWeight: 500 }}
      >
        <p>{address.line}</p>
        <p>{address.phone}</p>
      </div>
      <button
        type="button"
        onClick={onEdit ? () => onEdit(address.id) : undefined}
        className="self-start font-display text-[10px] font-bold uppercase text-[#11191f]"
      >
        EDIT DETAILS
      </button>
    </div>
  );
}

export function DesktopAddressInformationCard({
  addresses,
  onToggleDefault,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <SectionCard>
      <SectionHeader
        title="Address Information"
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
      <div className="flex w-full flex-col gap-6 p-8">
        {addresses.map((addr, i) => (
          <DesktopAddressRow
            key={addr.id}
            address={addr}
            divider={i < addresses.length - 1}
            onToggleDefault={onToggleDefault}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function DesktopAddressRow({ address, divider, onToggleDefault, onEdit, onDelete }) {
  return (
    <div
      className={
        "flex w-full items-start justify-between " +
        (divider ? "border-b border-[#f3f4f6] pb-[25px]" : "")
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#f3f4f6] text-[#11191f]">
          <AddressKindIcon kind={address.kind} size={20} />
        </div>
        <div className="flex flex-col gap-[3px]">
          <div className="flex items-center gap-2">
            <span className="font-display text-[14px] font-bold leading-5 text-[#11191f]">
              {address.label}
            </span>
            {address.isDefault ? (
              <span
                className="font-body text-[10px] leading-[15px] text-[#9ca3af]"
                style={{ fontStretch: "75%" }}
              >
                (Default)
              </span>
            ) : null}
          </div>
          <p
            className="max-w-[512px] font-body text-[14px] leading-[22.75px] text-[#6b7280]"
            style={{ fontStretch: "75%" }}
          >
            {address.line}
          </p>
          <p
            className="font-body text-[14px] leading-5 text-[#6b7280]"
            style={{ fontStretch: "75%", fontWeight: 500 }}
          >
            {address.phone}
          </p>
          <button
            type="button"
            onClick={onEdit ? () => onEdit(address.id) : undefined}
            className="mt-[8.5px] self-start font-display text-[11px] font-bold uppercase text-[#11191f]"
            style={{ letterSpacing: "0.55px" }}
          >
            Edit Details
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={address.isDefault}
          aria-label={address.isDefault ? "Default address" : "Set as default"}
          onClick={onToggleDefault ? () => onToggleDefault(address.id) : undefined}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#11191f] hover:bg-[#f3f4f6]"
        >
          <StarIcon filled={address.isDefault} size={18} />
        </button>
        <button
          type="button"
          aria-label="Remove address"
          onClick={onDelete ? () => onDelete(address.id) : undefined}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#11191f] hover:bg-[#f3f4f6]"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </div>
  );
}
