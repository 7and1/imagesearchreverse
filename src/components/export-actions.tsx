"use client";

import { SearchResult } from "./search-panel";

type ExportActionsProps = {
  results: SearchResult[];
  imageUrl: string;
};

export default function ExportActions({ results, imageUrl }: ExportActionsProps) {
  const exportCSV = () => {
    const headers = ["Title", "URL", "Domain", "Image URL"];
    const rows = results.map((r) => [
      `"${r.title}"`,
      `"${r.pageUrl}"`,
      `"${r.domain ?? ""}"`,
      `"${r.imageUrl ?? ""}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    downloadFile(csv, "search-results.csv", "text/csv");
  };

  const exportJSON = () => {
    const json = JSON.stringify(
      { imageUrl, results, exportedAt: new Date().toISOString() },
      null,
      2,
    );
    downloadFile(json, "search-results.json", "application/json");
  };

  const copyToClipboard = async () => {
    const text = results
      .map((r) => `${r.title}\n${r.pageUrl}\n${r.domain ?? ""}\n`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Results copied to clipboard!");
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  const shareResults = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", imageUrl);
    const shareUrl = url.toString();

    if (navigator.share) {
      navigator
        .share({
          title: "Image Search Results",
          text: `Found ${results.length} results`,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert("Shareable link copied to clipboard!"))
        .catch(() => alert("Failed to copy link"));
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={exportCSV}
        className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
      >
        Export CSV
      </button>
      <button
        onClick={exportJSON}
        className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
      >
        Export JSON
      </button>
      <button
        onClick={copyToClipboard}
        className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
      >
        Copy
      </button>
      <button
        onClick={shareResults}
        className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
      >
        Share
      </button>
    </div>
  );
}
