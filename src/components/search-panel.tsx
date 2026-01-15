/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TurnstileWidget from "@/components/turnstile-widget";

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const abortRef = useRef(false);
  const pollTokenRef = useRef(0);
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
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    pollTokenRef.current += 1;
    setStatus("idle");
    setError(null);
    setResults([]);
    setCheckUrl(null);
    setTaskId(null);
  };

  const handleUpload = async () => {
    if (!file) throw new Error("Select an image first.");
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      url?: string;
      hash?: string;
      error?: string;
    };
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Upload failed.");
    }

    return { url: data.url, hash: data.hash ?? null };
  };

  const pollResults = async (id: string) => {
    const token = pollTokenRef.current;
    setStatus("polling");

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      if (abortRef.current || token !== pollTokenRef.current) return;
      await sleep(POLL_DELAY);

      const response = await fetch(`/api/search?taskId=${id}`);
      const data = (await response.json()) as SearchResponse;

      if (token !== pollTokenRef.current) return;
      if (response.status === 200 && data.results?.length) {
        setResults(data.results);
        setCheckUrl(data.checkUrl ?? null);
        setStatus("done");
        return;
      }
    }

    setStatus("done");
  };

  const handleSearch = async (
    resolvedUrl: string,
    resolvedHash?: string | null,
  ) => {
    setStatus("searching");

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

    const data = (await response.json()) as SearchResponse;

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

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
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

        <div className="mt-6 flex gap-2 rounded-full border border-sand-200 bg-sand-100/80 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition ${
              mode === "upload"
                ? "bg-ink-900 text-sand-100"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex-1 rounded-full px-4 py-2 font-medium transition ${
              mode === "url"
                ? "bg-ink-900 text-sand-100"
                : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Paste URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "upload" ? (
            <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-sand-300 bg-white px-4 py-6 text-center transition hover:border-ember-500">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setFile(picked);
                }}
              />
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-28 w-28 rounded-2xl object-cover shadow-lg"
                  />
                  <span className="text-sm text-ink-500">
                    Click to replace image
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-ink-900">
                    Drop an image or click to browse
                  </p>
                  <p className="text-sm text-ink-500">
                    JPG, PNG, WEBP, or GIF up to 8MB.
                  </p>
                </div>
              )}
            </label>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink-700">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-sm text-ink-900 shadow-sm focus:border-ember-500 focus:outline-none"
              />
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "uploading" && "Uploading…"}
            {status === "searching" && "Searching…"}
            {status === "polling" && "Finding matches…"}
            {(status === "idle" || status === "done" || status === "error") &&
              "Start Reverse Search"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-2xl border border-ember-500/40 bg-ember-500/10 p-3 text-sm text-ember-600">
            {error}
          </div>
        )}

        {taskId && status === "polling" && (
          <p className="mt-4 text-xs text-ink-500">
            Task ID: <span className="font-mono text-ink-700">{taskId}</span>
          </p>
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
          <p className="mt-3 text-2xl font-semibold">
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
        {results.length > 0 ? (
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-ink-900">
                  Visual matches
                </h3>
                <p className="text-sm text-ink-500">
                  {results.length} sources detected
                </p>
              </div>
              {checkUrl && (
                <a
                  href={checkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-ink-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-900 transition hover:bg-ink-900 hover:text-sand-100"
                >
                  Open Google View
                </a>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <a
                  key={item.pageUrl}
                  href={item.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-40 w-full overflow-hidden bg-sand-200">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
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
          <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 p-6 text-center text-sm text-ink-500">
            Results will appear here after the search finishes.
          </div>
        )}
      </div>
    </div>
  );
}
