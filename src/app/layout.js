import { Geist, Geist_Mono, Zalando_Sans, Zalando_Sans_Expanded } from "next/font/google";
import StoreProvider from "@/components/shared/StoreProvider";
import StorefrontPwaRegister from "@/components/shared/StorefrontPwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const zalandoSans = Zalando_Sans({
  variable: "--font-zalando-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

const zalandoExpanded = Zalando_Sans_Expanded({
  variable: "--font-zalando-expanded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata = {
  title: "Repair",
  description: "Repair — performance apparel.",
  // Storefront PWA (scope "/"). The (admin) layout overrides `manifest` + icons
  // with the separate admin console PWA for /r3pr-console routes.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Repair" },
  icons: {
    icon: "/icons/storefront-192.png",
    apple: "/icons/storefront-apple-180.png",
  },
};

// Without this, mobile browsers (and headless Chrome at mobile widths) lay
// out at the 980px legacy default and the whole storefront overflows.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11191f",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${zalandoSans.variable} ${zalandoExpanded.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreProvider>{children}</StoreProvider>
        <StorefrontPwaRegister />
      </body>
    </html>
  );
}
