import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledgr-beryl.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep authenticated app surfaces out of search results.
      disallow: ["/api/", "/admin/", "/client/", "/dashboard/", "/p/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
