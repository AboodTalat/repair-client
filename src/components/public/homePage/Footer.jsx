import Image from "next/image";

const SHOP = ["New Arrivals", "Best Sellers", "Men", "Women", "Accessories"];
const HELP = ["Shipping & Returns", "FAQ", "Size Guide", "Contact Us", "Track Order"];

function FooterLink({ children }) {
  return (
    <li>
      <a
        href="#"
        className="font-body text-[14px] leading-4 text-[#232323]/50 hover:text-[#232323]"
        style={{ fontStretch: "75%" }}
      >
        {children}
      </a>
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

export default function Footer() {
  return (
    <footer className="w-full bg-white px-4 pb-[102px] pt-8 text-[#11191f] sm:px-8 sm:pb-16 md:px-12 md:pt-16 lg:px-16">
      <div className="mx-auto flex max-w-[357px] flex-col gap-6 sm:max-w-[720px] md:max-w-[1100px] md:grid md:grid-cols-12 md:gap-x-10 md:gap-y-10">
        <div className="flex flex-col gap-6 md:col-span-4">
          <a href="#" aria-label="Repair home" className="inline-flex h-8 w-[44.5px]">
            <Image
              src="/home/logo-re.png"
              alt="Repair"
              width={44}
              height={32}
              className="h-8 w-auto"
              style={{ filter: "brightness(0)" }}
            />
          </a>

          <p
            className="font-body text-[14px] leading-[19.5px] text-[#232323]/50 md:max-w-[320px]"
            style={{ fontStretch: "75%" }}
          >
            Engineered for performance, designed for life. We create premium athletic wear for the
            modern mover.
          </p>

          <div className="flex gap-3">
            <a
              href="#"
              aria-label="Instagram"
              className="grid size-12 place-items-center rounded-full bg-[#11191f]"
            >
              <Image src="/home/social-1.png" color="white" alt="" width={22} height={22} />
            </a>
            <a
              href="#"
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
              {SHOP.map((s) => (
                <FooterLink key={s}>{s}</FooterLink>
              ))}
            </ul>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <Heading>Help</Heading>
            <ul className="flex flex-col gap-3">
              {HELP.map((s) => (
                <FooterLink key={s}>{s}</FooterLink>
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
          <form className="flex gap-2" action="#" method="post">
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email"
              className="min-w-0 flex-1 rounded border border-[#11191f] bg-white p-[13px] font-body text-[14px] text-[#232323] placeholder:text-[#232323]/50 focus:outline-none"
              style={{ fontStretch: "75%" }}
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="grid shrink-0 place-items-center rounded bg-[#11191f] px-5"
            >
              <Image src="/home/icon-send.svg" alt="" width={12} height={14} />
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#0f0f11] pt-[25px] md:col-span-12 md:flex-row md:items-center md:justify-between md:gap-6">
          <p
            className="text-center font-body text-[14px] leading-4 text-[#232323]/50 md:text-left"
            style={{ fontStretch: "75%" }}
          >
            © 2026 RE. All rights reserved.
          </p>
          <ul className="flex justify-center gap-4 md:justify-end">
            <FooterLink>Privacy Policy</FooterLink>
            <FooterLink>Terms</FooterLink>
            <FooterLink>Cookies</FooterLink>
          </ul>
        </div>
      </div>
    </footer>
  );
}
