import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StructuredData } from "./structured-data";

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
    "Reverse image search for publishers, creators, and brand teams. Upload a photo to uncover original sources, usage context, and visually similar matches. Fast, accurate, and privacy-focused.",
  keywords: [
    "reverse image search",
    "image search",
    "find image source",
    "image lookup",
    "visual search",
    "image recognition",
    "source intelligence",
    "brand monitoring",
    "copyright protection",
    "image verification",
    "photo search",
    "duplicate image finder",
    "image tracking",
    "content protection",
  ],
  authors: [{ name: "ImageSearchReverse" }],
  creator: "ImageSearchReverse",
  publisher: "ImageSearchReverse",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "ImageSearchReverse — Find the original source of any image",
    description:
      "Upload an image and instantly locate the original source, top matches, and visual footprints across the web. Built for publishers, brands, and creators.",
    siteName: "ImageSearchReverse",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ImageSearchReverse — Reverse Image Search Tool",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ImageSearchReverse — Find the original source of any image",
    description:
      "Upload an image and instantly locate the original source, top matches, and visual footprints across the web. Fast, accurate, and privacy-focused.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@imagesearchreverse",
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": siteUrl,
      "en-GB": `${siteUrl}/en-GB`,
      "en-CA": `${siteUrl}/en-CA`,
      "en-AU": `${siteUrl}/en-AU`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-token",
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
      <head>
        <StructuredData />
      </head>
      <body className="min-h-screen bg-sand-100 text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
