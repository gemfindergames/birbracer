"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { CarCard } from "./CarCard";
import type { CarConfig } from "@/config/cars";

interface CarWithStatus extends CarConfig {
  status: "available" | "locked" | "taken";
  lockedBy?: string | null;
  lockedByUserId?: string;
  lockedUntil?: string | null;
}

interface CarGridProps {
  raceId: string;
  onCarConfirmed?: (carId: string) => void;
}

export function CarGrid({ raceId, onCarConfirmed }: CarGridProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [cars, setCars] = useState<CarWithStatus[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCars = useCallback(async () => {
    try {
      const res = await fetch(`/api/cars?raceId=${raceId}`);
      if (res.ok) {
        const data = await res.json();
        setCars(data.data);
        const myConfirmed = data.data.find(
          (c: CarWithStatus) => c.status === "taken" && c.lockedBy === user?.username
        );
        if (myConfirmed) setSelectedCarId(myConfirmed.id);
      }
    } catch {} finally { setLoading(false); }
  }, [raceId, user?.username]);

  useEffect(() => {
    fetchCars();
    const interval = setInterval(fetchCars, 3000);
    return () => clearInterval(interval);
  }, [fetchCars]);

  async function handleLock(carId: string) {
    if (!user) return;
    try {
      const res = await fetch("/api/cars/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, carId }),
      });
      if (res.ok) await fetchCars();
    } catch {}
  }

  async function handleConfirm(carId: string) {
    if (!user) return;
    try {
      const res = await fetch("/api/cars/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, carId }),
      });
      if (res.ok) {
        setSelectedCarId(carId);
        onCarConfirmed?.(carId);
        await fetchCars();
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-surface-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <span>🏎️</span>
        {t("lobby.select.car")}
        <span className="text-sm font-normal text-surface-400">({cars.length} cars)</span>
        {selectedCarId && (
          <span className="badge-green ml-2">{t("lobby.ready")}</span>
        )}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            currentUserId={user?.id || ""}
            selectedCarId={selectedCarId}
            onLock={handleLock}
            onConfirm={handleConfirm}
          />
        ))}
      </div>
    </div>
  );
}
