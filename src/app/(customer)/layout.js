import ShopHeader from "@/components/customer/shop/ShopHeader";
import ShopFooter from "@/components/customer/shop/ShopFooter";
import { fetchCategories } from "@/lib/storeNav";

// Layout shell for customer-facing pages past the public landing.
// White surface, dark text, sticky white header, dark footer — matches
// the Figma shop screens (frame set 2065:4344 + 15:810).
//
// The category tree is fetched once here and shared with both ShopHeader
// (desktop nav + sidebar) and ShopFooter (Shop column), so navigation and
// footer surface the same data across every customer page.
//
// Auth is NOT enforced here — shop, products, cart, checkout, and contact
// are all accessible to guest (unauthenticated) users. Only the /account/*
// subtree is gated by AuthGuard (see account/layout.js).

export default async function CustomerLayout({ children }) {
  const categories = await fetchCategories();
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#11191f]">
      <ShopHeader categories={categories} />
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="hidden md:block">
        <ShopFooter categories={categories} />
      </div>
    </div>
  );
}
