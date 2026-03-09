import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";
import { supabase } from "../../lib/supabaseClient";

type AnyRow = any;

function s(v: any) {
  return v === null || v === undefined ? "" : String(v);
}
function norm(v: any) {
  return s(v).trim();
}
function normLower(v: any) {
  return norm(v).toLowerCase();
}
function parseDate(v: any): number | null {
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? t : null;
}

function buildQueueSourceLink(r: AnyRow): string {
  const kind = String(r?.kind || "").toLowerCase();
  const metaKind = String(r?.meta?.kind || "").toLowerCase();

  if (metaKind === "achievements" || kind === "discord_webhook") return "/owner/state-achievements";
  if (metaKind === "morning_brief") return "/owner/morning-brief";
  return "/owner/search";
}

export default function OwnerQueueHealthPage() {
  const nav = useNavigate();
  const location = useLocation();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [statusFilter, setStatusFilter] = useState(() => {
    const p = new URLSearchParams(window.location.search || "");
    return String(p.get("status") || "ALL");
  });
  const [kindFilter, setKindFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setStatus("");

      const q = await supabase
        .from("discord_send_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (q.error) throw q.error;
      setRows((q.data || []) as AnyRow[]);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function toggleSelectedRowId(id: string) {
    const key = String(id || "");
    if (!key) return;
    setSelectedRowIds((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  function clearSelectedRows() {
    setSelectedRowIds([]);
  }

  function selectFilteredRowsByStatus(nextStatus: string) {
    const ids = filteredRows
      .filter((r) => String(r?.status || "").toLowerCase() === String(nextStatus || "").toLowerCase())
      .map((r) => String(r?.id || ""))
      .filter(Boolean);

    setSelectedRowIds(ids);
  }

  async function bulkRetryFailedRows() {
    try {
      const ids = selectedRowIds.slice();
      if (!ids.length) return setStatus("Select failed rows first.");
      if (!window.confirm(`Retry ${ids.length} selected row(s)?`)) return;

      setBulkBusy(true);

      for (const id of ids) {
        const up = await supabase
          .from("discord_send_queue")
          .update({
            status: "queued",
            status_detail: null,
            locked_at: null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", id);

        if (up.error) throw up.error;
      }

      setStatus(`Retried ${ids.length} row(s) ✅`);
      setSelectedRowIds([]);
      await loadAll();
    } catch (e: any) {
      setStatus("Bulk retry failed: " + String(e?.message || e || "unknown error"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkCloseSendingRows() {
    try {
      const ids = selectedRowIds.slice();
      if (!ids.length) return setStatus("Select sending rows first.");
      if (!window.confirm(`Close ${ids.length} selected sending row(s)?`)) return;

      setBulkBusy(true);

      for (const id of ids) {
        const up = await supabase
          .from("discord_send_queue")
          .update({
            status: "failed",
            status_detail: "Manually closed stale sending row",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", id);

        if (up.error) throw up.error;
      }

      setStatus(`Closed ${ids.length} row(s) ✅`);
      setSelectedRowIds([]);
      await loadAll();
    } catch (e: any) {
      setStatus("Bulk close failed: " + String(e?.message || e || "unknown error"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function copyText(txt: string) {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
      setStatus("Copied ✅");
      window.setTimeout(() => setStatus(""), 1000);
    } catch {}
  }

  async function retryFailedRow(row: AnyRow) {
    try {
      const id = String(row?.id || "");
      if (!id) return;
      if (!window.confirm("Retry this failed queue row?")) return;

      const up = await supabase
        .from("discord_send_queue")
        .update({
          status: "queued",
          status_detail: null,
          locked_at: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (up.error) throw up.error;

      setStatus("Row re-queued ✅");
      await loadAll();
    } catch (e: any) {
      setStatus("Retry failed: " + String(e?.message || e || "update failed"));
    }
  }

  async function closeSendingRow(row: AnyRow) {
    try {
      const id = String(row?.id || "");
      if (!id) return;
      if (!window.confirm("Mark this sending row as failed/closed?")) return;

      const up = await supabase
        .from("discord_send_queue")
        .update({
          status: "failed",
          status_detail: "Manually closed stale sending row",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (up.error) throw up.error;

      setStatus("Sending row closed ✅");
      await loadAll();
    } catch (e: any) {
      setStatus("Close failed: " + String(e?.message || e || "update failed"));
    }
  }

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const statusOptions = useMemo(() => {
    const vals = Array.from(new Set(rows.map((r) => s(r?.status)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...vals];
  }, [rows]);

  const kindOptions = useMemo(() => {
    const vals = Array.from(new Set(rows.map((r) => s(r?.kind)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...vals];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = normLower(targetFilter);
    return rows.filter((r) => {
      const statusOk = statusFilter === "ALL" || s(r?.status) === statusFilter;
      const kindOk = kindFilter === "ALL" || s(r?.kind) === kindFilter;
      const textOk =
        !needle ||
        `${s(r?.target)} ${s(r?.channel_name)} ${s(r?.channel_id)} ${s(r?.status_detail)} ${s(r?.kind)}`
          .toLowerCase()
          .includes(needle);
      return statusOk && kindOk && textOk;
    });
  }, [rows, statusFilter, kindFilter, targetFilter]);

  const summary = useMemo(() => {
    const queued = rows.filter((r) => normLower(r?.status) === "queued").length;
    const sending = rows.filter((r) => normLower(r?.status) === "sending").length;
    const failed = rows.filter((r) => normLower(r?.status) === "failed").length;
    const sent24h = rows.filter((r) => {
      if (normLower(r?.status) !== "sent") return false;
      const ts = parseDate(r?.sent_at) ?? parseDate(r?.updated_at) ?? parseDate(r?.created_at);
      return ts !== null && ts >= last24h;
    }).length;
    return { queued, sending, failed, sent24h };
  }, [rows, last24h]);

  const failedRows = useMemo(
    () => filteredRows.filter((r) => normLower(r?.status) === "failed").slice(0, 20),
    [filteredRows]
  );

  const sendingRows = useMemo(
    () => filteredRows.filter((r) => normLower(r?.status) === "sending").slice(0, 20),
    [filteredRows]
  );

  const sentRows = useMemo(
    () => filteredRows.filter((r) => normLower(r?.status) === "sent").slice(0, 20),
    [filteredRows]
  );

  return (
    <CommandCenterShell
      title="Owner • Queue Health"
      subtitle="Discord send queue snapshot, filters, and recovery actions"
      modules={modules}
      activeModuleKey="owner"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/morning-brief")}>
            Morning Brief
          </button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/state-achievements")}>
            Achievements
          </button>
          <button className="zombie-btn" type="button" onClick={() => void loadAll()} disabled={loading}>
            Refresh
          </button>
        </div>
      }
    >
      {status ? (
        <div style={{ marginBottom: 10, border: "1px solid rgba(176,18,27,0.35)", background: "rgba(176,18,27,0.12)", borderRadius: 12, padding: 10 }}>
          {status}
        </div>
      ) : null}

      {loading ? <div style={{ opacity: 0.8, marginBottom: 12 }}>Loading…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Queued", value: summary.queued },
          { label: "Sending", value: summary.sending },
          { label: "Failed", value: summary.failed },
          { label: "Sent Last 24h", value: summary.sent24h },
        ].map((x) => (
          <div key={x.label} style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
            <div style={{ opacity: 0.72, fontSize: 12 }}>{x.label}</div>
            <div style={{ fontWeight: 950, fontSize: 28, marginTop: 6 }}>{x.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Bulk Queue Actions</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Selected: {selectedRowIds.length}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => clearSelectedRows()} disabled={bulkBusy || !selectedRowIds.length}>
            Clear
          </button>
          <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => selectFilteredRowsByStatus("failed")} disabled={bulkBusy}>
            Select Failed
          </button>
          <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => selectFilteredRowsByStatus("sending")} disabled={bulkBusy}>
            Select Sending
          </button>
          <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => void bulkRetryFailedRows()} disabled={bulkBusy || !selectedRowIds.length}>
            Retry Selected
          </button>
          <button className="zombie-btn" type="button" style={{ padding: "8px 10px" }} onClick={() => void bulkCloseSendingRows()} disabled={bulkBusy || !selectedRowIds.length}>
            Close Selected
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(String(e.target.value || "ALL"))}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        >
          {statusOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(String(e.target.value || "ALL"))}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        >
          {kindOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>

        <input
          value={targetFilter}
          onChange={(e) => setTargetFilter(String(e.target.value || ""))}
          placeholder="Filter target / channel / error..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: "rgba(255,255,255,0.92)"
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Recent Failed Sends ({failedRows.length})</div>
          <div style={{ display: "grid", gap: 8 }}>
            {failedRows.length === 0 ? <div style={{ opacity: 0.7 }}>No failed rows.</div> : failedRows.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ fontWeight: 900 }}>{norm(r?.kind || "queue")}</div>
                    </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {norm(r?.status || "unknown")}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {norm(r?.target || r?.channel_name || r?.channel_id || "—")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                      {norm(r?.status_detail || "Unknown failure")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void retryFailedRow(r)}>
                      Retry
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void copyText(String(r?.status_detail || ""))}>
                      Copy Error
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void copyText(String(r?.id || ""))}>
                      Copy ID
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => nav(buildQueueSourceLink(r))}>
                      Open Source
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => nav(buildQueueSourceLink(r))}>
                      Open Source
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Current Sending Rows ({sendingRows.length})</div>
          <div style={{ display: "grid", gap: 8 }}>
            {sendingRows.length === 0 ? <div style={{ opacity: 0.7 }}>No sending rows.</div> : sendingRows.map((r, i) => (
              <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ fontWeight: 900 }}>{norm(r?.kind || "queue")}</div>
                    </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {norm(r?.status || "unknown")}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)" }}>
                        {norm(r?.target || r?.channel_name || r?.channel_id || "—")}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                      Created: {norm(r?.created_at)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void closeSendingRow(r)}>
                      Close Stale
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void copyText(String(r?.id || ""))}>
                      Copy ID
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => nav(buildQueueSourceLink(r))}>
                      Open Source
                    </button>
                    <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => nav(buildQueueSourceLink(r))}>
                      Open Source
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Recent Successful Sends ({sentRows.length})</div>
        <div style={{ display: "grid", gap: 8 }}>
          {sentRows.length === 0 ? <div style={{ opacity: 0.7 }}>No sent rows.</div> : sentRows.map((r, i) => (
            <div key={String(r?.id || i)} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.includes(String(r?.id || ""))}
                        onChange={() => toggleSelectedRowId(String(r?.id || ""))}
                      />
                      <div style={{ fontWeight: 900 }}>{norm(r?.kind || "queue")}</div>
                    </div>
                    </div>
                  <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                    {norm(r?.target || r?.channel_name || r?.channel_id || "—")}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                    Sent: {norm(r?.sent_at || r?.updated_at || r?.created_at)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="zombie-btn" type="button" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => void copyText(String(r?.id || ""))}>
                    Copy ID
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </CommandCenterShell>
  );
}







