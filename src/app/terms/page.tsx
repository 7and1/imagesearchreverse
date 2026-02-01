import Link from "next/link";
import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://imagesearchreverse.com";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read ImageSearchReverse's terms of service. Learn about acceptable use, service limits, third-party data providers, and our service disclaimer.",
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
};

export default function TermsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service",
    description:
      "Read ImageSearchReverse's terms of service. Learn about acceptable use, service limits, third-party data providers, and our service disclaimer.",
    url: `${siteUrl}/terms`,
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
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            By using ImageSearchReverse, you agree to these terms. Please read
            them carefully before using our service.
          </p>

          <div className="mt-8 space-y-8 text-sm text-ink-500">
            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Acceptance of Terms
              </h2>
              <p className="mt-3">
                By accessing or using ImageSearchReverse, you agree to be bound by
                these Terms of Service. If you do not agree to these terms, you
                may not use the service. These terms apply to all visitors, users,
                and others who access the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Description of Service
              </h2>
              <p className="mt-3">
                ImageSearchReverse provides reverse image search functionality,
                allowing users to upload images or provide image URLs to find
                similar images and their sources across the web. The service
                integrates with third-party search providers including DataForSEO,
                Google, Bing, and Yandex.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Acceptable Use
              </h2>
              <p className="mt-3">
                You agree to use the service only for lawful purposes and in
                accordance with these terms. You agree not to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Use the service to search for, upload, or distribute illegal
                  content, including CSAM (child sexual abuse material)
                </li>
                <li>
                  Circumvent or attempt to circumvent rate limits or access
                  controls
                </li>
                <li>
                  Use automated tools, bots, or scrapers without explicit written
                  permission (API access requires separate agreement)
                </li>
                <li>
                  Upload files containing malware, viruses, or malicious code
                </li>
                <li>
                  Violate the intellectual property rights of others
                </li>
                <li>
                  Use the service to harass, stalk, or harm individuals
                </li>
                <li>
                  Interfere with or disrupt the service or servers
                </li>
                <li>
                  Attempt to gain unauthorized access to any part of the service
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Service Limits
              </h2>
              <p className="mt-3">
                We reserve the right to enforce usage limits to protect the
                platform and ensure fair access for all users. Current limits
                include:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>10 reverse image searches per day per IP address</li>
                <li>50 image uploads per day per IP address</li>
                <li>Maximum file size of 10MB per image</li>
              </ul>
              <p className="mt-3">
                These limits may change with notice. For higher volume needs,
                contact us about enterprise plans.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                API Terms
              </h2>
              <p className="mt-3">
                API access requires a separate written agreement. API users must:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Authenticate using provided API credentials</li>
                <li>Comply with rate limits specified in their agreement</li>
                <li>Implement proper error handling and retry logic</li>
                <li>Not share API credentials with third parties</li>
                <li>Notify us of any security breaches within 24 hours</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Intellectual Property
              </h2>
              <p className="mt-3">
                You retain all rights to the images you upload. By using our
                service, you grant us a limited license to process your images
                solely for the purpose of providing the reverse image search
                service.
              </p>
              <p className="mt-3">
                Search results are provided by third-party search engines and
                belong to their respective owners. We do not claim ownership of
                search results or indexed content.
              </p>
              <p className="mt-3">
                The ImageSearchReverse name, logo, and service are protected by
                trademark and copyright laws. You may not use our branding without
                prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Third-Party Data
              </h2>
              <p className="mt-3">
                Search results are provided by third-party search providers
                (DataForSEO, Google, Bing, Yandex). We do not control or endorse
                the content of search results. Your use of third-party search
                engines through our service is subject to their respective terms
                of service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Privacy and Data
              </h2>
              <p className="mt-3">
                Your use of the service is also governed by our{" "}
                <Link href="/privacy" className="text-ember-600 hover:underline">
                  Privacy Policy
                </Link>
                , which explains how we collect, use, and protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Disclaimer of Warranties
              </h2>
              <p className="mt-3">
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT
                WARRANT THAT:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>The service will be uninterrupted or error-free</li>
                <li>Search results will be accurate or complete</li>
                <li>The service will meet your specific requirements</li>
                <li>Defects will be corrected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Limitation of Liability
              </h2>
              <p className="mt-3">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE
                FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING FROM
                YOUR USE OF THE SERVICE.
              </p>
              <p className="mt-3">
                Our total liability for any claim arising from these terms shall
                not exceed the amount you paid us (if any) in the 12 months
                preceding the claim, or $100, whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Indemnification
              </h2>
              <p className="mt-3">
                You agree to indemnify and hold harmless ImageSearchReverse and
                its operators from any claims, damages, or expenses (including
                attorneys&apos; fees) arising from your use of the service, your
                violation of these terms, or your violation of any rights of a
                third party.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Termination
              </h2>
              <p className="mt-3">
                We may terminate or suspend your access to the service immediately,
                without prior notice, for any reason, including violation of these
                terms. Upon termination, your right to use the service will
                immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Governing Law
              </h2>
              <p className="mt-3">
                These terms shall be governed by and construed in accordance with
                the laws of the United States. Any dispute arising from these
                terms shall be resolved through binding arbitration in accordance
                with the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">
                Changes to Terms
              </h2>
              <p className="mt-3">
                We may update these terms from time to time. We will notify you of
                any changes by posting the new terms on this page and updating the
                &ldquo;Updated&rdquo; date. Your continued use of the service after any
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900">Contact Us</h2>
              <p className="mt-3">
                If you have any questions about these terms, please contact us at:{" "}
                <a
                  href="mailto:legal@imagesearchreverse.com"
                  className="text-ember-600 hover:underline"
                >
                  legal@imagesearchreverse.com
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
