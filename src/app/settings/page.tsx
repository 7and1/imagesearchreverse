"use client";

import { useState, useEffect } from "react";

type Settings = {
  defaultSearchType: "upload" | "url";
  resultCount: number;
  darkMode: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  defaultSearchType: "upload",
  resultCount: 10,
  darkMode: false,
};

const SETTINGS_KEY = "app-settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        console.error("Failed to parse settings");
      }
    }
  }, []);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  const handleClearAllData = () => {
    localStorage.clear();
    setShowClearConfirm(false);
    window.location.reload();
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="rounded-3xl border border-sand-200 bg-white/80 p-8">
        <h1 className="text-3xl font-semibold text-ink-900">Settings</h1>
        <p className="mt-2 text-sm text-ink-500">
          Customize your ImageSearchReverse experience
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-2">
              Default search type
            </label>
            <select
              value={settings.defaultSearchType}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultSearchType: e.target.value as "upload" | "url",
                })
              }
              className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-sm focus:border-ember-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
            >
              <option value="upload">Upload Image</option>
              <option value="url">Paste URL</option>
            </select>
            <p className="mt-1 text-xs text-ink-500">
              Choose your preferred input method when the page loads
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-700 mb-2">
              Results per page
            </label>
            <input
              type="number"
              min="5"
              max="50"
              step="5"
              value={settings.resultCount}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  resultCount: parseInt(e.target.value, 10),
                })
              }
              className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3 text-sm focus:border-ember-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
            />
            <p className="mt-1 text-xs text-ink-500">
              Number of results to display (5-50)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-ink-700">
                Dark mode
              </label>
              <p className="text-xs text-ink-500">
                Reduce eye strain with darker colors
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, darkMode: !settings.darkMode })
              }
              className={`relative h-12 w-20 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 ${
                settings.darkMode ? "bg-ink-900" : "bg-sand-300"
              }`}
              aria-pressed={settings.darkMode}
            >
              <span
                className={`absolute top-2 h-8 w-8 rounded-full bg-white transition-transform duration-200 ${
                  settings.darkMode ? "translate-x-9" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="pt-6 border-t border-sand-200">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">
              Data Management
            </h3>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="rounded-full border border-ember-500 px-4 py-2 text-sm font-semibold text-ember-600 hover:bg-ember-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
            >
              Clear all data
            </button>
            <p className="mt-2 text-xs text-ink-500">
              This will delete your search history and settings. This action
              cannot be undone.
            </p>

            {showClearConfirm && (
              <div className="mt-4 rounded-2xl border border-ember-500/40 bg-ember-500/10 p-4">
                <p className="text-sm font-semibold text-ember-600 mb-3">
                  Are you sure? This will permanently delete all your data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAllData}
                    className="rounded-full bg-ember-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
