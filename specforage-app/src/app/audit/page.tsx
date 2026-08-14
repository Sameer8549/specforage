import Nav from "@/components/Nav";
import AuditPage from "@/components/AuditPage";

export const metadata = {
  title: "Quality Governance & Audit Dossier — SpecForge",
  description: "Enterprise quality scorecard, human review governance queue, and immutable provenance compliance audit event stream.",
};

export default function AuditRoute() {
  return (
    <>
      <Nav />
      <AuditPage />
    </>
  );
}
