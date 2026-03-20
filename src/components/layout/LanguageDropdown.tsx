"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";
import { Locale } from "@/types";

export function LanguageDropdown() {
  const { locale, setLocale, locales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === locale);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 text-sm"
        aria-label="Select language"
      >
        <span className="text-base">{current?.flag}</span>
        <span className="hidden sm:inline text-surface-600 dark:text-surface-400 font-medium">
          {current?.code.toUpperCase()}
        </span>
        <svg
          className={`w-3 h-3 text-surface-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 py-1 rounded-xl glass dark:glass border border-surface-200 dark:border-surface-700 shadow-xl animate-scale-in origin-top-right z-50 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                locale === l.code
                  ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                  : "text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              <span>{l.name}</span>
              {locale === l.code && (
                <svg
                  className="w-4 h-4 ml-auto text-brand-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
