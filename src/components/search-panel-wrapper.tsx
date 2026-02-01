"use client";

import { ErrorBoundary } from "./error-boundary";
import SearchPanel from "./search-panel";

export default function SearchPanelWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <SearchPanel />
    </ErrorBoundary>
  );
}

// Re-export the SearchResult type for convenience
export type { SearchResult } from "./search-panel";
