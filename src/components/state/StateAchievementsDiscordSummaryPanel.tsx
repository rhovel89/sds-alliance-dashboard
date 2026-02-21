import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AchType = {
  id: string;
  state_code?: string | null;
  name?: string | null;
  kind?: string | null;
  requires_option?: boolean | null;
  required_count?: number | null;
  active?: boolean | null;
};

type AchOption = {
  id: string;
  achievement_type_id?: string | null;
  label?: string | null;
  active?: boolean | null;
};

type AchReq = {
  id: string;
  state_code?: string | null;
  player_name?: string | null;
  alliance_name?: string | null;
  achievement_type_id?: string | null;
  option_id?: string | null;
  status?: string | null;
  current_count?: number | null;
  required_count?: number | null;
  completed_at?: string | null;
  created_at?: string | null;
};

type FormatKey = "short" | "detailed" | "swp" | "governor";

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function nowUtcShort() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} UTC`;
}

export default function StateAchievementsDiscordSummaryPanel(props: { stateCode: string }) {
  const stateCode = props.stateCode;

  const [types, setTypes] = useState<AchType[]>([]);
  const [opts, setOpts] = useState<AchOption[]>([]);
  const [reqs, setReqs] = useState<AchReq[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [format, setFormat] = useState<FormatKey>("short");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // Types (active)
      const tRes = await supabase
        .from("state_achievement_types")
        .select("id,state_code,name,kind,requires_option,required_count,active")
        .eq("state_code", stateCode)
        .eq("active", true)
        .order("name", { ascending: true });

      if (tRes.error) throw new Error(`types: ${tRes.error.message}`);
      const t = (tRes.data as any[]) ?? [];
      setTypes(t);

      const typeIds = t.map((x) => x.id).filter(Boolean);
      // Options (active)
      if (typeIds.length) {
        const oRes = await supabase
          .from("state_achievement_options")
          .select("id,achievement_type_id,label,active")
          .in("achievement_type_id", typeIds)
          .eq("active", true)
          .order("label", { ascending: true });

        if (oRes.error) throw new Error(`options: ${oRes.error.message}`);
        setOpts(((oRes.data as any[]) ?? []));
      } else {
        setOpts([]);
      }

      // Requests (we only need state scope)
      const rRes = await supabase
        .from("state_achievement_requests")
        .select("id,state_code,player_name,alliance_name,achievement_type_id,option_id,status,current_count,required_count,completed_at,created_at")
        .eq("state_code", stateCode)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (rRes.error) throw new Error(`requests: ${rRes.error.message}`);
      setReqs(((rRes.data as any[]) ?? []));
    } catch (e: any) {
      setTypes([]);
      setOpts([]);
      setReqs([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [stateCode]);

  const typeById = useMemo(() => {
    const m: Record<string, AchType> = {};
    for (const t of types) if (t?.id) m[t.id] = t;
    return m;
  }, [types]);

  const optById = useMemo(() => {
    const m: Record<string, AchOption> = {};
    for (const o of opts) if (o?.id) m[o.id] = o;
    return m;
  }, [opts]);

  const stats = useMemo(() => {
    // Aggregate by (type_id, option_id?)
    const byKey: Record<string, { key: string; typeId: string; optId: string | null; name: string; optLabel: string | null; done: number; inprog: number; total: number }> = {};

    for (const r of reqs) {
      const tid = String(r.achievement_type_id || "");
      if (!tid) continue;
      const t = typeById[tid];
      const typeName = (t?.name || "Achievement").toString();
      const oid = r.option_id ? String(r.option_id) : "";
      const o = oid ? optById[oid] : null;
      const optLabel = o?.label ? String(o.label) : null;

      const k = tid + "::" + (oid || "");
      if (!byKey[k]) {
        byKey[k] = {
          key: k,
          typeId: tid,
          optId: oid || null,
          name: typeName,
          optLabel,
          done: 0,
          inprog: 0,
          total: 0,
        };
      }
      const st = norm(r.status);
      const cur = Number(r.current_count ?? 0);
      const req = Number(r.required_count ?? (t?.required_count ?? 0));

      // Completion logic: either explicit status/completed_at OR count reached
      const isDone =
        st === "approved" ||
        st === "complete" ||
        st === "completed" ||
        !!r.completed_at ||
        (req > 0 && cur >= req);

      byKey[k].total += 1;
      if (isDone) byKey[k].done += 1;
      else byKey[k].inprog += 1;
    }

    const items = Object.values(byKey);

    // helpers for filters
    const isGovernor = (x: any) => norm(x.name).includes("governor");
    const isSwp = (x: any) => {
      const n = norm(x.name);
      return n.includes("swp") || n.includes("weapon");
    };

    return {
      all: items.sort((a, b) => (b.done - a.done) || (b.total - a.total)),
      governor: items.filter(isGovernor).sort((a, b) => (b.done - a.done) || (b.total - a.total)),
      swp: items.filter(isSwp).sort((a, b) => (b.done - a.done) || (b.total - a.total)),
    };
  }, [reqs, typeById, optById]);

  const text = useMemo(() => {
    const header = `🏆 State ${stateCode} — Achievements Summary (${nowUtcShort()})`;

    const pick =
      format === "governor" ? stats.governor :
      format === "swp" ? stats.swp :
      stats.all;

    if (!pick.length) {
      return header + "\n\n(No data available yet — or RLS is limiting access.)";
    }

    if (format === "short") {
      const lines = pick.slice(0, 12).map((x) => {
        const label = x.optLabel ? `${x.name} — ${x.optLabel}` : x.name;
        return `• ${label}: ✅ ${x.done} | ⏳ ${x.inprog}`;
      });
      return header + "\n\n" + lines.join("\n");
    }

    if (format === "swp") {
      const lines = pick.slice(0, 20).map((x) => {
        const label = x.optLabel ? `${x.optLabel}` : x.name;
        return `• ${label}: ✅ ${x.done} | ⏳ ${x.inprog}`;
      });
      return `🧨 SWP Weapons — State ${stateCode} (${nowUtcShort()})\n\n` + lines.join("\n");
    }

    if (format === "governor") {
      const lines = pick.slice(0, 20).map((x) => {
        const label = x.optLabel ? `${x.name} — ${x.optLabel}` : x.name;
        return `• ${label}: ✅ ${x.done} | ⏳ ${x.inprog}`;
      });
      return `👑 Governor Rotations — State ${stateCode} (${nowUtcShort()})\n\n` + lines.join("\n");
    }

    // detailed
    const lines = pick.slice(0, 25).map((x) => {
      const label = x.optLabel ? `${x.name} — ${x.optLabel}` : x.name;
      return `• ${label}\n  ✅ Completed: ${x.done}\n  ⏳ In progress: ${x.inprog}\n  📌 Total requests: ${x.total}`;
    });
    return header + "\n\n" + lines.join("\n\n");
  }, [format, stats, stateCode]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied Discord summary.");
    } catch {
      window.prompt("Copy:", text);
    }
  }

  return (
    <div className="zombie-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900 }}>📣 Discord-ready Summary</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={copy}>
            Copy
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ opacity: 0.75, fontSize: 12 }}>Format</div>
        <select className="zombie-input" value={format} onChange={(e) => setFormat(e.target.value as any)} style={{ padding: "8px 10px", minWidth: 260 }}>
          <option value="short">Short (top items)</option>
          <option value="detailed">Detailed (counts + totals)</option>
          <option value="swp">SWP Focus (weapons/options)</option>
          <option value="governor">Governor Focus</option>
        </select>

        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          Types: {types.length} • Options: {opts.length} • Requests: {reqs.length}
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "#ffb3b3", fontSize: 12 }}>
          Load error (RLS/schema): {err}
        </div>
      ) : null}

      <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
{text}
      </pre>

      <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
        Tip: Use this to post weekly status updates. SWP Focus uses option labels (e.g. Rail Gun).
      </div>
    </div>
  );
}