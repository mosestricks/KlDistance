# KL Distance

An interactive web app that visualizes the **Kullback–Leibler (KL) divergence** between two
2D Gaussian distributions, **P** (the original distribution) and **Q** (the tested one), in
real time.

![layout: live chart on top, interactive heatmap below](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TS-5eead4)

## What you see

- **Top third — live KL-over-time chart.** A continuously scrolling graph that redraws every
  animation frame. Because KL divergence is *asymmetric*, both directions are plotted:
  **KL(P‖Q)** (teal) and **KL(Q‖P)** (amber), with live numeric readouts and an auto-scaling
  y-axis.
- **Bottom two thirds — interactive heatmap.** Both Gaussians as a blended density map
  (P → blue, Q → red, overlap → purple/white), each with **1σ** (solid) and **2σ** (dashed)
  ellipses.

## Interacting

You can shape each distribution two ways — directly on the heatmap, or numerically in the
side panel:

| What | On the heatmap | In the panel |
|---|---|---|
| **Center (μ)** | drag the filled center dot | type `center x` / `center y` |
| **σ₁ (main axis) & angle** | drag the outer ring handle along the main axis | σ₁ slider + angle slider |
| **σ₂ (perpendicular)** | drag the perpendicular ring handle | σ₂ slider |
| **Select** | click a distribution | click its card |

**Reset** restores sensible defaults (P and Q offset, with different spreads and a rotation,
so KL is non-zero and its asymmetry is visible immediately).

## The math

A 2D Gaussian is parameterized by its center **μ**, two principal standard deviations
(σ₁ along the main axis, σ₂ perpendicular) and the rotation angle θ of the main axis. The
covariance is

```
Σ = R · diag(σ₁², σ₂²) · Rᵀ,   R = [[cosθ, −sinθ], [sinθ, cosθ]]
```

and the closed-form KL divergence between two Gaussians (here k = 2) is

```
KL(P ‖ Q) = ½ · [ tr(Σ_q⁻¹ Σ_p) + (μ_q − μ_p)ᵀ Σ_q⁻¹ (μ_q − μ_p) − k + ln(det Σ_q / det Σ_p) ]
```

KL is **not** symmetric: `KL(P‖Q) ≠ KL(Q‖P)`. It also grows sharply when Q is narrow relative
to P (the `Σ_q⁻¹` terms blow up) — that behavior is real, and the chart's auto-scale tracks it.

All of this lives in [`src/math/gaussian.ts`](src/math/gaussian.ts).

## Project layout

```
src/
  App.tsx               # layout: chart (top 1/3) + heatmap & controls (bottom 2/3)
  store.ts              # zustand state for P and Q (+ sensible defaults)
  math/gaussian.ts      # covariance, KL divergence, density
  components/
    KLChart.tsx         # scrolling live KL(P‖Q) & KL(Q‖P) chart
    Heatmap.tsx         # density heatmap + draggable center/axis handles
    Controls.tsx        # numeric inputs + sliders for each distribution
```

## Run locally

```bash
npm install
npm run dev      # → http://localhost:5181
npm run build    # typecheck + production build
```

Built with React, Vite, TypeScript, Tailwind CSS, Zustand, and the Canvas 2D API.
