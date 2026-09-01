import { useEffect } from "react";

import { Transition } from "@/components/utils/Transition";
import { useBannerSize } from "@/stores/banner";
import { BannerLocation } from "@/stores/banner/BannerLocation";
import { usePlayerStore } from "@/stores/player/store";

export function TopControls(props: {
  show?: boolean;
  children: React.ReactNode;
}) {
  const bannerSize = useBannerSize("player");
  const setHoveringAnyControls = usePlayerStore(
    (s) => s.setHoveringAnyControls,
  );

  useEffect(() => {
    return () => {
      setHoveringAnyControls(false);
    };
  }, [setHoveringAnyControls]);

  return (
    <div className="w-full text-white">
      <div className="relative z-10">
        <BannerLocation location="player" />
      </div>
      <div
        onMouseOver={() => setHoveringAnyControls(true)}
        onMouseOut={() => setHoveringAnyControls(false)}
        className="pointer-events-auto absolute top-0 z-20 w-full px-[calc(0.75rem+env(safe-area-inset-left))] pt-[calc(0.75rem+env(safe-area-inset-top))] pr-[calc(0.75rem+env(safe-area-inset-right))] sm:px-[calc(1.25rem+env(safe-area-inset-left))] sm:pr-[calc(1.25rem+env(safe-area-inset-right))] sm:pt-[calc(1.25rem+env(safe-area-inset-top))]"
        style={{
          top: `${bannerSize}px`,
        }}
      >
        <Transition
          animation="slide-down"
          show={props.show}
          className="top-content text-white"
        >
          {props.children}
        </Transition>
      </div>
    </div>
  );
}
