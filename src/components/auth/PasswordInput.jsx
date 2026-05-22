"use client";
import { useId, useState } from "react";

export default function PasswordInput({
  label,
  name,
  autoComplete = "current-password",
  required = false,
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const isFloating = value !== "";

  return (
    <div className="relative h-[50px] w-full border border-[#11191f]">
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 font-display text-[14px] font-medium uppercase tracking-[0.7px] text-[#11191f]/50 transition-all duration-150 ${
          isFloating
            ? "top-0 -translate-y-1/2 bg-white px-1 text-[10px] tracking-[0.5px]"
            : "top-1/2 -translate-y-1/2"
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="h-full w-full bg-transparent pl-4 pr-12 font-display text-[14px] font-medium tracking-[0.7px] text-[#11191f] outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-4 top-1/2 -translate-y-1/2 grid h-5 w-[18px] place-items-center text-[#11191f]"
      >
        {visible ? (
          <svg viewBox="0 0 18 16" fill="none" className="h-4 w-[18px]" aria-hidden>
            <path
              d="M1 1l16 14M9 3.5c4 0 7.5 4.5 7.5 4.5s-.85 1.1-2.2 2.3M6.5 4.5C4.4 5.6 1.5 8 1.5 8s3.5 4.5 7.5 4.5c1 0 1.95-.2 2.8-.55M7.2 6.2A2.3 2.3 0 009 10.5c.55 0 1.05-.2 1.45-.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 18 16" fill="none" className="h-4 w-[18px]" aria-hidden>
            <path
              d="M1.5 8S5 3.5 9 3.5 16.5 8 16.5 8 13 12.5 9 12.5 1.5 8 1.5 8z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
      </button>
    </div>
  );
}
