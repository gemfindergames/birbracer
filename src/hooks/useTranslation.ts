"use client";

import { useI18n } from "@/context/I18nContext";

// Shorthand hook — same as useI18n but a familiar name
export function useTranslation() {
  return useI18n();
}
