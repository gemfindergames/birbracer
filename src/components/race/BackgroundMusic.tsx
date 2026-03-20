"use client";

import React, { useEffect, useRef } from "react";
import { useSound } from "@/context/SoundContext";

interface BackgroundMusicProps {
  playing: boolean;
  intensity?: "low" | "medium" | "high";
}

export function BackgroundMusic({ playing, intensity = "medium" }: BackgroundMusicProps) {
  const { muted } = useSound();
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; master: GainNode } | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (playing && !muted && !activeRef.current) startMusic();
    else if ((!playing || muted) && activeRef.current) stopMusic();
    return () => { stopMusic(); };
  }, [playing, muted]);

  useEffect(() => {
    if (!nodesRef.current || !ctxRef.current) return;
    // Very quiet — just atmosphere, not a song
    const vol = intensity === "high" ? 0.018 : intensity === "medium" ? 0.012 : 0.008;
    nodesRef.current.master.gain.setTargetAtTime(vol, ctxRef.current.currentTime, 1.0);
  }, [intensity]);

  function startMusic() {
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      const oscs: OscillatorNode[] = [];

      // Soft pad chord: C major (C3, E3, G3) with sine waves
      // Very gentle, like ambient background in a cozy game
      const padNotes = [130.81, 164.81, 196.00]; // C3, E3, G3
      for (const freq of padNotes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.3; // relative to master (which is very low)
        osc.connect(gain).connect(master);
        osc.start();
        oscs.push(osc);
      }

      // Very slow shimmer — a high sine that gently fades in and out
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "sine";
      shimmer.frequency.value = 523.25; // C5
      shimmerGain.gain.value = 0.06;
      shimmer.connect(shimmerGain).connect(master);
      shimmer.start();
      oscs.push(shimmer);

      // Slow LFO on shimmer volume for gentle breathing effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15; // very slow: one cycle every ~7 seconds
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain).connect(shimmerGain.gain);
      lfo.start();
      oscs.push(lfo);

      nodesRef.current = { osc: oscs, master };

      // Very slow fade in (2 seconds)
      master.gain.setTargetAtTime(0.012, ctx.currentTime, 2.0);
      activeRef.current = true;
    } catch {}
  }

  function stopMusic() {
    if (ctxRef.current && nodesRef.current) {
      const ctx = ctxRef.current;
      const { master, osc } = nodesRef.current;
      // Slow fade out
      master.gain.setTargetAtTime(0, ctx.currentTime, 1.0);
      setTimeout(() => {
        osc.forEach((o) => { try { o.stop(); } catch {} });
        try { ctx.close(); } catch {}
      }, 2000);
    }
    nodesRef.current = null;
    ctxRef.current = null;
    activeRef.current = false;
  }

  return null;
}
