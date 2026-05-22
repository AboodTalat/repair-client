"use client";

import { IconChevronDown } from "./Icons";

export function Label({ children, required = false }) {
  return (
    <span className="font-body text-[11px] font-medium uppercase tracking-[1px] text-[#6b7280]">
      {children}
      {required ? <span className="ml-0.5 text-[#dc2626]">*</span> : null}
    </span>
  );
}

export function Field({ label, required = false, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <Label required={required}>{label}</Label> : null}
      {children}
      {hint ? <span className="font-body text-[11px] text-[#6b7280]">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return (
    <input
      type="text"
      {...props}
      className={
        "h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-body text-[14px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] " +
        className
      }
    />
  );
}

export function NumberInput({ className = "", ...props }) {
  return (
    <input
      type="number"
      {...props}
      className={
        "h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-body text-[14px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] " +
        className
      }
    />
  );
}

export function TextArea({ className = "", rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={
        "w-full rounded-[2px] border border-[#e5e7eb] bg-white p-3 font-body text-[14px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f] resize-y " +
        className
      }
    />
  );
}

export function Select({ options = [], value, onChange, placeholder, className = "" }) {
  return (
    <div className={"relative " + className}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full appearance-none rounded-[2px] border border-[#e5e7eb] bg-white pl-3 pr-9 font-body text-[14px] text-[#11191f] outline-none focus:border-[#11191f]"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
        <IconChevronDown />
      </span>
    </div>
  );
}

export function Toggle({ checked = false, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <span
        className="relative inline-block h-6 w-10 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "#11191f" : "#e5e7eb" }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      {label ? (
        <span className="font-body text-[13px] text-[#11191f]">{label}</span>
      ) : null}
    </label>
  );
}

export function Chip({ active = false, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 font-body text-[12px] font-medium transition-colors " +
        (active
          ? "border-[#11191f] bg-[#11191f] text-white"
          : "border-[#e5e7eb] bg-white text-[#11191f] hover:bg-[#f3f4f6]") +
        " " +
        className
      }
    >
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={"relative w-full " + className}>
      <span className="pointer-events-none absolute left-3 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-[#6b7280]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      </span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-white pl-9 pr-3 font-body text-[14px] text-[#11191f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#11191f]"
      />
    </div>
  );
}

export function DateInput(props) {
  return (
    <input
      type="date"
      {...props}
      className={
        "h-10 w-full rounded-[2px] border border-[#e5e7eb] bg-white px-3 font-body text-[14px] text-[#11191f] outline-none transition-colors focus:border-[#11191f] " +
        (props.className || "")
      }
    />
  );
}
