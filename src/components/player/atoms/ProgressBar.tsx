import {
  MouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSkipTime } from "@/components/player/hooks/useSkipTime";
import { useProgressBar } from "@/hooks/useProgressBar";
import { nearestImageAt } from "@/stores/player/slices/thumbnails";
import { usePlayerStore } from "@/stores/player/store";
import { durationExceedsHour, formatSeconds } from "@/utils/formatSeconds";

const SEGMENT_COLORS: Record<
  "intro" | "recap" | "credits" | "preview",
  string
> = {
  intro: "rgba(99, 102, 241, 0.75)",
  recap: "rgba(245, 158, 11, 0.75)",
  credits: "rgba(34, 197, 94, 0.75)",
  preview: "rgba(234, 179, 8, 0.75)",
};

function ThumbnailDisplay(props: { at: number; show: boolean }) {
  const thumbnailImages = usePlayerStore((s) => s.thumbnails.images);
  const currentThumbnail = useMemo(() => {
    return nearestImageAt(thumbnailImages, props.at)?.image;
  }, [thumbnailImages, props.at]);
  const [offsets, setOffsets] = useState({
    offscreenLeft: 0,
    offscreenRight: 0,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const padding = 32;
    const left = Math.max(0, (rect.left - padding) * -1);
    const right = Math.max(0, rect.right + padding - window.innerWidth);

    setOffsets({
      offscreenLeft: left,
      offscreenRight: right,
    });
  }, [props.at]);

  const formattedTime = useMemo(
    () => formatSeconds(Math.max(props.at, 0), durationExceedsHour(props.at)),
    [props.at],
  );
  const transformX =
    offsets.offscreenLeft > 0 ? offsets.offscreenLeft : -offsets.offscreenRight;

  if (!props.show) return null;

  return (
    <div className="pointer-events-none flex -translate-x-1/2 flex-col items-center">
      <div className="flex w-screen justify-center">
        <div ref={ref}>
          <div
            style={{
              transform: `translateX(${transformX}px)`,
            }}
          >
            {currentThumbnail && (
              <img
                src={currentThumbnail.data}
                className="no-fade h-24 rounded-xl border border-white/10 bg-black/80 object-cover shadow-2xl"
              />
            )}
            <p className="mx-auto mt-1.5 w-max rounded-lg border border-white/10 bg-black/80 px-2.5 py-1 text-center text-xs font-medium text-white/90 shadow-lg backdrop-blur-xl">
              {formattedTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function useMouseHoverPosition(barRef: RefObject<HTMLDivElement>) {
  const [mousePos, setMousePos] = useState(-1);

  const mouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = (e.pageX - rect.left) / barRef.current.offsetWidth;
      setMousePos(pos * 100);
    },
    [setMousePos, barRef],
  );

  const mouseLeave = useCallback(() => {
    setMousePos(-1);
  }, [setMousePos]);

  return { mousePos, mouseMove, mouseLeave };
}

export function ProgressBar() {
  const { duration, time, buffered } = usePlayerStore((s) => s.progress);
  const display = usePlayerStore((s) => s.display);
  const setDraggingTime = usePlayerStore((s) => s.setDraggingTime);
  const setSeeking = usePlayerStore((s) => s.setSeeking);
  const { isSeeking } = usePlayerStore((s) => s.interface);
  const segments = useSkipTime();

  const segmentRanges = useMemo(() => {
    if (duration <= 0) return [];
    return segments
      .map((seg) => {
        const startSec = (seg.start_ms ?? 0) / 1000;
        const endSec = seg.end_ms != null ? seg.end_ms / 1000 : duration;
        if (startSec >= endSec) return null;
        const left = (startSec / duration) * 100;
        const width = ((endSec - startSec) / duration) * 100;
        return {
          key: `${seg.type}-${seg.submission_count}-${seg.start_ms ?? "null"}`,
          left,
          width,
          color: SEGMENT_COLORS[seg.type],
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [segments, duration]);

  const commitTime = useCallback(
    (percentage: number) => {
      display?.setTime(percentage * duration);
    },
    [duration, display],
  );

  const ref = useRef<HTMLDivElement>(null);
  const { mouseMove, mouseLeave, mousePos } = useMouseHoverPosition(ref);

  const { dragging, dragPercentage, dragMouseDown } = useProgressBar(
    ref,
    commitTime,
  );
  useEffect(() => {
    setSeeking(dragging);
  }, [setSeeking, dragging]);

  useEffect(() => {
    setDraggingTime((dragPercentage / 100) * duration);
  }, [setDraggingTime, duration, dragPercentage]);

  return (
    <div className="relative w-full" dir="ltr">
      <div className="absolute inset-x-0 top-0">
        <div
          className="absolute bottom-0"
          style={{
            left: `${mousePos}%`,
          }}
        >
          <ThumbnailDisplay
            at={Math.floor((mousePos / 100) * duration)}
            show={mousePos > -1}
          />
        </div>
      </div>

      <div className="w-full" ref={ref}>
        <div
          className="group flex h-6 w-full cursor-pointer items-center"
          onMouseDown={dragMouseDown}
          onTouchStart={dragMouseDown}
          onMouseLeave={mouseLeave}
          onMouseMove={mouseMove}
        >
          <div
            className={[
              "relative h-[3px] w-full rounded-full bg-white/20 transition-[height] duration-150 group-hover:h-[5px]",
              dragging ? "!h-[5px]" : "",
            ].join(" ")}
          >
            {segmentRanges.map((range) => (
              <div
                key={range.key}
                className="pointer-events-none absolute bottom-0 top-0 rounded-full"
                style={{
                  left: `${range.left}%`,
                  width: `${range.width}%`,
                  backgroundColor: range.color,
                }}
              />
            ))}
            <div
              className="absolute left-0 top-0 flex h-full items-center justify-end rounded-full bg-white/25"
              style={{
                width: `${(buffered / duration) * 100}%`,
              }}
            />

            <div
              className="absolute top-0 flex h-full items-center justify-end rounded-full bg-progress-filled dir-neutral:left-0"
              style={{
                width: `${
                  Math.max(
                    0,
                    Math.min(
                      1,
                      dragging ? dragPercentage / 100 : time / duration,
                    ),
                  ) * 100
                }%`,
              }}
            >
              <div
                className={[
                  "h-2.5 min-h-2.5 w-2.5 min-w-2.5 translate-x-1/2 scale-0 rounded-full bg-white shadow transition-transform duration-150 group-hover:scale-100",
                  isSeeking ? "scale-100" : "",
                ].join(" ")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
