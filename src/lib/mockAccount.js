// In-process mock data for the customer `/account` hub page.
// Will swap to repairQuery("myAppGetMyAccount", …) / addresses + payment-methods
// resolvers once the customer-scoped resolvers land. The user-owned address
// model already exists in addresses.ts on the server; payment-methods is not
// yet modelled (decision pending — Stripe-managed vs. local PCI-scoped table).

export const PROFILE = {
  email: "aqeljihad@gmail.com",
  phoneCountry: "+971",
  phoneNumber: "553368602",
  dateOfBirth: "14/7/1999",
};

export const PAYMENT_METHODS = [
  {
    id: "pm-mc-4242",
    brand: "mastercard",
    last4: "4242",
    expiry: "04/2026",
    isDefault: true,
  },
  {
    id: "pm-visa-4242",
    brand: "visa",
    last4: "4242",
    expiry: "04/2025",
    isDefault: false,
  },
];

export const ADDRESSES = [
  {
    id: "addr-home",
    label: "Home",
    kind: "home",
    line: "Abu Dhabi - Alraha Beach, Al Reem Tower, 3rd Floor, 310",
    phone: "+971 553368602",
    isDefault: true,
    country: "UAE",
    city: "Abu Dhabi",
    neighborhood: "Alraha Beach",
    street: "Al Reem Tower",
    building: "3rd Floor",
    apartment: "310",
  },
  {
    id: "addr-office",
    label: "Office",
    kind: "office",
    line: "Dubai - Business Bay, The Opus, 12th Floor, Office 1204",
    phone: "+971 501234567",
    isDefault: false,
    country: "UAE",
    city: "Dubai",
    neighborhood: "Business Bay",
    street: "The Opus",
    building: "12th Floor",
    apartment: "1204",
  },
];
