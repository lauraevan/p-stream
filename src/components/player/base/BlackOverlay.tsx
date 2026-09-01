import { Transition } from "@/components/utils/Transition";

export function BlackOverlay(props: { show?: boolean }) {
  return (
    <Transition
      animation="fade"
      show={props.show}
      className="pointer-events-none absolute inset-0 h-full w-full bg-black/10"
    />
  );
}
