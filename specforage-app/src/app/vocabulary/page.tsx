import Nav from "@/components/Nav";
import VocabularyPage from "@/components/VocabularyPage";

export const metadata = {
  title: "Controlled Vocabulary Governance — SpecForge",
  description: "Manage approved vocabulary registries, tri-state term resolution (MATCHED / FIRST SEEN / FLAGGED), and synonym mapping rules.",
};

export default function VocabularyRoute() {
  return (
    <>
      <Nav />
      <VocabularyPage />
    </>
  );
}
