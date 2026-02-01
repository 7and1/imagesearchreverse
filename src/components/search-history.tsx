"use client";

import { useEffect, useState } from "react";
import { SearchResult } from "./search-panel";

export type HistoryItem = {
  id: string;
  timestamp: number;
  imageUrl: string;
  previewUrl?: string;
  results?: SearchResult[];
  resultCount?: number;
};

const HISTORY_KEY = "search-history";
const MAX_HISTORY = 10;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        console.error("Failed to parse search history");
      }
    }
  }, []);

  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const filtered = prev.filter((h) => h.imageUrl !== item.imageUrl);
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  return { history, addToHistory, removeFromHistory, clearHistory };
}

type SearchHistoryProps = {
  history: HistoryItem[];
  onItemClick: (item: HistoryItem) => void;
  onClear: () => void;
};

export default function SearchHistory({
  history,
  onItemClick,
  onClear,
}: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-3xl border border-sand-200 bg-white/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-ink-900">
          Recent searches
        </h3>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-ember-600 hover:text-ember-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 rounded-full px-3 py-1"
        >
          Clear history
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="group flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3 text-left transition hover:border-ember-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
          >
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-sand-200">
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt="Search preview"
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-ink-400">
                  No preview
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-500">
                {new Date(item.timestamp).toLocaleDateString()}
              </p>
              <p className="text-sm font-semibold text-ink-900 truncate">
                {item.resultCount ?? item.results?.length ?? 0} results
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
