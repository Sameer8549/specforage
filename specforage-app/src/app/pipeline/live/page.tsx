import Nav from "@/components/Nav";
import PipelineLivePage from "@/components/PipelineLivePage";

export const metadata = {
  title: "Interactive Playground | SpecForge",
  description: "Run a catalog item through the live SpecForge pipeline and inspect its complete trace.",
};

export default function LivePage() {
  return (
    <>
      <Nav />
      <PipelineLivePage />
    </>
  );
}
