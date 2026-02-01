import type {
  WebSite,
  Organization,
  FAQPage,
  BreadcrumbList,
  SoftwareApplication,
} from "schema-dts";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

const websiteSchema: WebSite = {
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "ImageSearchReverse",
  description:
    "Reverse image search for publishers, creators, and brand teams. Upload a photo to uncover original sources, usage context, and visually similar matches.",
  inLanguage: "en-US",
  publisher: {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
  },
};

const organizationSchema: Organization = {
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "ImageSearchReverse",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    "Production-grade reverse image search console for publishers, brands, and creators. Track provenance, discover duplicates, and monitor visual footprints.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "hello@imagesearchreverse.com",
  },
  // sameAs: Add social media profile URLs when available
  // e.g., "https://twitter.com/imagesearchreverse", "https://github.com/imagesearchreverse"
};

const faqSchema: FAQPage = {
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which sources do you search?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We rely on DataForSEO and Google image search indexes, returning the most relevant visual matches and sources. Our search covers billions of indexed images across the web, providing comprehensive source discovery and visual similarity matching.",
      },
    },
    {
      "@type": "Question",
      name: "Do you store my images?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Uploaded images are stored temporarily in Cloudflare R2 for query processing. You control the bucket lifecycle policy. Images are automatically deleted after processing, typically within 24 hours. We do not use your images for training purposes or share them with third parties.",
      },
    },
    {
      "@type": "Question",
      name: "How fast are results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most searches return in under 15 seconds. Larger images or queue spikes can take longer. Our edge-processing architecture on Cloudflare Workers ensures minimal latency and zero cold starts, providing consistent performance regardless of your location.",
      },
    },
    {
      "@type": "Question",
      name: "What image formats are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We support all common image formats including JPEG, PNG, WebP, GIF, and BMP. The maximum file size is 10MB per image. For best results, use clear, well-lit images with sufficient resolution.",
      },
    },
    {
      "@type": "Question",
      name: "Is there an API available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, we offer a REST API for programmatic reverse image search. The API provides the same powerful search capabilities as our web interface, with support for batch processing and webhooks. Contact us at hello@imagesearchreverse.com for API access and documentation.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use ImageSearchReverse for commercial purposes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. ImageSearchReverse is designed for commercial use by publishers, brands, agencies, and content creators. Our tiered pricing plans accommodate various usage levels, from individual freelancers to enterprise teams. All paid plans include priority processing and dedicated support.",
      },
    },
    {
      "@type": "Question",
      name: "How accurate are the search results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our advanced visual recognition algorithms achieve high accuracy in identifying visually similar and identical images. Results are ranked by similarity score, with confidence indicators to help you assess match quality. For best results, use original, unedited images whenever possible.",
      },
    },
    {
      "@type": "Question",
      name: "What is reverse image search used for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Reverse image search is used for verifying image authenticity, finding original sources, tracking brand usage, detecting copyright infringement, identifying fake profiles, locating higher resolution versions, discovering similar content, and monitoring online reputation. It's essential for journalists, photographers, brand managers, and content creators.",
      },
    },
  ],
};

const breadcrumbSchema: BreadcrumbList = {
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
  ],
};

const softwareApplicationSchema: SoftwareApplication = {
  "@type": "SoftwareApplication",
  name: "ImageSearchReverse",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier with 10 searches per day",
  },
  description:
    "Reverse image search for publishers, creators, and brand teams. Upload a photo to uncover original sources, usage context, and visually similar matches.",
  featureList: [
    "Instant reverse image search",
    "Multiple search engine integration (Google Lens, Yandex, Bing)",
    "Cloudflare Edge processing",
    "Temporary R2 storage with lifecycle policies",
    "API access for developers",
    "Brand monitoring and copyright protection",
    "Visual similarity matching",
    "Source intelligence tracking",
  ],
  softwareVersion: "1.0",
  author: {
    "@type": "Organization",
    name: "ImageSearchReverse",
    url: siteUrl,
  },
};

// Helper to wrap schema with @context for JSON-LD output
function withContext<T>(schema: T): { "@context": string } & T {
  return { "@context": "https://schema.org", ...schema } as {
    "@context": string;
  } & T;
}

// HowTo schema for "How to reverse image search"
const howToSchema = {
  "@type": "HowTo" as const,
  name: "How to Reverse Image Search",
  description:
    "Learn how to find the original source of any image using ImageSearchReverse. Follow these simple steps to discover where an image came from, find similar images, and track visual content across the web.",
  totalTime: "PT1M",
  estimatedCost: {
    "@type": "MonetaryAmount" as const,
    currency: "USD",
    value: "0",
  },
  image: `${siteUrl}/og-image.png`,
  step: [
    {
      "@type": "HowToStep" as const,
      position: 1,
      name: "Upload or paste your image",
      text: "Click the upload area to select an image from your device, drag and drop an image file, or paste an image URL directly into the search box.",
      image: `${siteUrl}/screenshot1.png`,
    },
    {
      "@type": "HowToStep" as const,
      position: 2,
      name: "Wait for processing",
      text: "Our system will analyze your image using advanced visual recognition algorithms. This typically takes 5-15 seconds depending on image size and server load.",
    },
    {
      "@type": "HowToStep" as const,
      position: 3,
      name: "Review your results",
      text: "Browse through the search results showing original sources, visually similar images, and websites where your image appears. Results are ranked by relevance and similarity score.",
    },
    {
      "@type": "HowToStep" as const,
      position: 4,
      name: "Explore matches",
      text: "Click on any result to visit the source website. Use the similarity scores to identify exact matches versus visually similar content.",
    },
  ],
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(websiteSchema)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(organizationSchema)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(faqSchema)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(breadcrumbSchema)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(softwareApplicationSchema)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(withContext(howToSchema)),
        }}
      />
    </>
  );
}
