import LegalPage from "@/components/customer/legal/LegalPage";

// `/terms` — static Terms & Conditions page. Linked from the checkout flow's
// agreement checkbox (PaymentPageClient) and the cart / checkout-details
// footnotes, plus the ShopFooter. Server component, placeholder content — swap
// the copy below for the store's real terms before launch. Lives under
// (customer) so it inherits the sticky white ShopHeader + desktop-only
// ShopFooter.

export const metadata = {
  title: "Terms & Conditions — Repair",
  description: "The terms and conditions governing use of the Repair store.",
};

const INTRO = [
  "Welcome to Repair. These Terms & Conditions (“Terms”) govern your access to and use of our website, products, and services. By placing an order or otherwise using the store, you agree to be bound by these Terms.",
  "Please read them carefully. If you do not agree with any part of these Terms, you should not use the store or place an order.",
];

const SECTIONS = [
  {
    heading: "Eligibility",
    paragraphs: [
      "You must be at least 18 years old, or the age of majority in your jurisdiction, to place an order. By using the store you represent that you meet this requirement and that the information you provide is accurate and complete.",
    ],
  },
  {
    heading: "Accounts",
    paragraphs: [
      "When you create an account you are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized use.",
    ],
  },
  {
    heading: "Orders & Pricing",
    paragraphs: [
      "All orders are subject to acceptance and product availability. Prices are shown in the displayed currency and may change at any time before an order is placed. We reserve the right to cancel or refuse any order, including where a pricing or description error has occurred.",
    ],
    bullets: [
      "An order is confirmed only once payment has been authorized.",
      "Promotional codes are subject to their own terms, usage limits, and expiry dates.",
      "Once placed, orders are processed promptly and may not be editable.",
    ],
  },
  {
    heading: "Payment",
    paragraphs: [
      "We accept the payment methods presented at checkout. By submitting a payment you confirm that you are authorized to use the selected method. All payments are processed securely; we do not store full card numbers on our systems.",
    ],
  },
  {
    heading: "Shipping & Delivery",
    paragraphs: [
      "Delivery times and fees are estimates shown at checkout and may vary based on destination and the selected delivery method. Risk of loss passes to you upon delivery to the address you provide.",
    ],
  },
  {
    heading: "Returns & Refunds",
    paragraphs: [
      "Items may be returned in line with our returns policy, where applicable. Some items, including final-sale and personalized products, may not be eligible for return. Refunds, when granted, are issued to the original payment method.",
    ],
  },
  {
    heading: "Intellectual Property",
    paragraphs: [
      "All content on the store — including text, graphics, logos, and imagery — is owned by or licensed to Repair and is protected by intellectual-property laws. You may not reproduce or redistribute it without prior written permission.",
    ],
  },
  {
    heading: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, Repair is not liable for any indirect, incidental, or consequential damages arising from your use of the store or products purchased through it. Nothing in these Terms limits liability that cannot be excluded by law.",
    ],
  },
  {
    heading: "Changes to These Terms",
    paragraphs: [
      "We may update these Terms from time to time. The version posted on this page is the one in effect. Continued use of the store after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "If you have any questions about these Terms, please get in touch through our Contact Us page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated="June 15, 2026"
      intro={INTRO}
      sections={SECTIONS}
      placeholder
    />
  );
}
