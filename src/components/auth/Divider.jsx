export default function Divider({ label = "Or" }) {
  return (
    <div className="flex w-full items-center py-2">
      <div className="h-px flex-1 border-t border-[#e5e7eb]" />
      <span className="px-4 font-display text-[12px] uppercase leading-[16px] tracking-[1.2px] text-[#d1d5db]">
        {label}
      </span>
      <div className="h-px flex-1 border-t border-[#e5e7eb]" />
    </div>
  );
}
