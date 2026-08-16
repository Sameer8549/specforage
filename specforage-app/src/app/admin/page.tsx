import type { Metadata } from "next";
import Nav from "@/components/Nav";
import AdminPage from "@/components/AdminPage";

export const metadata: Metadata = {
  title: "Session Efficiency — SpecForge",
  description: "Inspect manufacturer cache behavior and narrow adjudication usage for this browser's processed records.",
};

export default function AdminRoute() { return <><Nav /><AdminPage /></>; }
