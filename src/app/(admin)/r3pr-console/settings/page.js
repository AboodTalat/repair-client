import PageHeader from "@/components/admin/layout/PageHeader";
import SettingsManager from "@/components/admin/settings/SettingsManager";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Settings"
        description="Storefront-wide rules for shipping and delivery."
      />
      <SettingsManager />
    </>
  );
}
