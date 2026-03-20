"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCarById } from "@/lib/cars";

const EMOJI_OPTIONS = [
  "🐦", "🦅", "🦉", "🐧", "🦆", "🐥", "🦜", "🦩",
  "🐶", "🐱", "🦊", "🐻", "🐼", "🐯", "🦁", "🐸",
  "🏎️", "🚀", "⚡", "🔥", "💎", "👑", "🎮", "🎯",
  "😎", "🤖", "👾", "🎃", "💀", "👻", "🌟", "🌈",
];

interface Stats {
  totalRaces: number; wins: number; podiums: number; bestTime: number | null;
  winRate: number; favoriteCar: string | null; joinedAt: string | null;
  recentRaces: { raceId: string; raceName: string; position: number; finishTime: number; carId: string; date: string; }[];
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateAvatar, refreshUser } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setSelectedEmoji(user.avatarEmoji || "🐦");
    fetch("/api/auth/stats").then((r) => r.json()).then((d) => {
      if (d.success) setStats(d.data);
    }).catch(() => {}).finally(() => setLoadingStats(false));
  }, [user]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function saveAvatar() {
    setSaving(true);
    if (uploadFile) {
      const formData = new FormData();
      formData.append("avatar", uploadFile);
      await fetch("/api/upload/avatar", { method: "POST", body: formData });
    } else {
      await updateAvatar(selectedEmoji);
    }
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setEditingAvatar(false);
    setUploadFile(null);
    setUploadPreview(null);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading || !user) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;
  }

  const favCar = stats?.favoriteCar ? getCarById(stats.favoriteCar) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-5xl ring-4 ring-brand-500/20">
              {user.avatarImage ? (
                <img src={user.avatarImage} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (user.avatarEmoji || "🐦")}
            </div>
            <button
              onClick={() => setEditingAvatar(!editingAvatar)}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm hover:bg-brand-400 transition-all shadow-lg"
            >✏️</button>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="font-display font-bold text-2xl">{user.username}</h1>
            {user.isAdmin && <span className="badge-brand mt-1">⚡ Admin</span>}
            {stats?.joinedAt && (
              <p className="text-sm text-surface-500 mt-1">
                {t("profile.joined")} {new Date(stats.joinedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {saved && <span className="badge-green animate-bounce-in">{t("profile.saved")}</span>}
        </div>

        {/* Avatar Editor */}
        {editingAvatar && (
          <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-800 space-y-4 animate-slide-up">
            <h3 className="font-display font-bold text-sm">{t("profile.edit.avatar")}</h3>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-surface-100 dark:bg-surface-800">
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} onClick={() => { setSelectedEmoji(emoji); setUploadFile(null); setUploadPreview(null); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all ${selectedEmoji === emoji && !uploadPreview ? "bg-brand-500 scale-110" : "hover:bg-surface-200 dark:hover:bg-surface-700"}`}>
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-secondary !py-2 !px-4 text-sm">
                📷 {t("avatar.upload")}
              </button>
              {uploadPreview && <img src={uploadPreview} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500" alt="" />}
            </div>
            <Button variant="primary" size="sm" onClick={saveAvatar} loading={saving}>{t("profile.save")}</Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {loadingStats ? (
        <div className="text-center py-8 text-surface-500">{t("common.loading")}</div>
      ) : stats ? (
        <>
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <span>📊</span> {t("profile.stats")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <Card className="!p-4 text-center">
              <div className="text-3xl font-display font-bold text-brand-500">{stats.totalRaces}</div>
              <div className="text-xs text-surface-500 mt-1">{t("profile.total.races")}</div>
            </Card>
            <Card className="!p-4 text-center">
              <div className="text-3xl font-display font-bold text-yellow-500">{stats.wins}</div>
              <div className="text-xs text-surface-500 mt-1">🏆 {t("profile.wins")}</div>
            </Card>
            <Card className="!p-4 text-center">
              <div className="text-3xl font-display font-bold text-amber-500">{stats.podiums}</div>
              <div className="text-xs text-surface-500 mt-1">🥇 {t("profile.podiums")}</div>
            </Card>
            <Card className="!p-4 text-center">
              <div className="text-3xl font-display font-bold">{stats.bestTime ? `${stats.bestTime.toFixed(2)}s` : "—"}</div>
              <div className="text-xs text-surface-500 mt-1">⚡ {t("profile.best.time")}</div>
            </Card>
            <Card className="!p-4 text-center">
              <div className="text-3xl font-display font-bold text-emerald-500">{stats.winRate}%</div>
              <div className="text-xs text-surface-500 mt-1">📈 {t("profile.win.rate")}</div>
            </Card>
            <Card className="!p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {favCar ? (
                  <>
                    <img src={favCar.imagePath} alt="" className="w-12 h-6 object-contain" />
                  </>
                ) : <span className="text-2xl">🏎️</span>}
              </div>
              <div className="text-xs text-surface-500 mt-1">{t("profile.favorite.car")}</div>
              {favCar && <div className="text-[10px] text-surface-400">{favCar.name}</div>}
            </Card>
          </div>

          {/* Recent Races */}
          <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <span>🏁</span> {t("profile.recent.races")}
          </h2>
          {stats.recentRaces.length === 0 ? (
            <Card className="text-center py-8">
              <span className="text-3xl block mb-2">🏎️</span>
              <p className="text-surface-500">{t("profile.no.races")}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {stats.recentRaces.map((race) => {
                const car = getCarById(race.carId);
                const medal = race.position === 1 ? "🥇" : race.position === 2 ? "🥈" : race.position === 3 ? "🥉" : `#${race.position}`;
                return (
                  <Card key={`${race.raceId}-${race.date}`} className="!p-3 flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{medal}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{race.raceName}</div>
                      <div className="text-xs text-surface-400">{new Date(race.date).toLocaleDateString()}</div>
                    </div>
                    {car && <img src={car.imagePath} alt="" className="w-14 h-7 object-contain hidden sm:block" />}
                    <span className="font-mono text-sm text-surface-400">{race.finishTime.toFixed(2)}s</span>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
