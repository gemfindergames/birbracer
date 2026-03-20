"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";
import { useRace } from "@/hooks/useRace";
import { RaceCanvas } from "@/components/race/RaceCanvas";
import { Countdown } from "@/components/race/Countdown";
import { EmojiPicker } from "@/components/race/EmojiPicker";
import { EmojiOverlay, dispatchEmojiEvent } from "@/components/race/EmojiOverlay";
import { Commentary } from "@/components/race/Commentary";
import { HornButton } from "@/components/race/HornButton";
import { BackgroundMusic } from "@/components/race/BackgroundMusic";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SSEEvent, EmojiReactionPublic, RacerAnimState } from "@/types";
import { getCarById } from "@/lib/cars";
import { getTrackById } from "@/lib/tracks";

function dispatchHonkEvent(userId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("birbracer:honk", { detail: { userId } }));
}

// Mini confetti for the finish overlay
function FinishConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFEAA7", "#FF69B4", "#ffffff", "#FF8C00"];

    interface P { x: number; y: number; vx: number; vy: number; c: string; s: number; r: number; rs: number; life: number; max: number; }
    const particles: P[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: H * 0.3,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        c: colors[Math.floor(Math.random() * colors.length)],
        s: 2 + Math.random() * 4,
        r: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.15,
        life: 0,
        max: 80 + Math.random() * 60,
      });
    }

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of particles) {
        p.life++;
        if (p.life > p.max) continue;
        alive++;
        p.vy += 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.r += p.rs;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (alive > 0) animRef.current = requestAnimationFrame(render);
    }
    render();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function RacePage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { play } = useSound();
  const [finished, setFinished] = useState(false);
  const [closeFinish, setCloseFinish] = useState(false);
  const [showFinishOverlay, setShowFinishOverlay] = useState(false);
  const [showPreRace, setShowPreRace] = useState(false);
  const [topTwo, setTopTwo] = useState<{ first: RacerAnimState; second: RacerAnimState; gap: number } | null>(null);
  const { race, loading, connected, positions, countdown } = useRace({ raceId });
  const myCarId = race?.carSelections?.find((cs) => cs.userId === user?.id)?.carId;

  // Pre-race cinematic when countdown starts
  useEffect(() => {
    if (race?.status === "COUNTDOWN" && !showPreRace && !finished) {
      setShowPreRace(true);
      setTimeout(() => setShowPreRace(false), 3500);
    }
  }, [race?.status, showPreRace, finished]);

  // SSE for emojis + honks
  useEffect(() => {
    if (!raceId) return;
    const es = new EventSource(`/api/sse/${raceId}`);
    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);
        if (parsed.type === "emoji:new") {
          const reaction = parsed.data as EmojiReactionPublic;
          if (reaction.emoji === "📯HONK") { dispatchHonkEvent(reaction.userId); if (reaction.userId !== user?.id) play("horn" as any); }
          else dispatchEmojiEvent(reaction);
        }
      } catch {}
    };
    return () => es.close();
  }, [raceId, user?.id, play]);

  // Detect close finish
  useEffect(() => {
    if (positions.length < 2) return;
    const fin = positions.filter((r) => r.finished).sort((a, b) => (a.finishTime || 999) - (b.finishTime || 999));
    if (fin.length >= 2 && !closeFinish) {
      const gap = Math.abs((fin[0].finishTime || 0) - (fin[1].finishTime || 0));
      if (gap < 0.8) {
        setCloseFinish(true);
        setTopTwo({ first: fin[0], second: fin[1], gap });
      }
    }
  }, [positions, closeFinish]);

  // Finish handling
  useEffect(() => {
    if (race?.status === "FINISHED" && !finished) {
      setFinished(true);
      play("finish");

      if (closeFinish && topTwo) {
        setShowFinishOverlay(true);
        setTimeout(() => setShowFinishOverlay(false), 4000);
        setTimeout(() => router.push(`/results/${raceId}`), 5000);
      } else {
        setTimeout(() => router.push(`/results/${raceId}`), 3500);
      }
    }
  }, [race?.status, finished, closeFinish, topTwo, raceId, router, play]);

  useEffect(() => { if (!loading && !race) router.push("/"); if (race?.status === "ARCHIVED") router.push("/"); }, [race, loading, router]);

  if (loading) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;
  if (!race) return null;

  const isRacing = race.status === "RACING" || race.status === "COUNTDOWN";

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="font-display font-bold text-lg sm:text-2xl truncate">{race.name}</h1>
          {race.status === "RACING" && <Badge variant="red" pulse>{t("race.live")}</Badge>}
          {race.status === "COUNTDOWN" && <Badge variant="brand" pulse>{t("race.starting")}</Badge>}
          {finished && <Badge variant="green">{t("status.finished")}</Badge>}
        </div>
        <div className="flex items-center gap-2">{connected && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}</div>
      </div>

      {/* Race Canvas */}
      <div className="mb-3 sm:mb-4">
        <RaceCanvas trackId={race.trackId} racers={positions} status={race.status} />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {user && isRacing && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <EmojiPicker raceId={raceId} />
            <div className="w-px h-8 bg-surface-300 dark:bg-surface-700 hidden sm:block" />
            <HornButton raceId={raceId} carId={myCarId || undefined} />
          </div>
        )}
        {isRacing && <Commentary racers={positions} status={race.status} />}
        {finished && (
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="text-xl sm:text-2xl animate-bounce-in">🏆</span>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-base">{t("race.finished")}</p>
              <p className="text-xs sm:text-sm text-surface-500">{t("race.redirecting")}</p>
            </div>
            <Link href={`/results/${raceId}`}><Button variant="primary" size="sm">{t("race.view.results")}</Button></Link>
          </div>
        )}
      </div>

      {/* Countdown */}
      {race.status === "COUNTDOWN" && <Countdown value={countdown} />}

      {/* Background Music */}
      <BackgroundMusic
        playing={race.status === "RACING" || race.status === "COUNTDOWN"}
        intensity={race.status === "COUNTDOWN" ? "low" : finished ? "low" : "medium"}
      />

      {/* Emoji overlay */}
      <EmojiOverlay raceId={raceId} />

      {/* ─── PRE-RACE CINEMATIC ─── */}
      {showPreRace && race && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ animation: "prerace-bg 3.5s ease forwards" }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative z-10 text-center w-full max-w-lg" style={{ animation: "prerace-title 3.5s ease forwards" }}>
            {/* Track gradient banner */}
            {(() => { const track = getTrackById(race.trackId); return track ? (
              <div className="mb-6 h-2 rounded-full overflow-hidden mx-auto max-w-xs" style={{ background: `linear-gradient(to right, ${track.skyGradient[0]}, ${track.skyGradient[1]})` }} />
            ) : null; })()}

            <div className="text-xs sm:text-sm font-bold text-white/40 uppercase tracking-[0.3em] mb-2">{t("race.prerace.track")}</div>
            <h2 className="font-display font-black text-3xl sm:text-5xl text-white mb-6" style={{ textShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
              {race.name}
            </h2>

            {/* Racers entering one by one */}
            <div className="text-xs sm:text-sm font-bold text-white/40 uppercase tracking-[0.3em] mb-4">{t("race.prerace.racers")}</div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {race.participants.map((p, i) => {
                const cs = race.carSelections?.find((c) => c.userId === p.userId);
                const car = cs ? getCarById(cs.carId) : null;
                return (
                  <div key={p.userId} className="flex flex-col items-center" style={{ animation: `prerace-racer-enter 0.5s ease ${0.3 + i * 0.2}s both` }}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-lg sm:text-xl mb-1">
                      {p.avatarImage ? <img src={p.avatarImage} alt="" className="w-full h-full rounded-full object-cover" /> : (p.avatarEmoji || "🐦")}
                    </div>
                    {car && <img src={car.imagePath} alt="" className="h-6 sm:h-8 w-auto object-contain drop-shadow-md -mt-1" />}
                    <span className="text-[10px] sm:text-xs text-white/70 font-semibold mt-0.5 truncate max-w-[70px]">{p.username}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 font-display font-black text-2xl sm:text-4xl text-white/20 animate-pulse tracking-wider">
              {t("race.prerace.title")}
            </div>
          </div>
        </div>
      )}

      {/* ─── WHAT A FINISH! Overlay (Option B) ─── */}
      {showFinishOverlay && topTwo && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

          <div className="relative w-full max-w-md animate-scale-in">
            {/* Confetti */}
            <FinishConfetti />

            <div className="relative z-10 text-center px-4 py-6 sm:py-8">
              {/* Title */}
              <div className="mb-6">
                <span className="text-4xl sm:text-5xl block mb-2">🎉</span>
                <h2
                  className="font-display font-black text-3xl sm:text-4xl text-white"
                  style={{ textShadow: "0 0 30px rgba(255,200,0,0.5), 0 0 60px rgba(255,150,0,0.2)" }}
                >
                  {t("race.what.a.finish")}
                </h2>
              </div>

              {/* Top 2 side by side */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
                {/* Winner */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🥇</span>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-yellow-500/20 ring-2 ring-yellow-400 flex items-center justify-center text-2xl mb-1.5"
                    style={{ boxShadow: "0 0 20px rgba(255,193,7,0.4)" }}>
                    {topTwo.first.avatarEmoji || "🐦"}
                  </div>
                  <span className="font-display font-bold text-white text-sm sm:text-base">{topTwo.first.username}</span>
                  <span className="font-mono text-xs text-yellow-400">{topTwo.first.finishTime?.toFixed(2)}s</span>
                  {(() => {
                    const car = getCarById(topTwo.first.carId);
                    return car ? <img src={car.imagePath} alt="" className="w-16 h-8 sm:w-20 sm:h-10 object-contain mt-1" /> : null;
                  })()}
                </div>

                {/* VS */}
                <div className="flex flex-col items-center">
                  <span className="font-display font-black text-xl sm:text-2xl text-white/40">{t("race.vs")}</span>
                </div>

                {/* 2nd */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🥈</span>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-400/20 ring-2 ring-slate-300 flex items-center justify-center text-2xl mb-1.5">
                    {topTwo.second.avatarEmoji || "🐦"}
                  </div>
                  <span className="font-display font-bold text-white text-sm sm:text-base">{topTwo.second.username}</span>
                  <span className="font-mono text-xs text-slate-300">{topTwo.second.finishTime?.toFixed(2)}s</span>
                  {(() => {
                    const car = getCarById(topTwo.second.carId);
                    return car ? <img src={car.imagePath} alt="" className="w-16 h-8 sm:w-20 sm:h-10 object-contain mt-1" /> : null;
                  })()}
                </div>
              </div>

              {/* Gap */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-xs sm:text-sm text-white/70">{t("race.winner.by")}</span>
                <span className="font-mono font-bold text-sm sm:text-base text-yellow-400">{topTwo.gap.toFixed(2)}s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
