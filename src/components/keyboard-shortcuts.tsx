"use client";

import { useEffect } from "react";

type ShortcutConfig = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
};

const shortcuts: ShortcutConfig[] = [
  {
    key: "u",
    ctrlKey: true,
    description: "Open upload dialog",
    action: () => {
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      input?.click();
    },
  },
  {
    key: "v",
    ctrlKey: true,
    description: "Focus URL input",
    action: () => {
      const input = document.getElementById(
        "image-url",
      ) as HTMLInputElement;
      input?.focus();
    },
  },
  {
    key: "Enter",
    ctrlKey: true,
    description: "Submit search",
    action: () => {
      const button = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      button?.click();
    },
  },
  {
    key: "Escape",
    description: "Close modals",
    action: () => {
      const modal = document.querySelector("[role='dialog']");
      if (modal) {
        (modal as HTMLElement).dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape" }),
        );
      }
    },
  },
];

type KeyboardShortcutsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function KeyboardShortcuts({
  isOpen,
  onClose,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-auto rounded-3xl border border-sand-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-ink-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-500 hover:bg-sand-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500"
            aria-label="Close shortcuts"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-ink-700">{shortcut.description}</span>
              <kbd className="rounded-md border border-sand-300 bg-sand-100 px-2 py-1 font-mono text-xs text-ink-600">
                {shortcut.ctrlKey && "Ctrl+"}
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-sand-200">
          <p className="text-xs text-ink-500">
            Press <kbd className="rounded-md border border-sand-300 bg-sand-100 px-1.5 py-0.5 font-mono">Esc</kbd> or{" "}
            <kbd className="rounded-md border border-sand-300 bg-sand-100 px-1.5 py-0.5 font-mono">Ctrl+Shift+?</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

export function useKeyboardShortcuts(isEnabled = true) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "?") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-shortcuts"));
      }

      for (const shortcut of shortcuts) {
        const match =
          e.key === shortcut.key &&
          (shortcut.ctrlKey ?? false) === e.ctrlKey &&
          (shortcut.metaKey ?? false) === e.metaKey &&
          (shortcut.shiftKey ?? false) === e.shiftKey;

        if (match) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled]);
}
