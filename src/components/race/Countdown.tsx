"use client";

import React, { useEffect, useState, useRef } from "react";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";

interface CountdownProps { value: number | null; }

const VOICE_WORDS: Record<number, string> = {
  3: "Three",
  2: "Two",
  1: "One",
  0: "Go!",
};

function speakWord(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  // Cancel any pending speech
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = word === "Go!" ? 1.3 : 0.9;
  utter.pitch = word === "Go!" ? 1.4 : 0.8;
  utter.volume = 0.8;
  // Try to find a deeper/robotic voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) =>
    v.name.includes("Google") || v.name.includes("Daniel") || v.name.includes("Alex") || v.name.includes("Male")
  );
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

export function Countdown({ value }: CountdownProps) {
  const { t } = useI18n();
  const { play } = useSound();
  const [display, setDisplay] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isGo, setIsGo] = useState(false);
  const voiceInitRef = useRef(false);

  // Pre-init voices (browsers require a user gesture first, but we try)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis && !voiceInitRef.current) {
      window.speechSynthesis.getVoices();
      voiceInitRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (value === null) { setDisplay(null); setIsGo(false); return; }
    if (value > 0) {
      setDisplay(String(value));
      setIsGo(false);
      play("countdown");
      speakWord(VOICE_WORDS[value] || String(value));
    } else if (value === 0) {
      setDisplay(t("race.go"));
      setIsGo(true);
      play("race-start");
      speakWord("Go!");
    }
    setAnimKey((k) => k + 1);
  }, [value, t, play]);

  if (display === null) return null;

  return (
    <div className={`fixed inset-0 z-[90] flex items-center justify-center pointer-events-none ${isGo ? "animate-shake" : ""}`}>
      {/* Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
          opacity: isGo ? 0.3 : 0.7,
        }}
      />

      {/* Pulse ring */}
      <div
        key={`ring-${animKey}`}
        className="absolute rounded-full"
        style={{
          width: isGo ? 400 : 200,
          height: isGo ? 400 : 200,
          border: isGo ? "4px solid rgba(59,108,245,0.4)" : "2px solid rgba(255,255,255,0.15)",
          animation: "countdown-ring 0.6s ease-out forwards",
        }}
      />

      {/* Secondary ring for GO */}
      {isGo && (
        <div
          key={`ring2-${animKey}`}
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            border: "3px solid rgba(255,200,0,0.3)",
            animation: "countdown-ring 0.8s ease-out 0.1s forwards",
          }}
        />
      )}

      {/* Number / GO */}
      <div key={animKey} style={{ animation: isGo ? "countdown-go 0.5s ease-out" : "countdown-pop 0.4s ease-out" }}>
        <span
          className={`font-display font-black ${
            isGo
              ? "text-7xl sm:text-9xl bg-gradient-to-r from-brand-400 via-brand-300 to-brand-400 bg-clip-text text-transparent"
              : "text-8xl sm:text-[10rem] text-white"
          }`}
          style={{
            textShadow: isGo
              ? "0 0 60px rgba(59,108,245,0.8), 0 0 120px rgba(59,108,245,0.3)"
              : "0 4px 20px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.1)",
            letterSpacing: isGo ? "0.05em" : undefined,
          }}
        >
          {display}
        </span>
      </div>

      {/* Voice indicator */}
      <div className="absolute bottom-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm">
        <span className="text-lg">🎙️</span>
        <span className="text-white/60 text-sm font-medium">
          {isGo ? "GO!" : VOICE_WORDS[value || 3] || "..."}
        </span>
      </div>

      <style jsx>{`
        @keyframes countdown-ring {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes countdown-go {
          0% { transform: scale(0.3); opacity: 0; }
          40% { transform: scale(1.15); opacity: 1; }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
