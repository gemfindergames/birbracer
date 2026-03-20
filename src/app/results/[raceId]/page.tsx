"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";
import { Podium } from "@/components/results/Podium";
import { Leaderboard } from "@/components/results/Leaderboard";
import { ShareCard } from "@/components/results/ShareCard";
import { RaceCanvas } from "@/components/race/RaceCanvas";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RaceResultPublic, RacerAnimState, RacePublic } from "@/types";

export default function ResultsPage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const { t } = useI18n();
  const { play } = useSound();
  const [results, setResults] = useState<RaceResultPublic[]>([]);
  const [raceName, setRaceName] = useState("");
  const [raceData, setRaceData] = useState<RacePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayPositions, setReplayPositions] = useState<RacerAnimState[]>([]);
  const replayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetch_() {
      try {
        const [r1, r2] = await Promise.all([fetch(`/api/races/${raceId}/results`), fetch(`/api/races/${raceId}`)]);
        if (r1.ok) { const d = await r1.json(); setResults(d.data || []); }
        if (r2.ok) { const d = await r2.json(); setRaceName(d.data?.name || ""); setRaceData(d.data || null); }
      } catch {} finally { setLoading(false); }
    }
    fetch_();
  }, [raceId]);

  useEffect(() => { if (!loading && results.length > 0 && !soundPlayed) { play("finish"); setSoundPlayed(true); } }, [loading, results, soundPlayed, play]);

  function startReplay() {
    if (replaying || results.length === 0) return;
    setReplaying(true); play("race-start");
    const duration = raceData?.raceDuration || 15;
    const totalFrames = duration * 10;
    let frame = 0;
    const racers: RacerAnimState[] = results.map((r, i) => ({ userId: r.userId, username: r.username, carId: r.carId, lane: i, progress: 0, speed: 0, finished: false, finishTime: null, avatarEmoji: r.avatarEmoji, avatarImage: r.avatarImage }));
    const finishFrames = results.map((r) => Math.round((r.finishTime / duration) * totalFrames));
    function tick() {
      frame++;
      const updated = racers.map((racer, i) => ({ ...racer, progress: Math.min(frame / finishFrames[i], 1), finished: frame >= finishFrames[i], finishTime: frame >= finishFrames[i] ? results[i].finishTime : null }));
      setReplayPositions(updated);
      if (frame >= totalFrames) { if (replayRef.current) clearInterval(replayRef.current); setTimeout(() => setReplaying(false), 2000); }
    }
    setReplayPositions(racers);
    replayRef.current = setInterval(tick, 100);
  }

  useEffect(() => { return () => { if (replayRef.current) clearInterval(replayRef.current); }; }, []);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-10">
        <div className="h-10 w-48 skeleton mx-auto mb-3" />
        <div className="h-5 w-32 skeleton mx-auto" />
      </div>
      <div className="flex items-end justify-center gap-6 mb-10">
        <div className="w-36"><div className="h-16 w-16 rounded-full skeleton mx-auto mb-3" /><div className="h-28 skeleton rounded-t-2xl" /></div>
        <div className="w-44"><div className="h-22 w-22 rounded-full skeleton mx-auto mb-3" /><div className="h-40 skeleton rounded-t-2xl" /></div>
        <div className="w-36"><div className="h-14 w-14 rounded-full skeleton mx-auto mb-3" /><div className="h-20 skeleton rounded-t-2xl" /></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-10">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-2 text-shimmer bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">{t("results.title")}</h1>
        {raceName && <p className="text-surface-500 text-lg">{raceName}</p>}
      </div>
      {results.length === 0 ? (
        <div className="text-center py-16"><span className="text-4xl block mb-4">🏁</span><p className="text-surface-500">{t("results.no.results")}</p></div>
      ) : (
        <div className="space-y-10">
          <Podium results={results} />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <ShareCard raceName={raceName} results={results} />
            <Button variant="secondary" onClick={startReplay} disabled={replaying} loading={replaying}>
              {replaying ? `🏎️ ${t("race.replaying")}` : `🔄 ${t("race.replay")}`}
            </Button>
          </div>
          {replaying && raceData && (
            <div className="animate-fade-in"><div className="text-center mb-3"><Badge variant="brand" pulse>🔄 {t("race.replay")}</Badge></div><RaceCanvas trackId={raceData.trackId} racers={replayPositions} status="RACING" /></div>
          )}
          <div className="flex items-center gap-4"><div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" /><span className="text-surface-400 text-sm font-medium">{t("results.full")}</span><div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" /></div>
          <Leaderboard results={results} />
        </div>
      )}
      <div className="text-center mt-12"><Link href="/"><Button variant="secondary" size="lg">← {t("results.back")}</Button></Link></div>
    </div>
  );
}
