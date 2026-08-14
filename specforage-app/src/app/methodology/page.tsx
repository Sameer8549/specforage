import Nav from "@/components/Nav";
import MethodologyPage from "@/components/MethodologyPage";

export const metadata = {
  title: "Methodology & Principles — SpecForge",
  description: "Factual methodology statement: UNSPSC public taxonomy anchor for universal category generalization, strict manufacturer-domain-only retrieval, and zero hallucination.",
};

export default function MethodologyRoute() {
  return (
    <>
      <Nav />
      <MethodologyPage />
    </>
  );
}
