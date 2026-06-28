// A 2D Gaussian parameterized by center, the two principal std-devs (sigma1
// along the main axis, sigma2 perpendicular) and the rotation angle (degrees)
// of the main axis.
export interface Dist {
  cx: number;
  cy: number;
  s1: number; // std-dev along main axis
  s2: number; // std-dev along perpendicular axis
  angleDeg: number; // rotation of main axis, degrees (CCW, math convention)
}

/** Symmetric 2x2 covariance stored as [a, b, d] = [[a, b], [b, d]]. */
export interface Cov {
  a: number;
  b: number;
  d: number;
}

export function covariance(dist: Dist): Cov {
  const t = (dist.angleDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const v1 = dist.s1 * dist.s1;
  const v2 = dist.s2 * dist.s2;
  // Sigma = R diag(v1, v2) R^T,  R = [[c,-s],[s,c]]
  return {
    a: v1 * c * c + v2 * s * s,
    b: (v1 - v2) * c * s,
    d: v1 * s * s + v2 * c * c,
  };
}

export function det(cov: Cov): number {
  return cov.a * cov.d - cov.b * cov.b;
}

/** Inverse of a symmetric 2x2, returned as a Cov. */
export function inverse(cov: Cov): Cov {
  const dt = det(cov);
  return { a: cov.d / dt, b: -cov.b / dt, d: cov.a / dt };
}

/**
 * KL( P ‖ Q ) for two 2D Gaussians (k = 2):
 *   0.5 * [ tr(Σq⁻¹ Σp) + (μq−μp)ᵀ Σq⁻¹ (μq−μp) − 2 + ln(detΣq / detΣp) ]
 */
export function kl(P: Dist, Q: Dist): number {
  const Sp = covariance(P);
  const Sq = covariance(Q);
  const Sqi = inverse(Sq);
  const detP = det(Sp);
  const detQ = det(Sq);

  // tr(Σq⁻¹ Σp) for symmetric matrices
  const trace = Sqi.a * Sp.a + 2 * Sqi.b * Sp.b + Sqi.d * Sp.d;

  // Mahalanobis term with the inverse of Σq
  const dx = P.cx - Q.cx;
  const dy = P.cy - Q.cy;
  const maha = Sqi.a * dx * dx + 2 * Sqi.b * dx * dy + Sqi.d * dy * dy;

  return 0.5 * (trace + maha - 2 + Math.log(detQ / detP));
}

/** Peak-normalized Gaussian density, in [0, 1] (1 at the center). */
export function densityNormalized(dist: Dist, invCov: Cov, x: number, y: number): number {
  // ignores the 1/(2π√det) prefactor so the peak is always 1 — good for display
  const dx = x - dist.cx;
  const dy = y - dist.cy;
  const q = invCov.a * dx * dx + 2 * invCov.b * dx * dy + invCov.d * dy * dy;
  return Math.exp(-0.5 * q);
}
