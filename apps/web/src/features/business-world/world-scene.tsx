"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { resolveScene, type BusinessWorldConfig, type BusinessWorldSnapshot, type WorldZone, type ZoneId } from "./model";

// Art direction: a matte clay diorama with rounded forms and soft shadows.
// Colors are the established World palette plus the business's brand colors; do not add new hues.
const palette = { floor: "#e9ede5", pad: "#eeeade", wall: "#e3dfd1", wood: "#cd9f67", ink: "#10243e", glass: "#a8d8e7", leaf: "#4e7969", road: "#d5d9d9", box: "#cd9f67", skin: "#b9825d", hair: "#10243e", steel: "#afbec7", white: "#fff9e9", selected: "#c3daf4", alert: "#df1a2c", sky: "#eaf0ee", base: "#d9e4df" };
type Vec = [number, number, number];

// Geometry and materials are shared and cached for the lifetime of the page.
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 28);
const sphere = new THREE.SphereGeometry(1, 24, 16);
const torso = new THREE.CapsuleGeometry(.115, .2, 6, 16);
const leg = new THREE.CapsuleGeometry(.045, .1, 4, 10);
const unitBox = new RoundedBoxGeometry(1, 1, 1, 2, .14);
const materials = new Map<string, THREE.MeshLambertMaterial>();
function material(color: string) { let value = materials.get(color); if (!value) { value = new THREE.MeshLambertMaterial({ color }); materials.set(color, value); } return value; }
const boxes = new Map<string, RoundedBoxGeometry>();
function roundedBox(size: Vec, radius: number) {
  const r = Math.max(.004, Math.min(radius, Math.min(...size) / 2 - .002));
  const key = `${size.join(":")}:${r.toFixed(3)}`;
  let value = boxes.get(key);
  if (!value) { value = new RoundedBoxGeometry(size[0], size[1], size[2], 2, r); boxes.set(key, value); }
  return value;
}

function Block({ at, size, color, round = false, radius = .06 }: { at: Vec; size: Vec; color: string; round?: boolean; radius?: number }) {
  return round
    ? <mesh position={at} scale={size} geometry={cylinder} material={material(color)} castShadow receiveShadow dispose={null} />
    : <mesh position={at} geometry={roundedBox(size, radius)} material={material(color)} castShadow receiveShadow dispose={null} />;
}
function Disc({ at, r, color, depth = .05 }: { at: Vec; r: number; color: string; depth?: number }) { return <mesh position={at} rotation={[Math.PI / 2, 0, 0]} scale={[r, depth, r]} geometry={cylinder} material={material(color)} castShadow dispose={null} />; }
function Person({ at, shirt }: { at: Vec; shirt: string }) {
  return <group position={at}>
    <mesh position={[0, .34, 0]} geometry={torso} material={material(shirt)} castShadow dispose={null} />
    <mesh position={[0, .68, 0]} scale={.125} geometry={sphere} material={material(palette.skin)} castShadow dispose={null} />
    <mesh position={[0, .72, -.025]} scale={[.132, .105, .132]} geometry={sphere} material={material(palette.hair)} dispose={null} />
    {[-.055, .055].map(x => <mesh key={x} position={[x, .095, 0]} geometry={leg} material={material(palette.ink)} dispose={null} />)}
  </group>;
}
// Decorative walkers illustrate the miniature; their number is never a traffic metric.
function Walker({ at, shirt, paused, phase = 0 }: { at: Vec; shirt: string; paused: boolean; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(phase);
  useFrame((_, delta) => {
    if (paused || !ref.current) return;
    elapsed.current += Math.min(delta, .05);
    const t = elapsed.current * .65;
    ref.current.position.x = at[0] + Math.sin(t) * .5;
    ref.current.position.y = at[1] + Math.abs(Math.sin(t * 12)) * .03;
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
    lamp.current?.scale.setScalar(.17 + pulse * .05);
    halo.current?.scale.setScalar(.8 + pulse * .3);
  });
  return <group>
    <Block at={[1.35, 1.1, -1.15]} size={[.025, 2.2, .025]} color={palette.ink} round />
    <Block at={[1.35, .03, -1.15]} size={[.14, .06, .14]} color={palette.ink} round />
    <mesh ref={lamp} position={[1.35, 2.3, -1.15]} scale={.2} geometry={sphere}><meshBasicMaterial color={palette.alert} /></mesh>
    <mesh ref={halo} position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.42, 1.52, 56]} /><meshBasicMaterial color={palette.alert} transparent opacity={.3} depthWrite={false} />
    </mesh>
  </group>;
}
function AmbientMotion({ paused }: { paused: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => { if (!paused) invalidate(); }, [paused, invalidate]);
  useFrame(() => { if (!paused) invalidate(); });
  return null;
}
function Tree({ at }: { at: Vec }) {
  return <group position={at}>
    <Block at={[0, .04, 0]} size={[.36, .08, .36]} color={palette.wall} round />
    <Block at={[0, .42, 0]} size={[.045, .7, .045]} color={palette.wood} round />
    <mesh position={[0, 1, 0]} scale={[.42, .5, .42]} geometry={sphere} material={material(palette.leaf)} castShadow dispose={null} />
    <mesh position={[.2, .74, .1]} scale={.22} geometry={sphere} material={material(palette.leaf)} castShadow dispose={null} />
  </group>;
}
function Plant({ at }: { at: Vec }) {
  return <group position={at}>
    <Block at={[0, .15, 0]} size={[.15, .3, .15]} color={palette.wood} round />
    <mesh position={[0, .52, 0]} scale={[.24, .3, .24]} geometry={sphere} material={material(palette.leaf)} castShadow dispose={null} />
    <mesh position={[.13, .38, .06]} scale={.14} geometry={sphere} material={material(palette.leaf)} dispose={null} />
  </group>;
}
// Two low walls open toward the camera turn each area into its own small room.
function Walls({ height = .85, trim }: { height?: number; trim?: string }) {
  return <>
    <Block at={[0, height / 2, -1.63]} size={[3.7, height, .16]} color={palette.wall} radius={.07} />
    <Block at={[-1.77, height / 2, -.03]} size={[.16, height, 3.36]} color={palette.wall} radius={.07} />
    {trim && <Block at={[0, height + .03, -1.63]} size={[3.74, .1, .2]} color={trim} radius={.05} />}
  </>;
}
function Shelf({ at, accent }: { at: Vec; accent: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const transform = new THREE.Object3D();
    const tones = [accent, palette.box, palette.white, palette.box];
    for (let i = 0; i < 12; i++) {
      transform.position.set((i % 4) * .3 - .45, Math.floor(i / 4) * .4 + .27, 0);
      transform.scale.set(.22, .26 - (i % 3) * .04, .28);
      transform.updateMatrix();
      ref.current.setMatrixAt(i, transform.matrix);
      ref.current.setColorAt(i, new THREE.Color(tones[(i * 7) % tones.length]));
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [accent]);
  return <group position={at}>
    {[-.7, .7].map(x => <Block key={x} at={[x, .67, 0]} size={[.07, 1.34, .44]} color={palette.ink} radius={.03} />)}
    {[.1, .5, .9, 1.3].map(y => <Block key={y} at={[0, y, 0]} size={[1.42, .05, .44]} color={palette.white} radius={.02} />)}
    <instancedMesh ref={ref} args={[unitBox, material(palette.white), 12]} castShadow dispose={null} />
  </group>;
}
function Desk({ at, screen, shirt }: { at: Vec; screen: string; shirt: string }) {
  return <group position={at}>
    <Block at={[0, .56, 0]} size={[1.15, .08, .68]} color={palette.wood} radius={.04} />
    {[-.48, .48].map(x => <Block key={x} at={[x, .26, 0]} size={[.07, .52, .58]} color={palette.wall} radius={.03} />)}
    <Block at={[0, .66, -.14]} size={[.06, .14, .06]} color={palette.ink} radius={.02} />
    <Block at={[0, .87, -.14]} size={[.46, .3, .05]} color={palette.ink} radius={.025} />
    <Block at={[0, .87, -.11]} size={[.38, .22, .012]} color={screen} radius={.005} />
    <Person at={[0, 0, -.66]} shirt={shirt} />
  </group>;
}
function Truck({ primary, accent, moving, paused }: { primary: string; accent: string; moving: boolean; paused: boolean }) {
  const ref = useRef<THREE.Group>(null); const elapsed = useRef(0);
  useFrame((_, delta) => { if (!ref.current || paused || !moving) return; elapsed.current += Math.min(delta, .05); const t = elapsed.current * .45; ref.current.position.x = Math.sin(t) * .6; ref.current.position.z = Math.cos(t) * .25; ref.current.rotation.y = Math.atan2(Math.sin(t) * .25, Math.cos(t) * .6); });
  return <group ref={ref} position={[0, 0, moving ? -.2 : .15]}>
    <Block at={[-.33, .62, 0]} size={[1.25, .86, .86]} color={palette.white} radius={.12} />
    <Block at={[.63, .46, 0]} size={[.62, .56, .84]} color={primary} radius={.14} />
    <Block at={[.7, .56, 0]} size={[.36, .24, .86]} color={palette.glass} radius={.05} />
    <Block at={[-.33, .5, 0]} size={[1.1, .1, .88]} color={accent} radius={.02} />
    {[-.65, .62].flatMap(x => [-.42, .42].map(z => <mesh key={`${x}:${z}`} geometry={cylinder} rotation={[Math.PI / 2, 0, 0]} position={[x, .17, z]} scale={[.17, .12, .17]} material={material(palette.ink)} castShadow dispose={null} />))}
  </group>;
}
function IndustryDetails({ config, primary, accent }: { config: BusinessWorldConfig; primary: string; accent: string }) {
  if (config.industry === "food_restaurant") return <group position={[1.1, 0, -1]}><Block at={[0, .4, 0]} size={[1, .8, .6]} color={palette.steel} radius={.06} />{[-.25, .25].map(x => <Block key={x} at={[x, .86, 0]} size={[.15, .12, .15]} color={palette.ink} round />)}<Block at={[0, 1.3, -.05]} size={[1.2, .14, .7]} color={palette.steel} radius={.05} /></group>;
  if (config.industry === "salon_service") return <group position={[1.1, 0, -.9]}><Block at={[0, .8, -.6]} size={[.7, 1, .06]} color={accent} radius={.03} /><Block at={[0, .8, -.57]} size={[.58, .86, .03]} color={palette.glass} radius={.01} /><Block at={[0, .3, .1]} size={[.6, .16, .6]} color={primary} radius={.07} /><Block at={[0, .58, -.16]} size={[.6, .5, .12]} color={primary} radius={.05} /></group>;
  if (config.industry === "repair_services") return <group position={[1.1, 0, -1]}><Block at={[0, .5, 0]} size={[.95, 1, .75]} color={palette.white} radius={.1} /><Disc at={[0, .5, .39]} r={.28} color={palette.glass} depth={.04} /><Block at={[0, .9, .39]} size={[.6, .08, .03]} color={primary} radius={.01} /></group>;
  if (config.industry === "wholesale_distribution") return <group position={[1.1, 0, -1]}>{[0, 1].map(i => <Block key={i} at={[0, .27 + i * .52, 0]} size={[.85, .5, .75]} color={palette.box} radius={.05} />)}</group>;
  if (config.industry === "professional_services" || config.service !== "in_store") return <group position={[1.1, 0, -1]}><Block at={[0, .56, 0]} size={[1, .08, .6]} color={palette.wood} radius={.04} /><Block at={[0, .26, 0]} size={[.8, .52, .06]} color={palette.wood} radius={.02} /><Block at={[0, .82, -.1]} size={[.5, .32, .05]} color={palette.ink} radius={.025} /></group>;
  // Retail default: a small display stand of products.
  return <group position={[1.1, 0, -1.05]}><Block at={[0, .22, 0]} size={[.95, .44, .5]} color={palette.white} radius={.08} /><Block at={[-.28, .56, 0]} size={[.2, .24, .2]} color={accent} radius={.04} /><Block at={[0, .6, 0]} size={[.2, .32, .2]} color={primary} radius={.04} /><Block at={[.28, .54, 0]} size={[.2, .2, .2]} color={palette.box} radius={.04} /></group>;
}
function Store({ primary, secondary, accent, config, paused }: { primary: string; secondary: string; accent: string; config: BusinessWorldConfig; paused: boolean }) {
  return <group>
    <Walls height={1.2} />
    <Block at={[0, 1.25, -1.36]} size={[3.76, .12, .7]} color={primary} radius={.06} />
    <Disc at={[-.55, .8, -1.53]} r={.2} color={primary} /><Disc at={[-.55, .8, -1.5]} r={.08} color={accent} />
    <Block at={[-.55, .3, -.55]} size={[1.5, .6, .56]} color={palette.wood} radius={.1} />
    <Block at={[-.55, .62, -.55]} size={[1.6, .06, .66]} color={palette.white} radius={.03} />
    <Block at={[-.95, .76, -.55]} size={[.26, .22, .2]} color={palette.ink} radius={.04} /><Block at={[-.95, .78, -.44]} size={[.18, .12, .012]} color={palette.glass} radius={.005} />
    <Person at={[-.3, 0, -1.08]} shirt={primary} />
    {config.industry === "food_restaurant" && <><Block at={[.9, .45, .8]} size={[.4, .06, .4]} color={palette.wood} round /><Block at={[.9, .22, .8]} size={[.05, .44, .05]} color={palette.wood} round /></>}
    <Walker at={[-.2, 0, .75]} shirt={secondary} paused={paused} />
    <IndustryDetails config={config} primary={primary} accent={accent} />
  </group>;
}
function Contents({ zone, config, colors, paused }: { zone: WorldZone; config: BusinessWorldConfig; colors: BusinessWorldSnapshot["colors"]; paused: boolean }) {
  const { primary, secondary, accent } = colors;
  switch (zone.id) {
    case "sales": return <Store primary={primary} secondary={secondary} accent={accent} config={config} paused={paused} />;
    case "shelves": return <><Walls /><Shelf at={[-.7, 0, -1.2]} accent={accent} /><Shelf at={[.75, 0, -.1]} accent={accent} /><Block at={[-.9, .16, .7]} size={[.42, .32, .42]} color={palette.box} radius={.05} /></>;
    case "warehouse": return <>{config.storage !== "none" ? <Walls height={1.5} trim={primary} /> : <Walls />}<Shelf at={[-.7, 0, -1.2]} accent={accent} /><Shelf at={[.8, 0, -1.2]} accent={accent} /><Block at={[.2, .04, .55]} size={[1.1, .08, .9]} color={palette.wood} radius={.02} />{([[-.05, .3, .5], [.47, .3, .6], [.2, .72, .55]] as Vec[]).map(at => <Block key={at.join()} at={at} size={[.46, .42, .5]} color={palette.box} radius={.05} />)}</>;
    case "purchasing": return <>
      <Block at={[0, .13, -.55]} size={[2.9, .26, 1.7]} color={palette.wall} radius={.08} />
      {[-.85, -.05, .75].map((x, i) => <Block key={x} at={[x, .26 + (.42 + i * .12) / 2, -.6]} size={[.62, .42 + i * .12, .62]} color={palette.box} radius={.06} />)}
      {[-1.35, 1.35].flatMap(x => [-1.3, .2].map(z => <Block key={`${x}:${z}`} at={[x, .9, z]} size={[.035, 1.6, .035]} color={palette.ink} round />))}
      <Block at={[0, 1.72, -.55]} size={[3.1, .1, 1.9]} color={primary} radius={.05} />
      <Walker at={[.6, 0, .95]} shirt={accent} paused={paused} phase={3} />
    </>;
    case "crm": return <><Walls />
      <Block at={[-.2, .24, -1.05]} size={[1.9, .34, .62]} color={primary} radius={.14} /><Block at={[-.2, .5, -1.36]} size={[1.9, .62, .22]} color={primary} radius={.1} />
      <Block at={[-.2, .34, -.15]} size={[.36, .06, .36]} color={palette.wood} round /><Block at={[-.2, .16, -.15]} size={[.05, .32, .05]} color={palette.wood} round />
      <Walker at={[-.4, 0, .75]} shirt={secondary} paused={paused} phase={6} /><Person at={[.55, 0, .35]} shirt={accent} /><Plant at={[1.3, 0, -1.2]} />
    </>;
    case "delivery": return <>
      <Block at={[0, .012, 0]} size={[3.4, .024, 2.5]} color={palette.road} radius={.01} />
      {[-1, 0, 1].map(x => <Block key={x} at={[x, .03, 1.02]} size={[.5, .02, .06]} color={palette.white} radius={.005} />)}
      {config.fulfillment !== "pickup" ? <Truck primary={primary} accent={accent} paused={paused} moving={zone.metrics.some(m => m.label === "Out for delivery" && m.value > 0)} /> : <Block at={[0, .35, 0]} size={[1.6, .7, .8]} color={palette.wood} radius={.1} />}
      <Block at={[-1.3, .2, -.85]} size={[.4, .4, .4]} color={palette.box} radius={.05} /><Block at={[-1.25, .55, -.85]} size={[.28, .28, .28]} color={palette.box} radius={.04} />
    </>;
    default: return <><Walls />
      <Desk at={[-.75, 0, -.35]} screen={zone.id === "appointments" ? palette.glass : accent} shirt={secondary} /><Desk at={[.65, 0, -.35]} screen={palette.glass} shirt={primary} />
      {zone.id === "job_orders" && <><Block at={[0, .5, -1.53]} size={[2.2, .5, .04]} color={palette.white} radius={.02} />{[-.7, 0, .7].map((x, i) => <Block key={x} at={[x, .5, -1.5]} size={[.4, .3, .02]} color={i === 1 ? accent : palette.glass} radius={.01} />)}</>}
      <Plant at={[1.45, 0, -1.25]} />
    </>;
  }
}
function Area({ zone, config, position, snapshot, selected, onSelect, paused }: { zone: WorldZone; config: BusinessWorldConfig; position: Vec; snapshot: BusinessWorldSnapshot; selected: boolean; onSelect: (id: ZoneId) => void; paused: boolean }) {
  const marker = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const animateUntil = useRef(0);
  const previous = useRef(zone.revision);
  useEffect(() => { if (!paused && previous.current !== zone.revision && previous.current && zone.revision) { animateUntil.current = performance.now() + 1600; invalidate(); } previous.current = zone.revision; }, [zone.revision, paused, invalidate]);
  useFrame(() => { if (paused || performance.now() >= animateUntil.current || !marker.current) return; marker.current.position.y = 1.9 + Math.sin(performance.now() / 110) * .09; invalidate(); });
  const pick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(zone.id); };
  return <group position={position} onClick={pick}>
    <Block at={[0, -.08, 0]} size={[3.86, .16, 3.6]} color={selected ? palette.selected : palette.pad} radius={.075} />
    <Contents zone={zone} config={config} colors={snapshot.colors} paused={paused} />
    {zone.alert ? <AttentionBeacon paused={paused} /> : <mesh ref={marker} position={[1.35, 1.9, -1.15]} scale={.09} geometry={sphere} material={material(snapshot.colors.accent)} dispose={null} />}
  </group>;
}
function ProjectLabels({ layout, labels }: { layout: ReturnType<typeof resolveScene>; labels: Map<ZoneId, HTMLButtonElement> }) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const area of layout) {
      const element = labels.get(area.id); if (!element) continue;
      point.set(area.position[0], .15, area.position[2] + 1.6).project(camera);
      element.style.transform = `translate(-50%,-50%) translate(${(point.x + 1) * size.width / 2}px,${(1 - point.y) * size.height / 2}px)`;
      element.style.visibility = point.z > 1 ? "hidden" : "visible";
    }
  });
  return null;
}
function Lifecycle({ onFailure, cameraKey, visible, extent }: { onFailure: () => void; cameraKey: number; visible: boolean; extent: Extent }) {
  const { gl, invalidate, camera, size, setDpr } = useThree();
  const quality = useThree(state => state.performance.current);
  useFrame((state, delta) => { if (delta > 1 / 30 && delta < .15) state.performance.regress(); });
  useEffect(() => { setDpr(size.width < 600 || quality < 1 ? 1 : Math.min(window.devicePixelRatio, 1.5)); }, [size.width, quality, setDpr]);
  useEffect(() => { const lost = (event: Event) => { event.preventDefault(); onFailure(); }; gl.domElement.addEventListener("webglcontextlost", lost); return () => gl.domElement.removeEventListener("webglcontextlost", lost); }, [gl, onFailure]);
  // Fit the diorama to the stage: project its footprint through the fixed isometric view.
  const across = extent.w * .79 + extent.d * .62, up = (extent.w * .62 + extent.d * .79) * .55 + 3.2;
  const zoom = Math.min(size.width / (across * 1.04), size.height / (up * 1.03));
  // R3F owns this imperative Three.js camera; updating it is external-system synchronization.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { camera.position.set(15, 16, 19); camera.lookAt(0, 0, 0); camera.zoom = zoom; camera.updateProjectionMatrix(); if (visible) invalidate(); }, [cameraKey, camera, zoom, invalidate, visible]);
  return null;
}
type Extent = { w: number; d: number };
function Landscaping({ extent }: { extent: Extent }) {
  const small = useThree(state => state.size.width < 600);
  const x = extent.w / 2 - .75, z = extent.d / 2 - 1.3;
  return <>{[-x, x].flatMap(side => (small || z < 2 ? [0] : [-z, 0, z]).map(depth => <Tree key={`${side}:${depth}`} at={[side, -.15, depth]} />))}</>;
}
export default function WorldScene({ snapshot, config, selected, onSelect, paused, visible, cameraKey, onFailure }: { snapshot: BusinessWorldSnapshot; config: BusinessWorldConfig; selected: ZoneId | null; onSelect: (id: ZoneId) => void; paused: boolean; visible: boolean; cameraKey: number; onFailure: () => void }) {
  const layout = useMemo(() => resolveScene(config, snapshot.zones), [config, snapshot.zones]);
  const labels = useMemo(() => new Map<ZoneId, HTMLButtonElement>(), []);
  // The base hugs the layout, so a two-row business is not lost on an oversized table.
  const extent = useMemo<Extent>(() => { const step = config.presentation === "spacious" ? 4.8 : 4.1; return { w: step * 2 + 7, d: Math.max(1, Math.ceil(layout.length / 3)) * step + 1.4 }; }, [config.presentation, layout.length]);
  // Soft shadows carry the clay look on larger screens; phones skip the shadow pass.
  const [shadows] = useState(() => window.innerWidth >= 600);
  return <div className="world-canvas"><Canvas orthographic flat shadows={shadows} frameloop={visible ? "demand" : "never"} dpr={[1, 1.5]} camera={{ position: [15, 16, 19], zoom: 32, near: .1, far: 100 }} gl={{ antialias: true, powerPreference: "low-power" }} fallback={<p>Choose the 2D overview to explore your business on this device.</p>} onCreated={({ gl }) => { gl.setClearColor(palette.sky); }}>
    <hemisphereLight args={["#ffffff", "#e3dfd1", 2.1]} />
    <directionalLight position={[8, 20, 12]} intensity={1.35} castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-bias={-.0004} shadow-normalBias={.03} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={60} />
    <Block at={[0, -.66, 0]} size={[extent.w + .5, .5, extent.d + .5]} color={palette.base} radius={.24} />
    <Block at={[0, -.3, 0]} size={[extent.w, .3, extent.d]} color={palette.floor} radius={.14} />
    <Block at={[0, -.142, 0]} size={[.55, .02, extent.d - 1]} color={palette.road} radius={.008} />
    <Landscaping extent={extent} />
    <AmbientMotion paused={paused || !visible} />
    {layout.map(area => <Area key={area.id} zone={snapshot.zones.find(z => z.id === area.id)!} config={config} snapshot={snapshot} position={area.position} selected={selected === area.id} onSelect={onSelect} paused={paused} />)}
    <OrbitControls key={cameraKey} makeDefault enablePan={false} enableDamping={false} minZoom={8} maxZoom={85} minPolarAngle={.35} maxPolarAngle={1.1} minAzimuthAngle={-.8} maxAzimuthAngle={1.4} />
    <Lifecycle onFailure={onFailure} cameraKey={cameraKey} visible={visible} extent={extent} />
    <ProjectLabels layout={layout} labels={labels} />
  </Canvas><div className="world-label-overlay" aria-hidden="true">{layout.map(area => <button ref={element => { if (element) labels.set(area.id, element); else labels.delete(area.id); }} className={`world-scene-label ${selected === area.id ? "selected" : ""} ${snapshot.zones.find(z => z.id === area.id)?.alert ? "has-alert" : ""}`} tabIndex={-1} key={area.id} onClick={() => onSelect(area.id)}>{area.label}{snapshot.zones.find(z => z.id === area.id)?.alert && <span className="world-alert-badge">!</span>}</button>)}</div></div>;
}
