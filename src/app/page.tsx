import Link from "next/link";
import SearchPanel from "@/components/search-panel";

const features = [
  {
    title: "Source intelligence",
    description:
      "Identify the earliest publisher, duplicates, and syndication trails across the web.",
  },
  {
    title: "Brand safety",
    description:
      "Discover where your visuals appear and flag misuse before it spreads.",
  },
  {
    title: "Creator protection",
    description:
      "Monitor unauthorized re-uploads and confirm who is hosting your work.",
  },
];

const steps = [
  {
    title: "Upload or paste",
    description: "Drop an image file or paste a direct URL.",
  },
  {
    title: "Edge processing",
    description: "Cloudflare Workers process and dispatch your search request.",
  },
  {
    title: "Get verified matches",
    description: "We return visual matches, domains, and source URLs.",
  },
];

const faqs = [
  {
    question: "Which sources do you search?",
    answer:
      "We rely on DataForSEO and Google image search indexes, returning the most relevant visual matches and sources. Our search covers billions of indexed images across the web, providing comprehensive source discovery and visual similarity matching.",
  },
  {
    question: "Do you store my images?",
    answer:
      "Uploaded images are stored temporarily in Cloudflare R2 for query processing. You control the bucket lifecycle policy. Images are automatically deleted after processing, typically within 24 hours. We do not use your images for training purposes or share them with third parties.",
  },
  {
    question: "How fast are results?",
    answer:
      "Most searches return in under 15 seconds. Larger images or queue spikes can take longer. Our edge-processing architecture on Cloudflare Workers ensures minimal latency and zero cold starts, providing consistent performance regardless of your location.",
  },
  {
    question: "What image formats are supported?",
    answer:
      "We support all common image formats including JPEG, PNG, WebP, GIF, and BMP. The maximum file size is 10MB per image. For best results, use clear, well-lit images with sufficient resolution.",
  },
  {
    question: "Is there an API available?",
    answer:
      "Yes, we offer a REST API for programmatic reverse image search. The API provides the same powerful search capabilities as our web interface, with support for batch processing and webhooks. Contact us at hello@imagesearchreverse.com for API access and documentation.",
  },
  {
    question: "Can I use ImageSearchReverse for commercial purposes?",
    answer:
      "Absolutely. ImageSearchReverse is designed for commercial use by publishers, brands, agencies, and content creators. Our tiered pricing plans accommodate various usage levels, from individual freelancers to enterprise teams. All paid plans include priority processing and dedicated support.",
  },
  {
    question: "How accurate are the search results?",
    answer:
      "Our advanced visual recognition algorithms achieve high accuracy in identifying visually similar and identical images. Results are ranked by similarity score, with confidence indicators to help you assess match quality. For best results, use original, unedited images whenever possible.",
  },
  {
    question: "What is reverse image search used for?",
    answer:
      "Reverse image search is used for verifying image authenticity, finding original sources, tracking brand usage, detecting copyright infringement, identifying fake profiles, locating higher resolution versions, discovering similar content, and monitoring online reputation. It's essential for journalists, photographers, brand managers, and content creators.",
  },
];

export default function Home() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="h-full w-full grid-mask" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 pt-10">
        <div className="flex items-center gap-3">
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
        </div>
        <nav className="hidden items-center gap-6 text-sm text-ink-500 md:flex">
          <a href="#how" className="transition hover:text-ink-900">
            How it works
          </a>
          <a href="#features" className="transition hover:text-ink-900">
            Use cases
          </a>
          <a href="#faq" className="transition hover:text-ink-900">
            FAQ
          </a>
        </nav>
        <a
          href="mailto:hello@imagesearchreverse.com"
          className="rounded-full border border-ink-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-900 transition hover:bg-ink-900 hover:text-sand-100"
        >
          Talk to us
        </a>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        <section className="grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700">
              Built on Cloudflare Edge
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">
              Find the original source of any image in seconds.
            </h1>
            <p className="text-base text-ink-500 md:text-lg">
              ImageSearchReverse is a production-grade reverse image search
              console for publishers, brands, and creators. Track provenance,
              discover duplicates, and monitor visual footprints without the
              complexity of custom infrastructure.
            </p>
            <p className="text-base text-ink-500 md:text-lg">
              Whether you&apos;re a journalist verifying image authenticity, a
              brand manager monitoring visual assets, or a content creator
              protecting your work, our powerful reverse image search engine
              delivers accurate results in under 15 seconds. Powered by
              Cloudflare&apos;s edge network and advanced visual recognition
              technology, we make it effortless to trace image origins, identify
              unauthorized usage, and maintain control over your visual content
              across the web.
            </p>
            <p className="text-base text-ink-500 md:text-lg">
              Stop wasting hours manually searching for image sources. Simply
              upload an image or paste a URL, and let our sophisticated
              algorithms scour billions of indexed images to find exact matches,
              near-duplicates, and visually similar content. Get comprehensive
              source intelligence including publication dates, domain
              information, and confidence scores—all in one intuitive interface.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#search"
                className="rounded-full bg-ember-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ember-500/30 transition hover:bg-ember-600"
              >
                Start searching
              </a>
              <a
                href="mailto:hello@imagesearchreverse.com"
                className="rounded-full border border-sand-300 bg-white px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
              >
                View API docs
              </a>
            </div>
            <div className="grid gap-4 rounded-3xl border border-sand-200 bg-white/70 p-5 text-sm text-ink-500 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-semibold text-ink-900">15s</p>
                <p>Average turnaround</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-ink-900">10/day</p>
                <p>Free daily searches</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-ink-900">100%</p>
                <p>Edge-rendered stack</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-[32px] p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-sand-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  Recent detection
                </p>
                <p className="mt-2 text-lg font-semibold text-ink-900">
                  24 new placements found for the campaign hero.
                </p>
                <p className="mt-2 text-sm text-ink-500">
                  Monitor brand exposure and confirm licensing status.
                </p>
              </div>
              <div className="rounded-2xl border border-sand-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  Source confidence
                </p>
                <p className="mt-2 text-lg font-semibold text-ink-900">
                  Top matches ranked by visual similarity.
                </p>
                <p className="mt-2 text-sm text-ink-500">
                  Verify at-a-glance with thumbnail previews.
                </p>
              </div>
              <div className="rounded-2xl border border-sand-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  Compliance ready
                </p>
                <p className="mt-2 text-lg font-semibold text-ink-900">
                  Export results for legal or ops review.
                </p>
                <p className="mt-2 text-sm text-ink-500">
                  Shareable links and structured metadata included.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10" id="search">
          <SearchPanel />
        </section>

        <section className="py-12" id="how">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-3xl font-semibold text-ink-900">
              How it works
            </h2>
            <p className="max-w-lg text-sm text-ink-500">
              Everything runs on Cloudflare Workers, R2, and KV. That means
              low-latency execution and zero cold starts.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-sand-200 bg-white/70 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-ink-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12" id="features">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-3xl font-semibold text-ink-900">
              Designed for teams that move fast
            </h2>
            <Link
              href="#search"
              className="text-sm font-semibold text-ember-600"
            >
              Run a search →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-sand-200 bg-white/70 p-6"
              >
                <h3 className="text-xl font-semibold text-ink-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 space-y-8">
            <h2 className="text-3xl font-semibold text-ink-900">
              Powerful use cases for every industry
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  Journalism & fact-checking
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Verify image authenticity, trace original publication sources,
                  and detect manipulated visuals. Ensure the credibility of your
                  reporting with comprehensive image provenance tracking.
                </p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  Brand protection & monitoring
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Detect unauthorized use of your brand assets, monitor logo
                  placement across the web, and identify counterfeit products.
                  Protect your brand reputation with automated visual
                  monitoring.
                </p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  Copyright enforcement
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Find unauthorized reproductions of your creative work, build
                  evidence for DMCA takedowns, and license your images more
                  effectively. Track where your photos and designs appear
                  online.
                </p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  E-commerce & competitive analysis
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Discover where competitors are sourcing product images,
                  identify image theft, and find visually similar products. Gain
                  insights into market trends and pricing strategies.
                </p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  Digital forensics & investigations
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Trace the spread of misinformation, identify the origin of
                  leaked images, and build digital evidence chains. Essential
                  for OSINT investigations and online security research.
                </p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-ink-900">
                  Content creation & social media
                </h3>
                <p className="mt-2 text-sm text-ink-500">
                  Find higher resolution versions of images, discover original
                  creators for proper attribution, and identify reposts of your
                  content. Maintain proper credit and protect your creative
                  work.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12" id="faq">
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-8">
            <h2 className="text-3xl font-semibold text-ink-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Everything you need to know about ImageSearchReverse
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {faqs.map((item) => (
                <div key={item.question} className="space-y-2">
                  <h3 className="text-lg font-semibold text-ink-900">
                    {item.question}
                  </h3>
                  <p className="text-sm text-ink-500">{item.answer}</p>
                </div>
              ))}
            </div>
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
            <Link href="/privacy" className="hover:text-ink-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-900">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
