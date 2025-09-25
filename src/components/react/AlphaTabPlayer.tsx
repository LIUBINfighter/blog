import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type AlphaTabModelStyle = { colors: Map<number, unknown> };

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
type AlphaTabTrack = {
  index: number;
  name?: string;
  style?: AlphaTabModelStyle | null;
  staves?: AlphaTabStaff[];
};
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
  renderTracks?: (tracks: Array<number | AlphaTabTrack>) => void;
  tracks: AlphaTabTrack[];
  render: () => void;
  destroy: () => void;
  updateSettings: () => void;
  settings: {
    player?: Record<string, unknown>;
    display?: { scale?: number; layoutMode?: number } & Record<string, unknown>;
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

const applyScoreColors = (scoreToColor: AlphaTabScore | null, darkMode: boolean) => {
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

  [
    model.ScoreSubElement.Title,
    model.ScoreSubElement.SubTitle,
    model.ScoreSubElement.ChordDiagramList,
  ].forEach(element => scoreStyle.colors.set(element, darkColor));

  [
    model.ScoreSubElement.Artist,
    model.ScoreSubElement.Album,
    model.ScoreSubElement.Words,
    model.ScoreSubElement.Music,
    model.ScoreSubElement.WordsAndMusic,
    model.ScoreSubElement.Transcriber,
    model.ScoreSubElement.Copyright,
    model.ScoreSubElement.CopyrightSecondLine,
  ].forEach(element => scoreStyle.colors.set(element, secondaryDarkColor));

  for (const track of scoreToColor.tracks ?? []) {
    track.style = new model.TrackStyle();
    const trackStyle = track.style;
    if (!trackStyle) continue;

    [
      model.TrackSubElement.TrackName,
      model.TrackSubElement.BracesAndBrackets,
      model.TrackSubElement.SystemSeparator,
    ].forEach(element => trackStyle.colors.set(element, darkColor));
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
        ].forEach(element => barStyle.colors.set(element, darkColor));

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
            ].forEach(element => beatStyle.colors.set(element, darkColor));

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
              ].forEach(element => noteStyle.colors.set(element, darkColor));
            }
          }
        }
      }
    }
  }
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
  const layoutModeEnumRef = useRef<AlphaTabGlobals["LayoutMode"] | null>(null);
  const darkModeRef = useRef(isDarkMode);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [soundFontProgress, setSoundFontProgress] = useState(0);
  const [playerState, setPlayerState] = useState<number | null>(null);
  const [songPosition, setSongPosition] = useState({ currentTime: 0, endTime: 0 });
  const [score, setScore] = useState<AlphaTabScore | null>(null);
  const [activeTracks, setActiveTracks] = useState<Set<number>>(new Set());
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [isCountInOn, setIsCountInOn] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [layoutMode, setLayoutMode] = useState<"page" | "horizontal">("page");
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const formatDuration = useCallback((milliseconds: number) => {
    if (!Number.isFinite(milliseconds)) return "00:00";
    const totalSeconds = Math.max(milliseconds / 1000, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, []);

  const registerEvent = useCallback(<T,>(event: AlphaTabEvent<T>, handler: (payload: T) => void) => {
    event.on(handler);
    return () => event.off?.(handler);
  }, []);

  const loadSource = useCallback(
    async (descriptor: AlphaTabSource, explicitApi?: AlphaTabApiInstance | null) => {
      const api = explicitApi ?? apiRef.current;
      if (!api) return;

      setIsLoading(true);
      setSoundFontProgress(0);

      switch (descriptor.type) {
        case "url":
          api.load(descriptor.value);
          break;
        case "file":
          api.load(await descriptor.value.arrayBuffer());
          break;
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
    },
    [],
  );

  useEffect(() => {
    darkModeRef.current = isDarkMode;
    const container = containerRef.current;
    if (container) {
      container.dataset.theme = isDarkMode ? "dark" : "light";
    }
    if (scoreRef.current) {
      applyScoreColors(scoreRef.current, isDarkMode);
      apiRef.current?.render();
    }
  }, [isDarkMode]);

  useEffect(() => {
    let disposed = false;
    if (!mainRef.current || !viewportRef.current) return;

    setError(null);
    setIsLoading(true);

    loadAlphaTabRuntime()
      .then(() => {
        if (disposed) return;
        if (!window.alphaTab || !mainRef.current) {
          throw new Error("alphaTab.js 运行时不可用");
        }

        const alphaTab = window.alphaTab;
        playerStateEnumRef.current = alphaTab.synth?.PlayerState ?? null;
        layoutModeEnumRef.current = alphaTab.LayoutMode ?? null;

        const api = new alphaTab.AlphaTabApi(mainRef.current, {
          player: {
            enablePlayer: true,
            soundFont: soundFontUrl ?? DEFAULT_SOUNDFONT,
            scrollElement: viewportRef.current ?? undefined,
          },
          display: {
            layoutMode: alphaTab.LayoutMode?.Page,
            stretchForce: 0.9,
          },
        }) as AlphaTabApiInstance;

        apiRef.current = api;

        const detachments: Array<() => void> = [];

        detachments.push(
          registerEvent(api.renderStarted, () => {
            setIsLoading(true);
            const renderedTracks = new Set<number>();
            if (Array.isArray(api.tracks)) {
              api.tracks.forEach(track => {
                renderedTracks.add(track.index);
              });
            }
            setActiveTracks(renderedTracks);
          }),
        );

        detachments.push(
          registerEvent(api.renderFinished, () => {
            setIsLoading(false);
          }),
        );

        detachments.push(
          registerEvent(api.soundFontLoad, ({ loaded, total }) => {
            if (!total) return;
            setSoundFontProgress(Math.round((loaded / total) * 100));
          }),
        );

        detachments.push(
          registerEvent(api.playerReady, () => {
            setIsPlayerReady(true);
            setIsLooping(api.isLooping);
            setIsMetronomeOn(api.metronomeVolume > 0);
            setIsCountInOn(api.countInVolume > 0);

            const display = api.settings.display ?? {};
            if (typeof display.scale === "number") {
              setZoom(Math.round(display.scale * 100));
            }

            if (
              layoutModeEnumRef.current &&
              display.layoutMode === layoutModeEnumRef.current.Horizontal
            ) {
              setLayoutMode("horizontal");
            } else {
              setLayoutMode("page");
            }
          }),
        );

        detachments.push(
          registerEvent(api.scoreLoaded, incomingScore => {
            scoreRef.current = incomingScore;
            setScore(incomingScore);

            applyScoreColors(incomingScore, darkModeRef.current);
          }),
        );

        detachments.push(
          registerEvent(api.playerStateChanged, ({ state }) => {
            setPlayerState(state);
          }),
        );

        detachments.push(
          registerEvent(api.playerPositionChanged, payload => {
            setSongPosition(payload);
          }),
        );

        void loadSource(source, api).catch(err => {
          setError(err instanceof Error ? err.message : String(err));
        });

        return () => {
          detachments.forEach(detach => detach());
          api.destroy();
        };
      })
      .catch(err => {
        if (disposed) return;
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });

    return () => {
      disposed = true;
      apiRef.current?.destroy();
      apiRef.current = null;
      scoreRef.current = null;
    };
  }, [loadSource, registerEvent, soundFontUrl]);

  useEffect(() => {
    if (!apiRef.current) return;
    void loadSource(source).catch(err => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [loadSource, source]);

  // Track dialog: close on ESC and restore focus
  useEffect(() => {
    if (!isTrackDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTrackDialogOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isTrackDialogOpen]);

  const openTrackDialog = useCallback(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setIsTrackDialogOpen(true);
  }, []);

  const closeTrackDialog = useCallback(() => {
    setIsTrackDialogOpen(false);
    // restore focus to the last focused trigger
    const last = lastFocusedRef.current;
    if (last && typeof last.focus === "function") {
      last.focus();
    }
  }, []);

  const handleTrackClick = useCallback((track: AlphaTabTrack) => {
    const api = apiRef.current;
    if (!api) return;
    const renderTracks = typeof api.renderTracks === "function" ? api.renderTracks.bind(api) : null;
    if (!renderTracks) return;

    setActiveTracks(prev => {
      const isActive = prev.has(track.index);
      if (isActive && prev.size <= 1) {
        return prev;
      }

      const next = new Set(prev);
      if (isActive) {
        next.delete(track.index);
      } else {
        next.add(track.index);
      }

      const availableTracks = Array.isArray(api.tracks) ? api.tracks : [];
      const resolvedTracks = Array.from(next)
        .map(index => {
          return (
            availableTracks.find(t => t.index === index) ??
            scoreRef.current?.tracks?.find(t => t.index === index) ??
            null
          );
        })
        .filter((item): item is AlphaTabTrack => Boolean(item));

      if (resolvedTracks.length > 0) {
        renderTracks(resolvedTracks);
      }

      return next;
    });
  }, []);

  const handlePlayPause = useCallback(() => {
    apiRef.current?.playPause();
  }, []);

  const handleStop = useCallback(() => {
    apiRef.current?.stop();
  }, []);

  const handlePrint = useCallback(() => {
    apiRef.current?.print();
  }, []);

  const toggleLoop = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const next = !isLooping;
    api.isLooping = next;
    setIsLooping(next);
  }, [isLooping]);

  const toggleMetronome = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const next = !isMetronomeOn;
    api.metronomeVolume = next ? 1 : 0;
    setIsMetronomeOn(next);
  }, [isMetronomeOn]);

  const toggleCountIn = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const next = !isCountInOn;
    api.countInVolume = next ? 1 : 0;
    setIsCountInOn(next);
  }, [isCountInOn]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const api = apiRef.current;
    if (!api) return;
    const zoomValue = Number(event.target.value);
    if (!Number.isFinite(zoomValue)) return;
    setZoom(zoomValue);

    const display = api.settings.display ?? (api.settings.display = {});
    display.scale = zoomValue / 100;
    api.updateSettings();
    api.render();
  }, []);

  const handleLayoutChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const api = apiRef.current;
    if (!api) return;
    const mode = event.target.value as "page" | "horizontal";
    setLayoutMode(mode);

    const display = api.settings.display ?? (api.settings.display = {});
    const layouts = layoutModeEnumRef.current;
    if (layouts) {
      display.layoutMode = mode === "horizontal" ? layouts.Horizontal : layouts.Page;
    }
    api.updateSettings();
    api.render();
  }, []);

  const playerStateEnum = playerStateEnumRef.current;
  const isPlaying = playerStateEnum ? playerState === playerStateEnum.Playing : false;
  const controlsDisabled = !isPlayerReady || Boolean(error);

  const scoreTitle = useMemo(() => {
    if (!score) return "";
    return [score.title, score.artist].filter(Boolean).join(" — ");
  }, [score]);

  return (
    <div
      ref={containerRef}
      data-alphatab-root
      data-theme={isDarkMode ? "dark" : "light"}
      className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-bg)] shadow-xl shadow-slate-900/10 backdrop-blur ${
        className ?? ""
      }`}
    >
      <style suppressHydrationWarning>{`
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
        [data-alphatab-root][data-theme='dark'] .at-cursor-bar {
          background: color-mix(in srgb, var(--at-accent) 35%, transparent) !important;
        }
        [data-alphatab-root][data-theme='dark'] .at-selection div {
          background: color-mix(in srgb, var(--at-accent) 24%, transparent) !important;
        }
        [data-alphatab-root][data-theme='dark'] .at-cursor-beat {
          background: color-mix(in srgb, var(--at-accent) 85%, transparent) !important;
        }
        [data-alphatab-root] .at-highlight,
        [data-alphatab-root] .at-highlight * {
          fill: var(--at-accent) !important;
          stroke: var(--at-accent) !important;
        }
      `}</style>

      {error ? (
        <div className="m-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
          {error}
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="relative flex flex-col">
              <div
                ref={viewportRef}
                className="relative h-[420px] overflow-y-auto"
              >
                <div ref={mainRef} className="w-full" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--at-border-color)] bg-[color:var(--at-control-surface)] px-3 py-2 text-[color:var(--at-control-text)]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Tracks button (will open modal in next step) */}
              <button
                type="button"
                onClick={openTrackDialog}
                disabled={!score?.tracks?.length}
                className="flex h-10 w-10 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[color:var(--at-track-hover-bg)]"
                aria-label="Toggle track list"
              >
                <Guitar className="h-4 w-4" />
              </button>
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
              <div className="text-sm text-[color:var(--at-text-secondary)]">
                {scoreTitle || "未命名曲谱"}
              </div>
              {!isPlayerReady && (
                <span className="text-xs text-[color:var(--at-text-tertiary)]">
                  {soundFontProgress}%
                </span>
              )}
              <span className="font-mono text-xs text-[color:var(--at-text-secondary)]">
                {formatDuration(songPosition.currentTime)} / {formatDuration(songPosition.endTime)}
              </span>
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
        </>
      )}

      {isLoading && !error && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-[color:var(--at-overlay-bg)] pt-10 backdrop-blur-sm">
          <div className="rounded-2xl border border-[color:var(--at-border-color)] bg-[color:var(--at-overlay-content-bg)] px-6 py-4 text-sm text-[color:var(--at-overlay-text)] shadow-xl">
            乐谱载入中… {soundFontProgress ? `${soundFontProgress}%` : ""}
          </div>
        </div>
      )}

      {/* Track selection modal (always available, above content) */}
      {isTrackDialogOpen && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          aria-hidden={false}
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close tracks dialog"
            className="absolute inset-0 bg-[color:var(--at-overlay-bg)]"
            onClick={closeTrackDialog}
          />
          {/* dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="at-tracks-title"
            className="relative z-10 max-h-[calc(100%-48px)] max-w-[calc(100%-48px)] overflow-hidden rounded-2xl border border-[color:var(--at-border-color)] bg-[color:var(--at-panel-subtle-bg)] shadow-xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--at-border-color)] px-4 py-3">
              <p id="at-tracks-title" className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--at-text-tertiary)]">
                Tracks
              </p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-medium text-[color:var(--at-text-secondary)] transition hover:bg-[color:var(--at-track-hover-bg)]"
                onClick={closeTrackDialog}
              >
                收起
              </button>
            </div>
            <div className="max-h-[min(360px,calc(100vh-120px))] overflow-y-auto p-3">
              <ul className="flex flex-col gap-1 pr-1 text-sm">
                {score?.tracks?.length ? (
                  score.tracks.map(track => {
                    const isActive = activeTracks.has(track.index);
                    return (
                      <li key={track.index}>
                        <button
                          type="button"
                          onClick={() => handleTrackClick(track)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                            isActive
                              ? "bg-[color:var(--at-track-active-bg)] text-[color:var(--at-track-active-icon)]"
                              : "hover:bg-[color:var(--at-track-hover-bg)] text-[color:var(--at-text-secondary)]"
                          }`}
                          autoFocus={isActive}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center ${isActive ? "text-[color:var(--at-track-active-icon)]" : "opacity-60"}`}>
                            <Guitar size={18} />
                          </span>
                          <span className="truncate">{track.name || `Track ${track.index + 1}`}</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AlphaTabPlayer;
