import PageHeader from "@/components/admin/layout/PageHeader";
import ContactManager from "@/components/admin/contacts/ContactManager";

export default function MessagesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Contact Messages"
        description="Messages submitted through the customer contact form. Open a message to read it in full, mark it as replied, or archive it."
      />
      <ContactManager />
    </>
  );
}
