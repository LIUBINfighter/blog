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
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light"
  );
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
  const [sourceLabel, setSourceLabel] = useState<string>(
    initialSource?.label ?? DEFAULT_LABEL
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = localStorage.getItem("theme");
    const resolved = stored
      ? stored === "dark"
      : document.documentElement.getAttribute("data-theme") === "dark";
    setIsDarkMode(resolved);
  }, []);

  useEffect(() => {
    ensureThemeSync(isDarkMode);
  }, [isDarkMode]);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.toggleTheme = () => {
      const themeButton =
        document.querySelector<HTMLButtonElement>("#theme-btn");
      if (themeButton) {
        themeButton.click();
        return;
      }
      handleThemeToggle();
    };

    return () => {
      if (window.toggleTheme === undefined) return;
      if (window.toggleTheme === handleThemeToggle) {
        window.toggleTheme = undefined;
      }
    };
  }, [handleThemeToggle]);

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

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setSource({ type: "file", value: file });
      setSourceLabel(file.name);
    },
    []
  );

  const displayName = useMemo(() => {
    if (sourceLabel) return sourceLabel;
    if (source.type === "url") {
      try {
        const url = new URL(source.value);
        return decodeURIComponent(
          url.pathname.split("/").pop() || DEFAULT_LABEL
        );
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
    <div className={`flex flex-col gap-8 ${className ?? ""}`}>
      <style suppressHydrationWarning>{`
        :root {
          --at-panel-bg: color-mix(in srgb, var(--surface) 92%, transparent);
          --at-panel-surface: var(--surface-strong);
          --at-panel-subtle-bg: color-mix(in srgb, var(--surface-subtle) 100%, transparent);
          --at-border-color: color-mix(in srgb, var(--border) 78%, transparent);
          --at-text-primary: var(--text-primary);
          --at-text-secondary: var(--text-secondary);
          --at-text-tertiary: var(--text-tertiary);
          --at-control-surface: var(--control-surface);
          --at-control-text: var(--control-text);
          --at-control-active-bg: var(--control-active-bg);
          --at-control-active-text: var(--control-active-text);
          --at-track-active-bg: var(--track-active-bg);
          --at-track-hover-bg: var(--track-hover-bg);
          --at-track-active-icon: var(--track-active-icon);
          --at-overlay-bg: var(--overlay-bg);
          --at-overlay-content-bg: var(--overlay-content-bg);
          --at-overlay-text: var(--overlay-text);
          --at-badge-bg: var(--badge-bg);
          --at-badge-text: var(--badge-text);
          --at-accent: var(--accent-strong);
          --at-cursor-beat-width: 20vh;
          /* dedicated select capsule variables (light) */
          --at-select-surface: var(--surface-strong);
          --at-select-text: var(--control-text);
        }
        html.dark, [data-theme='dark'] {
          --at-panel-bg: color-mix(in srgb, var(--surface) 94%, transparent);
          --at-panel-surface: var(--surface-strong);
          --at-panel-subtle-bg: color-mix(in srgb, var(--surface-subtle) 100%, transparent);
          --at-border-color: color-mix(in srgb, var(--border) 82%, transparent);
          --at-text-primary: var(--text-primary);
          --at-text-secondary: var(--text-secondary);
          --at-text-tertiary: var(--text-tertiary);
          --at-control-surface: var(--control-surface);
          --at-control-text: var(--control-text);
          --at-control-active-bg: var(--control-active-bg);
          --at-control-active-text: var(--control-active-text);
          --at-track-active-bg: var(--track-active-bg);
          --at-track-hover-bg: var(--track-hover-bg);
          --at-track-active-icon: var(--track-active-icon);
          --at-overlay-bg: var(--overlay-bg);
          --at-overlay-content-bg: var(--overlay-content-bg);
          --at-overlay-text: var(--overlay-text);
          --at-badge-bg: var(--badge-bg);
          --at-badge-text: var(--badge-text);
          --at-accent: var(--accent-strong);
          --at-cursor-beat-width: 20vh;
          /* dedicated select capsule variables (dark) */
          --at-select-surface: var(--surface);
          --at-select-text: var(--control-text);
        }
      `}</style>

      <header className="rounded-[2.5rem] border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-bg)]/95 px-8 py-7 shadow-[0_28px_70px_-45px_color-mix(in_srgb,var(--border)_85%,transparent)] backdrop-blur-xl transition-colors">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.3em] text-[color:var(--at-text-tertiary)] uppercase">
              alphaTab Toolkit
            </p>
            <h2 className="text-2xl font-bold text-[color:var(--at-text-primary)]">
              {heading}
            </h2>
            <p className="text-sm text-[color:var(--at-text-secondary)]">
              {description}
            </p>
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
              id="theme-btn"
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--at-panel-subtle-bg)] text-[color:var(--at-text-primary)] transition hover:opacity-90"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--at-panel-subtle-bg)]/90 px-5 py-2.5 text-[0.7rem] tracking-[0.24em] text-[color:var(--at-text-tertiary)] uppercase">
          <FileMusic className="h-4 w-4" />
          <span className="font-semibold text-[color:var(--at-text-secondary)]">
            {displayName}
          </span>
        </div>
      </header>

      <AlphaTabPlayer
        source={source}
        isDarkMode={isDarkMode}
        soundFontUrl={soundFontUrl}
      />
    </div>
  );
};

export default AlphaTabApp;
