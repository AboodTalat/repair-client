import ContactForm from "@/components/customer/contact/ContactForm";

// `/contact` — Figma mobile 66:2449. Small "CONTACT US" eyebrow + subtitle
// above a 5-field form (first name, last name, email, country-code + phone,
// message) and a black SEND MESSAGE CTA. Figma defines a mobile design only,
// so the same column layout is centered and gently scaled up at md/lg
// instead of inventing a distinct desktop heading. Lives under (customer)
// so it inherits the sticky white ShopHeader and desktop-only ShopFooter.

export const metadata = {
  title: "Contact Us — Repair",
};

export default function ContactPage() {
  return (
    <main className="w-full bg-white">
      <div className="mx-auto w-full max-w-[400px] px-4 pt-4 pb-12 sm:px-6 md:max-w-[480px] md:pt-10 md:pb-20 lg:max-w-[560px] lg:pt-16">
        <div className="flex flex-col gap-1 pb-4 md:gap-1.5 md:pb-6">
          <h1 className="font-display text-[14px] font-medium leading-tight text-[#11191f] md:text-[18px] lg:text-[22px]">
            CONTACT US
          </h1>
          <p className="font-display text-[10px] font-medium leading-snug text-[rgba(17,25,31,0.5)] md:text-[12px] lg:text-[14px]">
            Our friendly team would love to hear from you
          </p>
        </div>

        <ContactForm />
      </div>
    </main>
  );
}
