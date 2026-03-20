"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const EMOJI_OPTIONS = ["🐦","🦅","🦉","🐧","🦆","🐥","🦜","🦩","🐶","🐱","🦊","🐻","🐼","🐯","🦁","🐸","🏎️","🚀","⚡","🔥","💎","👑","🎮","🎯","😎","🤖","👾","🎃","💀","👻","🌟","🌈"];

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarMode, setAvatarMode] = useState<"emoji"|"upload">("emoji");
  const [selectedEmoji, setSelectedEmoji] = useState("🐦");
  const [uploadPreview, setUploadPreview] = useState<string|null>(null);
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signup, updateAvatar } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { setError(t("auth.error.image.size")); return; }
    if (!file.type.startsWith("image/")) { setError(t("auth.error.image.type")); return; }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setAvatarMode("upload"); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (username.trim().length < 3) { setError(t("auth.error.short.user")); return; }
    if (password.length < 4) { setError(t("auth.error.short.pass")); return; }
    setLoading(true);
    const result = await signup(username.trim(), password);
    if (result.error) { setError(result.error); setLoading(false); return; }
    if (avatarMode === "upload" && uploadFile) {
      try { const fd = new FormData(); fd.append("avatar", uploadFile); await fetch("/api/upload/avatar", { method: "POST", body: fd }); } catch {}
    } else { await updateAvatar(selectedEmoji); }
    router.push("/");
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 overflow-visible">
            <img src="/icon.png" alt="BirbRacers" className="object-contain logo-img" style={{ height: "72px", width: "72px" }} />
          </div>
          <h1 className="font-display font-bold text-2xl mb-1">{t("auth.signup.title")}</h1>
          <p className="text-surface-500 text-sm">{t("auth.signup.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("auth.username")} type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("auth.username")} autoComplete="username" required />
          <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} autoComplete="new-password" required />
          <div className="space-y-3">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">{t("avatar.title")}</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAvatarMode("emoji")} className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${avatarMode === "emoji" ? "bg-brand-500 text-white shadow-md" : "bg-surface-100 dark:bg-surface-800 text-surface-500"}`}>😎 {t("avatar.emoji")}</button>
              <button type="button" onClick={() => { setAvatarMode("upload"); fileInputRef.current?.click(); }} className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${avatarMode === "upload" ? "bg-brand-500 text-white shadow-md" : "bg-surface-100 dark:bg-surface-800 text-surface-500"}`}>📷 {t("avatar.upload")}</button>
            </div>
            {avatarMode === "emoji" && (
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => setSelectedEmoji(emoji)} className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all duration-150 ${selectedEmoji === emoji ? "bg-brand-500 scale-110 shadow-lg shadow-brand-500/30" : "hover:bg-surface-200 dark:hover:bg-surface-700 hover:scale-105"}`}>{emoji}</button>
                ))}
              </div>
            )}
            {avatarMode === "upload" && (
              <div className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                {uploadPreview ? (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                    <img src={uploadPreview} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500" />
                    <div className="flex-1"><p className="text-sm font-medium text-surface-700 dark:text-surface-300">{t("auth.upload.looking.good")}</p><p className="text-xs text-surface-400">{uploadFile?.name}</p></div>
                    <button type="button" onClick={() => { setUploadPreview(null); setUploadFile(null); fileInputRef.current?.click(); }} className="btn-ghost text-xs">{t("auth.upload.change")}</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-center">
                    <span className="text-3xl block mb-2">📷</span>
                    <span className="text-sm text-surface-500">{t("auth.upload.tap")}</span>
                    <span className="text-xs text-surface-400 block mt-1">{t("auth.upload.formats")}</span>
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <span>{t("auth.your.avatar")}</span>
              {avatarMode === "upload" && uploadPreview ? <img src={uploadPreview} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="text-2xl">{selectedEmoji}</span>}
            </div>
          </div>
          {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-shake">{error}</div>}
          <Button type="submit" variant="primary" loading={loading} className="w-full">{t("auth.signup")}</Button>
        </form>
        <div className="mt-6 text-center text-sm text-surface-500">{t("auth.has.account")}{" "}<Link href="/login" className="text-brand-500 hover:text-brand-400 font-semibold transition-colors">{t("auth.login")}</Link></div>
      </div>
    </div>
  );
}
