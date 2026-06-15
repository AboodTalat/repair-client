import LegalPage from "@/components/customer/legal/LegalPage";

// `/privacy` — static Privacy Policy page. Linked from the checkout flow's
// agreement checkbox (PaymentPageClient) and the cart / checkout-details
// footnotes, plus the ShopFooter. Server component, placeholder content — swap
// the copy below for the store's real policy before launch. Lives under
// (customer) so it inherits the sticky white ShopHeader + desktop-only
// ShopFooter.

export const metadata = {
  title: "Privacy Policy — Repair",
  description: "How the Repair store collects, uses, and protects your data.",
};

const INTRO = [
  "This Privacy Policy explains how Repair collects, uses, discloses, and safeguards your information when you use our store. We are committed to protecting your privacy and handling your data transparently.",
  "By using the store, you consent to the practices described in this policy.",
];

const SECTIONS = [
  {
    heading: "Information We Collect",
    paragraphs: ["We collect information you provide directly and information generated as you use the store, including:"],
    bullets: [
      "Account details such as your name, email address, and phone number.",
      "Order and delivery information, including shipping addresses.",
      "Payment-related data, processed securely — we do not store full card numbers.",
      "Usage data such as pages viewed, products browsed, and device information.",
    ],
  },
  {
    heading: "How We Use Your Information",
    paragraphs: ["We use the information we collect to:"],
    bullets: [
      "Process and deliver your orders and provide customer support.",
      "Manage your account and authenticate your sign-in.",
      "Send transactional messages such as order confirmations and shipping updates.",
      "Improve our products, services, and store experience.",
      "Send marketing communications where you have opted in (you can unsubscribe at any time).",
    ],
  },
  {
    heading: "Cookies & Tracking",
    paragraphs: [
      "We use cookies and similar technologies to keep you signed in, remember your cart, and understand how the store is used. You can control cookies through your browser settings, though disabling them may affect some features.",
    ],
  },
  {
    heading: "Sharing Your Information",
    paragraphs: [
      "We do not sell your personal information. We share it only with service providers who help us operate the store — such as payment processors and delivery partners — and only to the extent needed to provide the service, or where required by law.",
    ],
  },
  {
    heading: "Data Retention",
    paragraphs: [
      "We retain your information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. Some records, such as order history, may be kept for accounting and audit purposes.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "We use technical and organizational measures to protect your information, including encrypted connections and restricted access. No method of transmission or storage is completely secure, but we work continually to safeguard your data.",
    ],
  },
  {
    heading: "Your Rights",
    paragraphs: ["Depending on your location, you may have the right to:"],
    bullets: [
      "Access the personal information we hold about you.",
      "Request correction or deletion of your information.",
      "Object to or restrict certain processing.",
      "Withdraw consent for marketing communications at any time.",
    ],
  },
  {
    heading: "Children's Privacy",
    paragraphs: [
      "The store is not directed at children under 18, and we do not knowingly collect personal information from them. If you believe a child has provided us information, please contact us so we can remove it.",
    ],
  },
  {
    heading: "Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The version posted on this page is the one in effect, and we encourage you to review it periodically.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "If you have questions about this Privacy Policy or how your data is handled, please reach out through our Contact Us page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 15, 2026"
      intro={INTRO}
      sections={SECTIONS}
      placeholder
    />
  );
}
