"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { ThemeToggle } from "./ThemeToggle";
import { SoundToggle } from "./SoundToggle";
import { LanguageDropdown } from "./LanguageDropdown";

// ─── LOGO CONFIG ────────────────────────────
// To change the logo later, just replace /public/logo.png
// The icon version at /public/icon.png is used on mobile
const LOGO_FULL = "/logo.png";   // Full logo with text (desktop)
const LOGO_ICON = "/icon.png";   // Just the birb (mobile)
// ─────────────────────────────────────────────

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass dark:glass border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* ─── Logo ─── */}
            <Link href="/" className="flex items-center gap-1.5 group flex-shrink-0">
              {/* Mobile: icon only */}
              <img
                src={LOGO_ICON}
                alt="BirbRacers"
                className="sm:hidden h-10 w-auto object-contain logo-img"
                draggable={false}
              />
              {/* Desktop: full logo */}
              <img
                src={LOGO_FULL}
                alt="BirbRacers"
                className="hidden sm:block h-11 lg:h-12 w-auto object-contain logo-img group-hover:drop-shadow-md transition-all duration-300"
                draggable={false}
              />
            </Link>

            {/* ─── Right side ─── */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <LanguageDropdown />
                <ThemeToggle />
                <SoundToggle />
              </div>

              <div className="w-px h-5 sm:h-6 bg-surface-300/50 dark:bg-surface-700/50 mx-0.5 sm:mx-1" />

              {loading ? (
                <div className="w-16 h-8 rounded-lg bg-surface-200 dark:bg-surface-800 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {user.isAdmin && (
                    <Link href="/admin" className="hidden sm:flex btn-ghost text-sm items-center gap-1">
                      <span className="text-xs">⚡</span>
                      <span className="hidden lg:inline">{t("nav.admin")}</span>
                    </Link>
                  )}
                  {user.isAdmin && (
                    <Link href="/admin" className="sm:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title={t("nav.admin")}>
                      <span className="text-sm">⚡</span>
                    </Link>
                  )}

                  <Link href="/profile" className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800/80 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all group">
                    <span className="text-base sm:text-lg flex-shrink-0">
                      {user.avatarImage ? (
                        <img src={user.avatarImage} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-1 ring-surface-300 dark:ring-surface-600" />
                      ) : (
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand-500/10 flex items-center justify-center text-sm">
                          {user.avatarEmoji || "🐦"}
                        </span>
                      )}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-surface-700 dark:text-surface-300 group-hover:text-brand-500 transition-colors max-w-[60px] sm:max-w-[100px] truncate">
                      {user.username}
                    </span>
                  </Link>

                  <button onClick={logout} className="hidden sm:block btn-ghost text-sm text-surface-500">{t("nav.logout")}</button>
                  <button onClick={logout} className="sm:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-400" title={t("nav.logout")}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link href="/login" className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all active:scale-95">
                    {t("nav.login")}
                  </Link>
                  <Link href="/signup" className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-md shadow-brand-500/20 transition-all active:scale-95">
                    {t("nav.signup")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
