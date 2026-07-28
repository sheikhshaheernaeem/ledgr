"use client";
import { ThemeProvider } from "next-themes";
import { ModeProvider } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";

export function Providers({ initialMode, children }: { initialMode: Family; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ModeProvider initialMode={initialMode}>{children}</ModeProvider>
    </ThemeProvider>
  );
}
