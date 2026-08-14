import Nav from "@/components/Nav";
import BatchLivePage from "@/components/BatchLivePage";

export const metadata = {
  title: "Live Batch Processing — SpecForge",
  description: "Live batch telemetry and export engine.",
};

export default function BatchLiveRoute() {
  return (
    <>
      <Nav />
      <BatchLivePage />
    </>
  );
}
