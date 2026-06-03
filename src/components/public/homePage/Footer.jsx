import Image from "next/image";
import Link from "next/link";
import {
  FOOTER_HELP_LINKS,
  FOOTER_LEGAL_LINKS,
  footerShopLinks,
} from "@/lib/storeNav";
import NewsletterSignup from "@/components/shared/NewsletterSignup";

function FooterLink({ href = "#", children }) {
  return (
    <li>
      <Link
        href={href}
        className="font-body text-[14px] leading-4 text-[#232323]/50 hover:text-[#232323]"
        style={{ fontStretch: "75%" }}
      >
        {children}
      </Link>
    </li>
  );
}

function Heading({ children }) {
  return (
    <h3 className="font-display text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#11191f]">
      {children}
    </h3>
  );
}

export default function Footer({ categories = [] }) {
  const shopLinks = footerShopLinks(categories);
  return (
    <footer className="w-full bg-white px-4 pb-[102px] pt-8 text-[#11191f] sm:px-8 sm:pb-16 md:px-12 md:pt-16 lg:px-16">
      <div className="mx-auto flex max-w-[357px] flex-col gap-6 sm:max-w-[720px] md:max-w-[1100px] md:grid md:grid-cols-12 md:gap-x-10 md:gap-y-10">
        <div className="flex flex-col gap-6 md:col-span-4">
          <Link href="/" aria-label="Repair home" className="inline-flex h-8 w-[44.5px]">
            <Image
              src="/home/logo-re.png"
              alt="Repair"
              width={44}
              height={32}
              className="h-8 w-auto"
              style={{ filter: "brightness(0)" }}
            />
          </Link>

          <p
            className="font-body text-[14px] leading-[19.5px] text-[#232323]/50 md:max-w-[320px]"
            style={{ fontStretch: "75%" }}
          >
            Engineered for performance, designed for life. We create premium athletic wear for the
            modern mover.
          </p>

          <div className="flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid size-12 place-items-center rounded-full bg-[#11191f]"
            >
              <Image src="/home/social-1.png" color="white" alt="" width={22} height={22} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="grid size-12 place-items-center rounded-full bg-[#11191f]"
            >
              <Image src="/home/social-2.svg" alt="" width={16} height={16} />
            </a>
          </div>
        </div>

        <div className="flex justify-center gap-8 md:col-span-4 md:gap-12">
          <div className="flex flex-1 flex-col gap-4">
            <Heading>Shop</Heading>
            <ul className="flex flex-col gap-3">
              {shopLinks.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <Heading>Help</Heading>
            <ul className="flex flex-col gap-3">
              {FOOTER_HELP_LINKS.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:col-span-4">
          <Heading>Stay in the loop</Heading>
          <p
            className="font-body text-[14px] leading-4 text-[#232323]/50"
            style={{ fontStretch: "75%" }}
          >
            Subscribe for exclusive drops and early access.
          </p>
          <NewsletterSignup tone="light" />
        </div>

        <div className="flex flex-col gap-4 border-t border-[#0f0f11] pt-[25px] md:col-span-12 md:flex-row md:items-center md:justify-between md:gap-6">
          <p
            className="text-center font-body text-[14px] leading-4 text-[#232323]/50 md:text-left"
            style={{ fontStretch: "75%" }}
          >
            © {new Date().getFullYear()} RE. All rights reserved.
          </p>
          <ul className="flex justify-center gap-4 md:justify-end">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
