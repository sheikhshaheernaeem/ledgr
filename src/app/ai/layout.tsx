"use client";

import { ModeProvider } from "@/components/providers/ModeProvider";

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <ModeProvider initialMode="ai">{children}</ModeProvider>;
}
