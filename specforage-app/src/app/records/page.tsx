import Nav from "@/components/Nav";
import RecordsPage from "@/components/RecordsPage";

export const metadata = {
  title: "Records Repository — SpecForge",
  description: "Browse structured, UNSPSC-classified product records with full attribute provenance and multi-format description suites.",
};

export default function RecordsRoute() {
  return (
    <>
      <Nav />
      <RecordsPage />
    </>
  );
}
