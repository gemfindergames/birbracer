"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { RacePublic } from "@/types";
import { getAllTracks } from "@/lib/tracks";

const tracks = getAllTracks();

const TRACK_NAMES: Record<string, string[]> = {
  ranch: ["Sunny Stampede", "Barn Burner", "Harvest Highway", "Country Classic", "Golden Fields GP"],
  desert: ["Scorched Sprint", "Sandstorm Dash", "Cactus Canyon", "Mirage Mile", "Sunburn Circuit"],
  neon: ["Neon Nights", "Cyber Circuit", "Pixel Rush", "Synthwave Sprint", "Electric Avenue"],
  space: ["Cosmic Circuit", "Stardust Speedway", "Galaxy Grand Prix", "Nebula Dash", "Asteroid Alley"],
  snow: ["Frozen Peaks", "Blizzard Blitz", "Ice Crystal Run", "Frostbite Sprint", "Polar Express"],
  city: ["City Lights", "Downtown Dash", "Skyline Sprint", "Metro Madness", "Neon District GP"],
};

function getRandomName(trackId: string): string {
  const names = TRACK_NAMES[trackId] || TRACK_NAMES["desert"];
  return names[Math.floor(Math.random() * names.length)];
}

function toCentralTime(date: Date): string {
  return date.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [races, setRaces] = useState<RacePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [raceName, setRaceName] = useState("");
  const [trackId, setTrackId] = useState("desert");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [duration, setDuration] = useState(15);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // 🕵️ Spy state
  const [spyRace, setSpyRace] = useState<RacePublic | null>(null);
  const [spyPick, setSpyPick] = useState<string | null>(null);
  const [spySaving, setSpySaving] = useState(false);
  const [spyConfirmed, setSpyConfirmed] = useState<Record<string, string>>({}); // raceId -> userId

  useEffect(() => { if (!authLoading && (!user || !user.isAdmin)) router.push("/login"); }, [user, authLoading, router]);

  const fetchRaces = useCallback(async () => {
    try { const res = await fetch("/api/races"); if (res.ok) { const d = await res.json(); setRaces(d.data || []); } } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRaces(); const i = setInterval(fetchRaces, 5000); return () => clearInterval(i); }, [fetchRaces]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!raceName.trim() || creating) return;
    setCreating(true);
    try {
      let scheduledAt = null;
      if (scheduleEnabled && scheduleDate && scheduleTime) {
        const [y, m, d] = scheduleDate.split("-").map(Number);
        const [hr, min] = scheduleTime.split(":").map(Number);
        const utc = new Date(Date.UTC(y, m - 1, d, hr + 6, min));
        scheduledAt = utc.toISOString();
      }
      const res = await fetch("/api/races", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: raceName.trim(), trackId, maxPlayers, raceDuration: duration, scheduledAt }),
      });
      if (res.ok) { setShowCreate(false); setRaceName(""); setScheduleEnabled(false); setScheduleDate(""); setScheduleTime(""); await fetchRaces(); }
    } catch {} finally { setCreating(false); }
  }

  async function handleAction(raceId: string, action: string, body?: object) {
    try { const res = await fetch(`/api/races/${raceId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); if (res.ok) await fetchRaces(); } catch {}
  }

  function handleCopyLink(raceId: string) { navigator.clipboard.writeText(`${window.location.origin}/lobby/${raceId}`); setCopiedId(raceId); setTimeout(() => setCopiedId(null), 2000); }
  function handleCopyWatch(raceId: string) { navigator.clipboard.writeText(`${window.location.origin}/watch/${raceId}`); setCopiedId(`w-${raceId}`); setTimeout(() => setCopiedId(null), 2000); }

  // 🕵️ Spy functions
  function openSpyModal(race: RacePublic) {
    setSpyRace(race);
    setSpyPick(spyConfirmed[race.id] || null);
  }

  async function handleSpySave() {
    if (!spyRace) return;
    setSpySaving(true);
    try {
      await fetch("/api/admin/rig", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: spyRace.id, userId: spyPick }),
      });
      if (spyPick) {
        setSpyConfirmed((prev) => ({ ...prev, [spyRace!.id]: spyPick! }));
      } else {
        setSpyConfirmed((prev) => { const n = { ...prev }; delete n[spyRace!.id]; return n; });
      }
    } catch {} finally { setSpySaving(false); setSpyRace(null); }
  }

  if (authLoading || !user?.isAdmin) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;

  const statusLabel = (s: string) => ({ LOBBY: t("status.waiting"), CAR_SELECT: t("status.picking.cars"), COUNTDOWN: t("status.starting"), RACING: t("status.racing"), FINISHED: t("status.finished"), ARCHIVED: "Archived" }[s] || s);
  const statusVariant = (s: string): "brand" | "green" | "red" | "yellow" => { if (s === "RACING") return "red"; if (s === "FINISHED") return "green"; if (s === "CAR_SELECT" || s === "COUNTDOWN") return "brand"; return "yellow"; };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div><h1 className="font-display font-bold text-xl sm:text-3xl flex items-center gap-2"><span>⚡</span>{t("admin.title")}</h1></div>
        <div className="flex items-center gap-2">
          <Link href="/admin/security"><Button variant="ghost" size="sm">🛡️ {t("admin.security")}</Button></Link>
          <Button variant="primary" size="sm" onClick={() => { setShowCreate(true); setRaceName(getRandomName(trackId)); }}>+ {t("admin.create.race")}</Button>
        </div>
      </div>

      {/* Race List */}
      {loading ? (
        <div className="text-center py-16 text-surface-500">{t("common.loading")}</div>
      ) : races.length === 0 ? (
        <Card className="text-center py-12"><span className="text-4xl block mb-3">🏎️</span><p className="text-surface-500">{t("home.no.races")}</p></Card>
      ) : (
        <div className="space-y-3">
          {races.map((race) => {
            const scheduled = (race as any).scheduledAt;
            const hasSpyPick = !!spyConfirmed[race.id];
            const canSpy = race.status === "LOBBY" || race.status === "CAR_SELECT";
            return (
              <Card key={race.id} className="!p-3 sm:!p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sm sm:text-base">{race.name}</h3>
                    <Badge variant={statusVariant(race.status)} pulse={race.status === "RACING" || race.status === "COUNTDOWN"}>{statusLabel(race.status)}</Badge>
                    <span className="text-xs text-surface-400">👥 {race.participants.length}/{race.maxPlayers}</span>
                    {scheduled && <span className="text-xs text-amber-500 font-medium">⏰ {toCentralTime(new Date(scheduled))} CT</span>}
                    {hasSpyPick && <span className="text-xs" title="Secret winner set">🕵️</span>}
                  </div>

                  {race.participants.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {race.participants.map((p) => (
                        <span key={p.userId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${spyConfirmed[race.id] === p.userId ? "bg-purple-500/10 ring-1 ring-purple-500/30 text-purple-500" : "bg-surface-100 dark:bg-surface-800"}`} title={p.username}>
                          {p.avatarEmoji || "🐦"} {p.username}
                          {p.carId && <span className="text-brand-500">✓</span>}
                          {spyConfirmed[race.id] === p.userId && <span>🕵️</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(race.id)}>
                      {copiedId === race.id ? "✅" : "🔗"} {copiedId === race.id ? t("admin.copied") : t("admin.copy.link")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyWatch(race.id)}>
                      {copiedId === `w-${race.id}` ? "✅" : "👁️"} {copiedId === `w-${race.id}` ? t("admin.copied") : t("admin.watch")}
                    </Button>

                    {/* 🕵️ Spy Pick Button */}
                    {canSpy && race.participants.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => openSpyModal(race)} className={hasSpyPick ? "!text-purple-500" : ""}>
                        🕵️ {hasSpyPick ? "Rigged" : "Spy"}
                      </Button>
                    )}

                    {race.status === "LOBBY" && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => handleAction(race.id, "start", { action: "car_select" })}>🚗 {t("admin.open.car.select")}</Button>
                        <Button variant="primary" size="sm" onClick={() => handleAction(race.id, "start", { action: "race" })}>🏁 {t("admin.start.race")}</Button>
                      </>
                    )}
                    {race.status === "CAR_SELECT" && (
                      <Button variant="primary" size="sm" onClick={() => handleAction(race.id, "start", { action: "race" })}>🏁 {t("admin.start.race")}</Button>
                    )}
                    {(race.status === "LOBBY" || race.status === "CAR_SELECT" || race.status === "RACING") && (
                      <Button variant="danger" size="sm" onClick={() => handleAction(race.id, "cancel")}>✕ {t("admin.cancel.race")}</Button>
                    )}
                    {(race.status === "FINISHED" || race.status === "ARCHIVED") && (
                      <Button variant="danger" size="sm" onClick={() => handleAction(race.id, "delete")}>🗑️ {t("admin.delete.race")}</Button>
                    )}
                    {race.status === "FINISHED" && <Link href={`/results/${race.id}`}><Button variant="ghost" size="sm">📊 {t("race.view.results")}</Button></Link>}
                    {(race.status === "LOBBY" || race.status === "CAR_SELECT") && <Link href={`/lobby/${race.id}`}><Button variant="ghost" size="sm">👁️ {t("admin.view")}</Button></Link>}
                    {race.status === "RACING" && <Link href={`/watch/${race.id}`}><Button variant="ghost" size="sm">👁️ {t("admin.watch")}</Button></Link>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Create Race Modal ─── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("admin.create.race")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label={t("admin.race.name")} value={raceName} onChange={(e) => setRaceName(e.target.value)} placeholder="e.g. Friday Night Race" autoFocus />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">{t("admin.track")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tracks.map((track) => (
                <button key={track.id} type="button" onClick={() => { setTrackId(track.id); setRaceName(getRandomName(track.id)); }}
                  className={`p-2.5 rounded-xl text-left transition-all duration-200 ${trackId === track.id ? "ring-2 ring-brand-500 bg-brand-500/10" : "bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>
                  <div className="h-10 rounded-lg mb-1.5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${track.skyGradient[0]}, ${track.skyGradient[1]})` }}>
                    <div className="w-full h-full flex items-center justify-center"><span className="text-sm opacity-60">🏎️</span></div>
                  </div>
                  <div className="font-semibold text-xs">{track.name}</div>
                  <div className="text-[10px] text-surface-400">{track.finishLineStyle} finish</div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(TRACK_NAMES[trackId] || []).map((name) => (
                <button key={name} type="button" onClick={() => setRaceName(name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${raceName === name ? "bg-brand-500 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700"}`}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("admin.max.players")} type="number" value={String(maxPlayers)} onChange={(e) => setMaxPlayers(Number(e.target.value))} min={2} max={20} />
            <Input label={t("admin.duration")} type="number" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} min={10} max={60} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`w-10 h-6 rounded-full transition-colors ${scheduleEnabled ? "bg-brand-500" : "bg-surface-300 dark:bg-surface-700"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 mt-1 ${scheduleEnabled ? "translate-x-4" : ""}`} />
              </button>
              <span className="text-sm font-medium">⏰ Schedule for later (US Central)</span>
            </div>
            {scheduleEnabled && (
              <div className="grid grid-cols-2 gap-2 animate-slide-up">
                <div><label className="block text-xs font-medium text-surface-500 mb-1">Date</label><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="input-field !py-2 !text-sm" min={new Date().toISOString().split("T")[0]} /></div>
                <div><label className="block text-xs font-medium text-surface-500 mb-1">Time (Central)</label><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="input-field !py-2 !text-sm" /></div>
                {scheduleDate && scheduleTime && <div className="col-span-2 text-xs text-amber-500 font-medium">⏰ Race starts at {scheduleTime} CT on {scheduleDate}</div>}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="primary" loading={creating}>{t("admin.create.race")}</Button>
          </div>
        </form>
      </Modal>

      {/* ─── 🕵️ Spy Pick Modal ─── */}
      <Modal open={!!spyRace} onClose={() => setSpyRace(null)} title="🕵️ Secret Winner Pick">
        {spyRace && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🕵️</div>
              <p className="text-sm text-surface-500">Choose who will win <span className="font-bold text-surface-700 dark:text-surface-300">{spyRace.name}</span></p>
              <p className="text-xs text-surface-400 mt-1">Nobody will know. The race will look completely natural.</p>
            </div>

            {/* Player selection */}
            <div className="space-y-1.5">
              {/* Random option */}
              <button
                onClick={() => setSpyPick(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  !spyPick
                    ? "bg-surface-200 dark:bg-surface-700 ring-2 ring-surface-400"
                    : "bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                }`}
              >
                <span className="text-xl">🎲</span>
                <div className="text-left flex-1">
                  <div className="font-semibold text-sm">Random (fair race)</div>
                  <div className="text-xs text-surface-400">Let fate decide</div>
                </div>
                {!spyPick && <span className="text-brand-500 font-bold text-sm">✓</span>}
              </button>

              {/* Each player */}
              {spyRace.participants.map((p) => (
                <button
                  key={p.userId}
                  onClick={() => setSpyPick(p.userId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    spyPick === p.userId
                      ? "bg-purple-500/10 ring-2 ring-purple-500/50"
                      : "bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700"
                  }`}
                >
                  <span className="text-xl flex-shrink-0">
                    {p.avatarImage ? <img src={p.avatarImage} alt="" className="w-8 h-8 rounded-full object-cover" /> : (p.avatarEmoji || "🐦")}
                  </span>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{p.username}</div>
                    {p.carId && <div className="text-xs text-surface-400">Car selected ✓</div>}
                  </div>
                  {spyPick === p.userId && <span className="text-purple-500 text-lg">🕵️</span>}
                </button>
              ))}
            </div>

            {spyPick && (
              <div className="px-4 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
                <span className="text-xs text-purple-500 font-medium">
                  🕵️ {spyRace.participants.find((p) => p.userId === spyPick)?.username} will secretly win this race
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSpyRace(null)}>{t("common.cancel")}</Button>
              <Button
                variant="primary"
                onClick={handleSpySave}
                loading={spySaving}
                className="!bg-gradient-to-r !from-purple-600 !to-purple-500 !shadow-purple-500/25"
              >
                🕵️ {spyPick ? "Set Secret Winner" : "Set to Random"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
