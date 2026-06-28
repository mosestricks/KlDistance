import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { kl } from "../math/gaussian";

const MAX_SAMPLES = 700;
const PQ_COLOR = "#5eead4"; // KL(P ‖ Q)
const QP_COLOR = "#fbbf24"; // KL(Q ‖ P)

/** Fit the canvas backing store to its display size; returns CSS-px dims. */
function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

export default function KLChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pq = useRef<number[]>([]);
  const qp = useRef<number[]>([]);
  const ymax = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const frame = () => {
      const { P, Q } = useStore.getState();
      let vpq = kl(P, Q);
      let vqp = kl(Q, P);
      if (!isFinite(vpq)) vpq = 0;
      if (!isFinite(vqp)) vqp = 0;

      pq.current.push(vpq);
      qp.current.push(vqp);
      if (pq.current.length > MAX_SAMPLES) pq.current.shift();
      if (qp.current.length > MAX_SAMPLES) qp.current.shift();

      const { w, h } = fitCanvas(canvas, ctx);

      // smoothed auto-scaled ceiling
      const peak = Math.max(0.4, ...pq.current, ...qp.current);
      const target = peak * 1.2;
      ymax.current += (target - ymax.current) * 0.08;
      const yMax = ymax.current;

      // background
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, w, h);

      // gridlines + labels
      ctx.strokeStyle = "#1e2c4d";
      ctx.fillStyle = "#5b6b8c";
      ctx.font = "10px ui-monospace, monospace";
      ctx.lineWidth = 1;
      const padL = 44;
      const plotW = w - padL - 8;
      for (let i = 0; i <= 4; i++) {
        const val = (yMax * (4 - i)) / 4;
        const y = 8 + ((h - 24) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - 8, y);
        ctx.stroke();
        ctx.fillText(val.toFixed(2), 6, y + 3);
      }

      const plot = (arr: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        const n = arr.length;
        for (let i = 0; i < n; i++) {
          const x = padL + (plotW * i) / (MAX_SAMPLES - 1);
          const y = 8 + (h - 24) * (1 - Math.min(arr[i], yMax) / yMax);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      plot(qp.current, QP_COLOR);
      plot(pq.current, PQ_COLOR);

      // current-value readouts
      const last = (a: number[]) => (a.length ? a[a.length - 1] : 0);
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillStyle = PQ_COLOR;
      ctx.fillText(`KL(P‖Q) = ${last(pq.current).toFixed(3)}`, padL + 6, 18);
      ctx.fillStyle = QP_COLOR;
      ctx.fillText(`KL(Q‖P) = ${last(qp.current).toFixed(3)}`, padL + 6, 34);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-1 right-3 text-[10px] text-white/30">
        time →
      </div>
    </div>
  );
}
