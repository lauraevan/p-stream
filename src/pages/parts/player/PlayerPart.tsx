import { ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Player } from "@/components/player";
import { SkipSegmentButton } from "@/components/player/atoms/SkipSegmentButton";
import { ThumbsFeedback } from "@/components/player/atoms/ThumbsFeedback";
import { WatchPartyStatus } from "@/components/player/atoms/WatchPartyStatus";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import {
  SegmentData,
  useSkipTime,
} from "@/components/player/hooks/useSkipTime";
import { PauseOverlay } from "@/components/player/overlays/PauseOverlay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useWatchPartyStore } from "@/stores/watchParty";

import { ScrapingPartInterruptButton, Tips } from "./ScrapingPart";

export interface PlayerPartProps {
  children?: ReactNode;
  backUrl: string;
  onLoad?: () => void;
  onMetaChange?: (meta: PlayerMeta) => void;
}

export function PlayerPart(props: PlayerPartProps) {
  const { showTargets, showTouchTargets } = useShouldShowControls();
  const status = usePlayerStore((s) => s.status);
  const { isMobile } = useIsMobile();
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );
  const isLoading = usePlayerStore((s) => s.mediaPlaying.isLoading);
  const { isHost, enabled } = useWatchPartyStore();
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);

  const inControl = !enabled || isHost;
  const isPlaying = status === playerStatus.PLAYING;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;

  const [isShifting, setIsShifting] = useState(false);
  const [isHoldingFullscreen, setIsHoldingFullscreen] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Shift") {
      setIsShifting(true);
    }
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift") {
      setIsShifting(false);
    }
  });

  const handleTouchStart = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(true);
    }, 100);
  };

  const handleTouchEnd = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHoldingFullscreen(false);
    }, 1000);
  };

  const [thumbsFeedbackData, setThumbsFeedbackData] = useState<{
    segment: SegmentData;
    skipTime: number;
  } | null>(null);

  const segments = useSkipTime();

  const handleSkipTriggered = useCallback(
    (segment: SegmentData, skipTime: number) => {
      setThumbsFeedbackData({ segment, skipTime });
    },
    [],
  );

  const handleThumbsFeedback = useCallback(() => {
    setThumbsFeedbackData(null);
  }, []);

  return (
    <Player.Container onLoad={props.onLoad} showingControls={showTargets}>
      {props.children}
      <PauseOverlay />
      <Player.BlackOverlay show={showTargets && isPlaying} />
      <Player.EpisodesRouter onChange={props.onMetaChange} />
      <Player.SettingsRouter />
      <Player.SubtitleView controlsShown={showTargets} />

      {isPlaying ? (
        <Player.CenterControls>
          <Player.LoadingSpinner />
          <Player.AutoPlayStart />
          <Player.CastingNotification />
        </Player.CenterControls>
      ) : null}

      <Player.CenterMobileControls
        className="text-white"
        show={showTouchTargets && isPlaying}
      >
        <Player.SkipBackward iconSizeClass="text-3xl" inControl={inControl} />
        <Player.Pause
          iconSizeClass="text-5xl"
          className={isLoading ? "opacity-0" : "opacity-100"}
        />
        <Player.SkipForward iconSizeClass="text-3xl" inControl={inControl} />
      </Player.CenterMobileControls>

      <div
        className={`absolute right-4 z-50 transition-all duration-300 ease-in-out ${
          showTargets ? "top-20" : "top-2"
        }`}
      >
        <WatchPartyStatus />
      </div>

      <Player.TopControls show={showTargets}>
        <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-1.5 pr-3 shadow-2xl backdrop-blur-xl">
            <Player.BackLink url={props.backUrl} />
            <div className="flex min-w-0 items-center gap-2">
              <Player.Title />
              {meta?.type === "show" ? (
                <span className="hidden shrink-0 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold tracking-wide text-white/70 sm:inline-flex">
                  {t("media.episodeDisplay", {
                    season: meta?.season?.number,
                    episode: meta?.episode?.number,
                  })}
                </span>
              ) : null}
            </div>
            <div className="ml-1 hidden items-center gap-0.5 border-l border-white/10 pl-1 sm:flex">
              <Player.InfoButton />
              <Player.BookmarkButton />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="flex sm:hidden">
              <Player.InfoButton />
              <Player.BookmarkButton />
            </div>
            <div className="hidden max-w-[28vw] items-center px-2 text-sm text-white/70 xl:flex">
              <Player.EpisodeTitle />
            </div>
            {isMobile && isPlaying ? (
              <>
                <Player.Airplay />
                <Player.Chromecast />
              </>
            ) : null}
          </div>
        </div>
      </Player.TopControls>

      <Player.BottomControls show={showTargets}>
        <div className="mx-auto w-full max-w-[1600px]">
          {status !== playerStatus.PLAYING && !manualSourceSelection ? (
            <div className="rounded-2xl border border-white/10 bg-black/65 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <Tips />
              {status === playerStatus.SCRAPING ? (
                <div className="mt-2 flex justify-center">
                  <ScrapingPartInterruptButton />
                </div>
              ) : null}
            </div>
          ) : null}

          {isPlaying ? (
            <div className="rounded-2xl border border-white/10 bg-black/65 px-2.5 pb-2 pt-1.5 shadow-2xl backdrop-blur-xl sm:px-3 sm:pb-2.5 sm:pt-2">
              <div className="px-1 sm:px-1.5">
                <Player.ProgressBar />
              </div>

              <div className="flex min-h-10 items-center justify-between gap-1" dir="ltr">
                <div className="hidden items-center gap-0.5 lg:flex">
                  <Player.Pause />
                  <Player.SkipBackward inControl={inControl} />
                  <Player.SkipForward inControl={inControl} />
                  <div className="mx-1 h-5 w-px bg-white/10" />
                  <Player.Volume />
                  <div className="px-1 text-sm text-white/70">
                    <Player.Time />
                  </div>
                </div>

                <div className="flex items-center px-1 text-xs text-white/70 lg:hidden">
                  <Player.Time short />
                </div>

                <div className="flex min-w-0 items-center justify-end gap-0.5">
                  <Player.Episodes inControl={inControl} />
                  <Player.SkipEpisodeButton
                    inControl={inControl}
                    onChange={props.onMetaChange}
                  />
                  <div className="hidden sm:flex">
                    {!(isPWA && isIOS) ? <Player.Pip /> : null}
                  </div>
                  <div className="hidden md:flex">
                    <Player.Airplay />
                    <Player.Chromecast />
                  </div>
                  <Player.Captions />
                  <Player.Settings />
                  <div className="mx-0.5 h-5 w-px bg-white/10" />
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="select-none touch-none"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {isShifting || isHoldingFullscreen ? (
                      <Player.Widescreen />
                    ) : (
                      <Player.Fullscreen />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Player.BottomControls>

      <Player.VolumeChangedPopout />
      <Player.SubtitleDelayPopout />
      <Player.SpeedChangedPopout />
      <Player.TIDBSubmissionSuccessPopout />
      <Player.UnreleasedEpisodeOverlay />

      <Player.NextEpisodeButton
        controlsShowing={showTargets}
        onChange={props.onMetaChange}
        inControl={inControl}
      />

      <SkipSegmentButton
        controlsShowing={showTargets}
        segments={segments}
        inControl={inControl}
        onChangeMeta={props.onMetaChange}
        onSkipTriggered={handleSkipTriggered}
      />

      <ThumbsFeedback
        controlsShowing={showTargets}
        feedbackData={thumbsFeedbackData}
        onAction={handleThumbsFeedback}
      />
    </Player.Container>
  );
}
