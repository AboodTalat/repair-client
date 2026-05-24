import Image from "next/image";
import Link from "next/link";
import {
  FOOTER_HELP_LINKS,
  FOOTER_LEGAL_LINKS,
  footerShopLinks,
} from "@/lib/storeNav";

function ColumnHeading({ children }) {
  return (
    <h3 className="font-body text-[14px] font-semibold uppercase leading-5 tracking-[0.7px] text-white">
      {children}
    </h3>
  );
}

function FooterLink({ href = "#", children }) {
  return (
    <li>
      <Link
        href={href}
        className="font-body text-[14px] leading-5 text-[#9ca3af] hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ label, href = "#", children }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
    >
      {children}
    </a>
  );
}

export default function ShopFooter({ categories = [] }) {
  const shopLinks = footerShopLinks(categories);
  return (
    <footer className="w-full bg-[#11191f] pb-8 pt-16 text-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-16 px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-12">
          {/* Brand column */}
          <div className="flex flex-col gap-[22.8px]">
            <Link href="/" aria-label="Repair home" className="relative h-[33px] w-12">
              <Image
                src="/home/logo-re.png"
                alt="Repair"
                fill
                sizes="48px"
                className="object-contain"
              />
            </Link>
            <p className="font-body text-[14px] leading-[22.75px] text-[#9ca3af]">
              Engineered for performance, designed for life. We create premium athletic wear for the
              modern mover.
            </p>
            <div className="flex gap-4 pt-[1.2px]">
              <SocialIcon label="Instagram" href="https://instagram.com">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="size-4"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Twitter" href="https://twitter.com">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                  <path d="M22 5.8c-.7.3-1.5.6-2.3.7a4 4 0 0 0 1.8-2.2 8 8 0 0 1-2.6 1A4 4 0 0 0 12 9a11.3 11.3 0 0 1-8.2-4.2 4 4 0 0 0 1.2 5.3 4 4 0 0 1-1.8-.5v.1A4 4 0 0 0 6.4 13a4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 17.6 11.3 11.3 0 0 0 8.1 19c7.3 0 11.3-6 11.3-11.3v-.5A8 8 0 0 0 22 5.8z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Facebook" href="https://facebook.com">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                  <path d="M13.5 21v-7.5h2.5l.4-3h-2.9v-2c0-.9.3-1.5 1.6-1.5H17V4.1A23 23 0 0 0 14.6 4c-2.4 0-4 1.4-4 4v2.5H8v3h2.6V21z" />
                </svg>
              </SocialIcon>
            </div>
          </div>

          {/* Shop links — driven by the live category tree */}
          <div className="flex flex-col gap-6">
            <ColumnHeading>Shop</ColumnHeading>
            <ul className="flex flex-col gap-4">
              {shopLinks.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Help links — wired to real customer pages */}
          <div className="flex flex-col gap-6">
            <ColumnHeading>Help</ColumnHeading>
            <ul className="flex flex-col gap-4">
              {FOOTER_HELP_LINKS.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-6">
            <ColumnHeading>Stay in the loop</ColumnHeading>
            <p className="font-body text-[14px] leading-5 text-[#9ca3af]">
              Subscribe for exclusive drops and early access.
            </p>
            <form className="flex gap-2" action="#" method="post">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email"
                className="min-w-0 flex-1 border border-white/20 bg-white/10 px-[17px] py-[14px] font-body text-[14px] text-white placeholder:text-[#6b7280] focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid shrink-0 place-items-center bg-white px-6 py-[13px]"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="#11191f"
                  strokeWidth="1.6"
                  className="size-4"
                  aria-hidden
                >
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-[33px] md:flex-row md:items-center">
          <p className="font-body text-[14px] leading-5 text-[#9ca3af]">
            © {new Date().getFullYear()} RE. All rights reserved.
          </p>
          <div className="flex gap-6">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="font-body text-[14px] leading-5 text-[#9ca3af] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
