import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledgr-beryl.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/ai", priority: 1.0, freq: "weekly" },
    { path: "/ai/login", priority: 0.5, freq: "yearly" },
    { path: "/ai/register", priority: 0.8, freq: "monthly" },
    { path: "/bookkeeping", priority: 1.0, freq: "weekly" },
    { path: "/bookkeeping/login", priority: 0.5, freq: "yearly" },
    { path: "/bookkeeping/register", priority: 0.8, freq: "monthly" },
    { path: "/services", priority: 0.9, freq: "monthly" },
    { path: "/about", priority: 0.7, freq: "monthly" },
    { path: "/from-bench", priority: 0.8, freq: "monthly" },
    { path: "/contact", priority: 0.6, freq: "monthly" },
    { path: "/terms", priority: 0.3, freq: "yearly" },
    { path: "/privacy", priority: 0.3, freq: "yearly" },
    { path: "/refunds", priority: 0.3, freq: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
