import Nav from "@/components/Nav";
import BatchLivePage from "@/components/BatchLivePage";

export const metadata = {
  title: "Batch Telemetry & Delivery Export — SpecForge",
  description: "Monitor high-throughput multi-row catalog processing, stage progress, and export to standardized Delivery Format CSV.",
};

export default function BatchRoute() {
  return (
    <>
      <Nav />
      <BatchLivePage />
    </>
  );
}
