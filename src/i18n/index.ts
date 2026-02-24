import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import fr from "./locales/fr.json";

const STORAGE_KEY = "sad_lang_v1";

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
} as const;

const rtlLangs = new Set<string>(["ar", "fa", "ur"]);

function applyDocumentLang(lang: string) {
  const base = (lang || "en").split("-")[0].toLowerCase();
  if (typeof document !== "undefined") {
    document.documentElement.lang = base;
    document.documentElement.dir = rtlLangs.has(base) ? "rtl" : "ltr";
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "es", "pt", "fr"],
    interpolation: { escapeValue: false },
    returnNull: false,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

applyDocumentLang(i18n.language);
i18n.on("languageChanged", (lng) => applyDocumentLang(lng));

export default i18n;
export const SAD_LANGUAGE_STORAGE_KEY = STORAGE_KEY;
