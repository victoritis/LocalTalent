import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import es from "./es.json"
import en from "./en.json"

export const LANGUAGES = [
  { code: "es", labelKey: "language.spanish", dateLocale: "es" },
  { code: "en", labelKey: "language.english", dateLocale: "en-US" },
] as const

export type SupportedLanguage = (typeof LANGUAGES)[number]["code"]

export const LANGUAGE_STORAGE_KEY = "localtalent.language"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

export default i18n
