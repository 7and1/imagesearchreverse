import Link from "next/link";
import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how ImageSearchReverse protects your privacy. We process images solely for reverse image searches, store data temporarily in Cloudflare R2, and never sell your information.",
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
};

export default function PrivacyPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy",
    description:
      "Learn how ImageSearchReverse protects your privacy. We process images solely for reverse image searches, store data temporarily in Cloudflare R2, and never sell your information.",
    url: `${siteUrl}/privacy`,
    dateModified: "2026-01-14",
    isPartOf: {
      "@type": "WebSite",
      name: "ImageSearchReverse",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-sand-200 bg-white/80 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
          Updated January 14, 2026
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-ink-900">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-ink-500">
          ImageSearchReverse respects your privacy. This policy explains what we
          collect, how we use it, and your choices.
        </p>

        <div className="mt-8 space-y-6 text-sm text-ink-500">
          <section>
            <h2 className="text-lg font-semibold text-ink-900">
              Data we process
            </h2>
            <p className="mt-2">
              We process the images you upload or the URLs you submit solely to
              perform reverse image searches. Uploaded images are stored in
              Cloudflare R2 for the duration of your search and follow the
              bucket lifecycle you control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">Analytics</h2>
            <p className="mt-2">
              We collect minimal usage telemetry (request counts, latency, and
              errors) to keep the service reliable. We do not sell personal
              information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">Your choices</h2>
            <p className="mt-2">
              You can request deletion of your stored uploads by adjusting your
              Cloudflare R2 lifecycle rules or deleting objects manually.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">Contact</h2>
            <p className="mt-2">
              Questions? Reach us at privacy@imagesearchreverse.com.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm font-semibold text-ember-600">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
    </>
  );
}
