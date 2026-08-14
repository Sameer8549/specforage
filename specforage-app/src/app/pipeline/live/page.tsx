import Nav from "@/components/Nav";
import PipelineLivePage from "@/components/PipelineLivePage";

export const metadata = {
  title: "Live Pipeline — SpecForge",
  description: "Real-time view of the 10-stage product intelligence pipeline.",
};

export default function LivePage() {
  return (
    <>
      <Nav />
      <PipelineLivePage />
    </>
  );
}
