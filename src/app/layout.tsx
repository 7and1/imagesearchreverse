import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StructuredData } from "./structured-data";
import { Toaster } from "@/components/toaster";

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "optional", // Non-critical font - use optional to prevent layout shift
  preload: false, // Don't preload mono font - only used in code snippets
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ImageSearchReverse",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
    // creator: "@imagesearchreverse", // Uncomment when Twitter account is created
  },
  alternates: {
    canonical: siteUrl,
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
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "",
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
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Preconnect to Cloudflare Turnstile for faster CAPTCHA loading */}
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        {/* DNS prefetch for R2 bucket (image storage) */}
        <link
          rel="dns-prefetch"
          href={process.env.NEXT_PUBLIC_R2_DOMAIN ? `https://${process.env.NEXT_PUBLIC_R2_DOMAIN}` : ""}
        />
        {/* Prefetch likely navigation targets */}
        <link rel="prefetch" href="/help" />
        <link rel="prefetch" href="/privacy" />
        <StructuredData />
      </head>
      <body className="min-h-screen bg-sand-100 text-ink-900 antialiased">
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-sand-100 focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
