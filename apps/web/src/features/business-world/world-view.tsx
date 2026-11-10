"use client";
import dynamic from "next/dynamic";
import { DashboardViewSwitch } from "./dashboard-view-switch";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { ConfigSchema, defaultPreferences, formatWorldMetric, industries, resolveScene, zoneLabel, type BusinessWorldConfig, type BusinessWorldSnapshot, type WorldPreferences, type ZoneId } from "./model";
import { saveWorldConfig, saveWorldPreferences } from "./actions";
import { useWorld, worldTelemetry } from "./use-world";

const Scene = dynamic(() => import("./world-scene"), { ssr: false, loading: () => <div className="world-scene-loading">Building your miniature world…<small>The area buttons below are ready to use.</small></div> });
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch() { this.props.onError(); }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function WorldView({ businessId }: { businessId: string }) {
  const [branch, setBranch] = useState<string | null>(null);
  const { snapshot, connection, error, visible, refresh } = useWorld(businessId, branch);
  const [preferences, setPreferences] = useState<WorldPreferences>(defaultPreferences);
  const initialized = useRef(false);
  const [selected, setSelected] = useState<ZoneId | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<BusinessWorldConfig | null>(null);
  const [reset, setReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reduced, setReduced] = useState(true);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches); update(); mq.addEventListener("change", update); return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!snapshot || initialized.current) return;
    initialized.current = true;
    // Hydrate personal controls from the first authenticated external snapshot.
    queueMicrotask(() => {
      setPreferences(snapshot.preferences);
      if (snapshot.preferences.branch_id && snapshot.branches.some(b => b.id === snapshot.preferences.branch_id)) setBranch(snapshot.preferences.branch_id);
    });
  }, [snapshot]);
  function closeDetails() { setSelected(null); triggerRef.current?.focus(); }
  useEffect(() => {
    if (!selected) return;
    detailRef.current?.focus();
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelected(null); triggerRef.current?.focus(); } };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, [selected]);
  async function preference(next: Partial<WorldPreferences>) {
    const updated = { ...preferences, ...next }; setPreferences(updated);
    try { await saveWorldPreferences(businessId, updated); } catch { setMessage("Your preference could not be saved. It applies to this visit only."); }
  }
  function choose(id: ZoneId) { triggerRef.current = document.querySelector<HTMLElement>(`[data-world-area="${id}"]`); setSelected(id); }
  function startCustomize(useSuggestion = false) { if (!snapshot) return; setDraft(useSuggestion ? snapshot.suggested : snapshot.config); setReset(useSuggestion); setCustomizing(true); setSelected(null); }
  async function applyConfig() {
    if (!draft) return; setSaving(true); setMessage("");
    try { await saveWorldConfig(businessId, ConfigSchema.parse(draft), reset); setCustomizing(false); setDraft(null); refresh(); setMessage("Your world is saved. Business operations are unchanged."); }
    catch { setMessage("World could not be saved. Please retry; your current layout is unchanged."); }
    finally { setSaving(false); }
  }
  const config = customizing && draft ? draft : snapshot?.config;
  const paused = reduced || preferences.motion === "paused" || !visible;
  const zones = snapshot && config ? resolveScene(config, snapshot.zones) : [];
  const selectedZone = snapshot?.zones.find(z => z.id === selected);
  const fallback = snapshot && config ? <AreaMap snapshot={snapshot} config={config} onSelect={choose} selected={selected} /> : null;
  const failScene = () => { setSceneFailed(true); worldTelemetry("render_failure"); };
  const attentionZones = zones.filter(area => snapshot?.zones.find(z => z.id === area.id)?.alert);
  return <div className="business-world" data-motion={paused ? "paused" : "enabled"}>
    <DashboardViewSwitch businessId={businessId} active="world" />
    <header className="world-heading"><div><p className="world-eyebrow">YOUR BUSINESS, CONNECTED <span>PILOT</span></p><h1>Your dashboard, <em>in 3D.</em></h1><p>{snapshot?.businessName ?? "Your business"} · A living overview of your recorded operations.</p></div></header>
    <div className="world-toolbar">
      <label>Branch<select value={branch ?? ""} onChange={e => { const value = e.target.value || null; setBranch(value); setSelected(null); void preference({ branch_id: value }); }}><option value="">All accessible branches</option>{snapshot?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button type="button" aria-pressed={preferences.representation === "2d"} onClick={() => { const representation = preferences.representation === "3d" ? "2d" : "3d"; void preference({ representation }); if (representation === "2d") worldTelemetry("fallback"); }}>{preferences.representation === "3d" ? "Use 2D overview" : "Use 3D world"}</button>
      <button type="button" aria-pressed={paused} disabled={reduced} onClick={() => void preference({ motion: paused ? "enabled" : "paused" })}>{reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}</button>
      <button type="button" onClick={() => setCameraKey(k => k + 1)}>Reset camera</button>
      {snapshot?.canManage && snapshot.configCompatible && <button type="button" className="world-primary" onClick={() => startCustomize()}>Customize world</button>}
    </div>
    <div className="world-freshness" role="status"><span className={connection === "Live" ? "world-live-dot" : "world-offline-dot"} />{connection} · {snapshot ? `Last successful refresh ${new Date(snapshot.generatedAt).toLocaleTimeString("en-PH")} · Today: ${snapshot.date} (Manila)` : "Loading authorized business areas…"}<button type="button" onClick={refresh}>Refresh</button></div>
    {message && <p role="status" className="world-notice">{message}</p>}
    {error && <div role="alert" className="world-notice"><strong>{error}</strong><p>Protected metrics have been cleared until access and data can be verified.</p><button onClick={refresh}>Retry</button></div>}
    {snapshot?.suggestionChanged && snapshot.canManage && <div className="world-notice">Your business setup has changed. Your saved layout is preserved. <button onClick={() => startCustomize(true)}>Update suggested world</button></div>}
    {snapshot && !snapshot.configCompatible && <p className="world-notice">This configuration was saved by a newer app version. A suggested preview is shown; saved settings are preserved.</p>}
    {customizing && draft && snapshot && <section className="world-customizer" aria-label="Customize world"><div><h2>A few choices. Your world, arranged.</h2><p>These choices change the visual representation only. They do not create branches, enable tools, change subscriptions, or modify operations.</p></div><div className="world-config-fields">
      <label>Business type<select value={draft.industry} onChange={e => { setReset(false); setDraft({ ...draft, industry: e.target.value as BusinessWorldConfig["industry"] }); }}>{Object.entries(industries).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {([{ key: "service", label: "Customer service", options: { in_store: "In-store", online: "Online", both: "Both" } }, { key: "storage", label: "Stock storage", options: { none: "None", stockroom: "Stockroom", warehouse: "Warehouse", both: "Both" } }, { key: "fulfillment", label: "Fulfillment", options: { pickup: "Pickup", delivery: "Delivery", both: "Both" } }, { key: "presentation", label: "Presentation", options: { compact: "Compact", spacious: "Spacious" } }] as const).map(field => <label key={field.key}>{field.label}<select value={draft[field.key]} onChange={e => { setReset(false); setDraft(ConfigSchema.parse({ ...draft, [field.key]: e.target.value })); }}>{Object.entries(field.options).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>)}
    </div><div className="world-custom-actions"><button className="world-primary" disabled={saving} onClick={() => void applyConfig()}>{saving ? "Saving…" : "Use this world"}</button><button onClick={() => { setDraft(snapshot.suggested); setReset(true); }}>Restore suggested layout</button><button onClick={() => { setCustomizing(false); setDraft(null); }}>Cancel preview</button><span>Preview below · shared with your business</span></div></section>}
    {snapshot && config && <>
      {attentionZones.length > 0 && <section className="world-attention" aria-label="Areas needing attention"><div><span className="world-alert-badge" aria-hidden="true">!</span><strong>{attentionZones.length} areas need attention</strong><span>Select an area to review the issue.</span></div><div className="world-attention-links">{attentionZones.map(area => <button key={area.id} onClick={() => choose(area.id)} aria-controls="world-details">{area.label}<span aria-hidden="true">↗</span></button>)}</div></section>}
      <section className="world-stage" aria-label="Business world"><div className="world-stage-caption"><strong>{customizing ? "LAYOUT PREVIEW" : snapshot.branchName ?? "BUSINESS OVERVIEW"}</strong><span>{zones.length} connected areas · {config.presentation}</span></div>
        {sceneFailed && <p role="status" className="world-notice">3D is unavailable on this device. The complete 2D overview is ready below. <button onClick={() => setSceneFailed(false)}>Retry 3D</button></p>}
        {preferences.representation === "2d" || sceneFailed ? fallback : <SceneBoundary fallback={fallback} onError={failScene}><Scene snapshot={snapshot} config={config} selected={selected} onSelect={choose} paused={paused} visible={visible} cameraKey={cameraKey} onFailure={failScene} /></SceneBoundary>}
        <div className="world-scene-legend"><span>● Red beacon = needs attention</span><span>{paused ? "Motion paused" : "Illustrative motion"} · select an area · drag to rotate</span></div>
      </section>
      <section className="world-areas" aria-label="Business areas"><div className="world-section-heading"><h2>Your business areas</h2><span>Choose an area to see its numbers and next steps.</span></div><div className="world-area-buttons">{zones.map(layout => { const z = snapshot.zones.find(item => item.id === layout.id)!; return <button key={z.id} data-world-area={z.id} aria-pressed={selected === z.id} aria-controls="world-details" onClick={() => choose(z.id)}><span className={`world-area-state ${z.alert ? "attention" : z.state}`} /><span><strong>{layout.label}</strong><small>{z.state === "disabled" ? "Setup opportunity" : z.state === "unavailable" ? "Data unavailable" : z.alert ? "Needs attention" : z.state === "empty" ? "No recorded activity" : "View details"}</small></span><span aria-hidden="true">↗</span></button>; })}</div>{!zones.length && <p>No business areas are available for your current access. Your administrator can help configure the relevant tools.</p>}</section>
      <label className="world-default"><input type="checkbox" checked={preferences.landing_view === "world"} onChange={e => void preference({ landing_view: e.target.checked ? "world" : "dashboard" })} />Open World when I select this business</label>
      <p className="world-footnote">This is a visual overview, not a floor plan. People are illustrative; vehicles show recorded status, not live location. Actions open your existing business tools.</p>
    </>}
    {selectedZone && config && <div id="world-details" className="world-details" role="region" aria-label={`${zoneLabel(selectedZone.id, config)} details`} tabIndex={-1} ref={detailRef}><button className="world-close" onClick={closeDetails} aria-label="Close area details">×</button><p className="world-eyebrow">{selectedZone.alert ? "NEEDS ATTENTION" : "AREA DETAILS"}</p><h2>{zoneLabel(selectedZone.id, config)}</h2><p className="world-detail-scope">{selectedZone.scope === "branch" ? snapshot?.branchName : "All accessible branches"} · {selectedZone.period}</p><dl>{selectedZone.metrics.map(m => <div key={m.label}><dt>{m.label}</dt><dd>{formatWorldMetric(m)}</dd></div>)}</dl>{selectedZone.state === "empty" && <p>No activity is recorded for these metrics yet.</p>}<p>{selectedZone.note}</p>{selectedZone.updatedAt && <small>Updated {new Date(selectedZone.updatedAt).toLocaleTimeString("en-PH")}</small>}<div className="world-detail-actions">{selectedZone.actions.map(a => <Link key={a.href + a.label} href={a.href} onClick={() => worldTelemetry("zone_action")}>{a.label} ↗</Link>)}</div></div>}
  </div>;
}
function AreaMap({ snapshot, config, onSelect, selected }: { snapshot: BusinessWorldSnapshot; config: BusinessWorldConfig; onSelect: (id: ZoneId) => void; selected: ZoneId | null }) {
  return <div className="world-map" aria-label="2D business overview">{resolveScene(config, snapshot.zones).map((area, index) => { const zone = snapshot.zones.find(z => z.id === area.id)!; return <button key={area.id} className={zone.alert ? "has-alert" : ""} aria-pressed={selected === area.id} onClick={() => onSelect(area.id)}><span className="world-map-number">{String(index + 1).padStart(2, "0")}</span><strong>{area.label}</strong><span>{zone.metrics[0] ? formatWorldMetric(zone.metrics[0]) : zone.state === "disabled" ? "Setup opportunity" : "No metric available"}</span><small>{zone.metrics[0]?.label ?? "Select to learn more"}</small></button>; })}</div>;
}
