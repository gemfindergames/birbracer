"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import { useRace } from "@/hooks/useRace";
import { RaceCanvas } from "@/components/race/RaceCanvas";
import { EmojiOverlay, dispatchEmojiEvent } from "@/components/race/EmojiOverlay";
import { Commentary } from "@/components/race/Commentary";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SSEEvent, EmojiReactionPublic } from "@/types";

export default function WatchPage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const router = useRouter();
  const { t } = useI18n();
  const { race, loading, connected, positions, countdown } = useRace({ raceId });
  const [finished, setFinished] = useState(false);

  // SSE for emojis
  useEffect(() => {
    if (!raceId) return;
    const es = new EventSource(`/api/sse/${raceId}`);
    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);
        if (parsed.type === "emoji:new") {
          const reaction = parsed.data as EmojiReactionPublic;
          if (reaction.emoji !== "📯HONK") dispatchEmojiEvent(reaction);
        }
      } catch {}
    };
    return () => es.close();
  }, [raceId]);

  useEffect(() => {
    if (race?.status === "FINISHED" && !finished) {
      setFinished(true);
      setTimeout(() => router.push(`/results/${raceId}`), 4000);
    }
  }, [race?.status, finished, raceId, router]);

  if (loading) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;
  if (!race) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="card text-center max-w-sm"><span className="text-4xl block mb-4">🏎️</span><p className="text-surface-500 mb-4">{t("lobby.race.not.found")}</p><Link href="/"><Button variant="secondary">{t("results.back")}</Button></Link></div></div>;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="font-display font-bold text-lg sm:text-2xl truncate">{race.name}</h1>
          {race.status === "RACING" && <Badge variant="red" pulse>{t("race.live")}</Badge>}
          {race.status === "LOBBY" && <Badge variant="yellow" pulse>{t("status.waiting")}</Badge>}
          {finished && <Badge variant="green">{t("status.finished")}</Badge>}
          <Badge variant="brand">👁️ Spectator</Badge>
        </div>
        <div className="flex items-center gap-2">
          {connected && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          <Link href="/"><Button variant="ghost" size="sm">← {t("common.back")}</Button></Link>
        </div>
      </div>

      {(race.status === "RACING" || race.status === "COUNTDOWN" || race.status === "FINISHED") ? (
        <div className="mb-4"><RaceCanvas trackId={race.trackId} racers={positions} status={race.status} /></div>
      ) : (
        <div className="card text-center py-12 mb-4">
          <span className="text-4xl block mb-3">⏳</span>
          <p className="font-display font-bold text-lg">{t("lobby.waiting")}</p>
          <p className="text-sm text-surface-500 mt-1">{race.participants.length}/{race.maxPlayers} {t("home.players")}</p>
        </div>
      )}

      {(race.status === "RACING") && <Commentary racers={positions} status={race.status} />}

      {finished && (
        <div className="flex items-center gap-3 animate-fade-in mt-4">
          <span className="text-2xl">🏆</span>
          <div><p className="font-display font-bold">{t("race.finished")}</p><p className="text-sm text-surface-500">{t("race.redirecting")}</p></div>
          <Link href={`/results/${raceId}`}><Button variant="primary" size="sm">{t("race.view.results")}</Button></Link>
        </div>
      )}

      <EmojiOverlay raceId={raceId} />
    </div>
  );
}
