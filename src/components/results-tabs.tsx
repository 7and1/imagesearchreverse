"use client";

import { useState, useMemo, useEffect } from "react";
import { SearchResult } from "./search-panel";

type ResultCategory = "all" | "exact" | "similar";

type ResultsTabsProps = {
  results: SearchResult[];
  onFilteredResults: (results: SearchResult[]) => void;
};

export default function ResultsTabs({
  results,
  onFilteredResults,
}: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<ResultCategory>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "domain">("relevance");
  const [domainFilter, setDomainFilter] = useState<string>("all");

  const domains = useMemo(() => {
    const domainMap = new Map<string, number>();
    results.forEach((result) => {
      if (result.domain) {
        domainMap.set(result.domain, (domainMap.get(result.domain) ?? 0) + 1);
      }
    });
    return Array.from(domainMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [results]);

  const categorizedResults = useMemo(() => {
    const exact = results.filter((r) => r.domain?.includes("google"));
    const similar = results.filter((r) => !r.domain?.includes("google"));

    return { exact, similar };
  }, [results]);

  const filteredResults = useMemo(() => {
    let filtered: SearchResult[] =
      activeTab === "all"
        ? results
        : activeTab === "exact"
          ? categorizedResults.exact
          : categorizedResults.similar;

    if (domainFilter !== "all") {
      filtered = filtered.filter((r) => r.domain === domainFilter);
    }

    if (sortBy === "domain") {
      filtered = [...filtered].sort((a, b) =>
        (a.domain ?? "").localeCompare(b.domain ?? ""),
      );
    }

    return filtered;
  }, [activeTab, sortBy, domainFilter, results, categorizedResults]);

  // Call the callback with filtered results
  useEffect(() => {
    onFilteredResults(filteredResults);
  }, [filteredResults, onFilteredResults]);

  const tabs = [
    { id: "all" as const, label: "All", count: results.length },
    {
      id: "exact" as const,
      label: "Exact matches",
      count: categorizedResults.exact.length,
    },
    {
      id: "similar" as const,
      label: "Similar images",
      count: categorizedResults.similar.length,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 ${
              activeTab === tab.id
                ? "bg-ink-900 text-sand-100"
                : "bg-sand-100 text-ink-700 hover:bg-sand-200"
            }`}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label
          htmlFor="sort-select"
          className="text-sm font-semibold text-ink-700"
        >
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-sm focus:border-ember-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
        >
          <option value="relevance">Relevance</option>
          <option value="domain">Domain</option>
        </select>

        {domains.length > 0 && (
          <>
            <label
              htmlFor="domain-select"
              className="text-sm font-semibold text-ink-700 ml-4"
            >
              Filter by domain:
            </label>
            <select
              id="domain-select"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-sm focus:border-ember-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
            >
              <option value="all">All domains</option>
              {domains.map(([domain, count]) => (
                <option key={domain} value={domain}>
                  {domain} ({count})
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
