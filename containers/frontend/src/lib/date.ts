import { format as fnsFormat, parseISO } from "date-fns"
import { enUS, es } from "date-fns/locale"
import type { Locale } from "date-fns"
import i18n from "@/i18n"

const LOCALE_MAP: Record<string, Locale> = {
  es,
  en: enUS,
  "en-US": enUS,
}

export function getLocale(): Locale {
  const lang = i18n.resolvedLanguage ?? i18n.language ?? "es"
  return LOCALE_MAP[lang] ?? LOCALE_MAP[lang.split("-")[0]] ?? es
}

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input
  if (typeof input === "number") return new Date(input)
  return parseISO(input)
}

export function formatDate(
  input: Date | string | number,
  pattern = "PP",
): string {
  return fnsFormat(toDate(input), pattern, { locale: getLocale() })
}

export function formatDateTime(
  input: Date | string | number,
  pattern = "PPp",
): string {
  return fnsFormat(toDate(input), pattern, { locale: getLocale() })
}

export function formatTime(
  input: Date | string | number,
  pattern = "p",
): string {
  return fnsFormat(toDate(input), pattern, { locale: getLocale() })
}

export function formatLongDate(input: Date | string | number): string {
  return formatDate(input, "PPPP")
}
