import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Customize your ImageSearchReverse experience. Configure search preferences, display options, and manage your data.",
  alternates: {
    canonical: `${siteUrl}/settings`,
  },
  openGraph: {
    title: "Settings · ImageSearchReverse",
    description:
      "Customize your ImageSearchReverse experience. Configure search preferences, display options, and manage your data.",
    url: `${siteUrl}/settings`,
  },
  robots: {
    index: false, // Settings page should not be indexed
    follow: true,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
