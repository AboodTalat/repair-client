import PageHeader from "@/components/admin/layout/PageHeader";
import BroadcastComposer from "@/components/admin/broadcast/BroadcastComposer";

export const metadata = { title: "Broadcast — Repair Console" };

export default function BroadcastPage() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Broadcast Email"
        description="Send announcements or promotional messages to a segmented customer audience. Templates render through the queued mailer."
      />
      <BroadcastComposer />
    </>
  );
}
