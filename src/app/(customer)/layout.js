import ShopHeader from "@/components/customer/shop/ShopHeader";
import ShopFooter from "@/components/customer/shop/ShopFooter";

// Layout shell for customer-facing pages past the public landing.
// White surface, dark text, sticky white header, dark footer — matches
// the Figma shop screens (frame set 2065:4344 + 15:810).

export default function CustomerLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#11191f]">
      <ShopHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="hidden md:block">
        <ShopFooter />
      </div>
    </div>
  );
}
