import Image from "next/image";
import Link from "next/link";

export default function AuthHeader({
  mobileLinkText,
  mobileLinkHref,
  mobileMode = "inline",
  desktopPromptText,
  desktopLinkText,
  desktopLinkHref,
}) {
  return (
    <>
      {/* Mobile: switch-link on left, RE logo centered */}
      {mobileMode === "inline" ? (
      <div className="relative flex h-[62px] w-full items-center justify-center px-4 md:hidden">
        {mobileLinkText ? (
          <Link
            href={mobileLinkHref}
            className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-[10px] font-bold uppercase leading-[12px] tracking-[0.5px] text-[#11191f]"
          >
            {mobileLinkText}
          </Link>
        ) : null}
        <Link href="/" aria-label="Repair home" className="block">
          <Image
            src="/auth/blackLogo-v2.png"
            alt="Repair"
            width={32}
            height={23}
            className="h-[23px] w-8 object-contain"
            priority
          />
        </Link>
      </div>
      ) : null}

      {/* Desktop: prompt + underlined link aligned right */}
      <div className="hidden h-[87px] w-full items-start justify-end gap-2 px-8 py-8 md:flex">
        {desktopPromptText ? (
          <span className="font-display text-[14px] font-normal leading-[20px] text-[#666]">
            {desktopPromptText}
          </span>
        ) : null}
        {desktopLinkText ? (
          <Link
            href={desktopLinkHref}
            className="border-b border-[#11191f] pb-[3px] font-display text-[14px] font-semibold uppercase leading-[20px] tracking-[0.7px] text-[#11191f] transition-opacity hover:opacity-80"
          >
            {desktopLinkText}
          </Link>
        ) : null}
      </div>
    </>
  );
}
