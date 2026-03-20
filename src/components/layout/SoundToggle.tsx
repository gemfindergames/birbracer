"use client";

import React from "react";
import { useSound } from "@/context/SoundContext";

export function SoundToggle() {
  const { muted, toggleMute } = useSound();

  return (
    <button
      onClick={toggleMute}
      className="relative p-1.5 sm:p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Sound off" : "Sound on"}
    >
      <div className="w-4 h-4 sm:w-5 sm:h-5">
        {muted ? (
          <svg
            className="w-5 h-5 text-surface-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-brand-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
