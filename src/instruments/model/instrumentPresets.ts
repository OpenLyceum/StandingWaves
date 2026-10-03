/**
 * instrumentPresets.ts
 *
 * Four pipes a learner can recognise, each described by nothing more than a length
 * and a termination.
 *
 * ── The comparison the screen is built around ─────────────────────────────────
 *
 * The flute and the clarinet are given the **same bore length** on purpose. That
 * one choice carries the whole lesson:
 *
 *   flute     — open at both ends   → f₁ = c/2L, every harmonic
 *   clarinet  — stopped at the reed → f₁ = c/4L, odd harmonics only
 *
 * so the clarinet sounds an **octave below** a flute of its own length, and its
 * ladder has gaps where the flute's has rungs. Both facts fall out of
 * `PipeTermination`; nothing here encodes them separately.
 *
 * ── What is a simplification, and said so ─────────────────────────────────────
 *
 * A real clarinet is not a cylinder with a rigid cap, a real flute has an embouchure
 * hole rather than a plain open end, and both have end corrections that flatten the
 * ideal frequencies by a few percent. What survives that simplification — which
 * harmonics a pipe supports, and where its fundamental sits — is exactly what this
 * screen is about, and it survives intact. See doc/model.md.
 */

import { PipeTermination } from "../../common/model/PipeTermination.js";

/** The bore length shared by the flute and the clarinet (m). */
const WOODWIND_LENGTH_M = 0.6;

/**
 * Bore length of the two organ pipes (m): a 4-ft stop, the commonest organ pitch
 * after 8 ft. Every preset must lie inside PIPE_LENGTH_RANGE_M, since it is written
 * into the same pipeLengthProperty the Standing Waves slider drives.
 */
const ORGAN_LENGTH_M = 1.22;

export const InstrumentPreset = {
  OPEN_ORGAN_PIPE: "openOrganPipe",
  STOPPED_ORGAN_PIPE: "stoppedOrganPipe",
  FLUTE: "flute",
  CLARINET: "clarinet",
} as const;

export type InstrumentPreset = (typeof InstrumentPreset)[keyof typeof InstrumentPreset];

export const InstrumentPresetValues = [
  InstrumentPreset.OPEN_ORGAN_PIPE,
  InstrumentPreset.STOPPED_ORGAN_PIPE,
  InstrumentPreset.FLUTE,
  InstrumentPreset.CLARINET,
] as const;

export type InstrumentSpec = {
  /** Bore length (m). */
  readonly pipeLength: number;
  /** How the bore is terminated. */
  readonly termination: PipeTermination;
};

/**
 * The four pipes. Ordered so the two organ pipes sit together and the two woodwinds
 * sit together, since each pair is a same-length comparison.
 */
export const INSTRUMENT_SPECS: Readonly<Record<InstrumentPreset, InstrumentSpec>> = {
  [InstrumentPreset.OPEN_ORGAN_PIPE]: {
    pipeLength: ORGAN_LENGTH_M,
    termination: PipeTermination.OPEN_OPEN,
  },
  [InstrumentPreset.STOPPED_ORGAN_PIPE]: {
    pipeLength: ORGAN_LENGTH_M,
    termination: PipeTermination.CLOSED_OPEN,
  },
  [InstrumentPreset.FLUTE]: {
    pipeLength: WOODWIND_LENGTH_M,
    termination: PipeTermination.OPEN_OPEN,
  },
  [InstrumentPreset.CLARINET]: {
    pipeLength: WOODWIND_LENGTH_M,
    termination: PipeTermination.CLOSED_OPEN,
  },
};

/** The spec for one preset. */
export function specFor(preset: InstrumentPreset): InstrumentSpec {
  return INSTRUMENT_SPECS[preset];
}
