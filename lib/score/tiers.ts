export type ScoreTier = "diamond" | "gold" | "silver" | "bronze" | "cold";
export type ActivityStatus = "ativa" | "dormente" | "perdida";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 80) return "diamond";
  if (score >= 60) return "gold";
  if (score >= 40) return "silver";
  if (score >= 20) return "bronze";
  return "cold";
}

export const TIER_LABELS: Record<ScoreTier, string> = {
  diamond: "Diamond",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  cold: "Cold",
};

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  ativa: "Ativa",
  dormente: "Dormente",
  perdida: "Perdida",
};

export const TIER_STYLES: Record<ScoreTier, { bg: string; color: string }> = {
  diamond: { bg: "#c0dd97", color: "#173404" },
  gold:    { bg: "#fac775", color: "#412402" },
  silver:  { bg: "#f7d6a3", color: "#4a3018" },
  bronze:  { bg: "#f5c4b3", color: "#4a1b0c" },
  cold:    { bg: "#e8c3b8", color: "#4a1f15" },
};

export const PERDIDA_STYLE = { bg: "#d3d1c7", color: "#2c2c2a" };
