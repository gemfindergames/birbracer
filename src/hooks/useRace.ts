"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RacePublic, SSEEvent, RaceStatus, RacerAnimState } from "@/types";
import { useSSE } from "./useSSE";

interface UseRaceOptions {
  raceId: string;
  enabled?: boolean;
}

export function useRace({ raceId, enabled = true }: UseRaceOptions) {
  const [race, setRace] = useState<RacePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<RacerAnimState[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Fetch race data
  const fetchRace = useCallback(async () => {
    if (!raceId || !enabled) return;
    try {
      const res = await fetch(`/api/races/${raceId}`);
      if (res.ok) {
        const data = await res.json();
        setRace(data.data);
        setError(null);
      } else {
        setError("Race not found");
      }
    } catch {
      setError("Failed to fetch race");
    } finally {
      setLoading(false);
    }
  }, [raceId, enabled]);

  useEffect(() => {
    fetchRace();
  }, [fetchRace]);

  // Handle SSE events
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case "race:update":
          setRace((prev) => {
            if (!prev) return prev;
            return { ...prev, ...(event.data as Partial<RacePublic>) };
          });
          break;

        case "race:countdown":
          setCountdown(event.data as number);
          break;

        case "race:positions":
          setPositions(event.data as RacerAnimState[]);
          break;

        case "race:finished":
          setRace((prev) => {
            if (!prev) return prev;
            return { ...prev, status: "FINISHED" as RaceStatus };
          });
          break;

        case "player:joined":
        case "player:left":
        case "car:locked":
        case "car:confirmed":
        case "car:released":
          // Refetch full race data for these events
          fetchRace();
          break;
      }
    },
    [fetchRace]
  );

  const { connected } = useSSE({
    raceId,
    enabled: enabled && !!raceId,
    onEvent: handleSSEEvent,
  });

  return {
    race,
    loading,
    error,
    connected,
    positions,
    countdown,
    refetch: fetchRace,
  };
}
