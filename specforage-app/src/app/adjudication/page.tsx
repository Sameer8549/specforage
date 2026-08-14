import Nav from "@/components/Nav";
import AdjudicationPage from "@/components/AdjudicationPage";

export const metadata = {
  title: "Conflict Adjudication Studio — SpecForge",
  description: "Deterministic conflict adjudication, discrepancy comparison matrices, rule priority hierarchies, and audit reasoning trails.",
};

export default function AdjudicationRoute() {
  return (
    <>
      <Nav />
      <AdjudicationPage />
    </>
  );
}
