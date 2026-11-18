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
import { TimeSpeed } from "scenerystack/scenery-phet";
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
const SLOW_MOTION_MULTIPLIER = 0.4;

/** Every screen's timer: Normal and Slow speed radios (in display order), starting on Slow. */
export const TIMER_OPTIONS = {
  initiallyPlaying: true,
  timeSpeedMultipliers: new Map([
    [TimeSpeed.NORMAL, 1],
    [TimeSpeed.SLOW, SLOW_MOTION_MULTIPLIER],
  ]) as ReadonlyMap<TimeSpeed, number>,
  initialTimeSpeed: TimeSpeed.SLOW,
} as const;

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
 *
 * Not more: each extra mode adds an off-resonant pressure of order 1/h at the
 * pressure nodes, so the tail sums slowly, and with twenty modes it holds a
 * sweeping pipe's pressure nodes above STANDING_MODE_MAX_IMPURITY from h = 3 up.
 */
export const MODE_COUNT = 12;

/**
 * Modes carried by the Instruments pipe: enough for each instrument's series to run
 * well past its first few harmonics (twenty bars on the open organ pipe, ten on a
 * stopped one). That screen marks no nodes, so the slow pressure tail that keeps
 * MODE_COUNT at twelve does not apply.
 */
export const INSTRUMENTS_MODE_COUNT = 20;

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

/** Settings for common/StandingWavesPanel.ts. */
export const STANDING_WAVES_PANEL_SETTINGS = {
  /** Options x margin (px). */
  OPTIONS_X_MARGIN: 12,
  /** Options y margin (px). */
  OPTIONS_Y_MARGIN: 10,
} as const;

/** Settings for common/StandingWavesScreenIcons.ts. */
export const STANDING_WAVES_SCREEN_ICONS_SETTINGS = {
  CREATE_REFLECTION_ICON_WIDTH_FRAC: 0.09, // fraction of pipe length

  /** Samples along each drawn curve; enough that a spindle reads as smooth. */
  CURVE_SAMPLES: 96,
  /** Pipe length (px). */
  PIPE_LENGTH: 440,
  /** Pipe y (px). */
  PIPE_Y: 128,
  /** Trace y (px). */
  TRACE_Y: 262,
  /** Inst pipe length (px). */
  INST_PIPE_LENGTH: 240,
  /** Inst pipe x (px). */
  INST_PIPE_X: 60,
  /** Inst pipe y (px). */
  INST_PIPE_Y: 150,
  /** Spectrum x (px). */
  SPECTRUM_X: 350,
  /** Spectrum baseline y (px). */
  SPECTRUM_BASELINE_Y: 300,
  /** Spectrum bar width (px). */
  SPECTRUM_BAR_WIDTH: 22,
  /** Spectrum bar gap (px). */
  SPECTRUM_BAR_GAP: 6,
  /** Create reflection icon line width (px). */
  CREATE_REFLECTION_ICON_LINE_WIDTH: 3,
  /** Create phase icon line width (px). */
  CREATE_PHASE_ICON_LINE_WIDTH: 3,
  /** Create standing waves icon line width (px). */
  CREATE_STANDING_WAVES_ICON_LINE_WIDTH: 3,
  /** Create standing waves icon radius (px). */
  CREATE_STANDING_WAVES_ICON_RADIUS: 4,
} as const;

/** Settings for common/model/PipeModalModel.ts. */
export const PIPE_MODAL_MODEL_SETTINGS = {
  /** Drive acceleration mps2 (m/s²). */
  DRIVE_ACCELERATION_MPS2: 250,
  /** Largest dimensionless step ωₕ·dt taken by the integrator. RK4 stays stable well past this; the bound is set for *accuracy*, so that a mode's phase does not creep over the thousands of cycles a build-up takes. */
  MAX_PHASE_STEP: 0.2,
  /** Hard cap on RK4 sub-steps per frame so a huge drive ω under fuzz cannot hang. */
  MAX_SUB_STEPS: 500,
  /** Drive frequency range min (Hz). */
  DRIVE_FREQUENCY_RANGE_MIN: 20,
  /** Drive frequency range max (Hz). */
  DRIVE_FREQUENCY_RANGE_MAX: 20000,
} as const;

/** Settings for common/model/modeShapes.ts. */
export const MODE_SHAPES_SETTINGS = {
  /** Node endpoint tolerance relative to node spacing (dimensionless). */
  NODE_SPACING_TOLERANCE: 1e-9,
  /** Absolute ceiling on marker count: a physical mode of harmonic h has ~h+1 nodes. */
  MAX_ZERO_NODES: 64,
} as const;

/** Settings for common/view/ChartFrame.ts. */
export const CHART_FRAME_SETTINGS = {
  CONSTRUCTOR_MAX_WIDTH_FACTOR: 0.8, // dimensionless
  Y_TITLE_MAX_WIDTH_FACTOR: 0.9, // dimensionless

  /** Tick length (px). */
  TICK_LENGTH: 5,
  /** Y title gutter (px). */
  Y_TITLE_GUTTER: 34,
  /** X title gutter (px). */
  X_TITLE_GUTTER: 28,
  /** Axis label font size (px). */
  AXIS_LABEL_FONT_SIZE: 13,
  /** Tick font size (px). */
  TICK_FONT_SIZE: 11,
  /** Constructor line width (px). */
  CONSTRUCTOR_LINE_WIDTH: 0.5,
} as const;

/** Settings for common/view/DensitySlabsNode.ts. */
export const DENSITY_SLABS_NODE_SETTINGS = {
  /** Density rest alpha (dimensionless). */
  DENSITY_REST_ALPHA: 0.34,
  /** Opacity of the slab walls. Faint: they are a frame of reference, not a subject. */
  WALL_ALPHA: 0.35,
} as const;

/** Settings for common/view/ParticleRowNode.ts. */
export const PARTICLE_ROW_NODE_SETTINGS = {
  /** Default marker radius in view pixels. */
  DEFAULT_PARTICLE_RADIUS: 2.2,
} as const;

/** Settings for common/view/PipeNode.ts. */
export const PIPE_NODE_SETTINGS = {
  /** How far the flare at an open end rises above the wall, in view pixels. */
  FLARE_RISE: 7,
  /** How far back along the pipe the flare is drawn, in view pixels. */
  FLARE_RUN: 14,
} as const;

/** Settings for common/view/StandingWavesNumberControl.ts. */
export const STANDING_WAVES_NUMBER_CONTROL_SETTINGS = {
  OPTIONS_ITEM_3_SPACING: 6, // px

  /** Track size width (px). */
  TRACK_SIZE_WIDTH: 140,
  /** Track size height (px). */
  TRACK_SIZE_HEIGHT: 3,
  /** Thumb size width (px). */
  THUMB_SIZE_WIDTH: 13,
  /** Thumb size height (px). */
  THUMB_SIZE_HEIGHT: 24,
  /** Title font size (px). */
  TITLE_FONT_SIZE: 13,
  /** Value font size (px). */
  VALUE_FONT_SIZE: 13,
  /** Options spacing (px). */
  OPTIONS_SPACING: 4,
  /** Options vertical spacing (px). */
  OPTIONS_VERTICAL_SPACING: 2,
  /** Options max width (px). */
  OPTIONS_MAX_WIDTH: 130,
} as const;

/** Settings for common/view/TraceStripNode.ts. */
export const TRACE_STRIP_NODE_SETTINGS = {
  TEXT_MAX_WIDTH_FACTOR: 0.45, // dimensionless
  NOTE_MAX_WIDTH_FACTOR: 0.45, // dimensionless

  /** Caption font size (px). */
  CAPTION_FONT_SIZE: 12,
  /** Caption margin (px). */
  CAPTION_MARGIN: 6,
  /** Note font size (px). */
  NOTE_FONT_SIZE: 11,
} as const;

/** Settings for common/view/createTimeControl.ts. */
export const CREATE_TIME_CONTROL_SETTINGS = {
  /** Speed radio spacing (px). */
  SPEED_RADIO_SPACING: 16,
} as const;

/** Settings for instruments/model/instrumentPresets.ts. */
export const INSTRUMENT_PRESETS_SETTINGS = {
  /** The bore length shared by the flute and the clarinet (m). */
  WOODWIND_LENGTH_M: 0.6,
  /** Bore length of the two organ pipes (m): a 4-ft stop, the commonest organ pitch after 8 ft. Every preset must lie inside PIPE_LENGTH_RANGE_M, since it is written into the same pipeLengthProperty the Standing Waves slider drives. */
  ORGAN_LENGTH_M: 1.22,
} as const;

/** Settings for instruments/view/HarmonicSpectrumNode.ts. */
export const HARMONIC_SPECTRUM_NODE_SETTINGS = {
  TITLE_MAX_WIDTH_FACTOR: 0.6, // dimensionless
  HINT_MAX_WIDTH_FACTOR: 0.38, // dimensionless
  CONSTRUCTOR_LINE_DASH_DASH: 3, // px
  CONSTRUCTOR_MAX_WIDTH_OFFSET: 20, // px

  /** Title font size (px). */
  TITLE_FONT_SIZE: 13,
  /** Hint font size (px). */
  HINT_FONT_SIZE: 11,
  /** Tick font size (px). */
  TICK_FONT_SIZE: 10,
  /** Message font size (px). */
  MESSAGE_FONT_SIZE: 12,
  /** Bar width in view pixels. Narrow enough that a pipe's bars and its partner's outlines, which interleave one slot apart, stay separate on the stopped organ pipe, whose slots are closest (70 Hz, about 8 px). */
  BAR_WIDTH: 4,
  /** Gap between a sounding bar and its selection outline, in view pixels. */
  OUTLINE_PAD: 2,
  /** Height of an empty socket, in view pixels. */
  SOCKET_HEIGHT: 10,
  /** Opacity of a bar that is not part of the note being sounded. */
  DIMMED_OPACITY: 0.35,
  /** How long the "no mode here" message stays up (ms of wall time). */
  MESSAGE_DURATION_MS: 2500,
  /** Top of the frequency axis (Hz). Fixed across every preset — a per-instrument axis would rescale under the learner and destroy the comparison the screen exists for. Wide enough to hold the first several harmonics of the longest pipe here. */
  MAX_FREQUENCY_HZ: 3500,
  /** Top of the amplitude axis. Heights are normalised against the pipe's own fundamental, so the tallest bar is 1; the margin above it leaves room inside the clipped plot for the selection outline. */
  MAX_RELATIVE_AMPLITUDE: 1.12,
  /** Frame x spacing (px). */
  FRAME_X_SPACING: 500,
  /** Selection outline line width (px). */
  SELECTION_OUTLINE_LINE_WIDTH: 1.5,
  /** Top inset for the "no mode here" message (px). */
  MESSAGE_TOP: 4,
  /** Bottom inset for the spectrum title / hint (px). */
  TITLE_BOTTOM: -6,
} as const;

/** Settings for instruments/view/InstrumentToneGenerator.ts. */
export const INSTRUMENT_TONE_GENERATOR_SETTINGS = {
  /** Sum of all partial gains. Bounding the sum, not each gain, bounds the waveform's peak however many partials the note has. */
  TOTAL_GAIN: 0.3,
  /** Time constant of every gain and frequency change (s): fast, but click-free. */
  RAMP_TIME_CONSTANT_S: 0.02,
} as const;

/** Settings for instruments/view/InstrumentsScreenView.ts. */
export const INSTRUMENTS_SCREEN_VIEW_SETTINGS = {
  CONSTRUCTOR_RADIUS: 2.2, // px
  CONSTRUCTOR_RADIUS_FACTOR: 0.18, // dimensionless

  READOUT_FONT_SIZE_SEGMENT_2: 11, // px

  /** Pipe view length (px). */
  PIPE_VIEW_LENGTH: 770,
  /** Strip height (px). */
  STRIP_HEIGHT: 110,
  /** Spectrum size width (px). */
  SPECTRUM_SIZE_WIDTH: 420,
  /** Spectrum size height (px). */
  SPECTRUM_SIZE_HEIGHT: 150,
  /** Pipe origin x (px). */
  PIPE_ORIGIN_X: 30,
  /** Pipe origin y (px). */
  PIPE_ORIGIN_Y: 34,
  /** Spectrum origin x (px). */
  SPECTRUM_ORIGIN_X: 80,
  /** Spectrum origin y (px). */
  SPECTRUM_ORIGIN_Y: 400,
  /** Readout gap (px). */
  READOUT_GAP: 50,
  /** Readout max width (px). */
  READOUT_MAX_WIDTH: 300,
  /** Readout font size (px). */
  READOUT_FONT_SIZE: 13,
  /** Series font size (px). */
  SERIES_FONT_SIZE: 14,
  /** Particle row count (count). */
  PARTICLE_ROW_COUNT: 3,
  /** Headroom above the resonant amplitude the traces are scaled against. */
  TRACE_HEADROOM: 1.25,
  /** Make strip x spacing (px). */
  MAKE_STRIP_X_SPACING: 0.25,
  /** Make strip font size (px). */
  MAKE_STRIP_FONT_SIZE: 11,
  /** Readout spacing (px). */
  READOUT_SPACING: 3,
} as const;

/** Settings for instruments/view/PlayPanel.ts. */
export const PLAY_PANEL_SETTINGS = {
  ITEM_2_SPACING: 3, // px

  /** Title font size (px). */
  TITLE_FONT_SIZE: 14,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 14,
  /** Note font size (px). */
  NOTE_FONT_SIZE: 11,
  /** Indent of the register-key note, so it sits under the label rather than the box. */
  NOTE_INDENT: 26,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 10,
} as const;

/** Settings for instruments/view/PresetPanel.ts. */
export const PRESET_PANEL_SETTINGS = {
  PRESET_RADIO_BUTTONS_MAX_WIDTH_OFFSET: 30, // px

  /** Title font size (px). */
  TITLE_FONT_SIZE: 14,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 14,
  /** Panel width (px). */
  PANEL_WIDTH: 190,
  /** Instruments panel min width (px). */
  INSTRUMENTS_PANEL_MIN_WIDTH: 184,
  /** Preset radio buttons spacing (px). */
  PRESET_RADIO_BUTTONS_SPACING: 8,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 10,
} as const;

/** Settings for phase-relationships/model/PhaseModel.ts. */
export const PHASE_MODEL_SETTINGS = {
  /** Initial reference position as a fraction of pipe length (dimensionless). */
  REFERENCE_POSITION_FRACTION: 0.35,
  /** Initial neighbour-pair position as a fraction of pipe length (dimensionless). */
  PAIR_POSITION_FRACTION: 0.65,
  /** Peak particle displacement (m). Arbitrary — the system is linear and nothing on this screen reads an absolute amplitude — but a real acoustic value keeps the derived velocity and pressure in a plausible range for the readouts. */
  AMPLITUDE_M: 1e-3,
} as const;

/** Settings for phase-relationships/view/NeighbourPairNode.ts. */
export const NEIGHBOUR_PAIR_NODE_SETTINGS = {
  CONSTRUCTOR_BOTTOM_OFFSET: 3, // px

  /** Caption font size (px). */
  CAPTION_FONT_SIZE: 11,
  /** Lag font size (px). */
  LAG_FONT_SIZE: 11,
  /** Dot radius (px). */
  DOT_RADIUS: 4.5,
  /** Peak velocity-arrow length, in view pixels. Short enough that the two arrows do not meet. */
  MAX_ARROW_LENGTH: 26,
  /** How far the gap must close or open, as a fraction of its own peak, before the caption calls the parcel squeezed or stretched rather than near its rest spacing. */
  STATE_THRESHOLD: 0.3,
  /** Arrow options head height (px). */
  ARROW_OPTIONS_HEAD_HEIGHT: 7,
  /** Arrow options head width (px). */
  ARROW_OPTIONS_HEAD_WIDTH: 8,
  /** Arrow options tail width (px). */
  ARROW_OPTIONS_TAIL_WIDTH: 2.5,
  /** Parcel outline line width (px). */
  PARCEL_OUTLINE_LINE_WIDTH: 1.5,
  /** State text max width (px). */
  STATE_TEXT_MAX_WIDTH: 220,
  /** Lag text max width (px). */
  LAG_TEXT_MAX_WIDTH: 220,
} as const;

/** Settings for phase-relationships/view/PhaseControlPanel.ts. */
export const PHASE_CONTROL_PANEL_SETTINGS = {
  EQUATIONS_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px
  REFERENCE_POINT_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px
  DENSITY_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px
  NEIGHBOUR_PAIR_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px

  SPACING: 4, // px

  /** Title font size (px). */
  TITLE_FONT_SIZE: 14,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 14,
  /** Verdict font size (px). */
  VERDICT_FONT_SIZE: 13,
  /** Note font size (px). */
  NOTE_FONT_SIZE: 11,
  /** Panel width (px). */
  PANEL_WIDTH: 210,
  /** Direction radio buttons spacing (px). */
  DIRECTION_RADIO_BUTTONS_SPACING: 6,
  /** Wavelength control delta (control/model units). */
  WAVELENGTH_CONTROL_DELTA: 0.01,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 12,
  /** Constructor font size (px). */
  CONSTRUCTOR_FONT_SIZE: 14,
  /** Constructor max width (px). */
  CONSTRUCTOR_MAX_WIDTH: 260,
} as const;

/** Settings for phase-relationships/view/PhaseScreenView.ts. */
export const PHASE_SCREEN_VIEW_SETTINGS = {
  CONSTRUCTOR_RADIUS: 2.2, // px
  CONSTRUCTOR_RADIUS_FACTOR: 0.18, // dimensionless
  REFERENCE_LINE_LINE_DASH_DASH: 4, // px
  CONSTRUCTOR_REFERENCE_LINE_LINE_DASH_DASH: 3, // px
  AXIS_LABEL_MAX_WIDTH_FACTOR: 0.8, // dimensionless

  /** Pipe view length (px). */
  PIPE_VIEW_LENGTH: 700,
  /** Plot height of each of the three trace strips. */
  STRIP_HEIGHT: 128,
  /** Plot origin of the pipe stack: room on the left for the open end's flare. */
  STACK_ORIGIN_X: 34,
  /** Axis title font size (px). */
  AXIS_TITLE_FONT_SIZE: 13,
  /** Rows of particle markers stacked across the bore. */
  PARTICLE_ROW_COUNT: 3,
  /** Reference line line width (px). */
  REFERENCE_LINE_LINE_WIDTH: 1.5,
} as const;

/** Settings for phase-relationships/view/ReferenceMarkerNode.ts. */
export const REFERENCE_MARKER_NODE_SETTINGS = {
  GUIDE_LINE_DASH_DASH: 3, // px
  CAPTION_BOTTOM_OFFSET: 3, // px

  /** Label font size (px). */
  LABEL_FONT_SIZE: 11,
  /** Radius of the dot marking the particle being followed. */
  DOT_RADIUS: 4.5,
  /** Arrow options head height (px). */
  ARROW_OPTIONS_HEAD_HEIGHT: 8,
  /** Arrow options head width (px). */
  ARROW_OPTIONS_HEAD_WIDTH: 9,
  /** Arrow options tail width (px). */
  ARROW_OPTIONS_TAIL_WIDTH: 3,
  /** Caption max width (px). */
  CAPTION_MAX_WIDTH: 120,
} as const;

/** Settings for preferences/StandingWavesPreferencesNode.ts. */
export const STANDING_WAVES_PREFERENCES_NODE_SETTINGS = {
  /** Header font size (px). */
  HEADER_FONT_SIZE: 18,
  /** Show velocity trace checkbox font size (px). */
  SHOW_VELOCITY_TRACE_CHECKBOX_FONT_SIZE: 14,
  /** Show velocity trace checkbox spacing (px). */
  SHOW_VELOCITY_TRACE_CHECKBOX_SPACING: 8,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 12,
} as const;

/** Settings for reflection/model/ReflectionModel.ts. */
export const REFLECTION_MODEL_SETTINGS = {
  /** Fraction of the pipe length within which the pulse counts as "at the far end". Roughly the half-width of the launched pulse, so the stage reads REFLECTING for about as long as the pulse is actually touching the boundary. */
  REFLECTION_ZONE_FRACTION: 0.12,
} as const;

/** Settings for reflection/model/SpringChainModel.ts. */
export const SPRING_CHAIN_MODEL_SETTINGS = {
  /** Launch position fraction (dimensionless). */
  LAUNCH_POSITION_FRACTION: 0.3,
} as const;

/** Settings for reflection/view/ChainPipeNode.ts. */
export const CHAIN_PIPE_NODE_SETTINGS = {
  CONSTRUCTOR_RADIUS: 2.4, // px
  CONSTRUCTOR_RADIUS_FACTOR: 0.18, // dimensionless
  HEADING_MAX_WIDTH_FACTOR: 0.6, // dimensionless
  CONSTRUCTOR_HEADING_MAX_WIDTH_FACTOR: 0.9, // dimensionless

  /** Heading font size (px). */
  HEADING_FONT_SIZE: 14,
  /** Rule font size (px). */
  RULE_FONT_SIZE: 12,
  /** Rows of particle markers stacked across the bore. */
  PARTICLE_ROW_COUNT: 3,
  /** Particle column count (count). */
  PARTICLE_COLUMN_COUNT: 40,
  /** Trace headroom (px). */
  TRACE_HEADROOM: 2.4,
  /** Velocity trace line width (px). */
  VELOCITY_TRACE_LINE_WIDTH: 1.5,
} as const;

/** Settings for reflection/view/ReflectionControlPanel.ts. */
export const REFLECTION_CONTROL_PANEL_SETTINGS = {
  /** Title font size (px). */
  TITLE_FONT_SIZE: 14,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 14,
  /** Far end label max width (px). */
  FAR_END_LABEL_MAX_WIDTH: 180,
  /** Far end radio buttons spacing (px). */
  FAR_END_RADIO_BUTTONS_SPACING: 6,
  /** Compare checkbox max width (px). */
  COMPARE_CHECKBOX_MAX_WIDTH: 180,
  /** Density checkbox max width (px). */
  DENSITY_CHECKBOX_MAX_WIDTH: 180,
  /** Launch button max width (px). */
  LAUNCH_BUTTON_MAX_WIDTH: 170,
  /** Hint font size (px). */
  HINT_FONT_SIZE: 11,
  /** Hint max width (px). */
  HINT_MAX_WIDTH: 190,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 10,
} as const;

/** Settings for reflection/view/ReflectionScreenView.ts. */
export const REFLECTION_SCREEN_VIEW_SETTINGS = {
  CONSTRUCTOR_Y_FACTOR: 3, // dimensionless
  AXIS_LABEL_MAX_WIDTH_FACTOR: 0.8, // dimensionless

  /** Drawn length of a pipe bore, in view pixels. */
  PIPE_VIEW_LENGTH: 720,
  /** Plot origin of the pipe stack: room on the left for the closed end's cap. */
  STACK_ORIGIN_X: 30,
  /** Trace-strip height when one assembly is showing. */
  SINGLE_STRIP_HEIGHT: 150,
  /** Bore and strip heights when two assemblies share the screen. */
  COMPARE_BORE_HEIGHT: 44,
  /** Compare strip height (px). */
  COMPARE_STRIP_HEIGHT: 72,
  /** Axis title font size (px). */
  AXIS_TITLE_FONT_SIZE: 13,
} as const;

/** Settings for standing-waves/view/DriveFrequencyControl.ts. */
export const DRIVE_FREQUENCY_CONTROL_SETTINGS = {
  ITEM_3_SPACING: 6, // px

  /** The coarse arrows' step (Hz). Every resonance is f₁/Q₁ wide — about 14 Hz at the default pipe — so both arrow steps stay under it and neither can jump over a peak. */
  COARSE_STEP_HZ: 10,
  /** Tick length above the top of the track (view px), clear of the thumb's top. */
  TICK_LENGTH: 16,
  /** Tick label font size (px). */
  TICK_LABEL_FONT_SIZE: 10,
  /** Number display range max (control/model units). */
  NUMBER_DISPLAY_RANGE_MAX: 9999,
  /** Slider page keyboard step (control/model units). */
  SLIDER_PAGE_KEYBOARD_STEP: 50,
  /** Title text max width (px). */
  TITLE_TEXT_MAX_WIDTH: 130,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 4,
} as const;

/** Settings for standing-waves/view/NodeMarkersNode.ts. */
export const NODE_MARKERS_NODE_SETTINGS = {
  ADD_MARKERS_LINE_DASH_DASH: 4, // px

  /** Label font size (px). */
  LABEL_FONT_SIZE: 10,
  /** How far the tick extends above and below the bore, in view pixels. */
  TICK_OVERSHOOT: 5,
  /** Add markers line width (px). */
  ADD_MARKERS_LINE_WIDTH: 1.5,
  /** Text max width (px). */
  TEXT_MAX_WIDTH: 110,
} as const;

/** Settings for standing-waves/view/OvertoneLadderNode.ts. */
export const OVERTONE_LADDER_NODE_SETTINGS = {
  TITLE_MAX_WIDTH_OFFSET: 20, // px
  FREQUENCY_TEXT_MAX_WIDTH_OFFSET: 30, // px

  /** Rung font size (px). */
  RUNG_FONT_SIZE: 12,
  /** Title font size (px). */
  TITLE_FONT_SIZE: 13,
  /** Width of a rung's content, in view pixels. */
  RUNG_CONTENT_WIDTH: 108,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 3,
  /** Strike line width (px). */
  STRIKE_LINE_WIDTH: 1.5,
  /** Constructor x margin (px). */
  CONSTRUCTOR_X_MARGIN: 6,
  /** Constructor y margin (px). */
  CONSTRUCTOR_Y_MARGIN: 3,
} as const;

/** Settings for standing-waves/view/StandingWavesControlPanel.ts. */
export const STANDING_WAVES_CONTROL_PANEL_SETTINGS = {
  DRIVER_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px
  NODES_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px
  DENSITY_CHECKBOX_MAX_WIDTH_OFFSET: 30, // px

  /** Title font size (px). */
  TITLE_FONT_SIZE: 14,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 14,
  /** Badge font size (px). */
  BADGE_FONT_SIZE: 13,
  /** Panel width (px). */
  PANEL_WIDTH: 200,
  /** Termination radio buttons spacing (px). */
  TERMINATION_RADIO_BUTTONS_SPACING: 6,
  /** Length control delta (control/model units). */
  LENGTH_CONTROL_DELTA: 0.01,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 11,
} as const;

/** Settings for standing-waves/view/StandingWavesScreenView.ts. */
export const STANDING_WAVES_SCREEN_VIEW_SETTINGS = {
  CONSTRUCTOR_RADIUS: 2.2, // px
  CONSTRUCTOR_RADIUS_FACTOR: 0.18, // dimensionless
  AXIS_LABEL_MAX_WIDTH_FACTOR: 0.9, // dimensionless

  /** Pipe view length (px). */
  PIPE_VIEW_LENGTH: 600,
  /** Plot height of the displacement and pressure strips. */
  STRIP_HEIGHT: 160,
  /** Plot origin of the pipe stack: room on the left for a closed end's cap. */
  STACK_ORIGIN_X: 30,
  /** Axis title font size (px). */
  AXIS_TITLE_FONT_SIZE: 13,
  /** Particle row count (count). */
  PARTICLE_ROW_COUNT: 3,
  /** Headroom above the resonant amplitude. A little over 1: on resonance the pipe settles *at* that amplitude, and a scale of exactly 1 would clip it whenever the transient overshoots. */
  TRACE_HEADROOM: 1.25,
  /** Velocity trace line width (px). */
  VELOCITY_TRACE_LINE_WIDTH: 1.5,
  /** Make strip x spacing (px). */
  MAKE_STRIP_X_SPACING: 0.25,
  /** Make strip font size (px). */
  MAKE_STRIP_FONT_SIZE: 11,
} as const;

/** Settings for standing-waves/view/SweepButton.ts. */
export const SWEEP_BUTTON_SETTINGS = {
  /** Icon width (px). */
  ICON_WIDTH: 26,
  /** Icon height (px). */
  ICON_HEIGHT: 12,
  /** Icon line width (px). */
  ICON_LINE_WIDTH: 1.8,
  /** Cycles per icon width at its left and right edges. */
  CHIRP_START_CYCLES: 1.2,
  /** Chirp end cycles (px). */
  CHIRP_END_CYCLES: 5,
  /** Chirp point count (count). */
  CHIRP_POINT_COUNT: 60,
  /** Constructor x margin (px). */
  CONSTRUCTOR_X_MARGIN: 6,
  /** Constructor y margin (px). */
  CONSTRUCTOR_Y_MARGIN: 5,
} as const;

/** Settings for standing-waves/model/StandingWavesModel.ts; units are documented per value. */
export const MANUAL_TIME_STEP = {
  /** Wall-clock interval advanced by Step Forward (s). */
  SECONDS: 1 / 60,
} as const;

/** Settings for phase-relationships/model/PhaseModel.ts; units are documented per value. */
export const PHASEMODEL_MANUAL_TIME_STEP = {
  /** Wall-clock interval advanced by Step Forward (s). */
  SECONDS: 1 / 60,
} as const;

/** Settings for instruments/model/InstrumentsModel.ts; units are documented per value. */
export const INSTRUMENTSMODEL_MANUAL_TIME_STEP = {
  /** Wall-clock interval advanced by Step Forward (s). */
  SECONDS: 1 / 60,
} as const;

/** Settings for reflection/model/ReflectionModel.ts; units are documented per value. */
export const REFLECTIONMODEL_MANUAL_TIME_STEP = {
  /** Wall-clock interval advanced by Step Forward (s). */
  SECONDS: 1 / 60,
} as const;

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
  TIMER_OPTIONS,
  CHAIN_MASS_COUNT,
  PULSE_WIDTH_FRACTION,
  PULSE_AMPLITUDE_CELLS,
  CHAIN_STABILITY_SAFETY,
  MODE_COUNT,
  INSTRUMENTS_MODE_COUNT,
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
