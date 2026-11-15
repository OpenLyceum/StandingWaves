/**
 * PipeTermination.ts
 *
 * How the two ends of the pipe are terminated, and everything that follows from
 * it: which harmonics exist, what their frequencies are, and where the
 * displacement and pressure nodes sit.
 *
 * ── The two boundary conditions ───────────────────────────────────────────────
 *
 * A **closed** (rigid) end cannot move, so ξ = 0 there: it is a displacement
 * node and — because the gradient is largest where the displacement is pinned —
 * a pressure antinode.
 *
 * An **open** end is held at atmospheric pressure by the room outside, so p = 0
 * there: a pressure node and a displacement antinode.
 *
 * The two are exact opposites, which is why a reflected wave inverts in one
 * quantity and not in the other. That asymmetry is the whole sim.
 *
 * ── Why a *pair* and not a per-end flag ───────────────────────────────────────
 *
 * The mode series depends on the combination, not on either end alone:
 *
 *   matching ends    (closed–closed, open–open)   f₁ = c/2L,   harmonics 1,2,3,4,…
 *   mismatched ends  (closed–open)                f₁ = c/4L,   harmonics 1,3,5,7,…
 *
 * Both facts about the stopped pipe come out of that one line: its fundamental
 * is an **octave below** an open pipe of the same length, and it sounds **only
 * the odd harmonics** of that fundamental. Naming the pair keeps the dependence
 * visible. (WaveComposer's `PipeBoundary` calls the mismatched case
 * `CLOSED_PIPE`, the musician's name for it; here, where all three combinations
 * are selectable, that name would be ambiguous.)
 *
 * ── Numbering convention ──────────────────────────────────────────────────────
 *
 * Everything below indexes modes by **harmonic number h relative to that pipe's
 * own fundamental**, so h is always an integer and fₕ = h·f₁. A stopped pipe
 * simply has no mode at even h — which is what {@link isModeAllowed} reports and
 * what the overtone ladder greys out.
 */

import { Property } from "scenerystack/axon";
import { SOUND_SPEED_MPS } from "../../StandingWavesConstants.js";

export const PipeTermination = {
  /** Rigid at both ends: displacement nodes at both. Harmonics 1,2,3,… of c/2L. */
  CLOSED_CLOSED: "closedClosed",
  /** Open at both ends: displacement antinodes at both. Harmonics 1,2,3,… of c/2L. */
  OPEN_OPEN: "openOpen",
  /** Closed at x = 0, open at x = L. Harmonics 1,3,5,… of c/4L. The stopped pipe. */
  CLOSED_OPEN: "closedOpen",
} as const;

export type PipeTermination = (typeof PipeTermination)[keyof typeof PipeTermination];

/** @internal Exported for unit tests; not part of the application API. */
export const PipeTerminationValues = [
  PipeTermination.CLOSED_CLOSED,
  PipeTermination.OPEN_OPEN,
  PipeTermination.CLOSED_OPEN,
] as const;

/** How a single end behaves — for drawing, and for the chain's boundary update. */
export const EndCondition = {
  CLOSED: "closed",
  OPEN: "open",
} as const;

export type EndCondition = (typeof EndCondition)[keyof typeof EndCondition];

/** Condition at the x = 0 end. */
export function leftEnd(termination: PipeTermination): EndCondition {
  return termination === PipeTermination.OPEN_OPEN ? EndCondition.OPEN : EndCondition.CLOSED;
}

/** Condition at the x = L end. */
export function rightEnd(termination: PipeTermination): EndCondition {
  return termination === PipeTermination.CLOSED_CLOSED ? EndCondition.CLOSED : EndCondition.OPEN;
}

/** Whether the two ends are terminated the same way. */
export function isSymmetric(termination: PipeTermination): boolean {
  return termination !== PipeTermination.CLOSED_OPEN;
}

/**
 * Whether the pipe has a mode at harmonic number h of its own fundamental.
 *
 * Matching ends support every harmonic. A stopped pipe supports only the odd
 * ones: fitting an odd number of quarter wavelengths between a displacement node
 * and a displacement antinode is possible for 1, 3, 5, … quarter wavelengths and
 * for nothing in between.
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 */
export function isModeAllowed(harmonicNumber: number, termination: PipeTermination): boolean {
  if (!Number.isInteger(harmonicNumber) || harmonicNumber < 1) {
    return false;
  }
  return isSymmetric(termination) || harmonicNumber % 2 === 1;
}

/**
 * The harmonic numbers this pipe actually supports, up to and including
 * `maxHarmonic`. 1,2,3,… for matching ends; 1,3,5,… for a stopped pipe.
 */
export function allowedHarmonics(termination: PipeTermination, maxHarmonic: number): number[] {
  const harmonics: number[] = [];
  for (let h = 1; h <= maxHarmonic; h++) {
    if (isModeAllowed(h, termination)) {
      harmonics.push(h);
    }
  }
  return harmonics;
}

/**
 * Fundamental frequency f₁ (Hz): c/2L for matching ends, c/4L for a stopped
 * pipe — an octave lower for the same length, which is why a stopped organ pipe
 * can be built half as long as the note it sounds.
 *
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 */
export function fundamentalFrequency(termination: PipeTermination, pipeLength: number): number {
  const halfWavelengthsPerLength = isSymmetric(termination) ? 2 : 4;
  return SOUND_SPEED_MPS / (halfWavelengthsPerLength * pipeLength);
}

/**
 * Resonant frequency of harmonic h: fₕ = h·f₁.
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 */
export function modeFrequency(harmonicNumber: number, termination: PipeTermination, pipeLength: number): number {
  return harmonicNumber * fundamentalFrequency(termination, pipeLength);
}

/**
 * Angular wavenumber kₕ = 2πfₕ/c of harmonic h (rad/m).
 *
 * Equivalently: matching ends fit a whole number of half wavelengths into L
 * (kₕ = hπ/L), a stopped pipe an odd number of quarter wavelengths
 * (kₕ = hπ/2L, h odd).
 *
 * @param harmonicNumber - 1-based harmonic index against this pipe's f₁
 * @param termination - how the pipe is terminated
 * @param pipeLength - L in m
 */
export function modeWavenumber(harmonicNumber: number, termination: PipeTermination, pipeLength: number): number {
  // Derived from the frequency rather than written out per case, so the two can
  // never disagree about where a mode sits.
  return (2 * Math.PI * modeFrequency(harmonicNumber, termination, pipeLength)) / SOUND_SPEED_MPS;
}

/** A Property over the three terminations, validated. */
export function createPipeTerminationProperty(
  defaultValue: PipeTermination = PipeTermination.OPEN_OPEN,
): Property<PipeTermination> {
  return new Property<PipeTermination>(defaultValue, { validValues: [...PipeTerminationValues] });
}
