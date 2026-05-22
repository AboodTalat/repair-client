export default function AuthButton({ children, type = "submit", ...props }) {
  return (
    <button
      type={type}
      className="relative flex h-[48px] w-full items-center justify-center bg-[#11191f] font-display text-[14px] font-bold uppercase tracking-[1.4px] text-white shadow-[0_10px_15px_-3px_#e5e7eb,0_4px_6px_-4px_#e5e7eb] transition-colors hover:bg-[#1c2630] md:h-[52px]"
      {...props}
    >
      {children}
    </button>
  );
}
