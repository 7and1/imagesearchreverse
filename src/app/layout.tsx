import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ImageSearchReverse — Find the original source of any image",
    template: "%s · ImageSearchReverse",
  },
  description:
    "Reverse image search for publishers, creators, and brand teams. Upload a photo to uncover original sources, usage context, and visually similar matches.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "ImageSearchReverse",
    description:
      "Upload an image and instantly locate the original source, top matches, and visual footprints across the web.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ImageSearchReverse",
    description:
      "Upload an image and instantly locate the original source, top matches, and visual footprints across the web.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport = {
  themeColor: "#f6efe5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-sand-100 text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
