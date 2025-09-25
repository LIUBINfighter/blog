import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Guitar,
  SkipBack,
  Play,
  Pause,
  Hourglass,
  Repeat,
  Printer,
  Search,
  Triangle as Metronome,
} from "lucide-react";

const ALPHATAB_CDN =
  "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js";
const DEFAULT_SOUNDFONT =
  "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2";

let alphaTabLoader: Promise<void> | null = null;

type AlphaTabEvent<T = unknown> = {
  on: (handler: (payload: T) => void) => void;
  off?: (handler: (payload: T) => void) => void;
};

type AlphaTabModelStyle = {
  colors: Map<number, unknown>;
};

type AlphaTabModel = {
  Color: { fromJson: (color: string) => unknown };
  ScoreStyle: new () => AlphaTabModelStyle;
  TrackStyle: new () => AlphaTabModelStyle;
  BarStyle: new () => AlphaTabModelStyle;
  VoiceStyle: new () => AlphaTabModelStyle;
  BeatStyle: new () => AlphaTabModelStyle;
  NoteStyle: new () => AlphaTabModelStyle;
  ScoreSubElement: Record<string, number>;
  TrackSubElement: Record<string, number>;
  BarSubElement: Record<string, number>;
  VoiceSubElement: Record<string, number>;
  BeatSubElement: Record<string, number>;
  NoteSubElement: Record<string, number>;
};

type AlphaTabNote = { style?: AlphaTabModelStyle | null };
type AlphaTabBeat = { style?: AlphaTabModelStyle | null; notes?: AlphaTabNote[] };
type AlphaTabVoice = { style?: AlphaTabModelStyle | null; beats?: AlphaTabBeat[] };
type AlphaTabBar = { style?: AlphaTabModelStyle | null; voices?: AlphaTabVoice[] };
type AlphaTabStaff = { bars?: AlphaTabBar[] };
type AlphaTabTrack = { index: number; name?: string; style?: AlphaTabModelStyle | null; staves?: AlphaTabStaff[] };
type AlphaTabScore = {
  title?: string;
  artist?: string;
  style?: AlphaTabModelStyle | null;
  tracks?: AlphaTabTrack[];
};

type AlphaTabGlobals = {
  AlphaTabApi: new (element: HTMLElement, options?: Record<string, unknown>) => AlphaTabApiInstance;
  LayoutMode: { Page: number; Horizontal: number };
  synth: { PlayerState: { Playing: number; Stopped: number; Paused: number } };
  model: AlphaTabModel;
};

type AlphaTabApiInstance = {
  load: (source: string | ArrayBuffer | Blob | File) => void;
  loadAlphaTex?: (source: string) => void;
  renderTracks: (tracks: AlphaTabTrack[]) => void;
  tracks: AlphaTabTrack[];
  render: () => void;
  destroy: () => void;
  updateSettings: () => void;
  settings: {
    player?: Record<string, unknown>;
    display?: { scale?: number; layoutMode?: number; stretchForce?: number } & Record<string, unknown>;
    [key: string]: unknown;
  };
  playerReady: AlphaTabEvent;
  renderStarted: AlphaTabEvent;
  renderFinished: AlphaTabEvent;
  soundFontLoad: AlphaTabEvent<{ loaded: number; total: number }>;
  scoreLoaded: AlphaTabEvent<AlphaTabScore>;
  playerStateChanged: AlphaTabEvent<{ state: number }>;
  playerPositionChanged: AlphaTabEvent<{ currentTime: number; endTime: number }>;
  playPause: () => void;
  stop: () => void;
  print: () => void;
  isLooping: boolean;
  metronomeVolume: number;
  countInVolume: number;
};

export type AlphaTabSource =
  | { type: "url"; value: string }
  | { type: "file"; value: File }
  | { type: "arrayBuffer"; value: ArrayBuffer }
  | { type: "alphaTex"; value: string };

declare global {
  interface Window {
    alphaTab?: AlphaTabGlobals;
  }
}

const loadAlphaTabRuntime = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("alphaTab runtime is only available in the browser"));
  }

  if (window.alphaTab) {
    return Promise.resolve();
  }

  if (!alphaTabLoader) {
    alphaTabLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src='${ALPHATAB_CDN}']`,
      );

      if (existing && window.alphaTab) {
        resolve();
        return;
      }

      const script = existing ?? document.createElement("script");
      script.src = ALPHATAB_CDN;
      script.async = true;
      script.defer = true;
      script.dataset.alphaTabLoader = "true";

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("无法加载 alphaTab.js 运行时"));

      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }

  return alphaTabLoader;
};

const suppressResizeObserverError = () => {
  if (typeof window === "undefined") return () => undefined;
  const resizeObserverLoopErr = "ResizeObserver loop completed with undelivered notifications";
  const originalError = window.console.error;
  window.console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith(resizeObserverLoopErr)) {
      return;
    }
    originalError.apply(window.console, args as [unknown, ...unknown[]]);
  };

  return () => {
    window.console.error = originalError;
  };
};

type AlphaTabPlayerProps = {
  source: AlphaTabSource;
  isDarkMode: boolean;
  className?: string;
  soundFontUrl?: string;
};

const AlphaTabPlayer: React.FC<AlphaTabPlayerProps> = ({
  source,
  isDarkMode,
  className,
  soundFontUrl,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<AlphaTabApiInstance | null>(null);
  const scoreRef = useRef<AlphaTabScore | null>(null);
  const playerStateEnumRef = useRef<AlphaTabGlobals["synth"]["PlayerState"] | null>(null);
  const layoutModeRef = useRef<AlphaTabGlobals["LayoutMode"] | null>(null);

  const [status, setStatus] = useState<"boot" | "loading" | "ready" | "error">("boot");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [runtimeReady, setRuntimeReady] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [soundFontProgress, setSoundFontProgress] = useState(0);
  const [scoreMeta, setScoreMeta] = useState<{ title?: string; artist?: string } | null>(null);
  const [activeTracks, setActiveTracks] = useState<Set<number>>(new Set());
  const [playerState, setPlayerState] = useState<number | null>(null);
  const [songPosition, setSongPosition] = useState<{ currentTime: number; endTime: number }>({
    currentTime: 0,
    endTime: 0,
  });
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [isCountInOn, setIsCountInOn] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [layoutMode, setLayoutMode] = useState<"page" | "horizontal">("page");

  useEffect(() => suppressResizeObserverError(), []);

  const formatDuration = useCallback((milliseconds: number) => {
    if (!Number.isFinite(milliseconds)) return "00:00";
    let seconds = Math.max(milliseconds / 1000, 0);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds - minutes * 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, []);

  const attachEvent = useCallback(<T,>(event: AlphaTabEvent<T>, handler: (payload: T) => void) => {
    event.on(handler);
    return () => {
      event.off?.(handler);
    };
  }, []);

  const applyScoreColors = useCallback((scoreToColor: AlphaTabScore | null, darkMode: boolean) => {
    const alphaTab = window.alphaTab;
    if (!alphaTab || !scoreToColor) return;

    const { model } = alphaTab;
    if (!model) return;

    const resetColors = (score: AlphaTabScore) => {
      score.style = null;
      for (const track of score.tracks ?? []) {
        track.style = null;
        for (const staff of track.staves ?? []) {
          for (const bar of staff.bars ?? []) {
            bar.style = null;
            for (const voice of bar.voices ?? []) {
              voice.style = null;
              for (const beat of voice.beats ?? []) {
                beat.style = null;
                for (const note of beat.notes ?? []) {
                  note.style = null;
                }
              }
            }
          }
        }
      }
    };

    if (!darkMode) {
      resetColors(scoreToColor);
      return;
    }

    const darkColor = model.Color.fromJson("#d1d5db");
    const secondaryDarkColor = model.Color.fromJson("#9ca3af");

    scoreToColor.style = new model.ScoreStyle();
    const scoreStyle = scoreToColor.style;
    if (!scoreStyle) return;
    const scorePrimaryElements = [
      model.ScoreSubElement.Title,
      model.ScoreSubElement.SubTitle,
      model.ScoreSubElement.ChordDiagramList,
    ];
    scorePrimaryElements.forEach((element: number) => scoreStyle.colors.set(element, darkColor));
    const scoreSecondaryElements = [
      model.ScoreSubElement.Artist,
      model.ScoreSubElement.Album,
      model.ScoreSubElement.Words,
      model.ScoreSubElement.Music,
      model.ScoreSubElement.WordsAndMusic,
      model.ScoreSubElement.Transcriber,
      model.ScoreSubElement.Copyright,
      model.ScoreSubElement.CopyrightSecondLine,
    ];
    scoreSecondaryElements.forEach((element: number) =>
      scoreStyle.colors.set(element, secondaryDarkColor),
    );

    for (const track of scoreToColor.tracks ?? []) {
      track.style = new model.TrackStyle();
      const trackStyle = track.style;
      if (!trackStyle) continue;
      [
        model.TrackSubElement.TrackName,
        model.TrackSubElement.BracesAndBrackets,
        model.TrackSubElement.SystemSeparator,
      ].forEach((element: number) => trackStyle.colors.set(element, darkColor));
      trackStyle.colors.set(model.TrackSubElement.StringTuning, secondaryDarkColor);

      for (const staff of track.staves ?? []) {
        for (const bar of staff.bars ?? []) {
          bar.style = new model.BarStyle();
          const barStyle = bar.style;
          if (!barStyle) continue;
          [
            model.BarSubElement.StandardNotationRepeats,
            model.BarSubElement.GuitarTabsRepeats,
            model.BarSubElement.SlashRepeats,
            model.BarSubElement.NumberedRepeats,
            model.BarSubElement.StandardNotationBarLines,
            model.BarSubElement.GuitarTabsBarLines,
            model.BarSubElement.SlashBarLines,
            model.BarSubElement.NumberedBarLines,
            model.BarSubElement.StandardNotationClef,
            model.BarSubElement.GuitarTabsClef,
            model.BarSubElement.StandardNotationKeySignature,
            model.BarSubElement.NumberedKeySignature,
            model.BarSubElement.StandardNotationTimeSignature,
            model.BarSubElement.GuitarTabsTimeSignature,
            model.BarSubElement.SlashTimeSignature,
            model.BarSubElement.NumberedTimeSignature,
            model.BarSubElement.StandardNotationStaffLine,
            model.BarSubElement.GuitarTabsStaffLine,
            model.BarSubElement.SlashStaffLine,
            model.BarSubElement.NumberedStaffLine,
            model.BarSubElement.StandardNotationBarNumber,
            model.BarSubElement.GuitarTabsBarNumber,
            model.BarSubElement.SlashBarNumber,
            model.BarSubElement.NumberedBarNumber,
          ].forEach((element: number) => barStyle.colors.set(element, darkColor));

          for (const voice of bar.voices ?? []) {
            voice.style = new model.VoiceStyle();
            const voiceStyle = voice.style;
            if (!voiceStyle) continue;
            voiceStyle.colors.set(model.VoiceSubElement.Glyphs, darkColor);

            for (const beat of voice.beats ?? []) {
              beat.style = new model.BeatStyle();
              const beatStyle = beat.style;
              if (!beatStyle) continue;
              [
                model.BeatSubElement.StandardNotationStem,
                model.BeatSubElement.GuitarTabStem,
                model.BeatSubElement.SlashStem,
                model.BeatSubElement.StandardNotationFlags,
                model.BeatSubElement.GuitarTabFlags,
                model.BeatSubElement.SlashFlags,
                model.BeatSubElement.StandardNotationBeams,
                model.BeatSubElement.GuitarTabBeams,
                model.BeatSubElement.SlashBeams,
                model.BeatSubElement.StandardNotationTuplet,
                model.BeatSubElement.GuitarTabTuplet,
                model.BeatSubElement.SlashTuplet,
                model.BeatSubElement.NumberedTuplet,
                model.BeatSubElement.StandardNotationRests,
                model.BeatSubElement.GuitarTabRests,
                model.BeatSubElement.SlashRests,
                model.BeatSubElement.NumberedRests,
                model.BeatSubElement.Effects,
                model.BeatSubElement.StandardNotationEffects,
                model.BeatSubElement.GuitarTabEffects,
                model.BeatSubElement.SlashEffects,
                model.BeatSubElement.NumberedEffects,
                model.BeatSubElement.NumberedDuration,
              ].forEach((element: number) => beatStyle.colors.set(element, darkColor));

              for (const note of beat.notes ?? []) {
                note.style = new model.NoteStyle();
                const noteStyle = note.style;
                if (!noteStyle) continue;
                [
                  model.NoteSubElement.StandardNotationNoteHead,
                  model.NoteSubElement.SlashNoteHead,
                  model.NoteSubElement.GuitarTabFretNumber,
                  model.NoteSubElement.NumberedNumber,
                  model.NoteSubElement.StandardNotationAccidentals,
                  model.NoteSubElement.NumberedAccidentals,
                  model.NoteSubElement.Effects,
                  model.NoteSubElement.StandardNotationEffects,
                  model.NoteSubElement.GuitarTabEffects,
                  model.NoteSubElement.SlashEffects,
                  model.NoteSubElement.NumberedEffects,
                ].forEach((element: number) => noteStyle.colors.set(element, darkColor));
              }
            }
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = containerRef.current;
    if (!root) return;
    root.dataset.theme = isDarkMode ? "dark" : "light";
    if (scoreRef.current) {
      applyScoreColors(scoreRef.current, isDarkMode);
      apiRef.current?.render();
    }
  }, [applyScoreColors, isDarkMode]);

  const loadSourceDescriptor = useCallback(async (descriptor: AlphaTabSource) => {
    const api = apiRef.current;
    if (!api) return;

    switch (descriptor.type) {
      case "url":
        api.load(descriptor.value);
        break;
      case "file": {
        const buffer = await descriptor.value.arrayBuffer();
        api.load(buffer);
        break;
      }
      case "arrayBuffer":
        api.load(descriptor.value);
        break;
      case "alphaTex":
        if (typeof api.loadAlphaTex === "function") {
          api.loadAlphaTex(descriptor.value);
        } else {
          api.load(descriptor.value);
        }
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!mainRef.current || !viewportRef.current) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    loadAlphaTabRuntime()
      .then(() => {
        if (cancelled) return;

        if (!window.alphaTab) {
          throw new Error("alphaTab.js 运行时不可用");
        }

        const alphaTab = window.alphaTab;
        playerStateEnumRef.current = alphaTab.synth?.PlayerState ?? null;
        layoutModeRef.current = alphaTab.LayoutMode ?? null;

        const host = mainRef.current;
        if (!host) {
          throw new Error("未找到 alphaTab 容器");
        }

        const settings = {
          player: {
            enablePlayer: true,
            soundFont: soundFontUrl ?? DEFAULT_SOUNDFONT,
            scrollElement: viewportRef.current ?? undefined,
          },
          display: {
            layoutMode: alphaTab.LayoutMode?.Page,
            stretchForce: 0.9,
          },
        };

        const api = new alphaTab.AlphaTabApi(host, settings) as AlphaTabApiInstance;
        apiRef.current = api;
        setRuntimeReady(true);

        const detachments: Array<() => void> = [];

        detachments.push(
          attachEvent(api.renderStarted, () => {
            setIsLoading(true);
          }),
        );

        detachments.push(
          attachEvent(api.renderFinished, () => {
            setIsLoading(false);
            setStatus("ready");
            if (api.tracks?.length) {
              const active = new Set<number>(api.tracks.map(track => track.index));
              setActiveTracks(active);
            }
          }),
        );

        detachments.push(
          attachEvent(api.soundFontLoad, ({ loaded, total }) => {
            if (total) {
              setSoundFontProgress(Math.round((loaded / total) * 100));
            }
          }),
        );

        detachments.push(
          attachEvent(api.playerReady, () => {
            setIsPlayerReady(true);
            setStatus("ready");
            setIsLooping(api.isLooping);
            setIsMetronomeOn(api.metronomeVolume > 0);
            setIsCountInOn(api.countInVolume > 0);
            const display = api.settings.display ?? {};
            if (typeof display.scale === "number") {
              setZoom(Math.round(display.scale * 100));
            }
            if (display.layoutMode === layoutModeRef.current?.Horizontal) {
              setLayoutMode("horizontal");
            } else {
              setLayoutMode("page");
            }
          }),
        );

        detachments.push(
          attachEvent(api.scoreLoaded, score => {
            scoreRef.current = score;
            setScoreMeta({ title: score?.title, artist: score?.artist });
            applyScoreColors(score, isDarkMode);
            const tracks = score?.tracks ?? [];
            if (tracks.length) {
              const indices = new Set<number>(tracks.map(track => track.index));
              setActiveTracks(indices);
              api.renderTracks(tracks);
            }
          }),
        );

        detachments.push(
          attachEvent(api.playerStateChanged, ({ state }) => {
            setPlayerState(state);
          }),
        );

        detachments.push(
          attachEvent(api.playerPositionChanged, ({ currentTime, endTime }) => {
            setSongPosition({ currentTime, endTime });
          }),
        );

        loadSourceDescriptor(source).catch(error => {
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setStatus("error");
        });

        return () => {
          detachments.forEach(detach => detach());
          api.destroy();
        };
      })
      .catch(error => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      apiRef.current?.destroy();
      apiRef.current = null;
      scoreRef.current = null;
      setRuntimeReady(false);
      setIsPlayerReady(false);
      setActiveTracks(new Set());
    };
  }, [attachEvent, isDarkMode, loadSourceDescriptor, soundFontUrl, source]);

  useEffect(() => {
    if (!runtimeReady || !apiRef.current) return;
    setStatus("loading");
    loadSourceDescriptor(source).catch(error => {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus("error");
    });
  }, [loadSourceDescriptor, runtimeReady, source]);

  const handleTrackClick = useCallback((track: AlphaTabTrack) => {
    if (!apiRef.current) return;
    apiRef.current.renderTracks([track]);
    setActiveTracks(new Set([track.index]));
  }, []);

  const handlePlayPause = useCallback(() => apiRef.current?.playPause(), []);
  const handleStop = useCallback(() => apiRef.current?.stop(), []);
  const handlePrint = useCallback(() => apiRef.current?.print(), []);

  const toggleLoop = useCallback(() => {
    if (!apiRef.current) return;
    const next = !isLooping;
    apiRef.current.isLooping = next;
    setIsLooping(next);
  }, [isLooping]);

  const toggleMetronome = useCallback(() => {
    if (!apiRef.current) return;
    const next = !isMetronomeOn;
    apiRef.current.metronomeVolume = next ? 1 : 0;
    setIsMetronomeOn(next);
  }, [isMetronomeOn]);

  const toggleCountIn = useCallback(() => {
    if (!apiRef.current) return;
    const next = !isCountInOn;
    apiRef.current.countInVolume = next ? 1 : 0;
    setIsCountInOn(next);
  }, [isCountInOn]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!apiRef.current) return;
    const zoomValue = Number(event.target.value);
    if (!Number.isFinite(zoomValue)) return;
    setZoom(zoomValue);
    const display = apiRef.current.settings.display ?? (apiRef.current.settings.display = {});
    display.scale = zoomValue / 100;
    apiRef.current.updateSettings();
    apiRef.current.render();
  }, []);

  const handleLayoutChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!apiRef.current) return;
    const mode = event.target.value as "page" | "horizontal";
    setLayoutMode(mode);
    const display = apiRef.current.settings.display ?? (apiRef.current.settings.display = {});
    const layoutModes = layoutModeRef.current;
    if (layoutModes) {
      display.layoutMode = mode === "horizontal" ? layoutModes.Horizontal : layoutModes.Page;
    }
    apiRef.current.updateSettings();
    apiRef.current.render();
  }, []);

  const playerStateEnum = playerStateEnumRef.current;
  const isPlaying = playerStateEnum ? playerState === playerStateEnum.Playing : false;
  const controlsDisabled = !isPlayerReady || status === "error";

  const scoreTitle = useMemo(() => {
    if (!scoreMeta) return "";
    return [scoreMeta.title, scoreMeta.artist].filter(Boolean).join(" — ");
  }, [scoreMeta]);

  return (
    <div
      ref={containerRef}
      data-alphatab-root
      data-theme={isDarkMode ? "dark" : "light"}
      className={`relative flex w-full flex-col gap-4 rounded-3xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-bg)] p-4 shadow-xl shadow-slate-900/10 transition-colors duration-300 backdrop-blur ${
        className ?? ""
      }`}
    >
      <style>{`
        [data-alphatab-root] .at-cursor-bar {
          background: rgba(255, 242, 0, 0.25) !important;
        }
        [data-alphatab-root] .at-selection div {
          background: color-mix(in srgb, var(--at-accent) 20%, transparent) !important;
        }
        [data-alphatab-root] .at-cursor-beat {
          background: color-mix(in srgb, var(--at-accent) 80%, transparent) !important;
          width: 3px !important;
        }
        [data-alphatab-root][data-theme="dark"] .at-cursor-bar {
          background: color-mix(in srgb, var(--at-accent) 35%, transparent) !important;
        }
        [data-alphatab-root][data-theme="dark"] .at-selection div {
          background: color-mix(in srgb, var(--at-accent) 24%, transparent) !important;
        }
        [data-alphatab-root][data-theme="dark"] .at-cursor-beat {
          background: color-mix(in srgb, var(--at-accent) 85%, transparent) !important;
        }
        [data-alphatab-root] .at-highlight,
        [data-alphatab-root] .at-highlight * {
          fill: var(--at-accent) !important;
          stroke: var(--at-accent) !important;
        }
      `}</style>

      {status === "error" ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          {errorMessage || "加载 alphaTab 时出现未知错误。"}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <aside className="order-2 w-full shrink-0 md:order-1 md:w-52">
              <div className="rounded-2xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-subtle-bg)] p-3">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--at-text-tertiary)]">
                  <Guitar className="h-3.5 w-3.5" />
                  Tracks
                </p>
                <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1 text-sm">
                  {scoreRef.current?.tracks?.length ? (
                    (scoreRef.current.tracks as AlphaTabTrack[]).map(track => {
                      const isActive = activeTracks.has(track.index);
                      return (
                        <li key={track.index}>
                          <button
                            type="button"
                            onClick={() => handleTrackClick(track)}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left transition-colors ${
                              isActive
                                ? "bg-[color:var(--at-track-active-bg)] text-[color:var(--at-track-active-icon)]"
                                : "hover:bg-[color:var(--at-track-hover-bg)] text-[color:var(--at-text-secondary)]"
                            }`}
                          >
                            <Guitar className={`mr-3 h-4 w-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
                            <span className="truncate text-sm font-medium">{track.name || `Track ${track.index + 1}`}</span>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="rounded-lg border border-dashed border-[color:var(--at-border-color)] p-3 text-xs text-[color:var(--at-text-tertiary)]">
                      曲谱载入后可切换不同的乐器/分声部。
                    </li>
                  )}
                </ul>
              </div>
            </aside>

            <section className="order-1 flex-1 md:order-2">
              <div
                ref={viewportRef}
                className="relative flex max-h-[70vh] min-h-[320px] flex-col overflow-y-auto rounded-3xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-surface, transparent)]"
              >
                <div ref={mainRef} className="at-main" />
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--at-border-color)] bg-[color:var(--at-control-surface)] px-3 py-2 text-[color:var(--at-control-text)]">
            <div className="flex flex-col gap-2 text-sm text-[color:var(--at-text-tertiary)] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-[color:var(--at-text-tertiary)]">
                <span className="rounded-full bg-[color:var(--at-badge-bg)] px-3 py-1 text-[color:var(--at-badge-text)]">
                  {isPlayerReady ? "Ready" : `Loading ${soundFontProgress}%`}
                </span>
                {scoreTitle && (
                  <span className="font-medium tracking-[0.2em] text-[color:var(--at-text-secondary)]">
                    {scoreTitle}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-[color:var(--at-text-secondary)]">
                {formatDuration(songPosition.currentTime)} / {formatDuration(songPosition.endTime)}
              </span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={controlsDisabled}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Stop"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  disabled={controlsDisabled}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--at-accent)] text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
                <div className="hidden text-sm text-[color:var(--at-text-secondary)] md:block">
                  {scoreMeta?.title ?? "未命名曲谱"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={toggleCountIn}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isCountInOn ? "bg-[color:var(--at-control-active-bg)] text-[color:var(--at-control-active-text)]" : "hover:bg-[color:var(--at-track-hover-bg)]"
                  }`}
                  aria-label="Toggle count-in"
                >
                  <Hourglass className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleMetronome}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isMetronomeOn ? "bg-[color:var(--at-control-active-bg)] text-[color:var(--at-control-active-text)]" : "hover:bg-[color:var(--at-track-hover-bg)]"
                  }`}
                  aria-label="Toggle metronome"
                >
                  <Metronome className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleLoop}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isLooping ? "bg-[color:var(--at-control-active-bg)] text-[color:var(--at-control-active-text)]" : "hover:bg-[color:var(--at-track-hover-bg)]"
                  }`}
                  aria-label="Toggle loop"
                >
                  <Repeat className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[color:var(--at-track-hover-bg)]"
                  aria-label="Print score"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <div className="flex items-center rounded-full border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-subtle-bg)] px-2">
                  <Search className="mr-1 hidden h-4 w-4 opacity-70 lg:block" />
                  <select
                    value={zoom}
                    onChange={handleZoomChange}
                    className="bg-transparent py-1 text-sm focus:outline-none"
                    aria-label="Zoom"
                  >
                    {[25, 50, 75, 90, 100, 110, 125, 150, 200].map(level => (
                      <option key={level} value={level}>
                        {level}%
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center rounded-full border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-subtle-bg)] px-2">
                  <select
                    value={layoutMode}
                    onChange={handleLayoutChange}
                    className="bg-transparent py-1 text-sm focus:outline-none"
                    aria-label="Layout mode"
                  >
                    <option value="page">Page</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isLoading && status !== "error" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-[color:var(--at-overlay-bg)] pt-10 backdrop-blur-sm">
          <div className="rounded-2xl border border-[color:var(--at-border-color)] bg-[color:var(--at-overlay-content-bg)] px-6 py-4 text-sm text-[color:var(--at-overlay-text)] shadow-xl">
            乐谱载入中… {soundFontProgress ? `${soundFontProgress}%` : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlphaTabPlayer;
