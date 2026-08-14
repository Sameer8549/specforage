import Nav from "@/components/Nav";
import TaxonomyPage from "@/components/TaxonomyPage";

export const metadata = {
  title: "UNSPSC Taxonomy Explorer — SpecForge",
  description: "Browse 55,000+ public UNSPSC commodity classifications, governed attribute schemas, and test live catalog text classification.",
};

export default function TaxonomyRoute() {
  return (
    <>
      <Nav />
      <TaxonomyPage />
    </>
  );
}
