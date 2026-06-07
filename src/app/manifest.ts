import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ledgr — AI-Native Bookkeeping",
    short_name: "Ledgr",
    description: "AI-powered bookkeeping for modern businesses",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [],
    shortcuts: [
      { name: "New Invoice", short_name: "Invoice", description: "Create a new invoice", url: "/invoices/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "New Transaction", short_name: "Transaction", description: "Add a transaction", url: "/transactions", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
    categories: ["finance", "business", "productivity"],
  };
}
