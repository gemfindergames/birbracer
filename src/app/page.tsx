"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RacePublic } from "@/types";
import { getTrackById } from "@/lib/tracks";
import { getAllCars } from "@/lib/cars";

const cars = getAllCars();

// ─── Floating Particles Background ───
function ParticlesBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            bottom: `-10px`,
            background: `rgba(99, 102, 241, ${0.15 + Math.random() * 0.2})`,
            animation: `float-particle ${12 + Math.random() * 18}s linear infinite`,
            animationDelay: `${Math.random() * 15}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Car Carousel ───
function CarCarousel() {
  const { t } = useI18n();
  return (
    <div className="mb-10 sm:mb-14">
      <h3 className="text-center text-xs sm:text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">{t("home.car.carousel")}</h3>
      <div className="overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-surface-50 dark:from-surface-950 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-surface-50 dark:from-surface-950 to-transparent z-10" />
        <div className="flex animate-scroll-cars" style={{ width: "fit-content" }}>
          {[...cars, ...cars].map((car, i) => (
            <div key={`${car.id}-${i}`} className="flex-shrink-0 w-28 sm:w-36 mx-2 sm:mx-3 group">
              <div className="h-14 sm:h-18 flex items-center justify-center">
                <img src={car.imagePath} alt={car.name} className="h-full w-auto object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" draggable={false} />
              </div>
              <p className="text-[9px] sm:text-[10px] text-center text-surface-400 font-semibold mt-1 truncate">{car.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scheduled Race Countdown ───
function ScheduledCountdown({ scheduledAt, name, raceId }: { scheduledAt: string; name: string; raceId: string }) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    }
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [scheduledAt]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)" }} />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⏰</span>
          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{t("schedule.next.race")}</span>
        </div>
        <h3 className="font-display font-black text-xl sm:text-2xl text-white mb-3">{name}</h3>
        {!expired ? (
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            {[
              { val: timeLeft.h, label: t("schedule.hours") },
              { val: timeLeft.m, label: t("schedule.minutes") },
              { val: timeLeft.s, label: t("schedule.seconds") },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="bg-black/20 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-mono font-black text-2xl sm:text-3xl text-white tabular-nums min-w-[52px] sm:min-w-[64px]" style={{ animation: "countdown-flip 0.3s ease" }}>
                  {String(val).padStart(2, "0")}
                </div>
                <span className="text-[10px] sm:text-xs text-white/60 font-medium mt-1 block">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white font-bold animate-pulse">{t("race.countdown.starting")}</p>
        )}
        <Link href={`/lobby/${raceId}`}>
          <button className="px-4 py-2 rounded-xl text-sm font-bold bg-white text-amber-600 hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-black/10 btn-squish">{t("home.join")}</button>
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton Loaders ───
function RaceCardSkeleton() {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:w-28 h-16 sm:h-20 skeleton rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 skeleton" />
          <div className="h-3 w-1/3 skeleton" />
          <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full skeleton" />)}</div>
        </div>
        <div className="h-9 w-20 skeleton rounded-xl" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [races, setRaces] = useState<RacePublic[]>([]);
  const [loading, setLoading] = useState(true);

  const statusLabel = (s: string) => ({ LOBBY: t("status.waiting"), CAR_SELECT: t("status.picking.cars"), COUNTDOWN: t("status.starting"), RACING: t("status.racing"), FINISHED: t("status.finished") }[s] || s);
  const statusVariant = (s: string): "brand" | "green" | "red" | "yellow" => { if (s === "RACING") return "red"; if (s === "FINISHED") return "green"; if (s === "CAR_SELECT" || s === "COUNTDOWN") return "brand"; return "yellow"; };

  const fetchRaces = useCallback(async () => {
    try { const res = await fetch("/api/races"); if (res.ok) { const data = await res.json(); setRaces(data.data || []); } } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRaces(); const i = setInterval(fetchRaces, 5000); return () => clearInterval(i); }, [fetchRaces]);
  useEffect(() => { const check = () => { fetch("/api/scheduler").catch(() => {}); }; check(); const i = setInterval(check, 10000); return () => clearInterval(i); }, []);

  async function handleJoin(raceId: string) {
    if (!user) { router.push("/login"); return; }
    try {
      const res = await fetch(`/api/races/${raceId}/join`, { method: "POST" });
      // Always redirect to lobby whether join succeeded or already joined
      router.push(`/lobby/${raceId}`);
    } catch {
      // Even on error, try navigating to lobby (they might already be in)
      router.push(`/lobby/${raceId}`);
    }
  }

  function getRaceLink(race: RacePublic) {
    if (race.status === "FINISHED") return `/results/${race.id}`;
    if (race.status === "RACING" || race.status === "COUNTDOWN") return `/race/${race.id}`;
    return `/lobby/${race.id}`;
  }

  const liveRaces = races.filter((r) => r.status === "RACING" || r.status === "COUNTDOWN");
  const scheduledRaces = races.filter((r) => (r as any).scheduledAt && (r.status === "LOBBY" || r.status === "CAR_SELECT"));

  return (
    <div className="relative min-h-screen">
      <ParticlesBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        {/* ─── Scheduled Race Countdown ─── */}
        {scheduledRaces.map((race) => (
          <div key={race.id} className="mb-6">{(race as any).scheduledAt && <ScheduledCountdown scheduledAt={(race as any).scheduledAt} name={race.name} raceId={race.id} />}</div>
        ))}

        {/* ─── Live Race Banner ─── */}
        {liveRaces.length > 0 && (
          <div className="mb-6 sm:mb-8 space-y-2">
            {liveRaces.map((race) => (
              <div key={race.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-red-500 p-3 sm:p-4 animate-fade-in shadow-lg shadow-red-500/20">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)" }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" /></span>
                    <span className="font-display font-bold text-white text-sm sm:text-base truncate">🏎️ {race.name} — {t("race.live")}!</span>
                    <span className="text-white/60 text-xs hidden sm:inline">{race.participants.length} {t("home.players")}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/watch/${race.id}`}><button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition-all btn-squish">👁️ {t("admin.watch")}</button></Link>
                    <Link href={getRaceLink(race)}><button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-red-600 hover:bg-white/90 transition-all btn-squish">{t("home.join")}</button></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Hero ─── */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs sm:text-sm font-semibold mb-4 sm:mb-6 animate-badge-pop">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" /></span>
            {t("app.multiplayer")}
          </div>
          <h1 className="font-display font-black text-3xl sm:text-6xl lg:text-7xl mb-3 sm:mb-4 tracking-tight animate-fade-in">
            <span className="text-shimmer bg-gradient-to-r from-surface-900 via-brand-500 to-surface-900 dark:from-white dark:via-brand-300 dark:to-white">{t("home.title")}</span>
          </h1>
          <p className="text-surface-500 text-base sm:text-xl max-w-lg mx-auto mb-6 sm:mb-8 animate-fade-in">{t("home.subtitle")}</p>
          <div className="flex items-center justify-center animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            <img src="/logo.png" alt="BirbRacers" className="h-14 sm:h-20 lg:h-24 w-auto object-contain logo-img hover:scale-105 transition-all duration-500" draggable={false} />
          </div>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Link href="/leaderboard"><Button variant="secondary" size="sm" className="btn-squish">🏆 {t("results.leaderboard")}</Button></Link>
          </div>
        </div>

        {/* ─── Car Carousel ─── */}
        <CarCarousel />

        {/* ─── Race List ─── */}
        <div>
          <h2 className="font-display font-bold text-lg sm:text-2xl mb-4 sm:mb-6 flex items-center gap-2"><span>🏁</span>{t("home.active.races")}</h2>
          {loading ? (
            <div className="grid gap-3 sm:gap-4">{[1,2,3].map(i => <RaceCardSkeleton key={i} />)}</div>
          ) : races.length === 0 ? (
            <div className="text-center py-12 sm:py-16 glass-glow rounded-2xl">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-4 avatar-wiggle"><span className="text-4xl">🏎️</span></div>
              <p className="text-surface-500 text-base sm:text-lg">{t("home.no.races")}</p>
              {user?.isAdmin && <Link href="/admin" className="inline-block mt-4 btn-primary text-sm btn-squish">{t("admin.create.race")}</Link>}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {races.map((race) => {
                const track = getTrackById(race.trackId);
                const canJoin = race.status === "LOBBY" || race.status === "CAR_SELECT";
                const isUserIn = race.participants.some((p) => p.userId === user?.id);
                const isLive = race.status === "RACING" || race.status === "COUNTDOWN";
                return (
                  <div key={race.id} className="card-hover card-tilt glass-glow group">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="w-full sm:w-28 h-16 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: track ? `linear-gradient(135deg, ${track.skyGradient[0]}, ${track.skyGradient[1]})` : "#1a1a3e" }}>
                        <div className="w-full h-full flex items-center justify-center"><span className="text-xl sm:text-2xl opacity-60 group-hover:scale-125 transition-transform duration-500">🏎️</span></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display font-bold text-base sm:text-lg truncate">{race.name}</h3>
                          <Badge variant={statusVariant(race.status)} pulse={!!(isLive || race.status === "LOBBY" || race.status === "CAR_SELECT")}>{statusLabel(race.status)}</Badge>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-surface-500">
                          <span>👥 {race.participants.length}/{race.maxPlayers} {t("home.players")}</span>
                          <span className="hidden sm:inline">🗺️ {track?.name || race.trackId}</span>
                        </div>
                        {race.participants.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-1.5">
                            {race.participants.slice(0, 6).map((p) => (
                              <div key={p.userId} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-xs sm:text-sm border-2 border-white dark:border-surface-900 -ml-1 first:ml-0 avatar-wiggle" title={p.username}>
                                {p.avatarImage ? <img src={p.avatarImage} alt="" className="w-full h-full rounded-full object-cover" /> : (p.avatarEmoji || "🐦")}
                              </div>
                            ))}
                            {race.participants.length > 6 && <span className="text-[10px] text-surface-400 ml-1">+{race.participants.length - 6}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLive && <Link href={`/watch/${race.id}`}><Button variant="ghost" size="sm" className="btn-squish">👁️</Button></Link>}
                        {canJoin && !isUserIn ? (
                          <Link href={`/lobby/${race.id}`} onClick={(e) => { if (user) { e.preventDefault(); handleJoin(race.id); } }}>
                            <Button variant="primary" size="sm" className="btn-squish">{t("home.join")}</Button>
                          </Link>
                        ) : (
                          <Link href={getRaceLink(race)}><Button variant="secondary" size="sm" className="btn-squish">{race.status === "FINISHED" ? t("race.view.results") : race.status === "RACING" ? t("race.live") : t("lobby.title")}</Button></Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
