import { create } from "zustand";
import type { Dist } from "./math/gaussian";

export type Which = "P" | "Q";

// World view bounds: y spans [-VIEW, VIEW]; x derived from aspect ratio.
export const VIEW = 6;

interface State {
  P: Dist;
  Q: Dist;
  selected: Which | null;
  set: (which: Which, partial: Partial<Dist>) => void;
  setCenter: (which: Which, cx: number, cy: number) => void;
  select: (which: Which | null) => void;
  reset: () => void;
}

const DEFAULTS: { P: Dist; Q: Dist } = {
  // P = original distribution
  P: { cx: -1.6, cy: 0.2, s1: 1.5, s2: 0.9, angleDeg: 30 },
  // Q = tested distribution
  Q: { cx: 1.6, cy: -0.3, s1: 1.0, s2: 1.0, angleDeg: 0 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function sanitize(d: Partial<Dist>): Partial<Dist> {
  const out: Partial<Dist> = { ...d };
  if (out.s1 !== undefined) out.s1 = clamp(out.s1, 0.15, 5);
  if (out.s2 !== undefined) out.s2 = clamp(out.s2, 0.15, 5);
  if (out.cx !== undefined) out.cx = clamp(out.cx, -VIEW * 1.5, VIEW * 1.5);
  if (out.cy !== undefined) out.cy = clamp(out.cy, -VIEW * 1.5, VIEW * 1.5);
  return out;
}

export const useStore = create<State>((set) => ({
  P: { ...DEFAULTS.P },
  Q: { ...DEFAULTS.Q },
  selected: "Q",
  set: (which, partial) =>
    set((s) => ({ [which]: { ...s[which], ...sanitize(partial) } } as Pick<State, Which>)),
  setCenter: (which, cx, cy) =>
    set((s) => ({ [which]: { ...s[which], ...sanitize({ cx, cy }) } } as Pick<State, Which>)),
  select: (which) => set({ selected: which }),
  reset: () => set({ P: { ...DEFAULTS.P }, Q: { ...DEFAULTS.Q }, selected: "Q" }),
}));
