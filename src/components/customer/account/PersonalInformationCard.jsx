import { PencilIcon } from "./AccountIcons";
import { parseE164 } from "@/lib/countryCodes";

// PERSONAL INFORMATION section — Figma mobile 77:2314 + desktop 119:4973.
// Email is read-only; phone + date of birth are editable through the single
// "Edit" affordance (opens EditProfileDrawer). `profile` carries RAW values:
//   { email, phone (E.164 string|null), dateOfBirth ("YYYY-MM-DD"|null) }
// and this card derives the display (splitting the dial code out of the phone
// so the country code is visibly present, and formatting the birth date).

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Split a stored E.164 phone into a "+<dial>" chip + the national number. Only
// splits when the value is a proper "+"-prefixed string; otherwise the whole
// value goes in the number slot and the dial chip stays empty.
function splitPhoneForDisplay(phone) {
  if (typeof phone === "string" && phone.startsWith("+")) {
    const { country, local } = parseE164(phone);
    return { code: `+${country.dial}`, number: local || phone };
  }
  return { code: "", number: phone && String(phone).trim() ? phone : "Not provided" };
}

function formatDob(dob) {
  if (!dob || typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "—";
  const [y, m, d] = dob.split("-").map(Number);
  if (!MONTHS[m - 1]) return "—";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function EditButton({ onClick, size = "sm" }) {
  const desktop = size === "lg";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[2px] border border-[#11191f] bg-white text-[#11191f] transition-colors hover:bg-[#f9fafb]"
      style={{
        height: desktop ? 36 : 28,
        padding: desktop ? "0 14px" : "0 10px",
        fontSize: desktop ? 12 : 10,
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
      aria-label="Edit personal information"
    >
      <PencilIcon size={desktop ? 14 : 12} className="text-[#11191f]" />
      <span className="font-display uppercase">Edit</span>
    </button>
  );
}

export function MobilePersonalInformationCard({ profile, onEdit }) {
  const phone = splitPhoneForDisplay(profile.phone);
  return (
    <section className="flex w-full flex-col gap-4 rounded-[4px] bg-white px-4 py-6 shadow-[0px_0px_5px_rgba(0,0,0,0.15)]">
      <div className="flex w-full items-center justify-between">
        <h2 className="font-display text-[12px] font-medium text-[#11191f]">
          PERSONAL INFORMATION
        </h2>
        {onEdit ? <EditButton onClick={onEdit} /> : null}
      </div>

      <div className="flex w-full flex-col gap-2">
        <MobileField>{profile.email || "—"}</MobileField>
        <MobileField>
          {phone.code ? (
            <>
              <span>{phone.code}</span>
              <span className="mx-2 inline-block h-2 w-px bg-[#11191f]/40" aria-hidden="true" />
            </>
          ) : null}
          <span>{phone.number}</span>
        </MobileField>
        <MobileField>{formatDob(profile.dateOfBirth)}</MobileField>
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

export function DesktopPersonalInformationCard({ profile, onEdit }) {
  const phone = splitPhoneForDisplay(profile.phone);
  return (
    <SectionCard>
      <SectionHeader
        title="Personal Information"
        action={onEdit ? <EditButton onClick={onEdit} size="lg" /> : null}
      />
      <div className="p-8">
        <div className="flex w-full max-w-[768px] flex-col gap-6">
          <Field label="Email Address">{profile.email || "—"}</Field>

          <div className="flex w-full flex-col gap-2">
            <FieldLabel>Phone Number</FieldLabel>
            <div className="flex w-full overflow-hidden rounded-[4px]">
              <div className="flex min-w-20 items-center justify-center border border-r-0 border-[#11191f] bg-[#f9fafb] px-4 py-[16.5px]">
                <span className="font-display text-[14px] font-medium leading-5 text-[#6b7280]">
                  {phone.code || "—"}
                </span>
              </div>
              <div className="flex flex-1 items-center border border-[#11191f] px-[17px] py-[17px]">
                <span className="font-display text-[14px] leading-5 text-[#11191f]">
                  {phone.number}
                </span>
              </div>
            </div>
          </div>

          <Field label="Date of Birth">{formatDob(profile.dateOfBirth)}</Field>
        </div>
      </div>
    </SectionCard>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative flex w-full items-center rounded-[4px] border border-[#11191f] bg-white px-[17px] py-[17px]">
        <span className="font-display flex-1 text-[14px] leading-5 text-[#11191f]">
          {children}
        </span>
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
