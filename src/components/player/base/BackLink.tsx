import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Icon, Icons } from "@/components/Icon";

export function BackLink(props: { url: string }) {
  const { t } = useTranslation();
  const label = t("player.back.default");

  return (
    <Link
      to={props.url}
      aria-label={label}
      title={label}
      className="tabbable flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-white/80 backdrop-blur-xl transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-white active:scale-95"
    >
      <Icon className="text-lg" icon={Icons.ARROW_LEFT} />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
