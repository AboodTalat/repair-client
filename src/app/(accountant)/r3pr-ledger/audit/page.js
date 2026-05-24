import PageHeader from "@/components/admin/layout/PageHeader";
import AuditLog from "@/components/accountant/audit/AuditLog";

export default function AuditLogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Audit log"
        description="Read-only trail of every view, filter change, and export performed on the financial ledger. Useful for compliance review."
      />
      <AuditLog />
    </>
  );
}
