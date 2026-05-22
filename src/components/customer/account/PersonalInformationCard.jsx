import { PencilIcon, CalendarIcon } from "./AccountIcons";

// PERSONAL INFORMATION section — Figma mobile 77:2314 + desktop 119:4973.
// Presentational. Inputs render as static read-only values that match the
// Figma look; wire to real form state when the customer profile resolver lands.

export function MobilePersonalInformationCard({ profile }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-[4px] bg-white px-4 py-6 shadow-[0px_0px_5px_rgba(0,0,0,0.15)]">
      <h2 className="font-display text-[12px] font-medium text-[#11191f]">
        PERSONAL INFORMATION
      </h2>

      <div className="flex w-full flex-col gap-2">
        <MobileField>{profile.email}</MobileField>
        <MobileField>
          <span>{profile.phoneCountry}</span>
          <span className="mx-2 inline-block h-2 w-px bg-[#11191f]/40" aria-hidden="true" />
          <span>{profile.phoneNumber}</span>
        </MobileField>
        <MobileField>{profile.dateOfBirth}</MobileField>
      </div>
    </section>
  );
}

function MobileField({ children }) {
  return (
    <div className="flex h-10 w-full items-center rounded-[2px] border border-[#11191f] px-3">
      <span className="font-display text-[10px] font-medium text-[#11191f]">
        {children}
      </span>
    </div>
  );
}

export function DesktopPersonalInformationCard({ profile }) {
  return (
    <SectionCard>
      <SectionHeader title="Personal Information" />
      <div className="p-8">
        <div className="flex w-full max-w-[768px] flex-col gap-6">
          <Field label="Email Address" trailing={<PencilIcon size={12} className="text-[#11191f]" />}>
            {profile.email}
          </Field>

          <div className="flex w-full flex-col gap-2">
            <FieldLabel>Phone Number</FieldLabel>
            <div className="flex w-full overflow-hidden rounded-[4px]">
              <div className="flex w-20 items-center justify-center border border-r-0 border-[#11191f] bg-[#f9fafb] px-4 py-[16.5px]">
                <span className="font-display text-[14px] font-medium leading-5 text-[#6b7280]">
                  {profile.phoneCountry}
                </span>
              </div>
              <div className="flex flex-1 items-center border border-[#11191f] px-[17px] py-[17px]">
                <span className="font-display text-[14px] leading-5 text-[#11191f]">
                  {profile.phoneNumber}
                </span>
              </div>
            </div>
          </div>

          <Field label="Date of Birth" trailing={<CalendarIcon size={16} className="text-[#11191f]" />}>
            {profile.dateOfBirth}
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function Field({ label, trailing, children }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative flex w-full items-center rounded-[4px] border border-[#11191f] bg-white px-[17px] py-[17px]">
        <span className="font-display flex-1 text-[14px] leading-5 text-[#11191f]">
          {children}
        </span>
        {trailing ? (
          <button
            type="button"
            className="ml-3 flex h-6 w-6 items-center justify-center text-[#11191f]"
            aria-label={`Edit ${label}`}
          >
            {trailing}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label
      className="font-body text-[12px] uppercase leading-4 text-[#6b7280]"
      style={{ fontStretch: "75%", fontWeight: 600 }}
    >
      {children}
    </label>
  );
}

// Shared section-card chrome reused by Payment + Address.
export function SectionCard({ children }) {
  return (
    <section className="w-full overflow-hidden rounded-[8px] border border-[#f3f4f6] bg-white shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
      {children}
    </section>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-[#f9fafb] px-8 pt-6 pb-[25px]">
      <h2
        className="font-display text-[18px] font-bold uppercase leading-7 text-[#11191f]"
        style={{ letterSpacing: "0.45px" }}
      >
        {title}
      </h2>
      {action}
    </div>
  );
}
