import { Suspense } from "react";
import ShopHeader from "@/components/customer/shop/ShopHeader";
import ShopFooter from "@/components/customer/shop/ShopFooter";
import RoleGuard from "@/components/auth/RoleGuard";
import { fetchCategories } from "@/lib/storeNav";

// Layout shell for customer-facing pages past the public landing.
// White surface, dark text, sticky white header, dark footer — matches
// the Figma shop screens (frame set 2065:4344 + 15:810).
//
// The category tree is fetched once here and shared with both ShopHeader
// (desktop nav + sidebar) and ShopFooter (Shop column), so navigation and
// footer surface the same data across every customer page.
//
// Authentication is NOT required here — shop, products, cart, checkout, and
// contact are all open to guest (unauthenticated) users. ADMINS may browse the
// storefront too (allowed below). Only delivery + accounting are bounced to
// their own console home, since the storefront is not their workspace. RoleGuard
// (public mode) renders the shell for guests + customers + admins and redirects
// only those two stakeholder roles. The /account/* subtree stays CUSTOMER-only
// and additionally requires auth (see account/layout.js) — it's the customer's
// personal hub (orders / wishlist / addresses), not part of the storefront.

export default async function CustomerLayout({ children }) {
  const categories = await fetchCategories();
  return (
    <RoleGuard allow={["customer", "admin"]}>
      <div className="flex min-h-screen flex-col bg-white text-[#11191f]">
        {/* ShopHeader reads ?category=/?sub= via useSearchParams to highlight the
            chosen category, so it needs a Suspense boundary. */}
        <Suspense fallback={<div className="sticky top-0 z-30 h-14 bg-white md:h-[80px]" />}>
          <ShopHeader categories={categories} />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
        <div className="hidden md:block">
          <ShopFooter categories={categories} />
        </div>
      </div>
    </RoleGuard>
  );
}
