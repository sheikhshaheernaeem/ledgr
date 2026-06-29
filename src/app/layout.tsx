import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { CommandPalette } from "@/components/search/CommandPalette";
import { KeyboardShortcuts } from "@/components/search/KeyboardShortcuts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledgr-beryl.vercel.app";
const TITLE = "Ledgr — AI Bookkeeping for Small Businesses";
const DESCRIPTION =
  "Replace your $1,200/month bookkeeper with AI + expert review for $299/month. Clean P&L every month, guaranteed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Ledgr",
  },
  description: DESCRIPTION,
  applicationName: "Ledgr",
  keywords: [
    "AI bookkeeping",
    "AI accounting",
    "small business bookkeeping",
    "Bench alternative",
    "automated bookkeeping",
    "monthly financial statements",
    "bookkeeping service",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Ledgr",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
          <CommandPalette />
          <KeyboardShortcuts />
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
