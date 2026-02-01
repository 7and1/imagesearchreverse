"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid var(--sand-300)",
          borderRadius: "1rem",
          color: "var(--ink-900)",
          fontFamily: "var(--font-body)",
        },
        classNames: {
          success: "!border-sage-500/30 !bg-sage-500/5",
          error: "!border-ember-500/30 !bg-ember-500/5",
        },
      }}
      expand={false}
      richColors
      closeButton
    />
  );
}
