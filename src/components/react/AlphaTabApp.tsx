import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileMusic, Moon, Sun, UploadCloud } from "lucide-react";
import AlphaTabPlayer from "./AlphaTabPlayer";
import type { AlphaTabSource } from "./AlphaTabPlayer";

declare global {
  interface Window {
    toggleTheme?: () => void;
  }
}

const DEFAULT_SOURCE: AlphaTabSource = {
  type: "url",
  value: "https://www.alphatab.net/files/canon.gp",
};

const DEFAULT_LABEL = "Canon in D (demo)";

const ensureThemeSync = (isDark: boolean) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  localStorage.setItem("theme", isDark ? "dark" : "light");
};

type InitialSourceDescriptor = AlphaTabSource & { label?: string };

interface AlphaTabAppProps {
  initialSource?: InitialSourceDescriptor;
  allowUpload?: boolean;
  heading?: string;
  description?: string;
  soundFontUrl?: string;
  className?: string;
}

const AlphaTabApp: React.FC<AlphaTabAppProps> = ({
  initialSource,
  allowUpload = true,
  heading = "React Player Integration",
  description = "Load Guitar Pro files directly in Astro via a React client island.",
  soundFontUrl,
  className,
}) => {
  const deriveInitialSource = useCallback((): AlphaTabSource => {
    if (initialSource) {
      const { label: _label, ...rest } = initialSource;
      void _label;
      return rest as AlphaTabSource;
    }
    return DEFAULT_SOURCE;
  }, [initialSource]);

  const [source, setSource] = useState<AlphaTabSource>(deriveInitialSource);
  const [sourceLabel, setSourceLabel] = useState<string>(initialSource?.label ?? DEFAULT_LABEL);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) {
      return stored === "dark";
    }
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    ensureThemeSync(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.toggleTheme = () => {
      const themeButton = document.querySelector<HTMLButtonElement>("#theme-btn");
      if (themeButton) {
        themeButton.click();
        return;
      }

      const next = !isDarkMode;
      ensureThemeSync(next);
      setIsDarkMode(next);
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new MutationObserver(() => {
      const themeAttr = document.documentElement.getAttribute("data-theme");
      if (themeAttr === "dark") {
        setIsDarkMode(true);
      } else if (themeAttr === "light") {
        setIsDarkMode(false);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSource({ type: "file", value: file });
    setSourceLabel(file.name);
  }, []);

  const displayName = useMemo(() => {
    if (sourceLabel) return sourceLabel;
    if (source.type === "url") {
      try {
        const url = new URL(source.value);
        return decodeURIComponent(url.pathname.split("/").pop() || DEFAULT_LABEL);
      } catch {
        return source.value;
      }
    }
    if (source.type === "alphaTex") return "AlphaTex snippet";
    if (source.type === "arrayBuffer") return "ArrayBuffer score";
    if (source.type === "file") return source.value.name;
    return DEFAULT_LABEL;
  }, [source, sourceLabel]);

  return (
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      <style>{`
        :root {
          --at-panel-bg: rgba(241, 245, 249, 0.92);
          --at-panel-surface: rgba(248, 250, 252, 0.92);
          --at-panel-subtle-bg: rgba(148, 163, 184, 0.08);
          --at-border-color: rgba(15, 23, 42, 0.12);
          --at-text-primary: #0f172a;
          --at-text-secondary: #1e293b;
          --at-text-tertiary: #475569;
          --at-control-surface: rgba(15, 23, 42, 0.08);
          --at-control-text: #0f172a;
          --at-control-active-bg: rgba(59, 130, 246, 0.25);
          --at-control-active-text: #0f172a;
          --at-track-active-bg: rgba(59, 130, 246, 0.14);
          --at-track-hover-bg: rgba(15, 23, 42, 0.08);
          --at-track-active-icon: #1d4ed8;
          --at-overlay-bg: rgba(15, 23, 42, 0.55);
          --at-overlay-content-bg: rgba(15, 23, 42, 0.92);
          --at-overlay-text: #f8fafc;
          --at-badge-bg: rgba(59, 130, 246, 0.15);
          --at-badge-text: #1d4ed8;
          --at-accent: #38bdf8;
        }
        html.dark, [data-theme="dark"] {
          --at-panel-bg: rgba(15, 23, 42, 0.8);
          --at-panel-surface: rgba(17, 24, 39, 0.82);
          --at-panel-subtle-bg: rgba(30, 41, 59, 0.75);
          --at-border-color: rgba(148, 163, 184, 0.25);
          --at-text-primary: #e2e8f0;
          --at-text-secondary: #cbd5f5;
          --at-text-tertiary: #94a3b8;
          --at-control-surface: rgba(30, 41, 59, 0.82);
          --at-control-text: #e2e8f0;
          --at-control-active-bg: rgba(96, 165, 250, 0.32);
          --at-control-active-text: #0f172a;
          --at-track-active-bg: rgba(96, 165, 250, 0.22);
          --at-track-hover-bg: rgba(148, 163, 184, 0.16);
          --at-track-active-icon: #bfdbfe;
          --at-overlay-bg: rgba(15, 23, 42, 0.7);
          --at-overlay-content-bg: rgba(30, 41, 59, 0.95);
          --at-overlay-text: #f8fafc;
          --at-badge-bg: rgba(96, 165, 250, 0.25);
          --at-badge-text: #bfdbfe;
          --at-accent: #60a5fa;
        }
      `}</style>

      <header className="rounded-3xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-bg)] p-6 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--at-text-tertiary)]">
              alphaTab Toolkit
            </p>
            <h2 className="text-2xl font-bold text-[color:var(--at-text-primary)]">{heading}</h2>
            <p className="text-sm text-[color:var(--at-text-secondary)]">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            {allowUpload && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[color:var(--at-control-active-bg)] px-5 py-2 text-sm font-medium text-[color:var(--at-control-text)] shadow-sm transition hover:opacity-90">
                <UploadCloud className="h-4 w-4" />
                <span>Load GP File</span>
                <input
                  type="file"
                  accept=".gp,.gpx,.gp3,.gp4,.gp5,.gp6,.gp7"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => window.toggleTheme?.()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--at-panel-subtle-bg)] text-[color:var(--at-text-primary)] transition hover:opacity-90"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--at-panel-subtle-bg)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--at-text-tertiary)]">
          <FileMusic className="h-4 w-4" />
          <span className="font-semibold text-[color:var(--at-text-secondary)]">{displayName}</span>
        </div>
      </header>

      <AlphaTabPlayer source={source} isDarkMode={isDarkMode} soundFontUrl={soundFontUrl} />
    </div>
  );
};

export default AlphaTabApp;
