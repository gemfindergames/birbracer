"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Locale } from "@/types";
import {
  getTranslation,
  getDefaultLocale,
  setLocale as storeLocale,
  LOCALES,
} from "@/i18n";

interface I18nContextType {
  locale: Locale;
  setLocale: (code: Locale) => void;
  t: (key: string, fallback?: string) => string;
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  locales: LOCALES,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(getDefaultLocale());
  }, []);

  const setLocale = useCallback((code: Locale) => {
    setLocaleState(code);
    storeLocale(code);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return getTranslation(locale, key, fallback);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
