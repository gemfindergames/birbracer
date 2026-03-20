"use client";

import React from "react";
import { useI18n } from "@/context/I18nContext";
import { RaceResultPublic } from "@/types";
import { getCarById } from "@/lib/cars";

interface LeaderboardProps { results: RaceResultPublic[]; }

export function Leaderboard({ results }: LeaderboardProps) {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
        <span>📊</span>{t("results.leaderboard")}
      </h2>
      <div className="card !p-0 overflow-hidden">
        <div className="grid grid-cols-[50px_1fr_1fr_80px] sm:grid-cols-[60px_1fr_1fr_100px] gap-2 px-4 py-3 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800 text-xs font-semibold text-surface-500 uppercase tracking-wider">
          <div>#</div>
          <div>{t("results.player")}</div>
          <div>{t("results.car")}</div>
          <div className="text-right">{t("results.time")}</div>
        </div>
        {results.map((result, idx) => {
          const car = getCarById(result.carId);
          const accent = car?.accentColor || "#3b6cf5";
          const isTop3 = result.position <= 3;

          return (
            <div
              key={result.userId}
              className={`grid grid-cols-[50px_1fr_1fr_80px] sm:grid-cols-[60px_1fr_1fr_100px] gap-2 px-4 py-3 items-center transition-colors duration-200 ${
                isTop3 ? "bg-brand-500/5 dark:bg-brand-500/5" : idx % 2 === 0 ? "" : "bg-surface-50/50 dark:bg-surface-800/20"
              }`}
            >
              <div className="flex items-center">
                <span className={`font-display font-bold text-lg ${
                  result.position === 1 ? "text-yellow-500" : result.position === 2 ? "text-gray-400" : result.position === 3 ? "text-orange-500" : "text-surface-400"
                }`}>
                  #{result.position}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                {/* Color badge */}
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-lg flex-shrink-0">
                  {result.avatarImage ? (
                    <img src={result.avatarImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (result.avatarEmoji || "🐦")}
                </span>
                <span className={`text-sm truncate ${isTop3 ? "font-bold" : "font-semibold"}`}>{result.username}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                {car && <img src={car.imagePath} alt={car.name} className="w-10 h-5 object-contain flex-shrink-0" />}
                <span className="text-xs text-surface-500 truncate">{car?.name || result.carId}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold">
                  {result.finishTime.toFixed(2)}<span className="text-surface-400 text-xs">s</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
