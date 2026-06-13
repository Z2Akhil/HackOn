import TriageRoom from "@/components/TriageRoom";

export const metadata = {
  title: "Live Triage Room | ReLoop",
  description: "Real-time product inspection with AI-guided triage",
};

export default function TriagePage() {
  return (
    <main className="triage-page">
      <TriageRoom />
    </main>
  );
}
