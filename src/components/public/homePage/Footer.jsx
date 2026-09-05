import Image from "next/image";
import Link from "next/link";
import {
  FOOTER_LEGAL_LINKS,
  footerShopLinks,
} from "@/lib/storeNav";
import { FOOTER_DEFAULT } from "@/lib/storefrontDefaults";
import NewsletterSignup from "@/components/shared/NewsletterSignup";

// Known social icons so the default Instagram/Twitter render exactly as before;
// any other network the admin adds falls back to a first-letter bubble.
const SOCIAL_ICONS = {
  instagram: { src: "/home/social-1.png", w: 22, h: 22 },
  twitter: { src: "/home/social-2.svg", w: 16, h: 16 },
  x: { src: "/home/social-2.svg", w: 16, h: 16 },
};

function SocialBubble({ network, url }) {
  const icon = SOCIAL_ICONS[(network || "").trim().toLowerCase()];
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={network || "Social link"}
      className="grid size-12 place-items-center rounded-full bg-[#11191f]"
    >
      {icon ? (
        <Image src={icon.src} alt="" width={icon.w} height={icon.h} />
      ) : (
        <span className="font-display text-[12px] font-bold uppercase text-white">
          {(network || "?").charAt(0)}
        </span>
      )}
    </a>
  );
}

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

export default function Footer({ categories = [], footer } = {}) {
  // CMS overlay — brand copy, social links, and the extra (Help) columns are
  // admin-editable; the Shop column stays category-driven and the legal bar
  // stays constant. Falls back to the current values so an empty CMS matches.
  const brandCopy = footer?.brandCopy || FOOTER_DEFAULT.brandCopy;
  const social = Array.isArray(footer?.social) ? footer.social : FOOTER_DEFAULT.social;
  const cmsColumns = Array.isArray(footer?.columns) ? footer.columns : FOOTER_DEFAULT.columns;
  const shopLinks = footerShopLinks(categories);
  return (
    <footer className="w-full bg-white px-4 pb-[102px] pt-8 text-[#11191f] sm:px-8 sm:pb-16 md:px-12 md:pt-16 lg:px-16">
      <div className="mx-auto flex max-w-[357px] flex-col gap-6 sm:max-w-[720px] md:max-w-[1100px] md:grid md:grid-cols-12 md:gap-x-10 md:gap-y-10">
        <div className="flex flex-col gap-6 md:col-span-4">
          <Link href="/" aria-label="Repair home" className="inline-flex h-8 w-[47px]">
            <Image
              src="/home/logo-re-v2.png"
              alt="Repair"
              width={47}
              height={32}
              className="h-8 w-auto"
              style={{ filter: "brightness(0)" }}
            />
          </Link>

          <p
            className="font-body text-[14px] leading-[19.5px] text-[#232323]/50 md:max-w-[320px]"
            style={{ fontStretch: "75%" }}
          >
            {brandCopy}
          </p>

          <div className="flex gap-3">
            {social.map((s, i) => (
              <SocialBubble key={s.id ?? i} network={s.network} url={s.url} />
            ))}
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
          {cmsColumns.map((col, ci) => (
            <div key={col.id ?? ci} className="flex flex-1 flex-col gap-4">
              <Heading>{col.heading}</Heading>
              <ul className="flex flex-col gap-3">
                {(col.links || []).map((link, li) => (
                  <FooterLink key={link.id ?? li} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </div>
          ))}
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
