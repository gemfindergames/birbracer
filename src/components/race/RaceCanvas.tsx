"use client";

import React, { useRef, useEffect, useState } from "react";
import { RacerAnimState } from "@/types";
import { getCarById } from "@/lib/cars";
import { getTrackById } from "@/lib/tracks";
import type { TrackConfig } from "@/types";

interface RaceCanvasProps {
  trackId: string;
  racers: RacerAnimState[];
  status: string;
  honkEvents?: { userId: string; frame: number }[];
}

// Smooth interpolation store for buttery animation
interface SmoothedRacer {
  displayProgress: number;
  displaySpeed: number;
  prevProgress: number;
}

// Confetti particle
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export function RaceCanvas({ trackId, racers, status, honkEvents }: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 450 });
  const carImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animFrameRef = useRef<number>(0);
  const racersRef = useRef<RacerAnimState[]>(racers);
  const frameRef = useRef(0);
  const smoothRef = useRef<Map<string, SmoothedRacer>>(new Map());
  const finishFlashRef = useRef<Map<string, number>>(new Map());
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const confettiSpawnedRef = useRef(false);
  const honkVisualsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => { racersRef.current = racers; }, [racers]);

  useEffect(() => {
    const ids = [...new Set(racers.map((r) => r.carId))];
    for (const carId of ids) {
      if (carImagesRef.current.has(carId)) continue;
      const cfg = getCarById(carId);
      if (!cfg) continue;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = cfg.imagePath;
      img.onload = () => carImagesRef.current.set(carId, img);
    }
  }, [racers]);

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        setDimensions({ width: w, height: Math.max(320, Math.min(520, w * 0.52)) });
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for honk events
  useEffect(() => {
    function handleHonk(e: CustomEvent<{ userId: string }>) {
      honkVisualsRef.current.set(e.detail.userId, frameRef.current);
    }
    window.addEventListener("birbracer:honk" as any, handleHonk as EventListener);
    return () => window.removeEventListener("birbracer:honk" as any, handleHonk as EventListener);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const track = getTrackById(trackId);
    const { width: W, height: H } = dimensions;
    const SKY_END = 0.30;
    const HORIZON = SKY_END;
    const TRACK_START = 0.32;
    const TRACK_END = 0.98;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    // Set canvas resolution for crispness
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    function render() {
      if (!ctx) return;
      frameRef.current++;
      const f = frameRef.current;
      const currentRacers = racersRef.current;
      const laneCount = Math.max(currentRacers.length, 1);

      // ─── Smooth interpolation ────────────
      for (const r of currentRacers) {
        let s = smoothRef.current.get(r.userId);
        if (!s) {
          s = { displayProgress: r.progress, displaySpeed: 0, prevProgress: r.progress };
          smoothRef.current.set(r.userId, s);
        }
        s.prevProgress = s.displayProgress;
        // Lerp toward target with easing
        const lerp = 0.12;
        s.displayProgress += (r.progress - s.displayProgress) * lerp;
        s.displaySpeed = s.displayProgress - s.prevProgress;
      }

      ctx.clearRect(0, 0, W, H);

      // ─── SKY ─────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * SKY_END);
      const skyColors = track?.skyColors || ["#0a0a1a", "#1a1a3e"];
      skyColors.forEach((c, i) => skyGrad.addColorStop(i / Math.max(skyColors.length - 1, 1), c));
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * SKY_END + 2);

      // ─── HORIZON GLOW ────────────────────
      const horizonY = H * HORIZON;
      const hGlow = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 25);
      const hColor = track?.horizonColor || "#2D1B69";
      hGlow.addColorStop(0, "transparent");
      hGlow.addColorStop(0.4, hColor + "60");
      hGlow.addColorStop(0.6, hColor);
      hGlow.addColorStop(1, "transparent");
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, horizonY - 40, W, 65);

      // ─── SCENERY ─────────────────────────
      if (track?.sceneryElements) {
        drawScenery(ctx, track, W, H, HORIZON, f);
      }

      // ─── HEAT SHIMMER (desert/ranch) ─────
      if (track && (track.id === "desert" || track.id === "ranch")) {
        drawHeatShimmer(ctx, W, H * TRACK_START, W, 20, f);
      }

      // ─── TRACK SURFACE ───────────────────
      const trackY = H * TRACK_START;
      const trackH = H * (TRACK_END - TRACK_START);
      const tGrad = ctx.createLinearGradient(0, trackY, 0, trackY + trackH);
      const gColors = track?.groundGradient || ["#2a2a3e", "#1a1a2e"];
      tGrad.addColorStop(0, gColors[0]);
      tGrad.addColorStop(0.5, gColors[1]);
      tGrad.addColorStop(1, gColors[0] + "80");
      ctx.fillStyle = tGrad;
      ctx.fillRect(0, trackY, W, trackH);

      // Track texture (subtle noise lines)
      ctx.strokeStyle = track?.trackLine || "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let ty = trackY + 3; ty < trackY + trackH; ty += 5) {
        ctx.globalAlpha = 0.15 + Math.sin(ty * 0.15 + f * 0.01) * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(W, ty);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ─── LANE DIVIDERS ───────────────────
      ctx.strokeStyle = track?.laneLineColor || "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([14, 20]);
      for (let i = 1; i < laneCount; i++) {
        const ly = trackY + (i / laneCount) * trackH;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(W, ly);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Track edges with glow
      const edgeGrad = ctx.createLinearGradient(0, trackY - 3, 0, trackY + 3);
      edgeGrad.addColorStop(0, "transparent");
      edgeGrad.addColorStop(0.5, track?.laneLineColor || "rgba(255,255,255,0.2)");
      edgeGrad.addColorStop(1, "transparent");
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, trackY - 3, W, 6);
      const edgeGrad2 = ctx.createLinearGradient(0, trackY + trackH - 3, 0, trackY + trackH + 3);
      edgeGrad2.addColorStop(0, "transparent");
      edgeGrad2.addColorStop(0.5, track?.laneLineColor || "rgba(255,255,255,0.15)");
      edgeGrad2.addColorStop(1, "transparent");
      ctx.fillStyle = edgeGrad2;
      ctx.fillRect(0, trackY + trackH - 3, W, 6);

      // ─── START / FINISH ──────────────────
      const carW = Math.min(130, W * 0.14);
      const carH = carW * 0.55;
      const startX = carW + 30;
      const endX = W - carW - 30;
      const raceW = endX - startX;

      // Start line
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(startX - 10, trackY);
      ctx.lineTo(startX - 10, trackY + trackH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Finish line
      const finishX = endX + 5;
      drawFinishLine(ctx, track, finishX, trackY, trackH, f);

      // ─── BOTTOM EDGE ─────────────────────
      const btmY = H * TRACK_END;
      const btmGrad = ctx.createLinearGradient(0, btmY, 0, H);
      btmGrad.addColorStop(0, gColors[1]);
      btmGrad.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = btmGrad;
      ctx.fillRect(0, btmY, W, H - btmY);

      // Atmosphere
      if (track?.atmosphereColor) {
        ctx.fillStyle = track.atmosphereColor;
        ctx.fillRect(0, 0, W, H);
      }

      // Particles
      if (track?.particleColor) drawParticles(ctx, track.particleColor, W, H, f);

      // ─── FIND LEADER ─────────────────────
      let leaderUserId = "";
      let maxProg = -1;
      for (const r of currentRacers) {
        const s = smoothRef.current.get(r.userId);
        const p = s?.displayProgress ?? r.progress;
        if (p > maxProg && !r.finished) { maxProg = p; leaderUserId = r.userId; }
      }

      // ─── RACERS ──────────────────────────
      const sorted = [...currentRacers].sort((a, b) => a.lane - b.lane);

      for (const racer of sorted) {
        const s = smoothRef.current.get(racer.userId);
        const prog = s?.displayProgress ?? racer.progress;
        const spd = s?.displaySpeed ?? 0;

        const laneTop = trackY + (racer.lane / laneCount) * trackH;
        const laneBot = trackY + ((racer.lane + 1) / laneCount) * trackH;
        const laneCenter = (laneTop + laneBot) / 2;
        const x = startX + prog * raceW;
        const y = laneCenter - carH / 2;

        const carCfg = getCarById(racer.carId);
        const accent = carCfg?.accentColor || "#3b6cf5";
        const isLeader = racer.userId === leaderUserId && !racer.finished;
        const isRacing = status === "RACING" && !racer.finished;

        // ─── Suspension bounce + tilt ──────
        const suspensionY = isRacing
          ? Math.sin(f * 0.18 + racer.lane * 1.8) * 2.0 + Math.sin(f * 0.07 + racer.lane) * 0.8
          : 0;
        const tilt = isRacing ? Math.sin(f * 0.12 + racer.lane * 2.5) * 0.012 : 0;

        // ─── Speed Trails (wider, with blur) ─
        if (prog > 0.02 && !racer.finished) {
          const intensity = Math.min(1, Math.abs(spd) * 80);
          const trailLen = carW * (0.8 + intensity * 1.5);
          // Multi-layer trail
          for (let layer = 0; layer < 3; layer++) {
            const layerAlpha = (0.12 - layer * 0.03) * (0.5 + intensity);
            const layerSpread = carH * (0.15 + layer * 0.08);
            const tg = ctx.createLinearGradient(x - trailLen, 0, x, 0);
            tg.addColorStop(0, "transparent");
            tg.addColorStop(0.4, `${accent}${Math.round(layerAlpha * 255).toString(16).padStart(2, "0")}`);
            tg.addColorStop(1, `${accent}${Math.round(layerAlpha * 2 * 255).toString(16).padStart(2, "0")}`);
            ctx.fillStyle = tg;
            ctx.beginPath();
            ctx.moveTo(x, y + carH * 0.5 - layerSpread);
            ctx.lineTo(x - trailLen, y + carH * 0.5 - layerSpread * 0.3);
            ctx.lineTo(x - trailLen, y + carH * 0.5 + layerSpread * 0.3);
            ctx.lineTo(x, y + carH * 0.5 + layerSpread);
            ctx.closePath();
            ctx.fill();
          }

          // Speed streaks
          ctx.lineWidth = 1;
          for (let ml = 0; ml < 4; ml++) {
            const streakAlpha = 0.15 + intensity * 0.2;
            ctx.strokeStyle = `rgba(255,255,255,${streakAlpha})`;
            const mlX = x - 12 - ml * 20 + Math.sin(f * 0.25 + ml * 1.5) * 4;
            const mlY = y + carH * (0.25 + ml * 0.14);
            const mlLen = 10 + intensity * 15 + ml * 3;
            ctx.beginPath();
            ctx.moveTo(mlX, mlY + suspensionY);
            ctx.lineTo(mlX - mlLen, mlY + suspensionY);
            ctx.stroke();
          }
        }

        // ─── Leader glow (subtle underline, not blob) ──
        if (isLeader) {
          const glowPulse = 0.5 + Math.sin(f * 0.08) * 0.3;
          // Thin glowing line under the car
          ctx.save();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.globalAlpha = glowPulse * 0.6;
          ctx.shadowColor = accent;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(x + carW * 0.1, y + carH + 2 + suspensionY);
          ctx.lineTo(x + carW * 0.9, y + carH + 2 + suspensionY);
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        // ─── Nitro Boost Visual (random bursts) ──
        if (isRacing && !racer.finished) {
          // Each racer gets occasional nitro bursts based on frame + lane seed
          const nitroSeed = Math.sin(f * 0.02 + racer.lane * 7.3) * Math.cos(f * 0.015 + racer.lane * 3.1);
          const isNitro = nitroSeed > 0.85; // ~7% of frames
          if (isNitro) {
            // Flame burst behind car
            const flameX = x - 5;
            const flameY = y + carH * 0.4 + suspensionY;
            const flameGrad = ctx.createRadialGradient(flameX, flameY, 0, flameX - 15, flameY, carW * 0.25);
            flameGrad.addColorStop(0, "rgba(255,200,50,0.6)");
            flameGrad.addColorStop(0.4, "rgba(255,100,20,0.3)");
            flameGrad.addColorStop(1, "transparent");
            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.ellipse(flameX - 8, flameY, carW * 0.18, carH * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // ─── Car Shadow (soft, perspective) ─
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(x + carW * 0.52, y + carH + 5 + suspensionY * 0.3, carW * 0.44, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Secondary ambient shadow
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.ellipse(x + carW * 0.5, y + carH + 8 + suspensionY * 0.2, carW * 0.55, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // ─── Car Image (crisp + tilt + gloss) ─
        const carImg = carImagesRef.current.get(racer.carId);
        ctx.save();
        ctx.translate(x + carW / 2, y + carH / 2 + suspensionY);
        ctx.rotate(tilt);

        if (carImg && carImg.complete && carImg.naturalWidth > 0) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(carImg, -carW / 2, -carH / 2, carW, carH);

          // Specular highlight dot (subtle, moves slightly)
          const specX = -carW * 0.12 + Math.sin(f * 0.03) * carW * 0.04;
          const specY = -carH * 0.18;
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath();
          ctx.ellipse(specX, specY, carW * 0.06, carH * 0.04, -0.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 8);
          ctx.fill();
        }
        ctx.restore();

        // ─── Finish flash ──────────────────
        if (racer.finished) {
          let flash = finishFlashRef.current.get(racer.userId);
          if (flash === undefined) {
            finishFlashRef.current.set(racer.userId, f);
            flash = f;
          }
          const elapsed = f - flash;
          if (elapsed < 25) {
            const flashAlpha = (1 - elapsed / 25) * 0.4;
            ctx.save();
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = elapsed * 3;
            ctx.fillStyle = "#ffffff";
            ctx.globalAlpha = flashAlpha;
            ctx.beginPath();
            ctx.ellipse(x + carW * 0.5, y + carH * 0.4, carW * 0.25 + elapsed * 1.5, carH * 0.2 + elapsed, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        }

        // ─── Name Tag (premium pill) ───────
        const labelX = x + carW / 2;
        const labelY = y - 16 + suspensionY;
        const fontSize = Math.max(10, Math.min(13, carW * 0.1));
        ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
        ctx.textAlign = "center";
        const text = racer.username;
        const tw = ctx.measureText(text).width;
        const pillW = tw + 28;
        const pillH = fontSize + 10;
        const pillX = labelX - pillW / 2;
        const pillY = labelY - pillH / 2;

        // Pill shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.roundRect(pillX + 1, pillY + 2, pillW, pillH, pillH / 2);
        ctx.fill();

        // Pill bg
        const pillBg = isLeader ? `${accent}cc` : "rgba(0,0,0,0.75)";
        ctx.fillStyle = pillBg;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();

        // Leader crown or color dot
        if (isLeader) {
          ctx.font = `${fontSize + 2}px serif`;
          ctx.fillText("👑", pillX + 10, labelY + fontSize * 0.35);
          ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, labelX + 6, labelY + fontSize * 0.35);
        } else {
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(pillX + 9, labelY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = racer.finished ? "#fbbf24" : "#ffffff";
          ctx.fillText(text, labelX + 5, labelY + fontSize * 0.35);
        }

        // Finish flag
        if (racer.finished) {
          ctx.font = `${Math.max(16, carW * 0.15)}px serif`;
          ctx.textAlign = "center";
          ctx.fillText("🏁", x + carW + 16, laneCenter + 5 + suspensionY);
        }
      }

      // ─── CONFETTI (on first finish) ────────
      const anyFinished = currentRacers.some((r) => r.finished);
      if (anyFinished && !confettiSpawnedRef.current) {
        confettiSpawnedRef.current = true;
        const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C00", "#ffffff"];
        for (let i = 0; i < 80; i++) {
          confettiRef.current.push({
            x: W * 0.7 + Math.random() * W * 0.3,
            y: -10 - Math.random() * 50,
            vx: (Math.random() - 0.6) * 4,
            vy: Math.random() * 2 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            life: 0,
            maxLife: 120 + Math.random() * 80,
          });
        }
      }

      // Update and draw confetti
      if (confettiRef.current.length > 0) {
        const alive: ConfettiParticle[] = [];
        for (const p of confettiRef.current) {
          p.life++;
          if (p.life > p.maxLife) continue;
          p.x += p.vx;
          p.vy += 0.03; // gravity
          p.y += p.vy;
          p.vx *= 0.99; // air resistance
          p.rotation += p.rotationSpeed;
          const alpha = Math.max(0, 1 - p.life / p.maxLife);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          ctx.globalAlpha = 1;
          alive.push(p);
        }
        confettiRef.current = alive;
      }

      // Reset confetti flag when race restarts
      if (status !== "RACING" && status !== "FINISHED" && confettiSpawnedRef.current) {
        confettiSpawnedRef.current = false;
        confettiRef.current = [];
      }

      // ─── HONK VISUALS ────────────────────
      // Listen for honk events dispatched via window events
      if (typeof window !== "undefined") {
        const now = f;
        for (const [userId, startFrame] of honkVisualsRef.current) {
          if (now - startFrame > 40) { honkVisualsRef.current.delete(userId); continue; }
          const racer = currentRacers.find((r) => r.userId === userId);
          if (!racer) continue;
          const s = smoothRef.current.get(racer.userId);
          const prog = s?.displayProgress ?? racer.progress;
          const laneTop = trackY + (racer.lane / laneCount) * trackH;
          const laneBot = trackY + ((racer.lane + 1) / laneCount) * trackH;
          const laneCenter = (laneTop + laneBot) / 2;
          const hx = startX + prog * raceW + carW + 20;
          const hy = laneCenter - 15;
          const elapsed = now - startFrame;
          const scale = 1 + elapsed * 0.02;
          const alpha = Math.max(0, 1 - elapsed / 40);
          ctx.globalAlpha = alpha;
          ctx.font = `${Math.round(18 * scale)}px serif`;
          ctx.textAlign = "center";
          ctx.fillText("📯", hx, hy - elapsed * 0.5);
          ctx.globalAlpha = 1;
        }
      }

      // ─── LIVE Badge ──────────────────────
      if (status === "RACING") {
        const bx = W - 76, by = 12, bw = 64, bh = 28;
        // Glow bg
        ctx.shadowColor = "rgba(220,38,38,0.6)";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "rgba(220,38,38,0.92)";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        // Text
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 11px "Exo 2", system-ui, sans-serif';
        ctx.textAlign = "center";
        const dotPulse = 0.4 + Math.sin(f * 0.12) * 0.6;
        ctx.globalAlpha = dotPulse;
        ctx.fillText("●", bx + 14, by + 18);
        ctx.globalAlpha = 1;
        ctx.fillText("LIVE", bx + 40, by + 18);
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    render();
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [dimensions, trackId, status]);

  // Camera shake: detect bunched-up racers
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (status !== "RACING") { setShaking(false); return; }
    const progs = racers.filter(r => !r.finished).map(r => r.progress);
    if (progs.length >= 2) {
      const sorted = progs.sort((a, b) => b - a);
      const maxGap = sorted[0] - sorted[sorted.length - 1];
      setShaking(maxGap < 0.08 && sorted[0] > 0.1);
    } else { setShaking(false); }
  }, [racers, status]);

  // Starting grid: show cars pulling in one by one before countdown
  const [gridPhase, setGridPhase] = useState(false);
  useEffect(() => {
    if (status === "COUNTDOWN") {
      setGridPhase(true);
      setTimeout(() => setGridPhase(false), 2000);
    }
  }, [status]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl overflow-hidden border-2 border-surface-200/50 dark:border-surface-700/50 shadow-2xl transition-transform relative ${
        shaking ? "animate-camera-shake" : ""
      }`}
      style={shaking ? { animationDuration: "0.15s", animationIterationCount: "infinite" } : undefined}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ width: dimensions.width, height: dimensions.height }}
      />
      {/* Starting grid overlay */}
      {gridPhase && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="text-center animate-fade-in">
            <div className="text-2xl sm:text-3xl font-display font-black text-white/50 animate-pulse" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              🏁 GET READY 🏁
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// SCENERY (kept from previous, unchanged)
// ═══════════════════════════════════════════════
function drawScenery(ctx: CanvasRenderingContext2D, track: TrackConfig, W: number, H: number, horizon: number, frame: number) {
  const hY = H * horizon;
  for (const el of track.sceneryElements) {
    const px = el.x * W + Math.sin(frame * 0.005) * el.parallaxSpeed * 8;
    const py = el.y * H;
    const sz = el.size * 30;
    switch (el.type) {
      case "mountain": {
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.moveTo(px - sz * 2, hY); ctx.lineTo(px, py); ctx.lineTo(px + sz * 2, hY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath(); ctx.moveTo(px - sz * 0.4, py + sz * 0.6); ctx.lineTo(px, py); ctx.lineTo(px + sz * 0.4, py + sz * 0.6); ctx.closePath(); ctx.fill();
        break;
      }
      case "snowpeak": {
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.moveTo(px - sz * 2.5, hY); ctx.lineTo(px - sz * 0.3, py); ctx.lineTo(px + sz * 0.3, py + sz * 0.2); ctx.lineTo(px + sz * 2.5, hY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = el.color2 || "#fff"; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(px - sz * 0.8, py + sz); ctx.lineTo(px - sz * 0.3, py); ctx.lineTo(px + sz * 0.3, py + sz * 0.2); ctx.lineTo(px + sz * 0.6, py + sz * 0.8); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; break;
      }
      case "building": {
        const bw = sz * 1.2, bh = hY - py;
        ctx.fillStyle = el.color; ctx.fillRect(px, py, bw, bh);
        const wColor = el.color2 || "#ffcc00";
        const rows = Math.floor(bh / 14), cols = Math.floor(bw / 10);
        for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) {
          if (Math.sin(r * 7 + c * 13 + frame * 0.01) <= -0.2) continue;
          ctx.fillStyle = wColor;
          ctx.globalAlpha = 0.25 + Math.sin(r * 3 + c * 5 + frame * 0.025) * 0.2;
          ctx.fillRect(px + c * 10, py + r * 14, 5, 8);
        }
        ctx.globalAlpha = 1;
        if (track.finishLineStyle === "neon") {
          ctx.strokeStyle = wColor; ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.3 + Math.sin(frame * 0.05 + px) * 0.25;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + bw, py); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case "tree": {
        ctx.fillStyle = "#5C4033"; ctx.fillRect(px + sz * 0.35, py + sz * 0.5, sz * 0.3, sz * 0.8);
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.arc(px + sz * 0.5, py + sz * 0.3, sz * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + sz * 0.25, py + sz * 0.45, sz * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + sz * 0.75, py + sz * 0.45, sz * 0.35, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "cactus": {
        ctx.fillStyle = el.color;
        ctx.fillRect(px + sz * 0.35, py, sz * 0.3, sz);
        ctx.fillRect(px, py + sz * 0.25, sz * 0.35, sz * 0.2);
        ctx.fillRect(px + sz * 0.65, py + sz * 0.4, sz * 0.35, sz * 0.2);
        ctx.fillRect(px, py + sz * 0.1, sz * 0.15, sz * 0.35);
        ctx.fillRect(px + sz * 0.85, py + sz * 0.25, sz * 0.15, sz * 0.35);
        break;
      }
      case "star": {
        const tw = 0.3 + Math.sin(frame * 0.08 + el.x * 100) * 0.5;
        ctx.globalAlpha = Math.max(0, tw);
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.arc(px, py, sz * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = el.color; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(px - sz * 0.2, py); ctx.lineTo(px + sz * 0.2, py); ctx.moveTo(px, py - sz * 0.2); ctx.lineTo(px, py + sz * 0.2); ctx.stroke();
        ctx.globalAlpha = 1; break;
      }
      case "cloud": {
        ctx.fillStyle = el.color;
        const drift = Math.sin(frame * 0.002 + el.x * 10) * 25 + frame * 0.02 * el.parallaxSpeed;
        const dx = (px + drift) % (W + sz * 2) - sz;
        ctx.beginPath();
        ctx.arc(dx, py, sz * 0.6, 0, Math.PI * 2);
        ctx.arc(dx + sz * 0.5, py - sz * 0.1, sz * 0.45, 0, Math.PI * 2);
        ctx.arc(dx + sz, py, sz * 0.5, 0, Math.PI * 2);
        ctx.arc(dx + sz * 0.5, py + sz * 0.15, sz * 0.4, 0, Math.PI * 2);
        ctx.fill(); break;
      }
      case "planet": {
        const grd = ctx.createRadialGradient(px - sz * 0.2, py - sz * 0.2, 0, px, py, sz);
        grd.addColorStop(0, el.color2 || "#7B3FA0"); grd.addColorStop(1, el.color);
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(px, py, sz * 1.5, sz * 0.3, -0.2, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case "mesa": {
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.moveTo(px - sz * 2, hY); ctx.lineTo(px - sz * 1.2, py); ctx.lineTo(px + sz * 1.2, py); ctx.lineTo(px + sz * 2, hY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = el.color2 || "#CD853F"; ctx.globalAlpha = 0.4;
        ctx.fillRect(px - sz * 1.2, py, sz * 2.4, sz * 0.3); ctx.globalAlpha = 1; break;
      }
      case "dune": {
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.moveTo(px - sz * 3, hY); ctx.quadraticCurveTo(px, py, px + sz * 3, hY); ctx.closePath(); ctx.fill(); break;
      }
      case "barn": {
        const bw = sz * 1.5, bh = sz * 1.2;
        ctx.fillStyle = el.color; ctx.fillRect(px, py, bw, bh);
        ctx.beginPath(); ctx.moveTo(px - sz * 0.2, py); ctx.lineTo(px + bw * 0.5, py - sz * 0.6); ctx.lineTo(px + bw + sz * 0.2, py); ctx.closePath(); ctx.fill();
        ctx.fillStyle = el.color2 || "#FFFACD"; ctx.fillRect(px + bw * 0.35, py + bh * 0.4, bw * 0.3, bh * 0.6); break;
      }
      case "silo": {
        ctx.fillStyle = el.color; ctx.fillRect(px, py, sz * 0.6, sz * 1.5);
        ctx.beginPath(); ctx.arc(px + sz * 0.3, py, sz * 0.3, Math.PI, 0); ctx.fill(); break;
      }
      case "fence": {
        ctx.strokeStyle = el.color; ctx.lineWidth = 1.5;
        for (let fx = 0; fx < W; fx += 20) { ctx.beginPath(); ctx.moveTo(fx, py); ctx.lineTo(fx, py + sz * 0.5); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, py + sz * 0.15); ctx.lineTo(W, py + sz * 0.15); ctx.moveTo(0, py + sz * 0.35); ctx.lineTo(W, py + sz * 0.35); ctx.stroke(); break;
      }
      case "rock": {
        ctx.fillStyle = el.color;
        ctx.beginPath(); ctx.moveTo(px, py + sz * 0.5); ctx.quadraticCurveTo(px + sz * 0.2, py - sz * 0.1, px + sz * 0.5, py + sz * 0.1); ctx.quadraticCurveTo(px + sz * 0.8, py, px + sz, py + sz * 0.5); ctx.closePath(); ctx.fill(); break;
      }
      case "lamppost": {
        ctx.strokeStyle = "#444"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + sz * 2); ctx.stroke();
        ctx.fillStyle = el.color;
        ctx.globalAlpha = 0.25 + Math.sin(frame * 0.04 + px) * 0.15;
        ctx.beginPath(); ctx.arc(px, py, sz * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(px, py, sz * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; break;
      }
    }
  }
}

function drawHeatShimmer(ctx: CanvasRenderingContext2D, W: number, y: number, w: number, h: number, frame: number) {
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let sx = 0; sx < w; sx += 8) {
    const offset = Math.sin(frame * 0.04 + sx * 0.08) * 2;
    ctx.fillStyle = "rgba(255,200,100,0.5)";
    ctx.fillRect(sx, y + offset, 6, h);
  }
  ctx.restore();
}

function drawFinishLine(ctx: CanvasRenderingContext2D, track: TrackConfig | undefined, x: number, y: number, h: number, frame: number) {
  const style = track?.finishLineStyle || "classic";
  const sz = 10;
  switch (style) {
    case "neon": {
      const colors = ["#ff00ff", "#00ffff", "#ff00ff"];
      for (let c = 0; c < 3; c++) {
        const glow = 0.4 + Math.sin(frame * 0.08 + c) * 0.3;
        ctx.fillStyle = colors[c % 3]; ctx.globalAlpha = glow * 0.6;
        ctx.fillRect(x + c * 4, y, 3, h);
      }
      // Bloom
      ctx.globalAlpha = 0.08 + Math.sin(frame * 0.05) * 0.04;
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(x - 8, y, 28, h);
      ctx.globalAlpha = 1; break;
    }
    case "ice": {
      ctx.fillStyle = "rgba(180,220,255,0.25)"; ctx.fillRect(x, y, 14, h);
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
      for (let iy = y; iy < y + h; iy += sz) ctx.strokeRect(x, iy, 14, sz);
      // Shimmer
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      const shY = y + ((frame * 1.5) % (h + 30)) - 15;
      ctx.fillRect(x, shY, 14, 15); break;
    }
    case "gold": {
      const gg = ctx.createLinearGradient(x, 0, x + 16, 0);
      gg.addColorStop(0, "#B8860B"); gg.addColorStop(0.5, "#FFD700"); gg.addColorStop(1, "#B8860B");
      ctx.fillStyle = gg; ctx.fillRect(x, y, 16, h);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x, y + ((frame * 2) % (h + 40)) - 20, 16, 20); break;
    }
    default: {
      for (let row = 0; row < Math.ceil(h / sz); row++) for (let c = 0; c < 3; c++) {
        ctx.fillStyle = (row + c) % 2 === 0 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.75)";
        ctx.fillRect(x + c * sz, y + row * sz, sz, sz);
      }
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, color: string, W: number, H: number, f: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < 20; i++) {
    const seed = i * 137.508;
    const px = (seed + f * 0.25) % W;
    const py = (seed * 2.3 + f * 0.12) % H;
    const sz = 0.8 + Math.sin(seed) * 0.8;
    ctx.globalAlpha = 0.15 + Math.sin(f * 0.04 + i * 0.7) * 0.12;
    ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
