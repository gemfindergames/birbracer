"use client";

import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "@/context/I18nContext";
import { RacerAnimState } from "@/types";

interface CommentaryProps { racers: RacerAnimState[]; status: string; }
interface CommentaryLine { id: number; text: string; icon: string; timestamp: number; }

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function Commentary({ racers, status }: CommentaryProps) {
  const { t } = useI18n();
  const [lines, setLines] = useState<CommentaryLine[]>([]);
  const idRef = useRef(0);
  const lastLeaderRef = useRef("");
  const lastCommentRef = useRef(0);
  const finishedSetRef = useRef<Set<string>>(new Set());
  const almostSetRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "RACING" || racers.length === 0) return;
    const now = Date.now();
    // 4 second minimum gap between comments (was 1.8s)
    if (now - lastCommentRef.current < 4000) return;

    const sorted = [...racers].sort((a, b) => (b.finished ? 1 : b.progress) - (a.finished ? 1 : a.progress));
    const leader = sorted[0], second = sorted[1];
    const newLines: CommentaryLine[] = [];

    function addLine(icon: string, text: string) {
      idRef.current++;
      newLines.push({ id: idRef.current, text, icon, timestamp: now });
      lastCommentRef.current = now;
    }

    // Lead change (important — always show)
    if (leader && leader.userId !== lastLeaderRef.current && lastLeaderRef.current !== "" && !leader.finished) {
      addLine("🔥", `${leader.username} ${t("commentary.takes.lead")}`);
      lastLeaderRef.current = leader.userId;
    } else if (leader && lastLeaderRef.current === "") {
      lastLeaderRef.current = leader.userId;
    }

    // Close race (rare — 8% chance, was 15%)
    if (!newLines.length && leader && second && !leader.finished && !second.finished && Math.abs(leader.progress - second.progress) < 0.05 && Math.random() < 0.08) {
      addLine("😱", t("commentary.close.race"));
    }

    // Speed burst (very rare — 2% chance, was 6%)
    if (!newLines.length && Math.random() < 0.02) {
      const active = racers.filter((r) => !r.finished);
      if (active.length > 0) {
        const r = pick(active);
        addLine("💨", `${r.username} ${t("commentary.speed.burst")}`);
      }
    }

    // Approaching finish (one-time per racer)
    for (const r of racers) {
      if (r.progress > 0.88 && !r.finished && !almostSetRef.current.has(r.userId)) {
        almostSetRef.current.add(r.userId);
        if (!newLines.length) addLine("🏁", `${r.username} ${t("commentary.almost")}`);
      }
    }

    // Finished (one-time per racer — always show)
    for (const r of racers) {
      if (r.finished && !finishedSetRef.current.has(r.userId)) {
        finishedSetRef.current.add(r.userId);
        const pos = finishedSetRef.current.size;
        const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏁";
        addLine(medal, `${r.username} ${t("commentary.finishes")} (P${pos})`);
      }
    }

    // Keep max 5 visible (was 8)
    if (newLines.length > 0) setLines((prev) => [...prev.slice(-4), ...newLines]);
  }, [racers, status, t]);

  useEffect(() => {
    if (status === "COUNTDOWN") {
      setLines([]);
      lastLeaderRef.current = "";
      lastCommentRef.current = 0;
      finishedSetRef.current.clear();
      almostSetRef.current.clear();
    }
  }, [status]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div className="w-full max-w-sm">
      <div ref={scrollRef} className="max-h-[120px] overflow-y-auto scrollbar-hide space-y-1.5 py-1">
        {lines.map((line) => (
          <div key={line.id} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-surface-100/80 dark:bg-surface-800/60 backdrop-blur-sm animate-slide-up text-sm">
            <span className="text-base flex-shrink-0">{line.icon}</span>
            <span className="text-surface-700 dark:text-surface-300 font-medium leading-tight">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
