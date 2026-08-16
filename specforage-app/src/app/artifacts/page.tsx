import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ArtifactsPage from "@/components/ArtifactsPage";

export const metadata: Metadata = {
  title: "Published Reference Artifacts — SpecForge",
  description: "Inspect and download SpecForge's self-derived entity and attribute vocabularies, UOM rules, and manually curated taxonomy bridge.",
};

export default function ArtifactsRoute() {
  return <><Nav /><ArtifactsPage /></>;
}
