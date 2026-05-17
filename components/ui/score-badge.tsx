import { cn } from "@/lib/utils";
import {
  getScoreTier,
  TIER_STYLES,
  PERDIDA_STYLE,
  TIER_LABELS,
  STATUS_LABELS,
  type ActivityStatus,
} from "@/lib/score/tiers";

interface ScoreBadgeProps {
  score: number;
  status?: ActivityStatus;
  breakdown?: Record<string, unknown> | null;
  className?: string;
}

function buildTooltip(
  score: number,
  status: ActivityStatus,
  breakdown: Record<string, unknown> | null | undefined
): string {
  const tier = getScoreTier(score);
  let txt = `Score ${score} · ${TIER_LABELS[tier]} · ${STATUS_LABELS[status]}`;
  if (breakdown && typeof breakdown === "object") {
    const b = breakdown as Record<string, number>;
    txt += `\n\nComposição:\n• Valor (30%):       ${b.valor ?? "–"}/100\n• Frequência (25%):  ${b.frequencia ?? "–"}/100\n• Engajamento (20%): ${b.engajamento ?? "–"}/100\n• Aderência (15%):   ${b.aderencia ?? "–"}/100\n• Maturidade (10%):  ${b.maturidade ?? "–"}/100`;
  }
  return txt;
}

export function ScoreBadge({
  score,
  status = "ativa",
  breakdown,
  className,
}: ScoreBadgeProps) {
  const tier = getScoreTier(score);
  const style = status === "perdida" ? PERDIDA_STYLE : TIER_STYLES[tier];
  const opacity = status === "dormente" ? 0.45 : 1;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[32px] h-[26px] px-[7px]",
        "text-[10px] font-bold tracking-[0.08em] rounded-xl shrink-0",
        "transition-transform hover:scale-105 cursor-help",
        className
      )}
      style={{ background: style.bg, color: style.color, opacity }}
      title={buildTooltip(score, status, breakdown)}
    >
      {score}
    </span>
  );
}
