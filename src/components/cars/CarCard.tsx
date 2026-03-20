"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";
import { useSound } from "@/context/SoundContext";
import type { CarConfig } from "@/config/cars";

interface CarCardProps {
  car: CarConfig & {
    status: "available" | "locked" | "taken";
    lockedBy?: string | null;
    lockedByUserId?: string;
    lockedUntil?: string | null;
  };
  currentUserId: string;
  selectedCarId: string | null;
  onLock: (carId: string) => void;
  onConfirm: (carId: string) => void;
}

export function CarCard({ car, currentUserId, selectedCarId, onLock, onConfirm }: CarCardProps) {
  const { t } = useI18n();
  const { play } = useSound();
  const [countdown, setCountdown] = useState<number | null>(null);

  const isMyLock = car.status === "locked" && car.lockedByUserId === currentUserId;
  const isMyConfirmed = selectedCarId === car.id;

  useEffect(() => {
    if (!isMyLock || !car.lockedUntil) { setCountdown(null); return; }
    function tick() {
      const remaining = Math.max(0, Math.ceil((new Date(car.lockedUntil!).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) setCountdown(null);
    }
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [isMyLock, car.lockedUntil]);

  function handleClick() {
    if (car.status === "taken" && !isMyConfirmed) return;
    if (car.status === "locked" && !isMyLock) return;
    if (isMyLock) { play("car-select"); onConfirm(car.id); }
    else if (car.status === "available") { play("click"); onLock(car.id); }
  }

  const accent = car.accentColor;
  const isClickable = car.status === "available" || isMyLock;

  let borderStyle = "border-surface-200 dark:border-surface-700";
  let glowStyle = {};
  let statusBadge: React.ReactNode = null;

  if (isMyConfirmed) {
    borderStyle = "border-2";
    glowStyle = { borderColor: accent, boxShadow: `0 0 20px ${accent}40, 0 0 40px ${accent}15` };
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: accent }}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        {t("car.selected")}
      </span>
    );
  } else if (isMyLock) {
    borderStyle = "border-2 border-amber-400 dark:border-amber-400";
    glowStyle = { boxShadow: "0 0 20px rgba(251,191,36,0.3)" };
    statusBadge = (
      <span className="badge-yellow text-[10px]">{t("car.lock.timer")} {countdown ?? "..."}{t("common.seconds")}</span>
    );
  } else if (car.status === "locked") {
    borderStyle = "border border-amber-500/30";
    statusBadge = <span className="badge-yellow text-[10px]">🔒 {car.lockedBy}</span>;
  } else if (car.status === "taken") {
    borderStyle = "border border-surface-300 dark:border-surface-700 opacity-40";
    statusBadge = <span className="badge-red text-[10px]">{t("car.taken")}</span>;
  } else {
    statusBadge = <span className="badge-green text-[10px]">{t("car.available")}</span>;
  }

  return (
    <div
      onClick={handleClick}
      className={`relative rounded-2xl ${borderStyle} bg-white dark:bg-surface-900 overflow-hidden transition-all duration-300 ease-out ${
        isClickable
          ? "cursor-pointer hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98]"
          : car.status === "taken" && !isMyConfirmed
          ? "cursor-not-allowed"
          : ""
      }`}
      style={glowStyle}
    >
      {/* Color accent strip at top */}
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />

      {/* Car image */}
      <div className="relative aspect-[16/9] p-3 flex items-center justify-center bg-gradient-to-b from-surface-50 to-surface-100 dark:from-surface-800/50 dark:to-surface-900/50">
        <img
          src={car.imagePath}
          alt={car.name}
          className={`w-full h-full object-contain drop-shadow-lg transition-transform duration-500 ${
            isMyConfirmed ? "animate-car-idle" : ""
          } ${isClickable ? "group-hover:scale-105" : ""}`}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60'%3E%3Crect fill='%23334155' width='100' height='60' rx='8'/%3E%3Ctext x='50' y='35' text-anchor='middle' fill='%2394a3b8' font-size='12'%3E🏎️%3C/text%3E%3C/svg%3E";
          }}
        />

        {/* Taken overlay */}
        {car.status === "taken" && !isMyConfirmed && (
          <div className="absolute inset-0 bg-surface-900/50 dark:bg-surface-950/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="text-3xl">🔒</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: accent }} />
          <h3 className="font-display font-bold text-sm truncate flex-1">{car.name}</h3>
        </div>

        <div className="flex items-center justify-between gap-2">
          {statusBadge}

          {isMyLock && countdown !== null && countdown > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); play("car-select"); onConfirm(car.id); }}
              className="btn-primary !py-1 !px-3 text-[11px] !rounded-lg"
            >
              {t("car.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
