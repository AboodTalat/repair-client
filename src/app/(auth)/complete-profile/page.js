import HeroPanel from "@/components/auth/HeroPanel";
import AuthHeader from "@/components/auth/AuthHeader";
import CompleteProfileForm from "@/components/auth/CompleteProfileForm";

export const metadata = { title: "Complete Profile — Repair" };

export default function CompleteProfilePage() {
  return (
    <>
      <HeroPanel
        image="/auth/reset-password-desktop.png"
        quote="One last detail."
        overlay="rgba(17,25,31,0.1)"
      />

      <main className="flex w-full min-w-0 flex-col bg-white md:w-[40%]">
        <AuthHeader
          mobileMode="none"
          desktopPromptText=""
          desktopLinkText=""
          desktopLinkHref="/"
        />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-16 xl:px-24">
          <div className="flex w-full max-w-[384px] flex-col">
            <div className="pb-8 md:pb-10">
              <h1 className="font-display text-[22px] font-bold uppercase leading-[28px] tracking-[-0.5px] md:text-[32px] md:leading-[48px] md:tracking-[-1.2px]">
                <span className="block">
                  <span className="text-[#11191f]/50">Almost</span>
                  <span className="text-[#11191f]"> There</span>
                </span>
                <span className="block">
                  <span className="text-[#11191f]/50">Add Your</span>
                  <span className="text-[#11191f]"> Phone</span>
                </span>
              </h1>
              <p className="pt-4 font-display text-[12px] uppercase tracking-[0.3px] text-[#11191f]/60">
                We use it for order updates and delivery contact.
              </p>
            </div>

            <CompleteProfileForm />
          </div>
        </div>
      </main>
    </>
  );
}
