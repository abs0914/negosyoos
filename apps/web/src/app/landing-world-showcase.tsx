"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@negosyo-os/ui";

import { formatWorldMetric, resolveScene, type WorldMetric, type ZoneId } from "@/features/business-world/model";
import "@/features/business-world/world.css";
import { demoWorldConfig, demoWorldSnapshot } from "./landing-world-demo";
import "./landing-world-showcase.css";

const Scene = dynamic(() => import("@/features/business-world/world-scene"), {
  ssr: false,
  loading: () => <WorldPoster message="Building the miniature…" />,
});

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const snapshot = demoWorldSnapshot;
const areas = resolveScene(demoWorldConfig, snapshot.zones);
const zoneFor = (id: ZoneId) => snapshot.zones.find(zone => zone.id === id)!;
const attention = areas.filter(area => zoneFor(area.id).alert);
const summary = (metric: WorldMetric) => metric.format === "money" ? formatWorldMetric(metric) : `${formatWorldMetric(metric)} ${metric.label.toLowerCase()}`;

const proofs = [
  { title: "Built from your records", body: "Each area reads the sales, stock, and accounts you already keep." },
  { title: "Trouble shows first", body: "Low stock, waiting approvals, and overdue balances light up." },
  { title: "One tap to act", body: "Every area opens the tool where you take care of it." },
] as const;

function WorldPoster({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="home-world-poster">
      <div className="home-world-poster-grid" aria-hidden="true">{areas.map(area => <span key={area.id} className={zoneFor(area.id).alert ? "has-alert" : ""} />)}</div>
      <p>{message}</p>
      {action}
    </div>
  );
}

function AreaGrid({ selected, onSelect }: { selected: ZoneId | null; onSelect: (id: ZoneId) => void }) {
  return (
    <div className="home-world-map" aria-label="2D overview of the example business">
      {areas.map(area => {
        const zone = zoneFor(area.id);
        return (
          <button type="button" key={area.id} className={zone.alert ? "has-alert" : ""} aria-pressed={selected === area.id} onClick={() => onSelect(area.id)}>
            <strong>{area.label}</strong>
            <span>{formatWorldMetric(zone.metrics[0]!)}</span>
            <small>{zone.metrics[0]!.label}</small>
          </button>
        );
      })}
    </div>
  );
}

export function LandingWorldShowcase() {
  const stageRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [motionOff, setMotionOff] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<ZoneId | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: coarse)");
    const update = () => { setReduced(motion.matches); setCoarse(pointer.matches); };
    update();
    motion.addEventListener("change", update);
    pointer.addEventListener("change", update);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) queueMicrotask(() => setSaveData(true));
    return () => { motion.removeEventListener("change", update); pointer.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    // Load the 3D bundle only as the visitor approaches; render frames only while it is on screen.
    const loader = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setNear(true); loader.disconnect(); } }, { rootMargin: "400px 0px" });
    const viewer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    loader.observe(element);
    viewer.observe(element);
    return () => { loader.disconnect(); viewer.disconnect(); };
  }, []);

  useEffect(() => { if (selected) detailRef.current?.focus({ preventScroll: true }); }, [selected]);

  const paused = reduced || motionOff || !inView;
  const shouldLoad = near && (!saveData || forceLoad);
  const selectedZone = selected ? zoneFor(selected) : null;
  const selectedLabel = selected ? areas.find(area => area.id === selected)?.label : null;
  const grid = <AreaGrid selected={selected} onSelect={setSelected} />;

  return (
    <section className="home-world" id="world" aria-labelledby="world-heading">
      <div className="site-width home-world-inner">
        <div className="home-world-heading">
          <div className="home-section-heading">
            <p className="design-label"><span>02 / See it all at once</span><span className="home-world-new">New</span></p>
            <h2 id="world-heading">Your whole negosyo.<br /><em>One living map.</em></h2>
          </div>
          <div className="home-world-intro">
            <p className="section-intro">Business World turns your records into a miniature of your business: the counter, the shelves, the supplier bay, the delivery area. When something needs you, a red beacon rises over it.</p>
            <p className="home-world-pilot"><span className="label-dot" /> Pilot, rolling out to selected workspaces</p>
          </div>
        </div>

        <div className="home-world-layout">
          <figure className="home-world-stage" ref={stageRef}>
            <figcaption className="home-world-caption">
              <span><Icon name="business" size={15} /> {snapshot.businessName}</span>
              <span>{view === "3d" ? (coarse ? "Tap explore · drag to turn" : "Drag to turn · select an area") : "2D overview"}</span>
            </figcaption>
            <div className="home-world-canvas-wrap" data-exploring={exploring || !coarse ? "true" : "false"}>
              {view === "2d" ? grid : !shouldLoad ? (
                <WorldPoster
                  message={saveData && near ? "Data saver is on. The 3D preview is about 1 MB." : "Your miniature loads as you scroll."}
                  action={saveData && near ? <button type="button" className="home-world-chip" onClick={() => setForceLoad(true)}>Load 3D preview</button> : null}
                />
              ) : (
                <SceneBoundary fallback={grid}>
                  <Scene snapshot={snapshot} config={demoWorldConfig} selected={selected} onSelect={setSelected} paused={paused} visible={inView} cameraKey={0} onFailure={() => setView("2d")} />
                </SceneBoundary>
              )}
              {view === "3d" && shouldLoad && coarse && !exploring ? (
                <button type="button" className="home-world-shield" onClick={() => setExploring(true)}>
                  <span><Icon name="chevron-right" size={16} /> Tap to explore in 3D</span>
                </button>
              ) : null}
            </div>
            <div className="home-world-controls">
              <span className="home-world-legend"><span className="home-world-beacon" aria-hidden="true" /> Red beacon = needs attention</span>
              <span className="home-world-buttons">
                {coarse && exploring && view === "3d" ? <button type="button" className="home-world-chip" onClick={() => setExploring(false)}>Done exploring</button> : null}
                {view === "3d" ? <button type="button" className="home-world-chip" aria-pressed={paused} disabled={reduced} onClick={() => setMotionOff(value => !value)}>{reduced ? "Reduced motion" : motionOff ? "Play motion" : "Pause motion"}</button> : null}
                <button type="button" className="home-world-chip" onClick={() => setView(value => value === "3d" ? "2d" : "3d")}>{view === "3d" ? "Show 2D" : "Show 3D"}</button>
              </span>
            </div>
          </figure>

          <aside className="home-world-panel" aria-label="Example business areas">
            {selectedZone && selectedLabel ? (
              <div className="home-world-detail" ref={detailRef} tabIndex={-1} role="region" aria-label={`${selectedLabel} details`}>
                <div className="home-world-detail-top">
                  <p className="design-label">{selectedZone.alert ? "Needs attention" : "Area details"}</p>
                  <button type="button" className="home-world-close" onClick={() => setSelected(null)} aria-label="Close area details">×</button>
                </div>
                <h3>{selectedLabel}</h3>
                <dl>{selectedZone.metrics.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{formatWorldMetric(item)}</dd></div>)}</dl>
                {selectedZone.note ? <p>{selectedZone.note}</p> : null}
              </div>
            ) : (
              <div className="home-world-attention">
                <p className="home-world-count"><strong>{attention.length}</strong><span>areas need<br />attention</span></p>
                <p>Select an area on the map, or start here.</p>
              </div>
            )}
            <ul className="home-world-areas">
              {areas.map(area => {
                const zone = zoneFor(area.id);
                return (
                  <li key={area.id}>
                    <button type="button" aria-pressed={selected === area.id} onClick={() => setSelected(area.id)}>
                      <span className={zone.alert ? "home-world-dot attention" : "home-world-dot"} aria-hidden="true" />
                      <span>{area.label}</span>
                      <small>{zone.alert ? "Needs attention" : summary(zone.metrics[0]!)}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="home-world-disclaimer">Illustrative data. People and vehicles are decorative; nothing here changes business records.</p>
          </aside>
        </div>

        <div className="home-world-footer">
          <ol className="home-world-proofs">{proofs.map((proof, index) => <li key={proof.title}><span>0{index + 1}</span><div><h3>{proof.title}</h3><p>{proof.body}</p></div></li>)}</ol>
          <Link className="site-button site-button-accent" href="/assessment">Start with a free health check <Icon name="chevron-right" size={17} /></Link>
        </div>
      </div>
    </section>
  );
}
