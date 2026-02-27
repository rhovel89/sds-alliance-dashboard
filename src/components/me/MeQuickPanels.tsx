import React from "react";
import { useTranslation } from "react-i18next";
import DailyBriefingPanel from "./DailyBriefingPanel";

function Card(props: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
      <div style={{ marginTop: 12 }}>         <DailyBriefingPanel />       </div>
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      <div style={{ marginTop: 10 }}>{props.children}</div>
      {props.note ? <div style={{ opacity: 0.65, fontSize: 12, marginTop: 8 }}>{props.note}</div> : null}
    </div>
  );
}

export default function MeQuickPanels() {
  const { t } = useTranslation();

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <Card title={t("me.quickLinks")} note=" ">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/me">{t("nav.me")}</a>
          <a href="/mail-threads">{t("nav.mailThreads")}</a>
          <a href="/mail-v2">{t("nav.mailInbox")}</a>
          <a href="/me/hq-manager">{t("nav.hqManager")}</a>
          <a href="/state/789/achievements/request-v2">{t("nav.achRequest")}</a>
          <a href="/state/789/achievements/admin-v2">{t("nav.achAdmin")}</a>
          <a href="/state/789/alerts-db">{t("nav.stateAlerts")}</a>
          <a href="/state/789/discussion-db">{t("nav.stateDiscussion")}</a>
        </div>
      </Card>

      <Card title={t("me.today")} note={t("me.todayNote")}>
        <div style={{ opacity: 0.85 }}>{t("me.todayNote")}</div>
      </Card>

      <Card title={t("me.tips")} note={t("me.tipsNote")}>
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
          <li>{t("me.tip1")}</li>
          <li>{t("me.tip2")}</li>
          <li>{t("me.tip3")}</li>
        </ul>
      </Card>
    </div>
  );
}


