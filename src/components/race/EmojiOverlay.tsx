"use client";

import React, { useState, useEffect } from "react";
import { EmojiReactionPublic } from "@/types";

interface FloatingEmoji {
  id: string;
  emoji: string;
  username: string;
  x: number;
  timestamp: number;
}

interface EmojiOverlayProps { raceId: string; }

export function EmojiOverlay({ raceId }: EmojiOverlayProps) {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    function handleEmojiEvent(event: CustomEvent<EmojiReactionPublic>) {
      const reaction = event.detail;
      if (reaction.raceId !== raceId) return;

      const floating: FloatingEmoji = {
        id: reaction.id || `${Date.now()}-${Math.random()}`,
        emoji: reaction.emoji,
        username: reaction.username,
        x: 5 + Math.random() * 85,
        timestamp: Date.now(),
      };

      setEmojis((prev) => [...prev.slice(-15), floating]);
      setTimeout(() => {
        setEmojis((prev) => prev.filter((e) => e.id !== floating.id));
      }, 2800);
    }

    window.addEventListener("birbracer:emoji" as any, handleEmojiEvent as EventListener);
    return () => window.removeEventListener("birbracer:emoji" as any, handleEmojiEvent as EventListener);
  }, [raceId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden">
      {emojis.map((e) => (
        <div
          key={e.id}
          className="absolute bottom-24 animate-float-up"
          style={{ left: `${e.x}%` }}
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <span className="text-2xl">{e.emoji}</span>
            <span className="text-[11px] font-bold text-white/90 max-w-[80px] truncate">
              {e.username}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function dispatchEmojiEvent(reaction: EmojiReactionPublic) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("birbracer:emoji", { detail: reaction }));
  }
}
