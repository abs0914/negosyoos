"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { resolveScene, type BusinessWorldConfig, type BusinessWorldSnapshot, type WorldZone, type ZoneId } from "./model";

const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
const sphere = new THREE.SphereGeometry(1, 10, 6);
const colors = { cream: "#fff9e9", wall: "#e3dfd1", glass: "#a8d8e7", ink: "#10243e", leaf: "#4e7969", road: "#d5d9d9", box: "#cd9f67" };
const materials = new Map<string, THREE.MeshLambertMaterial>();
function material(color: string) { let value = materials.get(color); if (!value) { value = new THREE.MeshLambertMaterial({ color }); materials.set(color, value); } return value; }
type Vec = [number, number, number];
function Block({ at, size, color, round = false }: { at: Vec; size: Vec; color: string; round?: boolean }) { return <mesh position={at} scale={size} geometry={round ? cylinder : box} material={material(color)} dispose={null} />; }
function Person({ at, shirt }: { at: Vec; shirt: string }) { return <group position={at}><Block at={[0, .25, 0]} size={[.15, .42, .12]} color={shirt} round /><mesh position={[0, .57, 0]} scale={.13} geometry={sphere} material={material("#b9825d")} dispose={null} /><Block at={[-.07, .04, 0]} size={[.06, .15, .07]} color={colors.ink} /><Block at={[.07, .04, 0]} size={[.06, .15, .07]} color={colors.ink} /></group>; }
// Decorative walkers illustrate the miniature; their number is never a traffic metric.
function Walker({ at, shirt, paused, phase = 0 }: { at: Vec; shirt: string; paused: boolean; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(phase);
  useFrame((_, delta) => {
    if (paused || !ref.current) return;
    elapsed.current += Math.min(delta, .05);
    const t = elapsed.current * .65;
    ref.current.position.x = at[0] + Math.sin(t) * .5;
    ref.current.position.y = at[1] + Math.abs(Math.sin(t * 12)) * .035;
    ref.current.position.z = at[2] + Math.cos(t) * .16;
    ref.current.rotation.y = Math.atan2(Math.cos(t) * .5, -Math.sin(t) * .16);
  });
  return <group ref={ref} position={at}><Person at={[0, 0, 0]} shirt={shirt} /></group>;
}
function AttentionBeacon({ paused }: { paused: boolean }) {
  const lamp = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    elapsed.current += Math.min(delta, .05);
    // A slow 2.4-second breath, never a rapid on/off flash.
    const pulse = (1 + Math.sin(elapsed.current * Math.PI * 2 / 2.4)) / 2;
    lamp.current?.scale.setScalar(.19 + pulse * .06);
    halo.current?.scale.setScalar(.75 + pulse * .35);
  });
  return <group>
    <Block at={[1.25, 1.2, -.9]} size={[.06, 2.4, .06]} color={colors.ink} />
    <mesh ref={lamp} position={[1.25, 2.48, -.9]} scale={.22} geometry={sphere}><meshBasicMaterial color="#df1a2c" /></mesh>
    <mesh ref={halo} position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.45, 1.57, 40]} /><meshBasicMaterial color="#df1a2c" transparent opacity={.24} depthWrite={false} />
    </mesh>
  </group>;
}
function AmbientMotion({ paused }: { paused: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => { if (!paused) invalidate(); }, [paused, invalidate]);
  useFrame(() => { if (!paused) invalidate(); });
  return null;
}
function Tree({ at }: { at: Vec }) { return <group position={at}><Block at={[0, .4, 0]} size={[.08, .8, .08]} color={colors.box} /><mesh position={[0, .9, 0]} scale={[.4, .55, .4]} geometry={sphere} material={material(colors.leaf)} dispose={null} /><Block at={[0, .04, 0]} size={[.5, .08, .5]} color={colors.wall} /></group>; }
function Shelf({ at, primary, accent }: { at: Vec; primary: string; accent: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { if (!ref.current) return; const transform = new THREE.Object3D(); for (let i = 0; i < 12; i++) { transform.position.set((i % 4) * .3 - .45, Math.floor(i / 4) * .4 + .24, 0); transform.scale.set(.23, .28, .3); transform.updateMatrix(); ref.current.setMatrixAt(i, transform.matrix); ref.current.setColorAt(i, new THREE.Color(i % 3 === 0 ? accent : colors.box)); } ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; }, [accent]);
  return <group position={at}><Block at={[-.7, .65, 0]} size={[.07, 1.3, .45]} color={primary} /><Block at={[.7, .65, 0]} size={[.07, 1.3, .45]} color={primary} />{[.08, .48, .88, 1.28].map(y => <Block key={y} at={[0, y, 0]} size={[1.45, .06, .46]} color={colors.cream} />)}<instancedMesh ref={ref} args={[box, material("#ffffff"), 12]} dispose={null} /></group>;
}
function Truck({ primary, accent, moving, paused }: { primary: string; accent: string; moving: boolean; paused: boolean }) {
  const ref = useRef<THREE.Group>(null); const elapsed = useRef(0);
  useFrame((_, delta) => { if (!ref.current || paused || !moving) return; elapsed.current += Math.min(delta, .05); const t = elapsed.current * .45; ref.current.position.x = Math.sin(t) * .6; ref.current.position.z = Math.cos(t) * .25; ref.current.rotation.y = Math.atan2(Math.sin(t) * .25, Math.cos(t) * .6); });
  return <group ref={ref} position={[0, 0, moving ? -.2 : .15]}><Block at={[-.35, .55, 0]} size={[1.25, .9, .85]} color={colors.cream} /><Block at={[.65, .4, 0]} size={[.65, .6, .85]} color={primary} /><Block at={[.68, .64, .435]} size={[.4, .27, .02]} color={colors.glass} /><Block at={[-.35, .55, .44]} size={[1, .12, .02]} color={accent} />{[-.65, .65].flatMap(x => [-.46, .46].map(z => <mesh key={`${x}:${z}`} geometry={cylinder} rotation={[Math.PI / 2, 0, 0]} position={[x, .16, z]} scale={[.18, .1, .18]} material={material(colors.ink)} dispose={null} />))}</group>;
}
function IndustryDetails({ config, primary, accent }: { config: BusinessWorldConfig; primary: string; accent: string }) {
  if (config.industry === "food_restaurant") return <group position={[.7, .05, -.45]}><Block at={[0, .5, 0]} size={[1, .8, .6]} color="#afbec7" />{[-.25, .25].map(x => <Block key={x} at={[x, .95, 0]} size={[.17, .15, .17]} color={colors.ink} round />)}<Block at={[0, 1.35, -.1]} size={[1.3, .15, .8]} color="#afbec7" /></group>;
  if (config.industry === "salon_service") return <group position={[.7, .05, -.3]}><Block at={[0, .9, -.35]} size={[.7, 1.1, .06]} color={accent} /><Block at={[0, .9, -.3]} size={[.58, .92, .03]} color={colors.glass} /><Block at={[0, .35, .3]} size={[.6, .15, .6]} color={primary} /><Block at={[0, .65, .55]} size={[.6, .5, .12]} color={primary} /></group>;
  if (config.industry === "repair_services") return <group position={[.65, .05, -.2]}><Block at={[0, .5, 0]} size={[.95, 1, .75]} color={colors.cream} /><mesh geometry={cylinder} material={material(colors.glass)} position={[0, .48, .39]} scale={[.3, .04, .3]} rotation={[Math.PI / 2, 0, 0]} dispose={null} /><Block at={[0, .88, .4]} size={[.6, .08, .03]} color={primary} /></group>;
  if (config.industry === "wholesale_distribution") return <group position={[.6, .08, -.3]}>{[0, 1].map(i => <Block key={i} at={[0, .3 + i * .55, 0]} size={[.85, .5, .75]} color={colors.box} />)}</group>;
  if (config.industry === "professional_services" || config.service !== "in_store") return <group position={[.65, .05, -.2]}><Block at={[0, .6, 0]} size={[1, .1, .7]} color={accent} /><Block at={[0, .85, -.1]} size={[.6, .4, .06]} color={colors.ink} /></group>;
  return null;
}
function Store({ primary, secondary, accent, config, paused }: { primary: string; secondary: string; accent: string; config: BusinessWorldConfig; paused: boolean }) {
  return <group><Block at={[0, .7, -.5]} size={[2.7, 1.4, 1.2]} color={colors.cream} /><Block at={[0, 1.5, -.45]} size={[2.9, .18, 1.4]} color={primary} /><Block at={[-.65, .7, .12]} size={[1, .85, .05]} color={colors.glass} /><Block at={[.55, .55, .12]} size={[.6, 1.1, .05]} color={primary} /><Block at={[.55, .7, .16]} size={[.42, .65, .03]} color={colors.glass} />
    {Array.from({ length: 8 }, (_, i) => <Block key={i} at={[-1.22 + i * .35, 1.18, .42]} size={[.35, .13, .75]} color={i % 2 ? colors.cream : secondary} />)}
    <Block at={[0, 1.65, -.15]} size={[1.4, .3, .09]} color={primary} /><Block at={[0, 1.65, -.09]} size={[.8, .06, .03]} color={accent} />
    <Block at={[-.85, .3, .95]} size={[.65, .6, .45]} color={primary} /><Block at={[-.85, .66, .95]} size={[.8, .09, .55]} color={colors.cream} /><Block at={[-.85, .8, .95]} size={[.22, .25, .08]} color={colors.ink} />
    {config.industry === "food_restaurant" && <><Block at={[.65, .45, .95]} size={[.45, .07, .45]} color={accent} round /><Block at={[.65, .22, .95]} size={[.07, .45, .07]} color={primary} round /></>}
    <Walker at={[.45, .08, .9]} shirt={accent} paused={paused} />
    <IndustryDetails config={config} primary={primary} accent={accent} />
  </group>;
}
function Area({ zone, config, position, snapshot, selected, onSelect, paused }: { zone: WorldZone; config: BusinessWorldConfig; position: Vec; snapshot: BusinessWorldSnapshot; selected: boolean; onSelect: (id: ZoneId) => void; paused: boolean }) {
  const { primary, secondary, accent } = snapshot.colors;
  const marker = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const animateUntil = useRef(0);
  const previous = useRef(zone.revision);
  useEffect(() => { if (!paused && previous.current !== zone.revision && previous.current && zone.revision) { animateUntil.current = performance.now() + 1600; invalidate(); } previous.current = zone.revision; }, [zone.revision, paused, invalidate]);
  useFrame(() => { if (paused || performance.now() >= animateUntil.current || !marker.current) return; marker.current.position.y = 2.1 + Math.sin(performance.now() / 110) * .09; invalidate(); });
  const pick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(zone.id); };
  const storage = zone.id === "warehouse" || zone.id === "shelves";
  return <group position={position} onClick={pick}>
    <Block at={[0, -.08, 0]} size={[3.65, .18, 3.4]} color={selected ? "#c3daf4" : "#eeeade"} />
    <Block at={[0, .02, -1.55]} size={[3.65, .04, .1]} color={selected ? primary : "#c7c1ad"} />
    {zone.id === "sales" ? <Store primary={primary} secondary={secondary} accent={accent} config={config} paused={paused} /> : storage ? <>
      {config.storage !== "none" && zone.id === "warehouse" && <><Block at={[0, .8, -1.1]} size={[3, 1.6, .1]} color={colors.wall} /><Block at={[-1.45, .8, -.45]} size={[.1, 1.6, 1.4]} color={colors.wall} /><Block at={[0, 1.65, -1]} size={[3.2, .12, .5]} color={primary} /></>}
      <Shelf at={[-.75, .05, -.65]} primary={primary} accent={accent} /><Shelf at={[.75, .05, .5]} primary={primary} accent={accent} />
    </> : zone.id === "delivery" ? <><Block at={[0, .01, 0]} size={[3.4, .03, 2.5]} color={colors.road} />{[-1, 0, 1].map(x => <Block key={x} at={[x, .04, 1.1]} size={[.5, .02, .06]} color={colors.cream} />)}{config.fulfillment !== "pickup" ? <Truck primary={primary} accent={accent} paused={paused} moving={zone.metrics.some(m => m.label === "Out for delivery" && m.value > 0)} /> : <Block at={[0, .35, 0]} size={[1.6, .7, .8]} color={primary} />}<Block at={[-1.2, .25, -.8]} size={[.4, .5, .4]} color={colors.box} /></> : zone.id === "purchasing" ? <><Block at={[0, .25, -.4]} size={[2.8, .5, 1.6]} color={colors.wall} />{[-.8, 0, .8].map((x, i) => <Block key={x} at={[x, .7, -.5]} size={[.65, .4 + i * .15, .65]} color={colors.box} />)}<Block at={[0, 1.65, -.75]} size={[3, .1, 1.5]} color={primary} />{[-1.4, 1.4].map(x => <Block key={x} at={[x, .85, -.75]} size={[.07, 1.6, .07]} color={primary} />)}<Walker at={[.8, .05, .8]} shirt={accent} paused={paused} phase={3} /></> : zone.id === "crm" ? <><Block at={[0, .3, -.5]} size={[2, .45, .5]} color={primary} /><Block at={[0, .7, -.7]} size={[2, .6, .1]} color={primary} /><Walker at={[-.6, .08, .45]} shirt={secondary} paused={paused} phase={6} /><Person at={[.3, .08, .7]} shirt={primary} /><Tree at={[1.3, 0, -.5]} /></> : <>
      {[-.7, .7].map((x, i) => <group key={x}><Block at={[x, .55, 0]} size={[1.1, .12, .7]} color={i ? primary : accent} /><Block at={[x, .27, 0]} size={[.1, .55, .1]} color={colors.wall} /><Block at={[x, .8, -.1]} size={[.4, .35, .08]} color={zone.id === "appointments" ? colors.glass : colors.ink} /><Person at={[x, .03, -.7]} shirt={i ? accent : secondary} /></group>)}
      {zone.id === "job_orders" && <Block at={[0, 1.1, -.95]} size={[2.8, 1, .1]} color={colors.wall} />}
    </>}
    {zone.alert ? <AttentionBeacon paused={paused} /> : <mesh ref={marker} position={[1.45, 2.1, -.9]} scale={.12} geometry={sphere} material={material(accent)} dispose={null} />}
  </group>;
}
function ProjectLabels({ layout, labels }: { layout: ReturnType<typeof resolveScene>; labels: Map<ZoneId, HTMLButtonElement> }) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const area of layout) {
      const element = labels.get(area.id); if (!element) continue;
      point.set(area.position[0], .15, area.position[2] + 1.55).project(camera);
      element.style.transform = `translate(-50%,-50%) translate(${(point.x + 1) * size.width / 2}px,${(1 - point.y) * size.height / 2}px)`;
      element.style.visibility = point.z > 1 ? "hidden" : "visible";
    }
  });
  return null;
}
function Lifecycle({ onFailure, cameraKey, visible }: { onFailure: () => void; cameraKey: number; visible: boolean }) {
  const { gl, invalidate, camera, size, setDpr } = useThree();
  const quality = useThree(state => state.performance.current);
  useFrame((state, delta) => { if (delta > 1 / 30 && delta < .15) state.performance.regress(); });
  useEffect(() => { setDpr(size.width < 600 || quality < 1 ? 1 : Math.min(window.devicePixelRatio, 1.5)); }, [size.width, quality, setDpr]);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); onFailure(); }; gl.domElement.addEventListener("webglcontextlost", lost); return () => gl.domElement.removeEventListener("webglcontextlost", lost); }, [gl, onFailure]);
  // R3F owns this imperative Three.js camera; updating it is external-system synchronization.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { camera.position.set(15, 16, 19); camera.lookAt(0, 0, 0); camera.zoom = Math.min(size.width / 22, size.height / 18); camera.updateProjectionMatrix(); if (visible) invalidate(); }, [cameraKey, camera, size.width, size.height, invalidate, visible]);
  return null;
}
function Landscaping() {
  const small = useThree(state => state.size.width < 600);
  return <>{[-7, 7].flatMap(x => (small ? [0] : [-6, 0, 6]).map(z => <Tree key={`${x}:${z}`} at={[x, -.15, z]} />))}</>;
}
export default function WorldScene({ snapshot, config, selected, onSelect, paused, visible, cameraKey, onFailure }: { snapshot: BusinessWorldSnapshot; config: BusinessWorldConfig; selected: ZoneId | null; onSelect: (id: ZoneId) => void; paused: boolean; visible: boolean; cameraKey: number; onFailure: () => void }) {
  const layout = useMemo(() => resolveScene(config, snapshot.zones), [config, snapshot.zones]);
  const labels = useMemo(() => new Map<ZoneId, HTMLButtonElement>(), []);
  return <div className="world-canvas"><Canvas orthographic frameloop={visible ? "demand" : "never"} dpr={[1, 1.5]} camera={{ position: [15, 16, 19], zoom: 32, near: .1, far: 100 }} gl={{ antialias: true, powerPreference: "low-power" }} fallback={<p>Choose the 2D overview to explore your business on this device.</p>} onCreated={({ gl }) => { gl.setClearColor("#eaf0ee"); }}>
    <ambientLight intensity={1.8} /><directionalLight position={[8, 15, 5]} intensity={2.2} />
    <Block at={[0, -.5, 0]} size={[15.7, .6, 18]} color="#d9e4df" /><Block at={[0, -.19, 0]} size={[15.4, .03, 17.7]} color="#e9ede5" />
    <Block at={[0, -.15, 0]} size={[.5, .03, 17.7]} color={colors.road} />
    <Landscaping />
    <AmbientMotion paused={paused || !visible} />
    {layout.map(area => <Area key={area.id} zone={snapshot.zones.find(z => z.id === area.id)!} config={config} snapshot={snapshot} position={area.position} selected={selected === area.id} onSelect={onSelect} paused={paused} />)}
    <OrbitControls key={cameraKey} makeDefault enablePan={false} enableDamping={false} minZoom={8} maxZoom={85} minPolarAngle={.35} maxPolarAngle={1.1} minAzimuthAngle={-.8} maxAzimuthAngle={1.4} />
    <Lifecycle onFailure={onFailure} cameraKey={cameraKey} visible={visible} />
    <ProjectLabels layout={layout} labels={labels} />
  </Canvas><div className="world-label-overlay" aria-hidden="true">{layout.map(area => <button ref={element => { if (element) labels.set(area.id, element); else labels.delete(area.id); }} className={`world-scene-label ${selected === area.id ? "selected" : ""} ${snapshot.zones.find(z => z.id === area.id)?.alert ? "has-alert" : ""}`} tabIndex={-1} key={area.id} onClick={() => onSelect(area.id)}>{area.label}{snapshot.zones.find(z => z.id === area.id)?.alert && <span className="world-alert-badge">!</span>}</button>)}</div></div>;
}
