import UnsubscribeClient from "./UnsubscribeClient";

// Public unsubscribe landing for the link carried in broadcast emails.
// Kept out of any role route-group so it needs no auth and no shop chrome.
// noindex — it's a per-recipient action page, not content.
export const metadata = {
  title: "Unsubscribe — Repair",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return <UnsubscribeClient />;
}
