"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RANK_TIERS } from "@/lib/ranks";

interface LeaderboardEntry {
  userId: string; username: string; avatarEmoji: string | null; avatarImage: string | null;
  wins: number; podiums: number; totalRaces: number; bestTime: number | null;
  rankId: string; rankName: string; rankEmoji: string; rankColor: string;
}

export default function LeaderboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-8">
        <span className="text-4xl sm:text-5xl block mb-2">🏆</span>
        <h1 className="font-display font-black text-2xl sm:text-4xl mb-2">{t("results.leaderboard")}</h1>
        <p className="text-surface-500 text-sm">{t("app.multiplayer")}</p>
      </div>

      {/* Rank tiers legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
        {RANK_TIERS.slice(1).map((tier) => (
          <div key={tier.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tier.color}15`, color: tier.color }}>
            <span>{tier.emoji}</span>
            <span>{tier.name}</span>
            <span className="text-[10px] opacity-60">{tier.minWins}+</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-surface-500">{t("common.loading")}</div>
      ) : data.length === 0 ? (
        <Card className="text-center py-12">
          <span className="text-4xl block mb-3">🏁</span>
          <p className="text-surface-500">{t("profile.no.races")}</p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_60px_60px_70px] sm:grid-cols-[50px_1fr_70px_70px_70px_80px] gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800 text-[10px] sm:text-xs font-bold text-surface-500 uppercase tracking-wider">
            <div>#</div>
            <div>{t("results.player")}</div>
            <div className="text-center">{t("profile.wins")}</div>
            <div className="text-center hidden sm:block">🥇🥈🥉</div>
            <div className="text-center">Races</div>
            <div className="text-right hidden sm:block">{t("profile.best.time")}</div>
          </div>

          {data.map((entry, idx) => (
            <div
              key={entry.userId}
              className={`grid grid-cols-[40px_1fr_60px_60px_70px] sm:grid-cols-[50px_1fr_70px_70px_70px_80px] gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 items-center text-sm transition-colors ${
                idx < 3 ? "bg-brand-500/3 dark:bg-brand-500/5" : idx % 2 === 0 ? "" : "bg-surface-50/50 dark:bg-surface-800/20"
              }`}
            >
              {/* Position */}
              <div className={`font-display font-bold text-base ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-500" : "text-surface-400"}`}>
                {idx + 1}
              </div>

              {/* Player + rank */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-lg flex-shrink-0">
                  {entry.avatarImage ? <img src={entry.avatarImage} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover" /> : (entry.avatarEmoji || "🐦")}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-xs sm:text-sm truncate">{entry.username}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{entry.rankEmoji}</span>
                    <span className="text-[10px] font-semibold" style={{ color: entry.rankColor }}>{entry.rankName}</span>
                  </div>
                </div>
              </div>

              {/* Wins */}
              <div className="text-center font-bold" style={{ color: entry.rankColor }}>{entry.wins}</div>

              {/* Podiums */}
              <div className="text-center text-surface-400 hidden sm:block">{entry.podiums}</div>

              {/* Races */}
              <div className="text-center text-surface-400 text-xs">{entry.totalRaces}</div>

              {/* Best time */}
              <div className="text-right font-mono text-xs text-surface-400 hidden sm:block">
                {entry.bestTime ? `${entry.bestTime.toFixed(2)}s` : "—"}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="text-center mt-8">
        <Link href="/"><Button variant="secondary">← {t("results.back")}</Button></Link>
      </div>
    </div>
  );
}
