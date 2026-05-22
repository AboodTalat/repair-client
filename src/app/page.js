import SplashSection from "@/components/public/homePage/SplashSection";
import HeaderShell from "@/components/public/homePage/HeaderShell";
import HeroSection from "@/components/public/homePage/HeroSection";
import ColorwaysIntro from "@/components/public/homePage/ColorwaysIntro";
import ColorwaySection from "@/components/public/homePage/ColorwaySection";
import CraftedToLast from "@/components/public/homePage/CraftedToLast";
import StatsSection from "@/components/public/homePage/StatsSection";
import BrowseCollection from "@/components/public/homePage/BrowseCollection";
import Footer from "@/components/public/homePage/Footer";

export default function Home() {
  return (
    <>
      <SplashSection />
      <HeaderShell />
      <main className="w-full overflow-x-hidden bg-black text-white">
        <div className="mx-auto w-full">
          <HeroSection />
        <ColorwaysIntro />
        <ColorwaySection
          image="/home/bright-white.png"
          imageAlt="Bright White colorway"
          multiSwatch
          swatches={[
            { color: "#11191f", name: "Midnight Black", tagline: "Timeless. Versatile. Essential." },
            { color: "#ffffff", name: "Bright White", tagline: "Bold. Modern. Dynamic." },
          ]}
          ctaLabel="SELECT YOUR COLOR"
        />
        <ColorwaySection
          image="/home/deep-blue.png"
          imageAlt="Deep Blue colorway"
          swatches={[
            { color: "#11233f", name: "Deep Blue", tagline: "Pure. Clean. Confident." },
          ]}
          ctaLabel="ADD TO CART"
          badge="UNISEX"
          reversed
        />
        <ColorwaySection
          image="/home/fresh-green.png"
          imageAlt="Fresh Green colorway"
          swatches={[
            { color: "#a8c0b2", name: "Fresh Green", tagline: "Sleek. Sophisticated. Powerful." },
          ]}
          ctaLabel="ADD TO CART"
          badge="UNISEX"
        />
        <CraftedToLast />
        <StatsSection />
          <BrowseCollection />
          <Footer />
        </div>
      </main>
    </>
  );
}
