"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// GCode parser and 3D viewer for food printing GCode.
// ─────────────────────────────────────────────────────────────────────────────

export const SYRINGE_COLORS = ["#D15200", "#29787C", "#27AE60", "#F39C12"];

type GMove = { x: number; y: number; z: number; e: number | null; tool: number; isTravel: boolean; layer: number };

function parseGCode(raw: string) {
  const moves: GMove[] = [];
  let x = 0, y = 0, z = 0, tool = 0, layerIdx = 0;
  let relativeExtrusion = false;
  let prevE = 0;
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";")) {
      const lm = line.match(/^;\s*---\s*Layer\s+(\d+)/);
      if (lm) layerIdx = Number(lm[1]);
      continue;
    }
    const cmdOnly = line.split(";")[0].trim();
    if (cmdOnly === "M83") { relativeExtrusion = true; continue; }
    if (cmdOnly === "M82") { relativeExtrusion = false; prevE = 0; continue; }
    const tM = line.match(/^T(\d+)/); if (tM) { tool = Number(tM[1]); continue; }
    if (!line.startsWith("G0") && !line.startsWith("G1")) continue;
    const isG1 = line.startsWith("G1");
    const xm = line.match(/X([-\d.]+)/); const ym = line.match(/Y([-\d.]+)/);
    const zm = line.match(/Z([-\d.]+)/); const em = line.match(/E([-\d.]+)/);
    if (xm) x = Number(xm[1]); if (ym) y = Number(ym[1]); if (zm) z = Number(zm[1]);
    let eVal: number | null = null, isTravel = true;
    if (em) {
      eVal = Number(em[1]);
      if (relativeExtrusion) {
        if (eVal > 0) isTravel = false;
      } else {
        if (eVal > prevE) isTravel = false;
        prevE = eVal;
      }
    }
    if (!isG1) isTravel = true;
    moves.push({ x, y, z, e: eVal, tool, isTravel, layer: layerIdx });
  }
  return { moves };
}

export function GCodeCanvas({ gcode }: { gcode: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const parsed = useMemo(() => parseGCode(gcode), [gcode]);
  const [timelinePos, setTimelinePos] = useState(1.0);
  const totalExt = useMemo(() => parsed.moves.filter((m) => !m.isTravel).length, [parsed]);

  const buildScene = useCallback(() => {
    const el = mountRef.current;
    if (!el || !parsed.moves.length) return;
    const THREE = (window as any).THREE;
    if (!THREE) return;
    if (sceneRef.current) {
      sceneRef.current.renderer.dispose();
      sceneRef.current.renderer.domElement.remove();
      sceneRef.current = null;
    }
    const bgColor = 0xfafafa;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    const rect = el.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 400;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    el.appendChild(renderer.domElement);

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
    for (const m of parsed.moves) {
      if (!m.isTravel) {
        xMin = Math.min(xMin, m.x); xMax = Math.max(xMax, m.x);
        yMin = Math.min(yMin, m.y); yMax = Math.max(yMax, m.y);
        zMin = Math.min(zMin, m.z); zMax = Math.max(zMax, m.z);
      }
    }
    if (!isFinite(xMin)) return;
    const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cz = (zMin + zMax) / 2;
    const rng = Math.max(xMax - xMin, yMax - yMin, zMax - zMin) || 10;
    const grid = new THREE.GridHelper(Math.ceil(rng / 10) * 10 + 20, Math.ceil(rng / 10) + 2, 0xdedede, 0xeeeeee);
    scene.add(grid);
    const TRAVEL_COLOR = "#ccccdd";
    const segs: any[] = [];
    let prev: GMove | null = null, extIdx = 0;
    for (const m of parsed.moves) {
      if (prev) {
        const pts = [
          new THREE.Vector3(cx - prev.x, prev.z, prev.y - cy),
          new THREE.Vector3(cx - m.x, m.z, m.y - cy),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const color = m.isTravel ? TRAVEL_COLOR : SYRINGE_COLORS[m.tool % 4];
        const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: m.isTravel ? 1 : 2 });
        const ln = new THREE.Line(geo, mat);
        ln._extIdx = extIdx;
        ln._isTravel = m.isTravel;
        segs.push(ln);
        scene.add(ln);
        extIdx++;
      }
      prev = m;
    }
    // Start farther back (rng * 3) so the full shape is visible by default
    let sph = { theta: -Math.PI * 5 / 8, phi: Math.PI / 4, radius: rng * 3 };
    const updCam = () => {
      camera.position.set(
        sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta),
        sph.radius * Math.cos(sph.phi),
        sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta)
      );
      camera.lookAt(0, cz, 0);
    };
    let drag = false, pm = { x: 0, y: 0 };
    const onD = (e: MouseEvent) => { drag = true; pm = { x: e.clientX, y: e.clientY }; };
    const onU = () => { drag = false; };
    const onM = (e: MouseEvent) => {
      if (!drag) return;
      sph.theta += (e.clientX - pm.x) * 0.008;
      sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi - (e.clientY - pm.y) * 0.008));
      pm = { x: e.clientX, y: e.clientY };
      updCam();
    };
    const onW = (e: WheelEvent) => {
      e.preventDefault();
      sph.radius = Math.max(rng * 1.0, Math.min(rng * 12, sph.radius + e.deltaY * 0.1));
      updCam();
    };
    renderer.domElement.addEventListener("mousedown", onD);
    window.addEventListener("mouseup", onU);
    window.addEventListener("mousemove", onM);
    renderer.domElement.addEventListener("wheel", onW, { passive: false });
    updCam();
    let aId = 0;
    const anim = () => { aId = requestAnimationFrame(anim); renderer.render(scene, camera); };
    anim();
    sceneRef.current = { renderer, segs, aId, onD, onU, onM, onW };
  }, [parsed]);

  useEffect(() => {
    if ((window as any).THREE) buildScene();
    else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      s.onload = () => buildScene();
      document.head.appendChild(s);
    }
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.aId);
        const c = sceneRef.current;
        c.renderer.domElement.removeEventListener("mousedown", c.onD);
        window.removeEventListener("mouseup", c.onU);
        window.removeEventListener("mousemove", c.onM);
        c.renderer.domElement.removeEventListener("wheel", c.onW);
        c.renderer.dispose();
        c.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
  }, [buildScene]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const maxV = Math.floor(timelinePos * sceneRef.current.segs.length);
    for (const s of sceneRef.current.segs) s.visible = s._extIdx < maxV;
  }, [timelinePos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={mountRef} style={{ flex: 1, minHeight: 0, borderRadius: "8px", overflow: "hidden", cursor: "grab" }} />
      {totalExt > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0 0", flexShrink: 0 }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={timelinePos}
            onChange={(e) => setTimelinePos(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--fg)" }}
          />
          <span style={{ fontSize: "11px", color: "var(--fg3)" }}>{Math.round(timelinePos * 100)}%</span>
        </div>
      )}
    </div>
  );
}
