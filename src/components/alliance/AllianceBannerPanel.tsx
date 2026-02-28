import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { ALLIANCE_BANNERS_BUCKET } from "../../lib/storageBuckets";

function safeKeyPart(s: string) {
  return String(s || "").replace(/[^\w.\-]+/g, "_");
}

export default function AllianceBannerPanel() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [canManage, setCanManage] = useState(false);
  const [bannerPath, setBannerPath] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  async function load() {
    if (!allianceCode) return;

    setStatus("");
    try {
      const cm = await supabase.rpc("can_manage_alliance_banner", { p_alliance_code: allianceCode });
      if (!cm.error) setCanManage(!!cm.data);
    } catch {}

    const r = await supabase
      .from("alliance_theme_settings")
      .select("banner_path,updated_at")
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (r.error) {
      setStatus(r.error.message);
      setBannerPath(null);
      setBannerUrl(null);
      return;
    }

    const p = r.data?.banner_path ? String(r.data.banner_path) : null;
    setBannerPath(p);

    if (!p) {
      setBannerUrl(null);
      return;
    }

    const s = await supabase.storage.from(ALLIANCE_BANNERS_BUCKET).createSignedUrl(p, 60 * 60);
    if (s.error || !s.data?.signedUrl) {
      setStatus(s.error?.message || "Could not load banner.");
      setBannerUrl(null);
      return;
    }
    setBannerUrl(s.data.signedUrl);
  }

  useEffect(() => { void load(); }, [allianceCode]);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    if (!allianceCode) return;

    const f = files[0];
    if (!String(f.type || "").startsWith("image/")) return alert("Please upload an image file.");
    if (f.size > 8 * 1024 * 1024) return alert("Max 8MB per banner.");

    const path = `${allianceCode}/${Date.now()}-${safeKeyPart(f.name)}`;

    setStatus("Uploading…");
    const up = await supabase.storage.from(ALLIANCE_BANNERS_BUCKET).upload(path, f, { upsert: false });
    if (up.error) { setStatus(up.error.message); alert(up.error.message); return; }

    const save = await supabase
      .from("alliance_theme_settings")
      .upsert({ alliance_code: allianceCode, banner_path: path, banner_mime: f.type || null });

    if (save.error) { setStatus(save.error.message); alert(save.error.message); return; }

    // Best-effort delete old banner file
    if (bannerPath && bannerPath !== path) {
      try { await supabase.storage.from(ALLIANCE_BANNERS_BUCKET).remove([bannerPath]); } catch {}
    }

    setStatus("Saved ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function removeBanner() {
    if (!bannerPath) return;
    const ok = confirm("Remove the alliance banner?");
    if (!ok) return;

    setStatus("Removing…");
    const delRow = await supabase.from("alliance_theme_settings").delete().eq("alliance_code", allianceCode);
    if (delRow.error) { setStatus(delRow.error.message); alert(delRow.error.message); return; }

    try { await supabase.storage.from(ALLIANCE_BANNERS_BUCKET).remove([bannerPath]); } catch {}

    setStatus("Removed ✅");
    setBannerPath(null);
    setBannerUrl(null);
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🖼️ Alliance Banner</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 160,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : "none",
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          padding: 10,
        }}
      >
        <div style={{ fontWeight: 950, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
          {allianceCode ? `${allianceCode} Command Center` : "Alliance"}
        </div>
        {!bannerUrl ? <div style={{ opacity: 0.85, fontSize: 12 }}>No banner set</div> : null}
      </div>

      {canManage ? (
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input type="file" accept="image/*" onChange={(e) => void upload(e.target.files)} />
            <span style={{ opacity: 0.85, fontSize: 12 }}>Upload banner</span>
          </label>
          {bannerPath ? <button type="button" onClick={() => void removeBanner()}>Remove</button> : null}
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Bucket: <code>{ALLIANCE_BANNERS_BUCKET}</code>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
          View-only. (Owner/Admin or R5/R4 can change the banner.)
        </div>
      )}
    </div>
  );
}
