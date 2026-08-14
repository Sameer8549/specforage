import Nav from "@/components/Nav";
import SettingsPage from "@/components/SettingsPage";

export const metadata = {
  title: "Pipeline Configuration & Settings — SpecForge",
  description: "Configure pipeline quality gates, confidence thresholds, manufacturer domain strictness, and Delivery Format schema export columns.",
};

export default function SettingsRoute() {
  return (
    <>
      <Nav />
      <SettingsPage />
    </>
  );
}
