import Link from "next/link";
import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

export const metadata: Metadata = {
  title: "Help & Documentation - How to Reverse Image Search",
  description:
    "Complete guide to using ImageSearchReverse for reverse image search. Step-by-step instructions, keyboard shortcuts, troubleshooting tips, and answers to frequently asked questions about finding image sources.",
  keywords: [
    "reverse image search help",
    "how to reverse image search",
    "image search tutorial",
    "find image source guide",
    "reverse image search FAQ",
    "image search troubleshooting",
  ],
  alternates: {
    canonical: `${siteUrl}/help`,
  },
  openGraph: {
    title: "Help & Documentation - How to Reverse Image Search",
    description:
      "Complete guide to using ImageSearchReverse. Learn how to find image sources, use keyboard shortcuts, and get the most out of your searches.",
    url: `${siteUrl}/help`,
  },
};

type ContentItem =
  | { type: "step"; number: number; title: string; description: string }
  | { type: "qa"; question: string; answer: string }
  | { type: "issue"; title: string; solution: string }
  | { type: "info"; title: string; description: string }
  | { type: "feature"; features: string[] }
  | { type: "cta"; text: string; email: string }
  | { type: "shortcut"; key: string; description: string; modifier?: string };

type Section = {
  id: string;
  title: string;
  icon: string;
  content: ContentItem[];
};

const sections: Section[] = [
  {
    id: "how-to-use",
    title: "How to Use",
    icon: "📖",
    content: [
      {
        type: "step",
        number: 1,
        title: "Choose Your Input Method",
        description:
          "Select either 'Upload Image' to drag and drop or browse for a file, or 'Paste URL' to enter a direct image link from the web.",
      },
      {
        type: "step",
        number: 2,
        title: "Prepare Your Image",
        description:
          "For uploads, you can drag and drop an image file or click to browse. Supported formats include JPEG, PNG, WebP, and GIF up to 8MB. For URLs, paste the complete image URL including the https:// prefix.",
      },
      {
        type: "step",
        number: 3,
        title: "Generate Search Links",
        description:
          "Click the 'Generate search links' button to instantly create direct search links for Google Lens, Yandex, and Bing. These links open the official search engines with your image pre-loaded.",
      },
      {
        type: "step",
        number: 4,
        title: "Run API Fallback (Optional)",
        description:
          "If search engines are blocked or you need structured data, complete the security check (if enabled) and click 'Run API fallback' to get visual matches and source URLs directly in our interface.",
      },
      {
        type: "step",
        number: 5,
        title: "Review Results",
        description:
          "Search engine links open instantly in new tabs. API fallback results appear below with thumbnails, titles, and source URLs. Click any result to visit the original page.",
      },
    ],
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    icon: "❓",
    content: [
      {
        type: "qa",
        question: "Which search engines do you support?",
        answer:
          "We generate official search links for Google Lens, Yandex Images, and Bing Visual Search. Each engine has unique strengths—Google excels at general web search, Yandex is powerful for faces and locations, and Bing offers comprehensive image matching.",
      },
      {
        type: "qa",
        question: "Do you store my uploaded images?",
        answer:
          "Images are temporarily stored in Cloudflare R2 for processing. They are automatically deleted within 24 hours according to the bucket lifecycle policy. We never use your images for training or share them with third parties. You maintain full control over your data.",
      },
      {
        type: "qa",
        question: "What's the difference between search engines and API fallback?",
        answer:
          "Search engine links are instant and free—they open official results directly on Google, Yandex, or Bing. The API fallback is a paid service that returns structured visual match data with thumbnails and source URLs directly in our interface. Use the API fallback when search engines are blocked or you need programmatic access to results.",
      },
      {
        type: "qa",
        question: "How fast are the results?",
        answer:
          "Search engine links generate instantly. The API fallback typically returns results in 5-15 seconds, depending on queue size. Our Cloudflare Workers edge network ensures low latency regardless of your location.",
      },
      {
        type: "qa",
        question: "Is there a daily usage limit?",
        answer:
          "Yes, to protect shared infrastructure, the API fallback is limited to 10 searches per day per IP address. Search engine links have no daily limit. For higher volume needs, contact us about enterprise plans.",
      },
      {
        type: "qa",
        question: "What image formats work best?",
        answer:
          "JPEG, PNG, WebP, GIF, and BMP formats are supported up to 10MB. For best results, use clear, well-lit images with sufficient resolution (at least 300px on the shortest side). Avoid heavily compressed or watermarked images when possible.",
      },
      {
        type: "qa",
        question: "Can I search with screenshots?",
        answer:
          "Yes! Screenshots work well, especially if they contain clear, distinct elements. For best results, crop unnecessary UI elements before uploading. The search engines will focus on the main visual content in your image.",
      },
      {
        type: "qa",
        question: "Is there an API for developers?",
        answer:
          "Yes, we offer a REST API for programmatic reverse image search with support for batch processing and webhooks. Contact us at hello@imagesearchreverse.com for API access, documentation, and pricing information.",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "🔧",
    content: [
      {
        type: "issue",
        title: "Upload fails or times out",
        solution:
          "Check that your image is under 10MB and in a supported format (JPEG, PNG, WebP, GIF, BMP). Ensure you have a stable internet connection. Try reducing the file size or using a different browser if the issue persists.",
      },
      {
        type: "issue",
        title: "URL search doesn't work",
        solution:
          "Verify the URL is a direct link to an image file (ending in .jpg, .png, .webp, etc.), not a webpage containing an image. Right-click the image on the source site and select 'Copy image address' to get the direct URL. Ensure the URL starts with https://.",
      },
      {
        type: "issue",
        title: "Search engine links don't find matches",
        solution:
          "Try using multiple search engines—each has different indexing. If one doesn't find results, another might. Ensure your image is clear and well-lit. For very new images, search engines may not have indexed them yet.",
      },
      {
        type: "issue",
        title: "API fallback returns no results",
        solution:
          "This can happen if the image is too generic (like a solid color or simple shape), very low resolution, or if similar images aren't indexed. Try cropping to focus on distinctive elements. Also check that you haven't exceeded the 10 searches/day limit.",
      },
      {
        type: "issue",
        title: 'Rate limit error message',
        solution:
          "The API fallback is limited to 10 searches per day per IP address. The limit resets at midnight UTC. For higher volume needs, contact us about enterprise plans with increased limits.",
      },
      {
        type: "issue",
        title: "Security check (CAPTCHA) keeps failing",
        solution:
          "Ensure JavaScript is enabled and cookies are allowed for our domain. Disable any aggressive privacy extensions or VPNs that might interfere with the CAPTCHA. If issues persist, try a different browser or device.",
      },
    ],
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    icon: "⌨️",
    content: [
      {
        type: "shortcut",
        modifier: "Ctrl",
        key: "U",
        description: "Open file upload dialog to select an image from your device",
      },
      {
        type: "shortcut",
        modifier: "Ctrl",
        key: "V",
        description: "Focus the URL input field to paste an image URL",
      },
      {
        type: "shortcut",
        modifier: "Ctrl",
        key: "Enter",
        description: "Submit the current search form",
      },
      {
        type: "shortcut",
        key: "Escape",
        description: "Close any open modal or dialog",
      },
      {
        type: "shortcut",
        modifier: "Ctrl+Shift",
        key: "?",
        description: "Toggle keyboard shortcuts help panel",
      },
    ],
  },
  {
    id: "api-info",
    title: "API Documentation",
    icon: "⚡",
    content: [
      {
        type: "info",
        title: "REST API Access",
        description:
          "Programmatic access to our reverse image search engine with batch processing and webhook support. Perfect for integrating into your workflows.",
      },
      {
        type: "feature",
        features: [
          "Batch image processing (up to 100 images per request)",
          "Webhook notifications for completed searches",
          "JSON response format with detailed match data",
          "Custom confidence scoring and filtering",
          "Priority processing queues",
          "Dedicated support and SLA guarantees",
        ],
      },
      {
        type: "cta",
        text: "Get API access",
        email: "hello@imagesearchreverse.com",
      },
    ],
  },
];

const sampleImages = [
  {
    category: "Faces",
    description: "Test facial recognition and people search",
    images: [
      {
        name: "Portrait example",
        url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop",
        alt: "Example portrait photo for testing face search",
      },
      {
        name: "Group photo",
        url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=300&fit=crop",
        alt: "Example group photo for testing people search",
      },
    ],
  },
  {
    category: "Products",
    description: "Find product sources and similar items",
    images: [
      {
        name: "Product shot",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop",
        alt: "Example product photo for testing item search",
      },
      {
        name: "Fashion item",
        url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=300&fit=crop",
        alt: "Example fashion photo for testing clothing search",
      },
    ],
  },
  {
    category: "Landmarks",
    description: "Identify locations and architecture",
    images: [
      {
        name: "Architecture",
        url: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=300&h=300&fit=crop",
        alt: "Example architecture photo for testing landmark search",
      },
      {
        name: "Nature scene",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
        alt: "Example nature photo for testing location search",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="h-full w-full grid-mask" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 pt-10">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg"
          aria-label="Return to homepage"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-900 text-sand-100">
            <span className="text-lg font-semibold">IR</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900">
              ImageSearchReverse
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
              Visual provenance
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-500 md:flex">
          <Link href="/#how" className="transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg">
            How it works
          </Link>
          <Link href="/#features" className="transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg">
            Use cases
          </Link>
          <Link href="/#faq" className="transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg">
            FAQ
          </Link>
        </nav>
        <Link
          href="/"
          className="rounded-full border border-ink-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-900 transition hover:bg-ink-900 hover:text-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
        >
          Back to search
        </Link>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="py-10">
          <h1 className="text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">
            Help & Documentation
          </h1>
          <p className="mt-4 text-lg text-ink-500">
            Everything you need to get the most out of ImageSearchReverse
          </p>
        </div>

        {/* Table of Contents */}
        <nav
          className="rounded-3xl border border-sand-200 bg-white/70 p-8 mb-12"
          aria-label="Page navigation"
        >
          <h2 className="text-2xl font-semibold text-ink-900 mb-4">
            On this page
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex items-center gap-2 text-ink-500 hover:text-ink-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg"
                >
                  <span aria-hidden="true">{section.icon}</span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content Sections */}
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="mb-16 scroll-mt-24"
          >
            <div className="flex items-center gap-3 mb-6">
              <span
                className="text-3xl"
                role="img"
                aria-label={section.title}
              >
                {section.icon}
              </span>
              <h2 className="text-3xl font-semibold text-ink-900">
                {section.title}
              </h2>
            </div>

            <div className="rounded-3xl border border-sand-200 bg-white/70 p-8">
              {section.content.map((item, index) => {
                if (item.type === "step") {
                  return (
                    <div
                      key={index}
                      className="flex gap-6 pb-8 last:pb-0 [&:not(:last-child)]:border-b border-sand-200"
                    >
                      <div className="flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-500 text-white font-semibold text-lg">
                          {item.number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-ink-900 mb-2">
                          {item.title}
                        </h3>
                        <p className="text-ink-500 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (item.type === "qa") {
                  return (
                    <div
                      key={index}
                      className="pb-6 last:pb-0 [&:not(:last-child)]:border-b border-sand-200"
                    >
                      <h3 className="text-lg font-semibold text-ink-900 mb-2">
                        {item.question}
                      </h3>
                      <p className="text-ink-500 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  );
                }

                if (item.type === "issue") {
                  return (
                    <div
                      key={index}
                      className="pb-6 last:pb-0 [&:not(:last-child)]:border-b border-sand-200"
                    >
                      <h3 className="text-lg font-semibold text-ink-900 mb-2 flex items-center gap-2">
                        <span className="text-ember-500">⚠️</span>
                        {item.title}
                      </h3>
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-ink-700 mb-1">
                          Solution:
                        </p>
                        <p className="text-ink-500 leading-relaxed">
                          {item.solution}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (item.type === "info") {
                  return (
                    <div key={index} className="mb-6">
                      <h3 className="text-xl font-semibold text-ink-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-ink-500 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  );
                }

                if (item.type === "feature") {
                  return (
                    <div key={index} className="mb-6">
                      <ul className="grid gap-2 md:grid-cols-2">
                        {item.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-ink-500"
                          >
                            <span
                              className="text-ember-500 flex-shrink-0"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                if (item.type === "cta") {
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-sand-200 bg-sand-100/50 p-6 text-center"
                    >
                      <p className="text-sm text-ink-500 mb-4">
                        Interested in API access? Contact us for documentation
                        and pricing.
                      </p>
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-2 rounded-full bg-ember-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ember-500/30 transition hover:bg-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
                      >
                        <span>{item.text}</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </a>
                    </div>
                  );
                }

                if (item.type === "shortcut") {
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 [&:not(:last-child)]:border-b border-sand-200"
                    >
                      <span className="text-ink-700">{item.description}</span>
                      <kbd className="inline-flex items-center gap-1 rounded-lg border border-sand-300 bg-sand-100 px-3 py-1.5 font-mono text-sm text-ink-600">
                        {item.modifier && (
                          <>
                            <span>{item.modifier}</span>
                            <span className="text-ink-400">+</span>
                          </>
                        )}
                        <span>{item.key}</span>
                      </kbd>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </section>
        ))}

        {/* Sample Images Gallery */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl" role="img" aria-label="Sample images">
              🖼️
            </span>
            <h2 className="text-3xl font-semibold text-ink-900">
              Sample Images Gallery
            </h2>
          </div>

          <div className="rounded-3xl border border-sand-200 bg-white/70 p-8">
            <p className="text-ink-500 mb-8">
              Click any sample image below to test reverse image search. These
              are example images to help you understand how the tool works with
              different types of content.
            </p>

            <div className="space-y-12">
              {sampleImages.map((category) => (
                <div key={category.category}>
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-ink-900">
                      {category.category}
                    </h3>
                    <p className="text-sm text-ink-500">
                      {category.description}
                    </p>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {category.images.map((image) => (
                      <a
                        key={image.name}
                        href={`/?url=${encodeURIComponent(image.url)}`}
                        className="group block rounded-2xl border border-sand-200 bg-white overflow-hidden transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
                      >
                        <div className="aspect-square overflow-hidden bg-sand-200">
                          <img
                            src={image.url}
                            alt={image.alt}
                            loading="lazy"
                            width={200}
                            height={200}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-ink-900">
                            {image.name}
                          </p>
                          <p className="text-xs text-ink-500 mt-1">
                            Click to search
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Video Demo Placeholder */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl" role="img" aria-label="Video demo">
              🎥
            </span>
            <h2 className="text-3xl font-semibold text-ink-900">
              Video Tutorial
            </h2>
          </div>

          <div className="rounded-3xl border border-sand-200 bg-white/70 p-8">
            <div className="aspect-video rounded-2xl bg-sand-200 flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-20 w-20 rounded-full bg-ink-900 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-sand-100 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-ink-900 mb-2">
                  Getting Started with ImageSearchReverse
                </h3>
                <p className="text-sm text-ink-500">
                  Video tutorial coming soon
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="rounded-3xl border border-sand-200 bg-ember-500/10 p-8 text-center">
          <h2 className="text-2xl font-semibold text-ink-900 mb-4">
            Ready to start searching?
          </h2>
          <p className="text-ink-500 mb-6 max-w-2xl mx-auto">
            Upload an image or paste a URL to instantly find original sources,
            track visual footprints, and discover similar content across the web.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/#search"
              className="inline-flex items-center gap-2 rounded-full bg-ember-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ember-500/30 transition hover:bg-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
            >
              Start searching
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
            <a
              href="mailto:hello@imagesearchreverse.com"
              className="inline-flex items-center gap-2 rounded-full border border-ink-900 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-ink-900 hover:text-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2"
            >
              Contact support
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-ink-500">
          <p>
            © {new Date().getFullYear()} ImageSearchReverse. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-lg">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
