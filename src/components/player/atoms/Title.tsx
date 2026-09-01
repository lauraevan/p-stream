import { useEffect, useState } from "react";

import { usePlayerStore } from "@/stores/player/store";
import { formatSeconds } from "@/utils/formatSeconds";

export function Title() {
  const title = usePlayerStore((s) => s.meta?.title);
  const { time } = usePlayerStore((s) => s.progress);
  const [isShifting, setIsShifting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShifting(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setIsShifting(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleTitleClick = () => {
    const baseLink = window.location.href;
    const timeStamp = formatSeconds(time, time >= 3600);

    if (isShifting) {
      navigator.clipboard
        .writeText(`${baseLink}?t=${timeStamp}`)
        .then(() => {});
    } else {
      navigator.clipboard.writeText(baseLink).then(() => {});
    }
  };

  return (
    <button
      type="button"
      onClick={handleTitleClick}
      className="min-w-0 max-w-[55vw] truncate text-left text-sm font-medium tracking-[-0.01em] text-white transition-colors duration-150 hover:text-white/75 sm:max-w-[42vw] sm:text-base"
      title={isShifting ? "Copy with current time" : "Copy link"}
    >
      {title}
    </button>
  );
}
