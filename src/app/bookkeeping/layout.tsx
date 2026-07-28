"use client";

import { ModeProvider } from "@/components/providers/ModeProvider";

export default function BookkeepingLayout({ children }: { children: React.ReactNode }) {
  return <ModeProvider initialMode="bookkeeping">{children}</ModeProvider>;
}
