"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";

interface HornButtonProps { raceId: string; carId?: string; }

export function HornButton({ raceId, carId }: HornButtonProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { play } = useSound();
  const [honking, setHonking] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  async function honk() {
    if (!user || cooldown) return;
    setCooldown(true); setHonking(true);
    play(carId ? `horn-${carId}` as any : "horn");
    try { await fetch("/api/emoji", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raceId, emoji: "📯HONK" }) }); } catch {}
    setTimeout(() => setHonking(false), 300);
    setTimeout(() => setCooldown(false), 3000);
  }

  return (
    <button onClick={honk} disabled={cooldown}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm transition-all duration-200 ${honking ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-500/40" : cooldown ? "bg-surface-200 dark:bg-surface-800 text-surface-400 cursor-not-allowed" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:scale-105 active:scale-95"}`}>
      <span className={`text-xl ${honking ? "animate-shake" : ""}`}>📯</span>
      <span>{cooldown && !honking ? "..." : t("race.horn")}</span>
    </button>
  );
}
