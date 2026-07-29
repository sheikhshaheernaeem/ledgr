import { LaneSwitcher } from "@/components/client/LaneSwitcher";
import { LiveSummary } from "@/components/client/LiveSummary";

// Auth + role + family("ai") are already enforced by src/app/ai/client/layout.tsx.
export default function AiClientHomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <LiveSummary />
      <LaneSwitcher />
    </div>
  );
}
