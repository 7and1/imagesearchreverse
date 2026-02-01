"use client";

import { toast } from "sonner";
import { SearchResult } from "./search-panel";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

type ExportActionsProps = {
  results: SearchResult[];
  imageUrl: string;
};

/**
 * Properly escape a value for CSV format
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape internal quotes by doubling them
 */
function escapeCSV(value: string | undefined | null): string {
  if (value == null) return "";
  const str = String(value);
  // If contains special characters, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ExportActions({ results, imageUrl }: ExportActionsProps) {
  const exportCSV = () => {
    const headers = ["Title", "URL", "Domain", "Image URL"];
    const rows = results.map((r) => [
      escapeCSV(r.title),
      escapeCSV(r.pageUrl),
      escapeCSV(r.domain),
      escapeCSV(r.imageUrl),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadFile(csv, "search-results.csv", "text/csv;charset=utf-8");
    toast.success("CSV exported successfully");
    trackEvent(ANALYTICS_EVENTS.EXPORT_CSV, { resultCount: results.length });
  };

  const exportJSON = () => {
    const json = JSON.stringify(
      { imageUrl, results, exportedAt: new Date().toISOString() },
      null,
      2,
    );
    downloadFile(json, "search-results.json", "application/json");
    toast.success("JSON exported successfully");
    trackEvent(ANALYTICS_EVENTS.EXPORT_JSON, { resultCount: results.length });
  };

  const copyToClipboard = async () => {
    const text = results
      .map((r) => `${r.title}\n${r.pageUrl}\n${r.domain ?? ""}\n`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Results copied to clipboard");
      trackEvent(ANALYTICS_EVENTS.COPY_RESULTS, { resultCount: results.length });
    } catch {
      toast.error("Failed to copy to clipboard");
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
        .then(() => {
          trackEvent(ANALYTICS_EVENTS.SHARE_RESULTS, { resultCount: results.length });
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          toast.success("Shareable link copied to clipboard");
          trackEvent(ANALYTICS_EVENTS.SHARE_RESULTS, { resultCount: results.length });
        })
        .catch(() => toast.error("Failed to copy link"));
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
        className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
        aria-label="Export results as CSV file"
      >
        Export CSV
      </button>
      <button
        onClick={exportJSON}
        className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
        aria-label="Export results as JSON file"
      >
        Export JSON
      </button>
      <button
        onClick={copyToClipboard}
        className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
        aria-label="Copy results to clipboard"
      >
        Copy
      </button>
      <button
        onClick={shareResults}
        className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700 transition hover:border-ink-900 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
        aria-label="Share search results"
      >
        Share
      </button>
    </div>
  );
}
