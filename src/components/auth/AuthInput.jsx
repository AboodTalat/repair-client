"use client";
import { useId, useState } from "react";

export default function AuthInput({
  label,
  type = "text",
  name,
  autoComplete,
  required = false,
  defaultValue = "",
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
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
        type={type}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="h-full w-full bg-transparent px-4 font-display text-[14px] font-medium tracking-[0.7px] text-[#11191f] outline-none placeholder:text-[#11191f]/50"
      />
    </div>
  );
}
