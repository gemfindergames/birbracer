"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useRace } from "@/hooks/useRace";
import { CarGrid } from "@/components/cars/CarGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCarById } from "@/lib/cars";

export default function LobbyPage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { race, loading, connected } = useRace({ raceId });

  useEffect(() => {
    if (!race) return;
    if (race.status === "RACING" || race.status === "COUNTDOWN") router.push(`/race/${raceId}`);
    if (race.status === "FINISHED") router.push(`/results/${raceId}`);
    if (race.status === "ARCHIVED") router.push("/");
  }, [race?.status, raceId, router]);

  useEffect(() => {
    if (!user || !race) return;
    const isIn = race.participants.some((p) => p.userId === user.id);
    if (!isIn && (race.status === "LOBBY" || race.status === "CAR_SELECT")) {
      fetch(`/api/races/${raceId}/join`, { method: "POST" });
    }
  }, [user, race, raceId]);

  if (authLoading || loading) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;
  if (!user) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4"><div className="card text-center max-w-sm"><span className="text-4xl mb-4 block">🔒</span><p className="text-surface-500 mb-4">{t("auth.need.login")}</p><Link href="/login"><Button variant="primary">{t("nav.login")}</Button></Link></div></div>;
  if (!race) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4"><div className="card text-center max-w-sm"><span className="text-4xl mb-4 block">🏎️</span><p className="text-surface-500 mb-4">{t("lobby.race.not.found")}</p><Link href="/"><Button variant="secondary">{t("results.back")}</Button></Link></div></div>;

  const showCarSelect = race.status === "CAR_SELECT" || race.status === "LOBBY";
  const readyCount = race.participants.filter((p) => p.carId).length;
  const allReady = readyCount === race.participants.length && race.participants.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏁</span>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white">{race.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={race.status === "CAR_SELECT" ? "brand" : "yellow"} pulse>
                {race.status === "CAR_SELECT" ? `🚗 ${t("status.picking.cars")}` : `⏳ ${t("status.waiting")}`}
              </Badge>
              {connected && <Badge variant="green" pulse>{t("status.connected")}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-white/80 text-sm">
              <div className="font-bold text-white text-lg">{race.participants.length}/{race.maxPlayers}</div>
              <div>{t("lobby.players.joined")}</div>
            </div>
            <Link href="/"><Button variant="ghost" size="sm" className="!text-white/70 hover:!text-white">← {t("common.back")}</Button></Link>
          </div>
        </div>
        <div className="relative z-10 mt-5">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
            <span>{readyCount} {t("lobby.of.ready")} {race.participants.length} {t("lobby.ready.word")}</span>
            {allReady && <span className="text-emerald-300 font-bold animate-pulse">{t("lobby.all.set")}</span>}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500" style={{ width: race.participants.length > 0 ? `${(readyCount / race.participants.length) * 100}%` : "0%" }} />
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-display font-bold text-lg mb-5 flex items-center gap-2"><span>🏎️</span> {t("lobby.race.lineup")}</h2>
        {race.participants.length === 0 ? (
          <div className="text-center py-10 text-surface-500">
            <div className="text-4xl mb-3 animate-pulse">🏁</div>
            <p className="text-lg font-medium">{t("lobby.waiting")}</p>
            <p className="text-sm text-surface-400 mt-1">{t("lobby.share.link")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {race.participants.map((p, idx) => {
              const car = p.carId ? getCarById(p.carId) : null;
              const isReady = !!p.carId;
              return (
                <div key={p.userId} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 animate-slide-up ${isReady ? "bg-gradient-to-r from-brand-500/5 to-transparent border border-brand-500/15" : "bg-surface-50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-800"}`} style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center font-display font-bold text-sm text-surface-500">{idx + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xl flex-shrink-0 ring-2 ring-surface-200 dark:ring-surface-700">
                    {p.avatarImage ? <img src={p.avatarImage} alt="" className="w-full h-full rounded-full object-cover" /> : (p.avatarEmoji || "🐦")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{p.username}</div>
                    {car && <div className="flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: car.accentColor }} /><span className="text-[11px] text-surface-500">{car.name}</span></div>}
                  </div>
                  {car && <div className="w-20 h-10 flex-shrink-0 hidden sm:block"><img src={car.imagePath} alt={car.name} className="w-full h-full object-contain" /></div>}
                  <div className="flex-shrink-0">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        {t("lobby.ready")}
                      </span>
                    ) : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">{t("lobby.picking")}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCarSelect && <div className="card"><CarGrid raceId={raceId} /></div>}
    </div>
  );
}
