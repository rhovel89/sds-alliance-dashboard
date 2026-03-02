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
import { buildResources } from "./resources";

const STORAGE_KEY = "sad_lang_v1";

// RTL support for future languages (not used by current list)
const rtlLangs = new Set<string>(["ar", "fa", "ur", "he"]);

function applyDocumentLang(lang: string) {
  const base = (lang || "en").split("-")[0].toLowerCase();
  if (typeof document !== "undefined") {
    document.documentElement.lang = base;
    document.documentElement.dir = rtlLangs.has(base) ? "rtl" : "ltr";
  }
}

// Prevent repeated init + repeated event handlers (fixes spam if app remounts)
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: buildResources(),
      fallbackLng: "en",
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
}

export default i18n;
export const SAD_LANGUAGE_STORAGE_KEY = STORAGE_KEY;
