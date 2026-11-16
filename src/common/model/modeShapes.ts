import { MODE_SHAPES_SETTINGS } from "../../StandingWavesConstants.js";
/**
 * modeShapes.ts
 *
 * The spatial shape of one standing-wave mode, in displacement and in pressure.
 *
 * ── The point of this file ────────────────────────────────────────────────────
 *
 * A mode of the pipe is a product of a shape in space and an oscillation in
 * time:
 *
 *   ξ(x, t) = A · φₕ(x) · cos(ωₕ t)
 *
 * and the pressure follows from p = −ρc² ∂ξ/∂x, so it carries the *derivative*
 * of the same shape:
 *
 *   p(x, t) = ρc²Akₕ · ψₕ(x) · cos(ωₕ t),      ψₕ = −(1/kₕ) dφₕ/dx
 *
 * Differentiating a sine gives a cosine. That is the entire reason a pressure
 * antinode sits at a displacement node: the two shapes are a **quarter
 * wavelength apart in space**, always, in every mode of every termination. Note
 * also that they share the same `cos(ωₕt)` — displacement and pressure are in
 * phase in *time* and offset in *space*, which is the opposite of the travelling
 * wave on the Phase screen, where they are offset in time and aligned in space.
 *
 * Both shapes are returned normalised to a peak of 1, so a caller scales them by
 * whatever amplitude it is drawing at.
 *
 * ── Per termination ──────────────────────────────────────────────────────────
 *
 *   closed–closed   φ = sin(kx)   ψ = −cos(kx)    ξ pinned at both ends
 *   open–open       φ = cos(kx)   ψ = +sin(kx)    p pinned at both ends
 *   closed–open     φ = sin(kx)   ψ = −cos(kx)    ξ pinned at x=0, p at x=L
 *
 * Closed–open shares its formulas with closed–closed; only kₕ differs (odd
 * quarter wavelengths rather than whole half wavelengths), and that alone is
 * what turns the antinode at x = L from a node.
 */

import { modeWavenumber, PipeTermination } from "./PipeTermination.js";

/**
 * Normalised displacement shape φₕ(x) ∈ [−1, 1].
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 * @param x - position along the pipe in m, 0 at the left end
 */
export function displacementShape(
  harmonicNumber: number,
  termination: PipeTermination,
  pipeLength: number,
  x: number,
): number {
  const k = modeWavenumber(harmonicNumber, termination, pipeLength);
  // Open–open is the only case with a displacement antinode at x = 0.
  return termination === PipeTermination.OPEN_OPEN ? Math.cos(k * x) : Math.sin(k * x);
}

/**
 * Normalised pressure shape ψₕ(x) = −(1/kₕ)·dφₕ/dx ∈ [−1, 1].
 *
 * Kept as a closed form rather than a numerical derivative of
 * {@link displacementShape}: the quarter-wave offset is the concept the sim is
 * teaching, and a finite difference would blur it near the ends, which is
 * exactly where it matters.
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 * @param x - position along the pipe in m, 0 at the left end
 */
export function pressureShape(
  harmonicNumber: number,
  termination: PipeTermination,
  pipeLength: number,
  x: number,
): number {
  const k = modeWavenumber(harmonicNumber, termination, pipeLength);
  return termination === PipeTermination.OPEN_OPEN ? Math.sin(k * x) : -Math.cos(k * x);
}

/**
 * Positions of the displacement nodes (ξ = 0) along the pipe, in m.
 *
 * These are the same points as the pressure antinodes — the sim marks them
 * together for exactly that reason.
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 */
export function displacementNodePositions(
  harmonicNumber: number,
  termination: PipeTermination,
  pipeLength: number,
): number[] {
  const k = modeWavenumber(harmonicNumber, termination, pipeLength);
  // sin(kx) = 0 at x = mπ/k; cos(kx) = 0 at x = (m + ½)π/k.
  const openOpen = termination === PipeTermination.OPEN_OPEN;
  const offset = openOpen ? 0.5 : 0;
  return zerosOf(k, offset, pipeLength);
}

/**
 * Positions of the pressure nodes (p = 0) along the pipe, in m — equivalently
 * the displacement antinodes.
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 */
export function pressureNodePositions(
  harmonicNumber: number,
  termination: PipeTermination,
  pipeLength: number,
): number[] {
  const k = modeWavenumber(harmonicNumber, termination, pipeLength);
  const openOpen = termination === PipeTermination.OPEN_OPEN;
  const offset = openOpen ? 0 : 0.5;
  return zerosOf(k, offset, pipeLength);
}

/**
 * Zeros of sin(kx − offset·π) inside [0, L], i.e. x = (m + offset)·π/k.
 *
 * A small epsilon guards the endpoint test: a node that lands exactly on x = L
 * (every closed end, and every pressure node of an open end) must be included,
 * and floating-point k·L lands a hair either side of the exact multiple.
 */
/** Absolute ceiling on marker count: a physical mode of harmonic h has ~h+1 nodes. */
const MAX_ZERO_NODES: number = MODE_SHAPES_SETTINGS.MAX_ZERO_NODES;

function zerosOf(wavenumber: number, offset: number, pipeLength: number): number[] {
  // A non-positive or non-finite wavenumber makes spacing infinite/NaN; the loop
  // below would never break (keyboard/pointer fuzz can hit degenerate pipe states).
  if (!(wavenumber > 0 && Number.isFinite(wavenumber) && Number.isFinite(pipeLength)) || pipeLength < 0) {
    return [];
  }
  const spacing = Math.PI / wavenumber;
  if (!(spacing > 0 && Number.isFinite(spacing))) {
    return [];
  }
  const epsilon = spacing * MODE_SHAPES_SETTINGS.NODE_SPACING_TOLERANCE;
  const positions: number[] = [];
  // Cap both by geometry and by an absolute bound: a tiny spacing (huge k from a
  // degenerate L or harmonic under fuzz) would otherwise make ceil(L/spacing) huge
  // enough to hang the animation frame for minutes.
  const maxNodes = Math.min(MAX_ZERO_NODES, Math.max(1, Math.ceil(pipeLength / spacing) + 2));
  for (let m = 0; m < maxNodes; m++) {
    const x = (m + offset) * spacing;
    if (x > pipeLength + epsilon) {
      break;
    }
    positions.push(Math.min(x, pipeLength));
  }
  return positions;
}
