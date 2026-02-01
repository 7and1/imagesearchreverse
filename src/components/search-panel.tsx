/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TurnstileWidget from "@/components/turnstile-widget";
import { ResultsGridSkeleton } from "@/components/skeleton";

export type SearchResult = {
  title: string;
  pageUrl: string;
  imageUrl?: string;
  domain?: string;
};

type SearchResponse = {
  taskId?: string;
  status?: "ready" | "pending";
  results?: SearchResult[];
  checkUrl?: string;
  error?: string;
  resetAt?: string;
  cached?: boolean;
};

const POLL_ATTEMPTS = 10;
const POLL_DELAY = 2000;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Get image dimensions from file
const getImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
};

const parseJsonResponse = async <T extends { error?: string }>(
  response: Response,
): Promise<T> => {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("<")) {
      return {
        error: `Unexpected response from server (status ${response.status}).`,
      } as T;
    }
    return { error: trimmed } as T;
  }
};

export default function SearchPanel() {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<
    "idle" | "uploading" | "searching" | "polling" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [checkUrl, setCheckUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [searchedImageUrl, setSearchedImageUrl] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [pollProgress, setPollProgress] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const abortRef = useRef(false);
  const pollTokenRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLLabelElement>(null);
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);
  const handleTurnstileVerify = useCallback(
    (token: string) => setTurnstileToken(token),
    [],
  );
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setImageDimensions(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Get image dimensions
    getImageDimensions(file).then(setImageDimensions);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Memoize file metadata
  const fileMetadata = useMemo(() => {
    if (!file) return null;
    return {
      size: formatFileSize(file.size),
      dimensions: imageDimensions
        ? `${imageDimensions.width}x${imageDimensions.height}`
        : null,
    };
  }, [file, imageDimensions]);

  const reset = () => {
    pollTokenRef.current += 1;
    setStatus("idle");
    setError(null);
    setResults([]);
    setCheckUrl(null);
    setTaskId(null);
    setSearchedImageUrl(null);
    setPollProgress(0);
  };

  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
    }
  }, []);

  // Handle file input change
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = event.target.files?.[0] ?? null;
      setFile(picked);
    },
    [],
  );

  const handleUpload = async () => {
    if (!file) throw new Error("Select an image first.");
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await parseJsonResponse<{
      url?: string;
      hash?: string;
      error?: string;
    }>(response);
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Upload failed.");
    }

    return { url: data.url, hash: data.hash ?? null };
  };

  const pollResults = async (id: string) => {
    const token = pollTokenRef.current;
    setStatus("polling");
    setPollProgress(0);

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      if (abortRef.current || token !== pollTokenRef.current) return;
      await sleep(POLL_DELAY);

      // Update progress
      const progress = Math.round(((attempt + 1) / POLL_ATTEMPTS) * 100);
      setPollProgress(progress);

      const response = await fetch(`/api/search?taskId=${id}`);
      const data = await parseJsonResponse<SearchResponse>(response);

      if (token !== pollTokenRef.current) return;
      if (!response.ok && response.status !== 202) {
        setStatus("error");
        setError(data.error || "Search failed.");
        return;
      }
      if (response.status === 200 && data.results?.length) {
        setResults(data.results);
        setCheckUrl(data.checkUrl ?? null);
        setStatus("done");
        setPollProgress(100);
        return;
      }
    }

    setStatus("done");
    setPollProgress(100);
  };

  const handleSearch = async (
    resolvedUrl: string,
    resolvedHash?: string | null,
  ) => {
    setStatus("searching");
    setSearchedImageUrl(resolvedUrl);

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: resolvedUrl,
        imageHash: resolvedHash ?? undefined,
        turnstileToken: turnstileToken ?? undefined,
      }),
    });

    const data = await parseJsonResponse<SearchResponse>(response);

    if (response.status === 429) {
      throw new Error(data.error || "Rate limit reached.");
    }

    if (!response.ok && response.status !== 202) {
      throw new Error(data.error || "Search failed.");
    }

    if (data.results?.length) {
      setResults(data.results);
      setCheckUrl(data.checkUrl ?? null);
      setStatus("done");
      return;
    }

    if (data.taskId) {
      setTaskId(data.taskId);
      await pollResults(data.taskId);
      return;
    }

    setStatus("done");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    reset();

    try {
      let resolvedUrl = imageUrl.trim();
      let resolvedHash: string | null = null;

      if (turnstileEnabled && !turnstileToken) {
        throw new Error("Complete the security check to continue.");
      }

      if (mode === "upload") {
        const uploaded = await handleUpload();
        resolvedUrl = uploaded.url;
        resolvedHash = uploaded.hash;
      } else if (!resolvedUrl) {
        throw new Error("Paste an image URL to continue.");
      }

      await handleSearch(resolvedUrl, resolvedHash);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileResetKey((current) => current + 1);
      }
    }
  };

  // Memoize estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (status !== "polling") return null;
    const remainingAttempts =
      POLL_ATTEMPTS - Math.ceil((pollProgress / 100) * POLL_ATTEMPTS);
    const seconds = Math.ceil(remainingAttempts * (POLL_DELAY / 1000));
    return `${seconds}s`;
  }, [status, pollProgress]);

  // Memoize mode switching handlers
  const handleModeUpload = useCallback(() => setMode("upload"), []);
  const handleModeUrl = useCallback(() => setMode("url"), []);

  // Screen reader status message
  const srStatusMessage = useMemo(() => {
    switch (status) {
      case "uploading":
        return "Uploading image, please wait.";
      case "searching":
        return "Searching for image matches, please wait.";
      case "polling":
        return `Processing search, ${pollProgress}% complete.`;
      case "done":
        return results.length > 0
          ? `Search complete. Found ${results.length} results.`
          : "Search complete. No results found.";
      case "error":
        return `Error: ${error || "An error occurred."}`;
      default:
        return "";
    }
  }, [status, pollProgress, results.length, error]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Screen reader live region for status announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {srStatusMessage}
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/70 p-6 shadow-[0_24px_60px_rgba(18,16,15,0.12)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sand-100">
            Reverse Search
          </span>
          <p className="text-sm text-ink-500">
            Upload a file or paste a URL. We will return original sources and
            visual matches.
          </p>
        </div>

        <div
          className="mt-6 flex gap-2 rounded-full border border-sand-200 bg-sand-100/80 p-1 text-sm"
          role="tablist"
          aria-label="Search mode selection"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            aria-controls="search-panel"
            tabIndex={mode === "upload" ? 0 : -1}
            onClick={handleModeUpload}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px] ${
              mode === "upload"
                ? "bg-ink-900 text-sand-100"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Upload Image
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            aria-controls="search-panel"
            tabIndex={mode === "url" ? 0 : -1}
            onClick={handleModeUrl}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px] ${
              mode === "url"
                ? "bg-ink-900 text-sand-100"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Paste URL
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
          id="search-panel"
          role="tabpanel"
          aria-labelledby={`mode-${mode}`}
        >
          {mode === "upload" ? (
            <label
              ref={dropZoneRef}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white px-4 py-6 text-center transition-all min-h-[180px] ${
                isDragging
                  ? "border-ember-500 bg-ember-50 scale-[1.02]"
                  : "border-sand-300 hover:border-ember-500"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload image file"
                aria-describedby="upload-instructions"
              />
              <span id="upload-instructions" className="sr-only">
                Supported formats: JPEG, PNG, WebP, GIF, BMP. Maximum file size: 10MB.
              </span>
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      width={112}
                      height={112}
                      className="h-28 w-28 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-semibold">
                        Replace
                      </span>
                    </div>
                  </div>
                  {fileMetadata && (
                    <div className="text-xs text-ink-500 flex gap-3">
                      {fileMetadata.dimensions && (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                          </svg>
                          {fileMetadata.dimensions}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {fileMetadata.size}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-ink-900">
                    {isDragging
                      ? "Drop image here"
                      : "Drop an image or click to browse"}
                  </p>
                  <p className="text-sm text-ink-500">
                    JPG, PNG, WebP, GIF, or BMP up to 10MB.
                  </p>
                </div>
              )}
            </label>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="image-url"
                className="text-sm font-semibold text-ink-700"
              >
                Image URL
              </label>
              <input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-sm text-ink-900 shadow-sm focus:border-ember-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
                aria-describedby="url-instructions"
              />
              <p id="url-instructions" className="text-xs text-ink-400">
                Enter a direct link to an image (ending in .jpg, .png, .webp, etc.)
              </p>
            </div>
          )}

          {turnstileEnabled && (
            <div className="rounded-2xl border border-sand-200 bg-sand-100/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                Security check
              </p>
              <div className="mt-3">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={handleTurnstileVerify}
                  onExpire={handleTurnstileExpire}
                  resetKey={turnstileResetKey}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              status === "uploading" ||
              status === "searching" ||
              status === "polling" ||
              (turnstileEnabled && !turnstileToken)
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[48px]"
            aria-live="polite"
            aria-busy={
              status === "uploading" ||
              status === "searching" ||
              status === "polling"
            }
          >
            {status === "uploading" && "Uploading…"}
            {status === "searching" && "Searching…"}
            {status === "polling" && "Finding matches…"}
            {(status === "idle" || status === "done" || status === "error") &&
              "Start Reverse Search"}
          </button>
        </form>

        {error && (
          <div
            className="mt-4 rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4 text-sm text-ember-600"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <p className="mt-1 text-ember-500 text-xs">
                  {error.includes("Rate limit") && "Your daily limit resets at midnight UTC. Try again tomorrow or contact us for higher limits."}
                  {error.includes("security check") && "Please complete the CAPTCHA verification above before searching."}
                  {error.includes("Upload failed") && "Check your file size (max 10MB) and format (JPG, PNG, WebP, GIF, BMP)."}
                  {error.includes("URL") && "Make sure the URL points directly to an image file (ending in .jpg, .png, etc.)."}
                  {!error.includes("Rate limit") && !error.includes("security check") && !error.includes("Upload failed") && !error.includes("URL") && "Please try again. If the problem persists, try a different image or contact support."}
                </p>
              </div>
            </div>
          </div>
        )}

        {taskId && status === "polling" && (
          <div className="mt-4 space-y-2" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>Searching...</span>
              <span>{pollProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-sand-200 overflow-hidden">
              <div
                className="h-full bg-ember-500 transition-all duration-500 ease-out"
                style={{ width: `${pollProgress}%` }}
                role="progressbar"
                aria-valuenow={pollProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-xs text-ink-500 flex items-center justify-between">
              <span>
                Task ID:{" "}
                <span className="font-mono text-ink-700">{taskId}</span>
              </span>
              {estimatedTimeRemaining && (
                <span>~{estimatedTimeRemaining} remaining</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-sand-200 bg-white/60 p-6">
          <h3 className="text-xl font-semibold text-ink-900">
            What you will get
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-ink-500">
            <li>Original source candidates and canonical URLs.</li>
            <li>Visually similar images with domain context.</li>
            <li>One-click open in Google Image Search.</li>
            <li>Daily usage caps to protect shared infrastructure.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-night-900 p-6 text-sand-100">
          <p className="text-sm uppercase tracking-[0.2em] text-sand-300">
            Status
          </p>
          <p className="mt-3 text-2xl font-semibold" aria-live="polite">
            {status === "idle" && "Ready when you are"}
            {status === "uploading" && "Uploading image"}
            {status === "searching" && "Querying DataForSEO"}
            {status === "polling" && "Waiting for results"}
            {status === "done" && "Results ready"}
            {status === "error" && "Something went wrong"}
          </p>
          <p className="mt-3 text-sm text-sand-300">
            Average response time is 5-15 seconds depending on the queue.
          </p>
        </div>
      </div>

      <div className="lg:col-span-2">
        {status === "polling" && results.length === 0 ? (
          <ResultsGridSkeleton count={6} />
        ) : results.length > 0 ? (
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-ink-900">
                  Visual matches
                </h3>
                <p className="text-sm text-ink-500" aria-live="polite">
                  {results.length} source{results.length !== 1 ? "s" : ""}{" "}
                  detected
                </p>
              </div>
              {checkUrl && (
                <a
                  href={checkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-ink-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-900 transition hover:bg-ink-900 hover:text-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center"
                >
                  Open Google View
                </a>
              )}
            </div>

            {searchedImageUrl && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-ink-500 self-center mr-1">
                  Also search on:
                </span>
                <a
                  href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(searchedImageUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-4 py-2.5 text-xs font-medium text-ink-700 transition hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </a>
                <a
                  href={`https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(searchedImageUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-4 py-2.5 text-xs font-medium text-ink-700 transition hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 3v16.5l4 2.5v-9l7 4.5-4-8V3H5z" fill="#008373"/>
                    <path d="M9 13v9l7-4.5-7-4.5z" fill="#00A78E"/>
                    <path d="M16 9.5l-7-4.5v4l7 4.5-4 8 7-4.5V9.5z" fill="#00D7B4"/>
                  </svg>
                  Bing
                </a>
                <a
                  href={`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(searchedImageUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-4 py-2.5 text-xs font-medium text-ink-700 transition hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 min-h-[44px]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#FF0000"/>
                    <text x="12" y="16" textAnchor="middle" fill="#FF0000" fontSize="10" fontWeight="bold">Y</text>
                  </svg>
                  Yandex
                </a>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <a
                  key={item.pageUrl}
                  href={item.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
                >
                  <div className="h-40 w-full overflow-hidden bg-sand-200 relative">
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          loading="lazy"
                          width={320}
                          height={160}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-ink-500">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-sm font-semibold text-ink-900 line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-xs text-ink-500">
                      {item.domain || "Source"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="rounded-3xl border border-dashed border-sand-300 bg-white/60 p-6 text-center text-sm text-ink-500"
            role="status"
            aria-live="polite"
          >
            Results will appear here after the search finishes.
          </div>
        )}
      </div>
    </div>
  );
}
