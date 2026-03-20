"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { getSoundPlayer, SoundName } from "@/lib/sounds";

interface SoundContextType {
  muted: boolean;
  toggleMute: () => void;
  play: (name: SoundName) => void;
  stop: (name: SoundName) => void;
  stopAll: () => void;
}

const SoundContext = createContext<SoundContextType>({
  muted: false,
  toggleMute: () => {},
  play: () => {},
  stop: () => {},
  stopAll: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const playerRef = useRef<ReturnType<typeof getSoundPlayer> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const player = getSoundPlayer();
    playerRef.current = player;
    setMuted(player.muted);
    setReady(true);
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      const newMuted = playerRef.current.toggle();
      setMuted(newMuted);
    }
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (playerRef.current && !playerRef.current.muted) {
        playerRef.current.play(name);
      }
    },
    []
  );

  const stop = useCallback((name: SoundName) => {
    playerRef.current?.stop(name);
  }, []);

  const stopAll = useCallback(() => {
    playerRef.current?.stopAll();
  }, []);

  return (
    <SoundContext.Provider value={{ muted, toggleMute, play, stop, stopAll }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}
