"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  resetKey?: number;
};

const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (document.querySelector("script[data-turnstile]")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  resetKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire,
        "error-callback": onExpire,
      });
      setIsLoaded(true);
    };

    loadTurnstileScript().then(() => {
      if (window.turnstile) {
        render();
      } else {
        const interval = window.setInterval(() => {
          if (!window.turnstile) return;
          window.clearInterval(interval);
          render();
        }, 200);
      }
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, onVerify, onExpire]);

  useEffect(() => {
    if (!window.turnstile || !widgetIdRef.current) return;
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  return (
    <div ref={containerRef} className="turnstile">
      {!isLoaded && (
        <div className="flex h-12 w-full items-center justify-center bg-sand-200 rounded-lg animate-pulse">
          <span className="text-xs text-ink-500">Loading security check...</span>
        </div>
      )}
    </div>
  );
}
