"use client";

/**
 * Skeleton loading components for search results
 * Used during polling/loading states to show placeholder content
 */

export function ResultCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white animate-pulse">
      {/* Image placeholder */}
      <div className="h-40 w-full bg-sand-200" />
      {/* Content placeholder */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-4 bg-sand-200 rounded w-3/4" />
        {/* Domain skeleton */}
        <div className="h-3 bg-sand-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export function ResultsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          {/* Title skeleton */}
          <div className="h-6 bg-sand-200 rounded w-40 animate-pulse" />
          {/* Subtitle skeleton */}
          <div className="h-4 bg-sand-200 rounded w-32 animate-pulse" />
        </div>
        {/* Button skeleton */}
        <div className="h-10 bg-sand-200 rounded-full w-36 animate-pulse" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <ResultCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function SearchFormSkeleton() {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white/70 p-6 shadow-[0_24px_60px_rgba(18,16,15,0.12)] backdrop-blur animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-6 bg-sand-200 rounded-full w-32" />
        <div className="h-4 bg-sand-200 rounded w-64" />
      </div>

      {/* Tab buttons */}
      <div className="mt-6 flex gap-2 rounded-full border border-sand-200 bg-sand-100/80 p-1">
        <div className="flex-1 h-10 bg-sand-200 rounded-full" />
        <div className="flex-1 h-10 bg-sand-300 rounded-full" />
      </div>

      {/* Upload area */}
      <div className="mt-6 min-h-[180px] rounded-2xl border-2 border-dashed border-sand-300 bg-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-sand-200 rounded-full mx-auto" />
          <div className="h-4 bg-sand-200 rounded w-32 mx-auto" />
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-4 h-12 bg-sand-200 rounded-2xl" />
    </div>
  );
}

export function StatusCardSkeleton() {
  return (
    <div className="rounded-3xl border border-sand-200 bg-night-900 p-6 animate-pulse">
      <div className="h-4 bg-sand-300/20 rounded w-16" />
      <div className="mt-3 h-8 bg-sand-300/20 rounded w-48" />
      <div className="mt-3 h-4 bg-sand-300/20 rounded w-64" />
    </div>
  );
}

/**
 * Inline loading spinner for buttons and small areas
 */
export function LoadingSpinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
