import { useStore, type Which } from "../store";
import type { Dist } from "../math/gaussian";

const COLORS: Record<Which, string> = { P: "#5b9dff", Q: "#ff6b6b" };
const LABELS: Record<Which, string> = { P: "P — original", Q: "Q — tested" };

const r2 = (v: number) => Math.round(v * 100) / 100;

function NumberRow({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/55">{label}</span>
      <input
        type="number"
        step={step}
        value={r2(value)}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="w-20 rounded border border-ink-600 bg-ink-900 px-2 py-1 text-right font-mono text-white/90 focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-white/55">{label}</span>
        <span className="font-mono text-white/90">
          {r2(value)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function DistCard({ which }: { which: Which }) {
  const d = useStore((s) => s[which]) as Dist;
  const selected = useStore((s) => s.selected);
  const set = useStore((s) => s.set);
  const select = useStore((s) => s.select);
  const isSel = selected === which;

  return (
    <div
      onMouseDown={() => select(which)}
      className={[
        "rounded-xl border bg-ink-800/50 p-3 transition",
        isSel ? "border-accent/70 ring-1 ring-accent/40" : "border-ink-600",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: COLORS[which] }} />
        <span className="text-sm font-semibold text-white/90">{LABELS[which]}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberRow label="center x" value={d.cx} step={0.1} onChange={(v) => set(which, { cx: v })} />
        <NumberRow label="center y" value={d.cy} step={0.1} onChange={(v) => set(which, { cy: v })} />
      </div>

      <div className="mt-3 space-y-2.5">
        <SliderRow
          label="σ₁ (main axis)"
          value={d.s1}
          min={0.15}
          max={5}
          step={0.05}
          onChange={(v) => set(which, { s1: v })}
        />
        <SliderRow
          label="σ₂ (perpendicular)"
          value={d.s2}
          min={0.15}
          max={5}
          step={0.05}
          onChange={(v) => set(which, { s2: v })}
        />
        <SliderRow
          label="angle"
          value={d.angleDeg}
          min={-180}
          max={180}
          step={1}
          suffix="°"
          onChange={(v) => set(which, { angleDeg: v })}
        />
      </div>
    </div>
  );
}

export default function Controls() {
  const reset = useStore((s) => s.reset);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <DistCard which="P" />
      <DistCard which="Q" />
      <button
        onClick={reset}
        className="mt-auto rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-accent/60 hover:text-white"
      >
        Reset to defaults
      </button>
      <p className="text-[10px] leading-snug text-white/35">
        Drag the <span className="text-white/60">center dot</span> to move a distribution, or the
        two <span className="text-white/60">ring handles</span> to change σ₁/angle and σ₂. KL is
        asymmetric — both directions are plotted above.
      </p>
    </div>
  );
}
