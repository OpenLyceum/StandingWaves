/**
 * StandingWavesConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in StandingWavesColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Range } from "scenerystack/dot";
import StandingWavesNamespace from "./StandingWavesNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Vertical gap between stacked trace strips and the pipe above them. */
export const STRIP_SPACING = 8;

/** Drawn height of a pipe's bore, i.e. the inside gap between its walls (px). */
export const PIPE_BORE_HEIGHT = 60;

/** Thickness of a pipe wall, and of the cap that closes an end (px). */
export const PIPE_WALL_THICKNESS = 5;

// ── The medium (SI units) ─────────────────────────────────────────────────────

/**
 * Speed of sound in the pipe (m/s). Dry air at 20 °C. Held fixed: the sim is
 * about boundary conditions, and a variable sound speed would let a learner
 * change fₙ without changing anything they can see in the pipe.
 */
export const SOUND_SPEED_MPS = 343;

/**
 * Density of the medium (kg/m³). Dry air at 20 °C and 1 atm. Enters only
 * through the characteristic impedance ρc, which is what converts between the
 * velocity and pressure axes.
 */
export const AIR_DENSITY_KGPM3 = 1.204;

// ── Pipe geometry (SI units) ──────────────────────────────────────────────────

/**
 * Default pipe length (m). At 1 m an open–open pipe has f₁ = c/2L = 171.5 Hz,
 * near F₃, and the stopped pipe of the same length lands an octave below it.
 *
 * Deliberately a long pipe. The pipe is drawn at a fixed pixel length whatever
 * its metres, so a longer pipe means a lower fundamental and a slower-looking
 * wave at the same clock rate — without slowing the speed of sound.
 */
export const PIPE_LENGTH_DEFAULT_M = 1.0;

/**
 * Selectable pipe-length range (m): a 2 ft to a 6.5 ft organ pipe. The short end
 * bounds how fast the top of the overtone ladder can look on screen.
 */
export const PIPE_LENGTH_RANGE_M = new Range(0.5, 2.0);

// ── Slow motion (dimensionless) ───────────────────────────────────────────────
//
// Audible sound is far too fast to animate: the 171.5 Hz fundamental of the
// default pipe has a 5.8 ms period, and its pulse crosses the pipe in 2.9 ms.
// Both would alias into meaningless flicker at any display refresh rate.
//
// So the *clock* is slowed and the physics is left alone — every frequency,
// length and speed in the model is a true SI value, and each screen advances
// model time at a fraction of wall-clock time. That keeps the readouts honest
// (the sim really does say 343 Hz). TimeControlNode's Slow speed multiplies
// these base rates by 0.4 and is selected by default. Do not "fix" this by scaling c or fₙ.

/**
 * Normal-speed model seconds per wall-clock second on Reflection. A pulse crosses
 * the default 1 m pipe in L/c = 2.9 ms, so this stretches one crossing to about
 * 4.4 s, or about 11 s with Slow motion selected.
 */
export const REFLECTION_TIME_SCALE = 1 / 1500;

/**
 * Normal-speed model seconds per wall-clock second on Standing Waves. The
 * 171.5 Hz fundamental of the default pipe then oscillates at an apparent
 * 0.86 Hz, or 0.34 Hz (a 2.9 s period) with Slow selected by default.
 */
export const HARMONIC_TIME_SCALE = 1 / 200;

/**
 * Normal-speed model seconds per wall-clock second on Phase. The default wave
 * is one wavelength long, so f = c/L = 343 Hz — twice the 171.5 Hz fundamental
 * of the Standing Waves screen. Half of {@link HARMONIC_TIME_SCALE} puts that
 * wave at the same apparent 0.86 Hz, or 0.34 Hz with Slow selected.
 */
export const PHASE_TIME_SCALE = 1 / 400;

/**
 * Normal-speed model seconds per wall-clock second on Instruments. Its pipes
 * are real instruments and keep their real lengths, so the clock is slowed
 * instead: the default flute's 286 Hz fundamental appears at 0.95 Hz, or
 * 0.38 Hz with Slow selected — close to the Standing Waves screen's rate.
 */
export const INSTRUMENTS_TIME_SCALE = 1 / 300;

/** Default Slow motion rate relative to each screen's normal clock rate. */
export const SLOW_MOTION_MULTIPLIER = 0.4;

// ── Reflection screen: the mass-spring chain ──────────────────────────────────

/**
 * Number of point masses in the chain. Enough that a pulse several cells wide
 * still looks like a smooth curve, few enough that the individual masses remain
 * separately visible — the chain has to read as a discrete mechanical analog,
 * not as a drawn line.
 */
export const CHAIN_MASS_COUNT = 80;

/**
 * Width of the launched Gaussian pulse, as a fraction of the pipe length. A
 * pulse this wide spans ~8 lattice cells, which keeps the lattice's own
 * dispersion (ω = 2√(k/m)·|sin(qa/2)| rather than the continuum ω = cq) below
 * the line width over a couple of round trips. See doc/model.md.
 */
export const PULSE_WIDTH_FRACTION = 0.1;

/**
 * Peak displacement of the launched pulse, as a fraction of the lattice
 * spacing. Small enough that neighbouring masses never cross (which would look
 * like the chain passing through itself) yet large enough to see.
 */
export const PULSE_AMPLITUDE_CELLS = 0.35;

/**
 * Safety factor on the explicit stability limit dt < 2/ω_max = √(m/k) for the
 * velocity-Verlet lattice. The sub-step count is chosen so the actual step
 * stays below this fraction of the limit.
 */
export const CHAIN_STABILITY_SAFETY = 0.5;

// ── Standing Waves screen: the driven modal bank ──────────────────────────────

/**
 * Highest mode number carried by the modal expansion. The drive can only reach
 * a mode it overlaps, and the visible pattern is dominated by whichever mode is
 * near resonance, so a dozen is plenty — it covers the whole overtone ladder a
 * learner can select and keeps the off-resonance response honest.
 */
export const MODE_COUNT = 12;

/**
 * Quality factor Q₁ of a pipe's fundamental; harmonic h has Qₕ = h·Q₁, so every
 * mode shares one damping rate (see PipeModalModel). A real organ pipe sits
 * somewhere around 30–50; this is deliberately lower so that the resonance is
 * broad enough to find by dragging the frequency slider, and so the build-up time
 * constant τ = Q₁/(πf₁) — about 3.8 periods of the fundamental, and the same for
 * every mode — stays near 4.5 s of wall clock at the default length (11 s in
 * Slow) rather than tens of seconds.
 */
export const FUNDAMENTAL_QUALITY_FACTOR = 12;

/**
 * Driving-frequency range, in multiples of the *current* pipe's own f₁. Because it
 * scales with the pipe, harmonic h always sits at the same place on the slider
 * track, and the track spends its pixels on this pipe's ladder alone: at the
 * default pipe a resonance is about two pixels wide rather than one, and a tick
 * marks each rung. The top covers the eight rungs of the overtone ladder, so every
 * rung the ladder offers is one the slider can also reach.
 */
export const DRIVE_FREQUENCY_RANGE_HARMONICS = new Range(0.5, 8.5);

/**
 * Fraction of a mode's half-power bandwidth within which the sim reports that
 * the pipe is "at resonance". Shared by the on-screen badge and the a11y
 * description so the two can never disagree.
 */
export const RESONANCE_BANDWIDTH_FRACTION = 0.5;

/**
 * Pace of the automatic frequency sweep, as the model time it spends crossing one
 * resonance width f₁/Q₁, in units of the build-up time τ = Q₁/(πf₁).
 *
 * Stated against τ rather than in Hz/s so that every pipe sweeps the same way
 * relative to its own response: a mode crossed in a fraction of τ still rises to
 * a clear peak (a chirped oscillator reaches about √(π·t/τ) of its steady state),
 * but does not fully settle, so the sweep shows *where* the resonances are while
 * the slider and the ladder remain the way to *sit on* one. At this pace the
 * default pipe's full 0.5 f₁ – 8.5 f₁ sweep takes about two minutes of wall clock
 * at Normal speed.
 */
export const SWEEP_CROSSING_TIME_CONSTANTS = 0.3;

/**
 * When the pipe is said to *have* nodes and antinodes. A node is a property of one
 * mode's shape, so a mode h is the standing mode only when
 *
 *   - its envelope has reached at least this fraction of its resonant amplitude,
 *     so a faint off-resonance sliver or the first moments of a build-up do not
 *     count, and
 */
export const STANDING_MODE_MIN_FRACTION = 0.25;

/**
 *   - every other mode together is at most this fraction of it in displacement, so
 *     the zeros of the sum really sit still at that mode's nodes rather than
 *     swimming between two patterns (a drive between two rungs, or the mode just
 *     passed still ringing down during a sweep).
 */
export const STANDING_MODE_MAX_IMPURITY = 0.25;

/**
 * Once a mode is the standing mode, both thresholds above are relaxed by this
 * factor before it is dropped, so a pattern hovering at a threshold does not make
 * the markers flicker.
 */
export const STANDING_MODE_HYSTERESIS = 0.6;

// ── Phase screen: the travelling wave ─────────────────────────────────────────

/**
 * Number of particle markers drawn along the pipe on the Phase screen. Spaced
 * so that a full wavelength of the default wave holds about a dozen of them —
 * enough to see the compressions form out of individual motions.
 */
export const PARTICLE_COUNT = 48;

/**
 * Peak drawn particle displacement, as a multiple of the equilibrium particle
 * spacing.
 *
 * This is a **view exaggeration**, not physics: real acoustic displacements are a
 * tiny fraction of any drawn spacing and would be invisible. The system is linear,
 * so scaling it changes nothing but legibility.
 *
 * What the eye actually reads is not the displacement but its *gradient* — the
 * crowding — and the gradient of a pulse this wide is about a tenth of the
 * displacement. Hence a value above 1: at 1.2 the local spacing swings by roughly
 * ±18%, which is clearly visible, while staying far below the 100% at which
 * neighbouring particles would cross and the row would read as passing through
 * itself.
 */
export const PARTICLE_AMPLITUDE_SPACINGS = 1.2;

/** Selectable wavelength range on the Phase screen, as a fraction of pipe length. */
export const PHASE_WAVELENGTH_RANGE_FRACTION = new Range(0.25, 1.5);

// ── Trace rendering ───────────────────────────────────────────────────────────

/** Samples used to draw one continuous curve across a trace strip. */
export const TRACE_SAMPLE_COUNT = 240;

/**
 * Cap on the per-frame clock advance (s of wall clock). Returning to a
 * background tab hands over one enormous dt; without this the lattice takes a
 * huge number of sub-steps at once and the animation jumps.
 */
export const MAX_FRAME_DT_S = 0.1;

StandingWavesNamespace.register("StandingWavesConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  STRIP_SPACING,
  PIPE_BORE_HEIGHT,
  PIPE_WALL_THICKNESS,
  SOUND_SPEED_MPS,
  AIR_DENSITY_KGPM3,
  PIPE_LENGTH_DEFAULT_M,
  PIPE_LENGTH_RANGE_M,
  REFLECTION_TIME_SCALE,
  HARMONIC_TIME_SCALE,
  PHASE_TIME_SCALE,
  INSTRUMENTS_TIME_SCALE,
  SLOW_MOTION_MULTIPLIER,
  CHAIN_MASS_COUNT,
  PULSE_WIDTH_FRACTION,
  PULSE_AMPLITUDE_CELLS,
  CHAIN_STABILITY_SAFETY,
  MODE_COUNT,
  FUNDAMENTAL_QUALITY_FACTOR,
  DRIVE_FREQUENCY_RANGE_HARMONICS,
  RESONANCE_BANDWIDTH_FRACTION,
  SWEEP_CROSSING_TIME_CONSTANTS,
  STANDING_MODE_MIN_FRACTION,
  STANDING_MODE_MAX_IMPURITY,
  STANDING_MODE_HYSTERESIS,
  PARTICLE_COUNT,
  PARTICLE_AMPLITUDE_SPACINGS,
  PHASE_WAVELENGTH_RANGE_FRACTION,
  TRACE_SAMPLE_COUNT,
  MAX_FRAME_DT_S,
});
