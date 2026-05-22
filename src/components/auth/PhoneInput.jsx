"use client";
import { useId, useState } from "react";

export default function PhoneInput({ name = "phone", required = false }) {
  const id = useId();
  const [value, setValue] = useState("");
  const isFloating = value !== "";

  return (
    <div className="relative h-[50px] w-full border border-[#11191f]">
      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-1 font-display text-[14px] font-medium leading-[20px] text-[#11191f]/50">
        <span>+962</span>
        <span className="text-[#d1d5db]">|</span>
      </div>
      <label
        htmlFor={id}
        className={`pointer-events-none absolute font-display text-[14px] font-medium uppercase tracking-[0.7px] text-[#11191f]/50 transition-all duration-150 ${
          isFloating
            ? "left-4 top-0 -translate-y-1/2 bg-white px-1 text-[10px] tracking-[0.5px]"
            : "left-[80px] top-1/2 -translate-y-1/2"
        }`}
      >
        Phone Number
      </label>
      <input
        id={id}
        type="tel"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="tel-national"
        required={required}
        className="h-full w-full bg-transparent pl-[80px] pr-4 font-display text-[14px] font-medium tracking-[0.7px] text-[#11191f] outline-none"
      />
    </div>
  );
}
