import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { KeyboardShortcuts } from "@/components/search/KeyboardShortcuts";
import { MODE_COOKIE } from "@/components/providers/ModeProvider";
import type { Family } from "@/config/tiers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Elegant editorial serif for display headings on marketing pages.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieMode = (await cookies()).get(MODE_COOKIE)?.value;
  const initialMode: Family = cookieMode === "bookkeeping" ? "bookkeeping" : "ai";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers initialMode={initialMode}>
          {children}
          <KeyboardShortcuts />
          <Toaster richColors position="top-right" />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
