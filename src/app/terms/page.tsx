import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="rounded-3xl border border-sand-200 bg-white/80 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
          Updated January 14, 2026
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-ink-900">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-ink-500">
          By using ImageSearchReverse, you agree to these terms. Please read
          them carefully.
        </p>

        <div className="mt-8 space-y-6 text-sm text-ink-500">
          <section>
            <h2 className="text-lg font-semibold text-ink-900">
              Acceptable use
            </h2>
            <p className="mt-2">
              You agree not to use the service to violate copyright, privacy, or
              applicable laws. You are responsible for the content you submit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">
              Service limits
            </h2>
            <p className="mt-2">
              We reserve the right to enforce daily usage limits to protect the
              platform. Limits may change with notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">
              Third-party data
            </h2>
            <p className="mt-2">
              Search results are provided by third-party search providers. We do
              not control or endorse external content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-900">Disclaimer</h2>
            <p className="mt-2">
              The service is provided as-is without warranties. We are not
              liable for indirect damages.
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
  );
}
