import { useEffect } from "react";

import { Transition } from "@/components/utils/Transition";
import { usePlayerStore } from "@/stores/player/store";

export function BottomControls(props: {
  show?: boolean;
  children: React.ReactNode;
}) {
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
      <div
        onMouseOver={() => setHoveringAnyControls(true)}
        onMouseOut={() => setHoveringAnyControls(false)}
        className="pointer-events-auto absolute bottom-0 z-20 w-full px-[calc(0.75rem+env(safe-area-inset-left))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] pr-[calc(0.75rem+env(safe-area-inset-right))] sm:px-[calc(1.25rem+env(safe-area-inset-left))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pr-[calc(1.25rem+env(safe-area-inset-right))]"
      >
        <Transition animation="slide-up" show={props.show}>
          {props.children}
        </Transition>
      </div>
    </div>
  );
}
