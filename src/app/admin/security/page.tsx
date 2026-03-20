"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { UserSecurity } from "@/types";

interface SecurityUser extends UserSecurity { isSuspicious: boolean; isBanned?: boolean; }

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const pts = code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

export default function SecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && (!user || !user.isAdmin)) router.push("/login"); }, [user, authLoading, router]);

  async function fetchUsers() {
    try { const res = await fetch("/api/admin/security"); if (res.ok) { const d = await res.json(); setUsers(d.data || []); } } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); const i = setInterval(fetchUsers, 10000); return () => clearInterval(i); }, []);

  async function handleBan(userId: string, action: "ban" | "unban") {
    setBanning(userId);
    try {
      await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await fetchUsers();
    } catch {} finally { setBanning(null); }
  }

  if (authLoading || !user?.isAdmin) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-surface-500">{t("common.loading")}</div></div>;

  const suspiciousCount = users.filter((u) => u.isSuspicious).length;
  const bannedCount = users.filter((u: any) => u.isBanned).length;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-3xl flex items-center gap-2"><span>🛡️</span>{t("admin.security.title")}</h1>
          <p className="text-surface-500 text-xs sm:text-sm mt-1">Monitor users, ban abusers instantly</p>
        </div>
        <div className="flex items-center gap-2">
          {suspiciousCount > 0 && <Badge variant="red">⚠️ {suspiciousCount}</Badge>}
          {bannedCount > 0 && <Badge variant="red">🚫 {bannedCount} banned</Badge>}
          <Link href="/admin"><Button variant="ghost" size="sm">← {t("common.back")}</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
        <Card className="!p-3 sm:!p-4 text-center"><div className="text-xl sm:text-2xl font-display font-bold">{users.length}</div><div className="text-[10px] sm:text-xs text-surface-500">Total Users</div></Card>
        <Card className="!p-3 sm:!p-4 text-center"><div className="text-xl sm:text-2xl font-display font-bold text-red-500">{suspiciousCount}</div><div className="text-[10px] sm:text-xs text-surface-500">Suspicious</div></Card>
        <Card className="!p-3 sm:!p-4 text-center"><div className="text-xl sm:text-2xl font-display font-bold">{new Set(users.map((u) => u.ipAddress).filter(Boolean)).size}</div><div className="text-[10px] sm:text-xs text-surface-500">Unique IPs</div></Card>
        <Card className="!p-3 sm:!p-4 text-center"><div className="text-xl sm:text-2xl font-display font-bold text-red-500">{bannedCount}</div><div className="text-[10px] sm:text-xs text-surface-500">Banned</div></Card>
      </div>

      {loading ? (
        <div className="text-center py-16 text-surface-500">{t("common.loading")}</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isBanned = (u as any).isBanned;
            return (
              <div key={u.id} className={`card !p-3 sm:!p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${u.isSuspicious ? "!border-red-500/30 bg-red-500/5" : ""} ${isBanned ? "opacity-50" : ""}`}>
                {/* User */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{u.avatarImage ? <img src={u.avatarImage} alt="" className="w-7 h-7 rounded-full object-cover" /> : (u.avatarEmoji || "🐦")}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{u.username}</span>
                      {u.isAdmin && <span className="text-[10px] text-brand-500 font-bold">ADMIN</span>}
                      {isBanned && <Badge variant="red">🚫 BANNED</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-surface-400">
                      <span className="font-mono">{u.ipAddress || "N/A"}</span>
                      <span>{countryFlag(u.countryCode)} {u.country || u.countryCode || ""}</span>
                      <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.isSuspicious && <Badge variant="red">⚠️ Dup IP</Badge>}

                  {/* Ban/Unban button */}
                  {!u.isAdmin && (
                    isBanned ? (
                      <button
                        onClick={() => handleBan(u.id, "unban")}
                        disabled={banning === u.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {banning === u.id ? "..." : "✅ Unban"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBan(u.id, "ban")}
                        disabled={banning === u.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {banning === u.id ? "..." : "🚫 Ban"}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {users.length === 0 && <div className="text-center py-12 text-surface-500">No users found</div>}
        </div>
      )}
    </div>
  );
}
