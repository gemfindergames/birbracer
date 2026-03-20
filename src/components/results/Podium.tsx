"use client";

import React, { useRef, useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";
import { RaceResultPublic } from "@/types";
import { getCarById } from "@/lib/cars";

interface PodiumProps { results: RaceResultPublic[]; }

export function Podium({ results }: PodiumProps) {
  const { t } = useI18n();
  const { play } = useSound();
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [revealed, setRevealed] = useState(false);
  const top3 = results.slice(0, 3);

  // Staggered reveal
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Confetti
  useEffect(() => {
    if (top3.length === 0 || !revealed) return;
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    play("confetti" as any);
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFEAA7", "#FF69B4", "#fff", "#FF8C00", "#7c3aed", "#22c55e"];
    interface P { x:number; y:number; vx:number; vy:number; c:string; s:number; r:number; rs:number; life:number; max:number; shape:number; }
    const ps: P[] = [];
    for (let i = 0; i < 200; i++) ps.push({
      x: W/2 + (Math.random()-0.5)*200, y: H*0.3, vx: (Math.random()-0.5)*14, vy: -Math.random()*10-3,
      c: colors[Math.floor(Math.random()*colors.length)], s: 3+Math.random()*7, r: Math.random()*Math.PI*2,
      rs: (Math.random()-0.5)*0.2, life: 0, max: 120+Math.random()*80, shape: Math.floor(Math.random()*3),
    });
    function render() {
      if (!ctx) return;
      ctx.clearRect(0,0,W,H);
      let alive = 0;
      for (const p of ps) {
        p.life++; if (p.life > p.max) continue; alive++;
        p.vy += 0.06; p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.r += p.rs;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1-p.life/p.max);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0,0,p.s/2,0,Math.PI*2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0,-p.s/2); ctx.lineTo(p.s/2,p.s/2); ctx.lineTo(-p.s/2,p.s/2); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (alive > 0) animRef.current = requestAnimationFrame(render);
    }
    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [top3.length, revealed, play]);

  if (top3.length === 0) return null;

  const winner = top3[0];
  const second = top3[1];
  const third = top3[2];
  const winnerCar = getCarById(winner?.carId || "");

  // Display: 2nd, 1st, 3rd
  const displayOrder = [second, winner, third].filter(Boolean);
  const configs = [
    { podiumH: "h-20 sm:h-28", medal: "🥈", rank: t("results.2nd"), delay: 600, ringColor: "ring-slate-300", gradient: "from-slate-300 via-gray-200 to-slate-400", avatarSize: "w-14 h-14 sm:w-16 sm:h-16", fontSize: "text-sm", carH: "h-8 sm:h-10", spotlight: "rgba(192,192,192,0.15)" },
    { podiumH: "h-32 sm:h-44", medal: "🥇", rank: t("results.1st"), delay: 200, ringColor: "ring-yellow-400", gradient: "from-yellow-400 via-amber-300 to-yellow-500", avatarSize: "w-20 h-20 sm:w-24 sm:h-24", fontSize: "text-base sm:text-lg", carH: "h-14 sm:h-18", spotlight: "rgba(255,215,0,0.2)" },
    { podiumH: "h-14 sm:h-20", medal: "🥉", rank: t("results.3rd"), delay: 900, ringColor: "ring-orange-400", gradient: "from-orange-500 via-amber-600 to-orange-700", avatarSize: "w-12 h-12 sm:w-14 sm:h-14", fontSize: "text-xs sm:text-sm", carH: "h-7 sm:h-9", spotlight: "rgba(205,127,50,0.12)" },
  ];

  return (
    <div className="relative w-full max-w-3xl mx-auto px-2 sm:px-4">
      {/* Confetti */}
      <canvas ref={confettiRef} className="absolute inset-0 w-full h-full pointer-events-none z-30" style={{ mixBlendMode: "screen" }} />

      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-block animate-bounce-in">
          <span className="text-5xl sm:text-6xl block mb-2 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 30px rgba(255,193,7,0.5))" }}>🏆</span>
        </div>
        <h2 className="font-display font-black text-2xl sm:text-3xl text-shimmer bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
          {t("results.race.complete")}
        </h2>
      </div>

      {/* ─── Winner Spotlight (above podium) ─── */}
      {winner && revealed && (
        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          {/* Spotlight glow */}
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse" style={{ background: "radial-gradient(circle, rgba(255,215,0,0.6), transparent 70%)", width: "200%", height: "200%", left: "-50%", top: "-50%" }} />
            <div className="relative">
              {/* Champion badge */}
              <div className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-[0.3em] mb-2 animate-badge-pop" style={{ animationDelay: "0.8s", animationFillMode: "both" }}>
                ✦ {t("results.champion")} ✦
              </div>
              {/* Winner car — BIG */}
              {winnerCar && (
                <div className="h-20 sm:h-28 mb-3 animate-fade-in" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
                  <img src={winnerCar.imagePath} alt={winnerCar.name} className="h-full w-auto object-contain mx-auto drop-shadow-2xl animate-car-idle" style={{ filter: "drop-shadow(0 8px 25px rgba(255,193,7,0.3))" }} />
                </div>
              )}
              <p className="text-xs sm:text-sm text-surface-400 font-semibold">{winnerCar?.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Podium Blocks ─── */}
      <div className="flex items-end justify-center gap-2 sm:gap-6 relative z-20">
        {displayOrder.map((result, idx) => {
          if (!result) return <div key={idx} className="flex-1 max-w-[200px]" />;
          const config = configs[idx];
          const car = getCarById(result.carId);
          const accent = car?.accentColor || "#3b6cf5";
          const isWinner = idx === 1;

          return (
            <div
              key={result.userId}
              className={`flex-1 ${isWinner ? "max-w-[220px]" : "max-w-[180px]"} ${revealed ? "animate-podium-rise" : "opacity-0"}`}
              style={{ animationDelay: `${config.delay}ms`, animationFillMode: "both" }}
            >
              <div className="flex flex-col items-center mb-2 sm:mb-3">
                {/* Medal */}
                <div className={`${isWinner ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"} mb-1 sm:mb-2 ${revealed ? "animate-bounce-in" : "opacity-0"}`}
                  style={{ animationDelay: `${config.delay + 200}ms`, animationFillMode: "both" }}>
                  {config.medal}
                </div>

                {/* Avatar with spotlight */}
                <div className="relative mb-2 sm:mb-3">
                  {/* Spotlight behind avatar */}
                  <div className="absolute inset-0 rounded-full blur-xl" style={{ background: config.spotlight, width: "150%", height: "150%", left: "-25%", top: "-25%", animation: "spotlight-pulse 2s ease-in-out infinite" }} />
                  <div className={`relative ${config.avatarSize} rounded-full flex items-center justify-center ${isWinner ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} ring-3 ${config.ringColor} bg-surface-100 dark:bg-surface-800 overflow-hidden avatar-wiggle`}
                    style={{ boxShadow: isWinner ? `0 0 30px ${accent}50, 0 0 60px ${accent}20` : `0 0 15px ${accent}25` }}>
                    {result.avatarImage ? (
                      <img src={result.avatarImage} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (result.avatarEmoji || "🐦")}
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white/20" style={{ backgroundColor: accent }} />
                  <span className={`font-display font-bold ${config.fontSize} truncate max-w-[120px] sm:max-w-[150px]`}>{result.username}</span>
                </div>

                {/* Time */}
                <span className={`${isWinner ? "text-sm" : "text-xs"} text-surface-400 font-mono tabular-nums`}>{result.finishTime.toFixed(2)}s</span>

                {/* Car (smaller for 2nd/3rd) */}
                {car && !isWinner && (
                  <div className={`mt-1.5 ${config.carH} animate-car-idle`}>
                    <img src={car.imagePath} alt={car.name} className="h-full w-auto object-contain drop-shadow-md" />
                  </div>
                )}
                {car && !isWinner && <span className="text-[9px] text-surface-500 mt-0.5">{car.name}</span>}
              </div>

              {/* Podium block */}
              <div className={`${config.podiumH} rounded-t-2xl bg-gradient-to-t ${config.gradient} flex items-start justify-center pt-2 sm:pt-3 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/10" />
                <span className={`font-display font-black ${isWinner ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"} text-white/90 drop-shadow-sm relative z-10`}>{config.rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
