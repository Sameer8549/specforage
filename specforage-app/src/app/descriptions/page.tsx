import Nav from "@/components/Nav";
import DescriptionsPage from "@/components/DescriptionsPage";

export const metadata = {
  title: "Formula Description Studio — SpecForge",
  description: "Deterministic formula-based description generator with strict length enforcement across 6 channels (Mobile, Invoice, Short, Long, Retail, Marketing).",
};

export default function DescriptionsRoute() {
  return (
    <>
      <Nav />
      <DescriptionsPage />
    </>
  );
}
