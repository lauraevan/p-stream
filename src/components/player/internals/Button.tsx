import classNames from "classnames";
import { forwardRef } from "react";

import { Icon, Icons } from "@/components/Icon";

export interface VideoPlayerButtonProps {
  children?: React.ReactNode;
  onClick?: (el: HTMLButtonElement) => void;
  icon?: Icons;
  iconSizeClass?: string;
  className?: string;
  activeClass?: string;
}

export const VideoPlayerButton = forwardRef<
  HTMLButtonElement,
  VideoPlayerButtonProps
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => props.onClick?.(e.currentTarget as HTMLButtonElement)}
      className={classNames([
        "tabbable group flex items-center gap-2 rounded-xl border border-transparent p-2.5 text-white/90 transition-[background-color,border-color,color,transform] duration-150 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95 active:bg-white/15",
        props.activeClass ?? "",
        props.className ?? "",
      ])}
    >
      {props.icon && (
        <Icon
          className={classNames([
            props.iconSizeClass || "text-xl",
            "transition-transform duration-150 group-hover:scale-105",
          ])}
          icon={props.icon}
        />
      )}
      {props.children}
    </button>
  );
});
