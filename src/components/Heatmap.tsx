import { useEffect, useRef, useState } from "react";
import { useStore, VIEW, type Which } from "../store";
import {
  covariance,
  densityNormalized,
  inverse,
  type Dist,
} from "../math/gaussian";

const P_RGB = [91, 157, 255]; // blue
const Q_RGB = [255, 107, 107]; // red
const BUF_W = 260; // heatmap compute resolution (width); scaled up to canvas
const HANDLE_HIT = 16; // px grab radius

type DragType = "center" | "major" | "minor";
interface Drag {
  which: Which;
  type: DragType;
}

export default function Heatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const P = useStore((s) => s.P);
  const Q = useStore((s) => s.Q);
  const selected = useStore((s) => s.selected);
  const setCenter = useStore((s) => s.setCenter);
  const setDist = useStore((s) => s.set);
  const select = useStore((s) => s.select);

  // --- coordinate mapping (set per draw) -----------------------------------
  const view = useRef({ w: 0, h: 0, scale: 1 });
  const toPx = (wx: number, wy: number) => {
    const { w, h, scale } = view.current;
    return { x: w / 2 + wx * scale, y: h / 2 - wy * scale };
  };
  const toWorld = (px: number, py: number) => {
    const { w, h, scale } = view.current;
    return { x: (px - w / 2) / scale, y: (h / 2 - py) / scale };
  };

  const handles = (d: Dist) => {
    const a = (d.angleDeg * Math.PI) / 180;
    const u = { x: Math.cos(a), y: Math.sin(a) };
    const perp = { x: -Math.sin(a), y: Math.cos(a) };
    return {
      center: { x: d.cx, y: d.cy },
      major: { x: d.cx + 2 * d.s1 * u.x, y: d.cy + 2 * d.s1 * u.y },
      minor: { x: d.cx + 2 * d.s2 * perp.x, y: d.cy + 2 * d.s2 * perp.y },
    };
  };

  // --- draw ----------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = h / (2 * VIEW);
    view.current = { w, h, scale };

    // 1) heatmap into a low-res offscreen buffer
    const bufH = Math.max(2, Math.round((BUF_W * h) / w));
    if (!bufRef.current) bufRef.current = document.createElement("canvas");
    const buf = bufRef.current;
    buf.width = BUF_W;
    buf.height = bufH;
    const bctx = buf.getContext("2d")!;
    const img = bctx.createImageData(BUF_W, bufH);
    const bscale = bufH / (2 * VIEW);

    const SpInv = inverse(covariance(P));
    const SqInv = inverse(covariance(Q));
    for (let by = 0; by < bufH; by++) {
      const wy = (bufH / 2 - by) / bscale;
      for (let bx = 0; bx < BUF_W; bx++) {
        const wx = (bx - BUF_W / 2) / bscale;
        let vP = densityNormalized(P, SpInv, wx, wy);
        let vQ = densityNormalized(Q, SqInv, wx, wy);
        vP = Math.pow(vP, 0.65); // lift tails for visibility
        vQ = Math.pow(vQ, 0.65);
        const i = (by * BUF_W + bx) * 4;
        img.data[i] = Math.min(255, P_RGB[0] * vP + Q_RGB[0] * vQ);
        img.data[i + 1] = Math.min(255, P_RGB[1] * vP + Q_RGB[1] * vQ);
        img.data[i + 2] = Math.min(255, P_RGB[2] * vP + Q_RGB[2] * vQ);
        img.data[i + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, 0, 0, w, h);

    // 2) axes
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.lineWidth = 1;
    const o = toPx(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, o.y);
    ctx.lineTo(w, o.y);
    ctx.moveTo(o.x, 0);
    ctx.lineTo(o.x, h);
    ctx.stroke();

    // 3) per-distribution ellipses + handles
    const drawDist = (d: Dist, rgb: number[], which: Which) => {
      const c = toPx(d.cx, d.cy);
      const rot = (-d.angleDeg * Math.PI) / 180; // screen y is inverted
      const col = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const isSel = selected === which;

      for (const [k, dash] of [
        [1, [] as number[]],
        [2, [5, 4]],
      ] as const) {
        ctx.beginPath();
        ctx.setLineDash(dash);
        ctx.ellipse(c.x, c.y, d.s1 * k * scale, d.s2 * k * scale, rot, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.globalAlpha = k === 1 ? 0.95 : 0.5;
        ctx.lineWidth = isSel ? 2 : 1.25;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const hs = handles(d);
      // main-axis line
      const mp = toPx(hs.major.x, hs.major.y);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(mp.x, mp.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // handle dots
      const dot = (wx: number, wy: number, r: number, fill: boolean) => {
        const p = toPx(wx, wy);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (fill) {
          ctx.fillStyle = col;
          ctx.fill();
        } else {
          ctx.fillStyle = "#0a0e17";
          ctx.fill();
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };
      dot(hs.major.x, hs.major.y, 4.5, false); // σ1 / angle handle
      dot(hs.minor.x, hs.minor.y, 4.5, false); // σ2 handle
      dot(d.cx, d.cy, isSel ? 7 : 5.5, true); // center handle

      // label
      ctx.fillStyle = col;
      ctx.font = "bold 13px ui-sans-serif, system-ui";
      ctx.fillText(which, c.x + 9, c.y - 9);
    };

    drawDist(P, P_RGB, "P");
    drawDist(Q, Q_RGB, "Q");
  }, [P, Q, selected, resizeTick]);

  // redraw on container resize
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // --- interaction ---------------------------------------------------------
  const pickHandle = (px: number, py: number): Drag | null => {
    let best: { drag: Drag; dist: number } | null = null;
    for (const which of ["P", "Q"] as Which[]) {
      const d = useStore.getState()[which];
      const hs = handles(d);
      const cand: [DragType, { x: number; y: number }][] = [
        ["center", hs.center],
        ["major", hs.major],
        ["minor", hs.minor],
      ];
      for (const [type, wpt] of cand) {
        const p = toPx(wpt.x, wpt.y);
        const dd = Math.hypot(p.x - px, p.y - py);
        if (dd <= HANDLE_HIT && (!best || dd < best.dist)) {
          best = { drag: { which, type }, dist: dd };
        }
      }
    }
    return best?.drag ?? null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = pickHandle(px, py);
    if (hit) {
      dragRef.current = hit;
      select(hit.which);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wpt = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const d = useStore.getState()[drag.which];
    if (drag.type === "center") {
      setCenter(drag.which, wpt.x, wpt.y);
    } else if (drag.type === "major") {
      const vx = wpt.x - d.cx;
      const vy = wpt.y - d.cy;
      const len = Math.hypot(vx, vy);
      const angleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
      setDist(drag.which, { s1: len / 2, angleDeg });
    } else {
      // minor: project onto the perpendicular of the current main axis
      const a = (d.angleDeg * Math.PI) / 180;
      const perp = { x: -Math.sin(a), y: Math.cos(a) };
      const proj = Math.abs((wpt.x - d.cx) * perp.x + (wpt.y - d.cy) * perp.y);
      setDist(drag.which, { s2: proj / 2 });
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="h-full w-full touch-none"
      style={{ cursor: dragRef.current ? "grabbing" : "crosshair" }}
    />
  );
}
