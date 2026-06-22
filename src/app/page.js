import SplashSection from "@/components/public/homePage/SplashSection";
import HeaderShell from "@/components/public/homePage/HeaderShell";
import HeroSection from "@/components/public/homePage/HeroSection";
import ColorwaysIntro from "@/components/public/homePage/ColorwaysIntro";
import ColorwaySection from "@/components/public/homePage/ColorwaySection";
import CraftedToLast from "@/components/public/homePage/CraftedToLast";
import StatsSection from "@/components/public/homePage/StatsSection";
import BrowseCollection from "@/components/public/homePage/BrowseCollection";
import Footer from "@/components/public/homePage/Footer";
import { fetchCategories } from "@/lib/storeNav";
import { fetchStorefrontContent } from "@/lib/storefrontContent";
import { COLORWAYS_DEFAULT } from "@/lib/storefrontDefaults";

// Single source of the current-design colorway defaults (shared with the admin
// editor seed). When the CMS has no `colorways` section the landing renders
// identically; an admin editing colorways on /r3pr-console/storefront overlays
// this same shape (the StorefrontManager fields map 1:1 to ColorwaySection's props).
const DEFAULT_COLORWAYS = COLORWAYS_DEFAULT;

export default async function Home() {
  const [categories, content] = await Promise.all([
    fetchCategories(),
    fetchStorefrontContent(),
  ]);

  // CMS overlay: use admin-set colorways when present, else the current design.
  const colorways =
    Array.isArray(content?.colorways) && content.colorways.length
      ? content.colorways
      : DEFAULT_COLORWAYS;

  return (
    <>
      <SplashSection />
      <HeaderShell />
      <main className="w-full overflow-x-hidden bg-black text-white">
        <div className="mx-auto w-full">
          <HeroSection hero={content?.hero} />
        <ColorwaysIntro intro={content?.colorways_intro} />
        {colorways.map((cw, i) => (
          <ColorwaySection
            key={cw.id ?? i}
            image={cw.image}
            imageAlt={cw.imageAlt}
            multiSwatch={cw.multiSwatch}
            swatches={cw.swatches}
            ctaLabel={cw.ctaLabel}
            badge={cw.badge}
            reversed={cw.reversed}
          />
        ))}
        <CraftedToLast content={content?.crafted_to_last} />
        <StatsSection stats={content?.stats} />
          <BrowseCollection tiles={content?.browse_tiles} />
          <Footer categories={categories} footer={content?.footer} />
        </div>
      </main>
    </>
  );
}
