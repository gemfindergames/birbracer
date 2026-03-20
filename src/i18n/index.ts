// ─────────────────────────────────────────────
// BirbRacer — i18n System
// ─────────────────────────────────────────────

import { Locale, LocaleConfig } from "@/types";

import en from "./locales/en.json";
import es from "./locales/es.json";
import tr from "./locales/tr.json";
import zh from "./locales/zh.json";
import hi from "./locales/hi.json";
import ms from "./locales/ms.json";
import ru from "./locales/ru.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";

export const LOCALES: LocaleConfig[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
];

const translations: Record<Locale, Record<string, string>> = {
  en,
  es,
  tr,
  zh,
  hi,
  ms,
  ru,
  fr,
  it,
};

export function getTranslation(
  locale: Locale,
  key: string,
  fallback?: string
): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
}

export function getLocaleConfig(code: Locale): LocaleConfig | undefined {
  return LOCALES.find((l) => l.code === code);
}

export function getDefaultLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("birbracer_locale") as Locale | null;
    if (stored && translations[stored]) return stored;
  }
  return "en";
}

export function setLocale(code: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("birbracer_locale", code);
  }
}
