import Nav from "@/components/Nav";
import TaxonomyPage from "@/components/TaxonomyPage";

export const metadata = {
  title: "UNSPSC Taxonomy Explorer — SpecForge",
  description: "Browse a curated UNSPSC reference preview; live catalog classification runs through the SpecForge backend pipeline.",
};

export default function TaxonomyRoute() {
  return (
    <>
      <Nav />
      <TaxonomyPage />
    </>
  );
}
