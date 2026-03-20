"use client";

import React, { useCallback, useState } from "react";
import { RaceResultPublic } from "@/types";
import { getCarById } from "@/lib/cars";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/Button";

interface ShareCardProps { raceName: string; results: RaceResultPublic[]; }

export function ShareCard({ raceName, results }: ShareCardProps) {
  const [generating, setGenerating] = useState(false);
  const { t } = useI18n();

  const generate = useCallback(async () => {
    if (results.length === 0) return;
    setGenerating(true);
    try {
      const W = 1200, H = 630;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0A0E1A"); bg.addColorStop(0.5, "#0F1628"); bg.addColorStop(1, "#0A0E1A");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(59,108,245,0.04)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // Header - draw logo image
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = "/logo.png";
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = 45;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        ctx.drawImage(logoImg, 30, 15, logoW, logoH);
      } else {
        ctx.font = 'bold 24px system-ui, sans-serif'; ctx.fillStyle = "#3b6cf5"; ctx.textAlign = "left"; ctx.fillText("BirbRacer", 50, 48);
      }
      ctx.font = 'bold 36px system-ui, sans-serif'; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.fillText(raceName, W / 2, 55);
      const sep = ctx.createLinearGradient(100, 0, W - 100, 0);
      sep.addColorStop(0, "transparent"); sep.addColorStop(0.3, "rgba(59,108,245,0.3)"); sep.addColorStop(0.7, "rgba(59,108,245,0.3)"); sep.addColorStop(1, "transparent");
      ctx.strokeStyle = sep; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(100, 78); ctx.lineTo(W - 100, 78); ctx.stroke();

      // Podium
      const top3 = results.slice(0, 3);
      const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
      const medals = ["🥈", "🥇", "🥉"];
      const podiumHeights = [130, 170, 95];
      const podiumColors = [["#6B7280","#9CA3AF"],["#D97706","#F59E0B"],["#B45309","#D97706"]];
      const podiumX = [W/2-220, W/2, W/2+220];
      const podiumBottomY = 560;

      const carImages: (HTMLImageElement|null)[] = [];
      await Promise.all(podiumOrder.map((r, i) => new Promise<void>((resolve) => {
        if (!r) { carImages[i] = null; resolve(); return; }
        const car = getCarById(r.carId);
        if (!car) { carImages[i] = null; resolve(); return; }
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { carImages[i] = img; resolve(); };
        img.onerror = () => { carImages[i] = null; resolve(); };
        img.src = car.imagePath;
      })));

      for (let i = 0; i < podiumOrder.length; i++) {
        const r = podiumOrder[i]; if (!r) continue;
        const cx = podiumX[i], ph = podiumHeights[i];
        const car = getCarById(r.carId);
        const accent = car?.accentColor || "#3b6cf5";
        const isW = i === 1;
        const pbTopY = podiumBottomY - ph;
        const cw = isW ? 150 : 120, ch = cw * 0.45;
        const carY = pbTopY - ch - 8, carNameY = pbTopY - 2, timeY = carY - 8, nameY = timeY - 20;
        const avatarR = isW ? 32 : 26, avatarCY = nameY - avatarR - 10, medalY = avatarCY - avatarR - 8;

        ctx.font = `${isW ? 40 : 34}px serif`; ctx.textAlign = "center"; ctx.fillText(medals[i], cx, medalY);
        ctx.fillStyle = accent; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR+2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR, 0, Math.PI*2); ctx.stroke();
        ctx.font = `${isW?28:22}px serif`; ctx.fillStyle = "#ffffff"; ctx.fillText(r.avatarEmoji||"🐦", cx, avatarCY+(isW?10:8));
        ctx.font = `bold ${isW?20:16}px system-ui, sans-serif`; ctx.fillStyle = "#ffffff"; ctx.fillText(r.username, cx, nameY);
        ctx.font = `${isW?14:12}px monospace`; ctx.fillStyle = "#94a3b8"; ctx.fillText(`${r.finishTime.toFixed(2)}s`, cx, timeY);
        const ci = carImages[i]; if (ci?.complete && ci.naturalWidth > 0) ctx.drawImage(ci, cx-cw/2, carY, cw, ch);
        if (car) { ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = "#64748b"; ctx.fillText(car.name, cx, carNameY); }
        const pbW = isW ? 160 : 140;
        const pG = ctx.createLinearGradient(0, pbTopY, 0, podiumBottomY); pG.addColorStop(0, podiumColors[i][1]); pG.addColorStop(1, podiumColors[i][0]);
        ctx.fillStyle = pG; ctx.beginPath(); ctx.roundRect(cx-pbW/2, pbTopY, pbW, ph, [12,12,0,0]); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.roundRect(cx-pbW/2, pbTopY, pbW/2, ph, [12,0,0,0]); ctx.fill();
        ctx.font = `bold ${isW?40:32}px system-ui, sans-serif`; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillText(`${r.position}`, cx, pbTopY+(isW?55:45));
      }

      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = "#475569"; ctx.textAlign = "center"; ctx.fillText("birbracer.com", W/2, H-15);
      ctx.strokeStyle = "rgba(59,108,245,0.12)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(1,1,W-2,H-2,16); ctx.stroke();

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `birbracer-${raceName.replace(/\s+/g,"-").toLowerCase()}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setGenerating(false);
      }, "image/png");
    } catch { setGenerating(false); }
  }, [raceName, results]);

  if (results.length === 0) return null;
  return <Button variant="primary" onClick={generate} loading={generating}>📸 {t("results.download")}</Button>;
}
