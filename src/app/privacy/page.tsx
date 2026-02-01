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
    dateModified: "2026-02-01",
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
            Updated February 1, 2026
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-ink-900">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            ImageSearchReverse respects your privacy. This policy explains what we
            collect, how we use it, and your rights under GDPR, CCPA, and other
            privacy regulations.
          </p>

          <div className="mt-8 space-y-8 text-sm text-ink-500">
            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Information We Collect
              </h2>
              <div className="mt-3 space-y-3">
                <p>
                  <strong className="text-ink-700">Uploaded Images:</strong>{" "}
                  Images you upload for reverse search are temporarily stored in
                  Cloudflare R2 for processing. They are automatically deleted
                  within 24 hours according to our bucket lifecycle policy. We do
                  not use your images for training purposes or share them with
                  third parties.
                </p>
                <p>
                  <strong className="text-ink-700">IP Addresses:</strong> We
                  collect IP addresses for rate limiting purposes (10 searches per
                  day per IP). This data is stored for 48 hours and then
                  automatically purged.
                </p>
                <p>
                  <strong className="text-ink-700">Usage Analytics:</strong> We
                  collect minimal anonymized usage data (request counts, latency,
                  errors) to maintain service reliability. This data cannot be
                  used to identify individual users.
                </p>
                <p>
                  <strong className="text-ink-700">CAPTCHA Tokens:</strong>{" "}
                  Cloudflare Turnstile tokens are processed for security
                  verification and are not stored after validation.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                How We Use Your Information
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>To perform reverse image searches via the DataForSEO API</li>
                <li>To enforce rate limits and prevent abuse</li>
                <li>To maintain service reliability and debug issues</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Cookies and Tracking
              </h2>
              <p className="mt-3">
                We use only essential cookies necessary for the service to
                function. We do not use marketing, analytics, or third-party
                tracking cookies. Cloudflare Turnstile may set cookies for
                security verification purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Data Processors
              </h2>
              <p className="mt-3">
                We use the following subprocessors to provide our service:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong>Cloudflare</strong> - Hosting, R2 storage, KV caching,
                  and Turnstile security
                </li>
                <li>
                  <strong>DataForSEO</strong> - Reverse image search results
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                International Data Transfers
              </h2>
              <p className="mt-3">
                Data is processed via Cloudflare&apos;s global edge network. Your
                data may be transferred to and processed in countries outside of
                your residence, including the United States. We rely on Standard
                Contractual Clauses for GDPR compliance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Your Rights (GDPR/CCPA)
              </h2>
              <p className="mt-3">
                Depending on your jurisdiction, you may have the following rights:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong>Right to Access:</strong> Request a copy of your
                  personal data
                </li>
                <li>
                  <strong>Right to Deletion:</strong> Request deletion of your
                  data
                </li>
                <li>
                  <strong>Right to Portability:</strong> Receive your data in a
                  portable format
                </li>
                <li>
                  <strong>Right to Object:</strong> Object to processing of your
                  data
                </li>
                <li>
                  <strong>Right to Non-Discrimination:</strong> Exercise your
                  rights without penalty (CCPA)
                </li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us at{" "}
                <a
                  href="mailto:privacy@imagesearchreverse.com"
                  className="text-ember-600 hover:underline"
                >
                  privacy@imagesearchreverse.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Data Retention
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Uploaded images: 24 hours maximum</li>
                <li>IP addresses for rate limiting: 48 hours</li>
                <li>Search cache: 48 hours</li>
                <li>Analytics data: 90 days (anonymized)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">Security</h2>
              <p className="mt-3">
                We implement appropriate technical and organizational measures to
                protect your data, including encryption in transit (TLS 1.3) and
                at rest. Our service runs on Cloudflare&apos;s secure edge network.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Children&apos;s Privacy
              </h2>
              <p className="mt-3">
                Our service is not intended for children under 13. We do not
                knowingly collect data from children under 13. If you believe we
                have collected data from a child under 13, please contact us
                immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Changes to This Policy
              </h2>
              <p className="mt-3">
                We may update this privacy policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the &quot;Updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">Contact Us</h2>
              <p className="mt-3">
                If you have any questions about this privacy policy or our data
                practices, please contact us at:{" "}
                <a
                  href="mailto:privacy@imagesearchreverse.com"
                  className="text-ember-600 hover:underline"
                >
                  privacy@imagesearchreverse.com
                </a>
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
