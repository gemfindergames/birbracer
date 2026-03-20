// ─────────────────────────────────────────────
// BirbRacer — Player Ranking Tiers
// ─────────────────────────────────────────────

export interface RankTier {
  id: string;
  name: string;
  emoji: string;
  color: string;
  minWins: number;
}

export const RANK_TIERS: RankTier[] = [
  { id: "unranked", name: "Unranked",  emoji: "🥚", color: "#94a3b8", minWins: 0 },
  { id: "bronze",   name: "Bronze",    emoji: "🥉", color: "#CD7F32", minWins: 1 },
  { id: "silver",   name: "Silver",    emoji: "🥈", color: "#C0C0C0", minWins: 3 },
  { id: "gold",     name: "Gold",      emoji: "🥇", color: "#FFD700", minWins: 7 },
  { id: "diamond",  name: "Diamond",   emoji: "💎", color: "#45B7D1", minWins: 15 },
  { id: "champion", name: "Champion",  emoji: "👑", color: "#FF6B6B", minWins: 30 },
];

export function getRankByWins(wins: number): RankTier {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (wins >= tier.minWins) rank = tier;
  }
  return rank;
}

export function getNextRank(wins: number): RankTier | null {
  const current = getRankByWins(wins);
  const idx = RANK_TIERS.indexOf(current);
  return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getWinsToNextRank(wins: number): number | null {
  const next = getNextRank(wins);
  return next ? next.minWins - wins : null;
}
