import Nav from "@/components/Nav";
import InputPage from "@/components/InputPage";

export const metadata = {
  title: "Pipeline Input — SpecForge",
  description: "Enter a single catalog row or upload a CSV to begin processing.",
};

export default function PipelinePage() {
  return (
    <>
      <Nav />
      <InputPage />
    </>
  );
}
