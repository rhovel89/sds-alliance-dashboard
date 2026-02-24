import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";

const STORAGE_KEY = "sad_lang_v1";

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
  de: { translation: de },
  ru: { translation: ru },
  zh: { translation: zh },
  ko: { translation: ko },
} as const;

// RTL support for future languages (not used by current list)
const rtlLangs = new Set<string>(["ar", "fa", "ur", "he"]);

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
    // Support base langs; i18next will fall back from zh-CN -> zh automatically
    supportedLngs: ["en", "es", "pt", "fr", "de", "ru", "zh", "ko"],
    nonExplicitSupportedLngs: true,
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
