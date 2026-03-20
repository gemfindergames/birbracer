"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";

const RACE_EMOJIS = ["🔥", "🚀", "😂", "😱", "💀", "👏", "❤️", "😎", "🎉", "😡"];

interface EmojiPickerProps { raceId: string; }

export function EmojiPicker({ raceId }: EmojiPickerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { play } = useSound();
  const [lastSent, setLastSent] = useState<string | null>(null);

  async function sendEmoji(emoji: string) {
    if (!user) return;
    setLastSent(emoji);
    play("emoji-pop");

    try {
      await fetch("/api/emoji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, emoji }),
      });
    } catch {}

    // Brief visual flash only (no blocking cooldown)
    setTimeout(() => setLastSent(null), 200);
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mr-0.5 hidden sm:block">{t("emoji.title")}</span>
      {RACE_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => sendEmoji(emoji)}
          className={`w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-xl sm:text-lg transition-all duration-100 active:scale-75 ${
            lastSent === emoji
              ? "scale-125 bg-brand-500/20"
              : "hover:bg-surface-100 dark:hover:bg-surface-800 hover:scale-110"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
