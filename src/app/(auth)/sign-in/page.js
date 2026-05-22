import Image from "next/image";
import Link from "next/link";
import HeroPanel from "@/components/auth/HeroPanel";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import AuthButton from "@/components/auth/AuthButton";
import GoogleButton from "@/components/auth/GoogleButton";
import Divider from "@/components/auth/Divider";
import TermsFooter from "@/components/auth/TermsFooter";

export const metadata = { title: "Sign In — Repair" };

export default function SignInPage() {
  return (
    <>
      <HeroPanel image="/auth/reset-password-desktop.png" quote="Define your movement." overlay="rgba(17,25,31,0.1)" />

      <main className="flex w-full min-w-0 flex-col bg-white md:w-[40%]">
        {/* Mobile: hero pulled to the very top, navbar overlaid */}
        <div className="relative md:hidden">
          <div
            className="relative w-full overflow-hidden "
            style={{ aspectRatio: "393 / 300" }}
          >
            <Image
              src="/auth/sign-in-mobile.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-top"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center px-4 py-5">
            <Link
              href="/sign-up"
              className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 font-display text-[10px] font-bold uppercase leading-[14px] tracking-[0.5px] text-[#11191f]"
            >
              Sign Up
            </Link>
            <Link href="/" aria-label="Repair home" className="pointer-events-auto block">
              <Image
                src="/auth/blackLogo.png"
                alt="Repair"
                width={32}
                height={23}
                className="h-[23px] w-8 object-contain"
                priority
              />
            </Link>
          </div>
        </div>

        <AuthHeader
          mobileMode="none"
          desktopPromptText="Don't have an account?"
          desktopLinkText="Sign Up"
          desktopLinkHref="/sign-up"
        />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-16 xl:px-24">
          <div className="flex w-full max-w-[384px] flex-col">
            <div className="pb-8 md:pb-10">
              <h1 className="font-display text-[22px] font-bold uppercase leading-[28px] tracking-[-0.5px] md:text-[32px] md:leading-[48px] md:tracking-[-1.2px]">
                <span className="block">
                  <span className="text-[#11191f]/50">Power in</span>
                  <span className="text-[#11191f]"> Life</span>
                </span>
                <span className="block">
                  <span className="text-[#11191f]/50">Grace in</span>
                  <span className="text-[#11191f]"> Style</span>
                </span>
              </h1>
            </div>

            <div className="pb-8">
              <GoogleButton>Sign in with Google</GoogleButton>
            </div>

            <div className="pb-8">
              <Divider />
            </div>

            <form className="flex w-full flex-col gap-5">
              <AuthInput label="Email Address" type="email" name="email" autoComplete="email" required />
              <PasswordInput label="Password" name="password" autoComplete="current-password" required />
              <AuthButton>Sign In</AuthButton>
            </form>

            <div className="flex items-center justify-center gap-1 pt-4">
              <span className="font-display text-[12px] uppercase leading-[16px] tracking-[0.3px] text-[#6b7280]">
                Forgot Password?
              </span>
              <Link
                href="/email-sent"
                className="font-display text-[12px] font-semibold uppercase leading-[16px] tracking-[0.3px] text-[#11191f]"
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <TermsFooter>
            By signing in, you agree to our{" "}
            <Link href="#" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline">
              Privacy Policy
            </Link>
            .
          </TermsFooter>
        </div>
      </main>
    </>
  );
}
