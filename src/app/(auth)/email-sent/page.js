import Link from "next/link";
import HeroPanel from "@/components/auth/HeroPanel";
import AuthHeader from "@/components/auth/AuthHeader";
import RequestPasswordResetForm from "@/components/auth/RequestPasswordResetForm";
import TermsFooter from "@/components/auth/TermsFooter";

export const metadata = { title: "Reset Password — Repair" };

function DirectboxReceiveIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      aria-hidden
      className="block text-[#11191f]"
    >
      <path
        d="M32 5.33333V21.3333L37.3333 16"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 21.3333L26.6667 16"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.6667 32C8 32 8 36.7733 8 42.6667V45.3333C8 52.6933 8 58.6667 21.3333 58.6667H42.6667C53.3333 58.6667 56 52.6933 56 45.3333V42.6667C56 36.7733 56 32 45.3333 32C42.6667 32 41.92 32.56 40.5333 33.6L37.8133 36.48C34.6667 39.84 29.3333 39.84 26.16 36.48L23.4667 33.6C22.08 32.56 21.3333 32 18.6667 32Z"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3333 32V21.3334C13.3333 15.9734 13.3333 11.5467 21.3333 10.7734"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50.6667 32V21.3334C50.6667 15.9734 50.6667 11.5467 42.6667 10.7734"
        stroke="currentColor"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EmailSentPage() {
  return (
    <>
      <HeroPanel image="/auth/reset-password-desktop.png" quote="Define your movement." overlay="rgba(17,25,31,0.1)" />

      <main className="flex w-full min-w-0 flex-col bg-white md:w-[40%]">
        <AuthHeader
          mobileLinkText="Sign In / Sign Up"
          mobileLinkHref="/sign-in"
          desktopLinkText="Back to Login"
          desktopLinkHref="/sign-in"
        />

        {/* Form Container — Figma: gap-32 between blocks, centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:px-6 md:px-8 lg:px-16 xl:px-24">
          {/* Icon & Instruction Area — gap-16 between icon and text */}
          <div className="flex w-full max-w-[384px] flex-col items-center gap-4">
            <DirectboxReceiveIcon />
            <div className="w-full px-[43.69px]">
              <p className="text-center font-display text-[16px] font-semibold uppercase leading-[24px] tracking-[0.4px] text-[#11191f]">
                Enter your registered email to receive a password reset link
              </p>
            </div>
          </div>

          {/* Heading + form (or post-submit "check your inbox" state) lives
              in the client component so it can swap on success. */}
          <RequestPasswordResetForm />
        </div>

        <div className="hidden md:block">
          <TermsFooter>
            Need help?{" "}
            <Link href="/contact" className="underline">
              Contact Support
            </Link>
          </TermsFooter>
        </div>
      </main>
    </>
  );
}
