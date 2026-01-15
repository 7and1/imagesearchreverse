import type {
  WebSite,
  Organization,
  FAQPage,
  BreadcrumbList,
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
  sameAs: [],
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

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
