import type { MetadataRoute } from "next";

// Static last modified dates based on content stability
// Update these when significant content changes are made
const LAST_MODIFIED = {
  home: new Date("2025-01-17"), // Main app - updated with features
  help: new Date("2025-01-15"), // Help/FAQ content
  privacy: new Date("2025-01-10"), // Privacy policy
  terms: new Date("2025-01-10"), // Terms of service
  settings: new Date("2025-01-15"), // Settings page
};

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

  return [
    {
      url: siteUrl,
      lastModified: LAST_MODIFIED.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/help`,
      lastModified: LAST_MODIFIED.help,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/settings`,
      lastModified: LAST_MODIFIED.settings,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: LAST_MODIFIED.privacy,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: LAST_MODIFIED.terms,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
