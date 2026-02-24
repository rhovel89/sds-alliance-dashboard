import React from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", labelKey: "lang.en" },
  { code: "es", labelKey: "lang.es" },
  { code: "fr", labelKey: "lang.fr" },
  { code: "pt", labelKey: "lang.pt" },
  { code: "de", labelKey: "lang.de" },
  { code: "ru", labelKey: "lang.ru" },
  { code: "zh", labelKey: "lang.zh" },
  { code: "ko", labelKey: "lang.ko" }
] as const;

export default function FloatingLanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 9999,
        border: "1px solid #333",
        borderRadius: 12,
        padding: 10,
        background: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(6px)",
        maxWidth: 280
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{t("lang.label")}</div>
      <select
        value={(i18n.language?.split("-")[0] ?? "en")}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        style={{ width: "100%" }}
        aria-label={t("lang.label")}
      >
        {LANGS.map((x) => (
          <option key={x.code} value={x.code}>
            {t(x.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}

