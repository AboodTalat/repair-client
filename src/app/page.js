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

// Current-design colorway defaults. These mirror the original hardcoded
// <ColorwaySection> calls EXACTLY, so when the CMS has no `colorways` section
// (ships empty) the landing renders identically. An admin editing colorways on
// /r3pr-console/storefront overlays this same shape (the StorefrontManager
// fields map 1:1 to ColorwaySection's props).
const DEFAULT_COLORWAYS = [
  {
    id: "cw-1",
    image: "/home/bright-white.png",
    imageAlt: "Bright White colorway",
    multiSwatch: true,
    ctaLabel: "SELECT YOUR COLOR",
    swatches: [
      { color: "#11191f", name: "Midnight Black", tagline: "Timeless. Versatile. Essential." },
      { color: "#ffffff", name: "Bright White", tagline: "Bold. Modern. Dynamic." },
    ],
  },
  {
    id: "cw-2",
    image: "/home/deep-blue.png",
    imageAlt: "Deep Blue colorway",
    ctaLabel: "ADD TO CART",
    badge: "UNISEX",
    reversed: true,
    swatches: [{ color: "#11233f", name: "Deep Blue", tagline: "Pure. Clean. Confident." }],
  },
  {
    id: "cw-3",
    image: "/home/fresh-green.png",
    imageAlt: "Fresh Green colorway",
    ctaLabel: "ADD TO CART",
    badge: "UNISEX",
    swatches: [{ color: "#a8c0b2", name: "Fresh Green", tagline: "Sleek. Sophisticated. Powerful." }],
  },
];

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
        <ColorwaysIntro />
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
        <CraftedToLast />
        <StatsSection stats={content?.stats} />
          <BrowseCollection />
          <Footer categories={categories} />
        </div>
      </main>
    </>
  );
}
