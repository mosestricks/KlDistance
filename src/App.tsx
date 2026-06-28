import KLChart from "./components/KLChart";
import Heatmap from "./components/Heatmap";
import Controls from "./components/Controls";

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-ink-900 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-ink-600 bg-ink-800/60 px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight">KL Distance</span>
          <span className="text-xs text-white/45">
            divergence between two 2D Gaussians, live
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pdist" /> P (original)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-qdist" /> Q (tested)
          </span>
        </div>
      </header>

      {/* Top third: live KL-over-time chart */}
      <section className="h-[32vh] shrink-0 border-b border-ink-600">
        <KLChart />
      </section>

      {/* Bottom two thirds: heatmap + controls */}
      <main className="flex min-h-0 flex-1">
        <section className="relative min-w-0 flex-1">
          <Heatmap />
        </section>
        <aside className="w-80 shrink-0 border-l border-ink-600 bg-ink-800/40">
          <Controls />
        </aside>
      </main>
    </div>
  );
}
