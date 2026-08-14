import Nav from "@/components/Nav";
import ValidatePage from "@/components/ValidatePage";

export const metadata = {
  title: "Ground-Truth Format & Validate — SpecForge",
  description: "Side-by-side ground truth comparison against actual expected benchmarks and 20-bullet feature specification matrices.",
};

export default function ValidateRoute() {
  return (
    <>
      <Nav />
      <ValidatePage />
    </>
  );
}
