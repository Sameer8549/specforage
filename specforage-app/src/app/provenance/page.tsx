import Nav from "@/components/Nav";
import ProvenancePage from "@/components/ProvenancePage";

export const metadata = {
  title: "Source Provenance & Discipline — SpecForge",
  description: "Inspect strict manufacturer-domain restriction, source extraction lineage traces, and hard-enforced marketplace blocklists.",
};

export default function ProvenanceRoute() {
  return (
    <>
      <Nav />
      <ProvenancePage />
    </>
  );
}
