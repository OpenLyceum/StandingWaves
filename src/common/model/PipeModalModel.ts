/**
 * PipeModalModel.ts
 *
 * The air column in a finite pipe, driven at one end, as a bank of independent
 * damped driven oscillators — one per mode. Shared by the Standing Waves and
 * Instruments screens.
 *
 * ── Why a modal bank rather than "add two travelling waves" ───────────────────
 *
 * Summing a forward and a backward wave of equal amplitude gives a perfect
 * standing wave at any frequency you like, which is precisely the thing that is
 * not true of a real pipe. A pipe responds *selectively*: drive it off resonance
 * and almost nothing happens; drive it near a mode and the pattern grows over
 * several cycles until damping balances the drive.
 *
 * So each mode h carries its own amplitude aₕ(t) obeying
 *
 *   äₕ + (ωₕ/Q)·ȧₕ + ωₕ²·aₕ = F·cos(Θ)
 *
 * and the state of the pipe is the sum of the mode shapes weighted by those
 * amplitudes:
 *
 *   ξ(x, t) = Σ aₕ(t)·φₕ(x)          p(x, t) = Σ ρc²kₕ·aₕ(t)·ψₕ(x)
 *
 * Two things then come out for free rather than being animated by hand:
 *
 *   - the **steady-state amplitude is a Lorentzian** in the drive frequency, so
 *     resonance is something you can hunt for with the frequency slider;
 *   - the **build-up takes the right time**, τ = 2Q/ωₕ = Q/(πfₕ), so switching to
 *     an exact harmonic visibly fills the pipe over a few seconds.
 *
 * ── Drive coupling ───────────────────────────────────────────────────────────
 *
 * The driver sits at the **left** end and is whatever kind of source that end
 * admits: a pressure source (a reed) against a closed end, a volume-velocity
 * source (a jet) at an open end. Each couples to the quantity its end has an
 * antinode in — pressure at a closed end, displacement at an open one — so in
 * both cases the coupling to every mode has unit magnitude. That is not a
 * convenience: it is why a reed at the stopped end of a clarinet can excite the
 * whole odd-harmonic ladder.
 *
 * ── Units ────────────────────────────────────────────────────────────────────
 *
 * Everything here is SI and real: metres, seconds, hertz, pascals. Model time
 * runs slower than wall-clock time (see HARMONIC_TIME_SCALE) but it is still
 * seconds, so `step` takes model seconds and every frequency is a true one.
 */

import {
  BooleanProperty,
  DerivedProperty,
  NumberProperty,
  type Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import {
  MODE_COUNT,
  MODE_QUALITY_FACTOR,
  PIPE_LENGTH_DEFAULT_M,
  PIPE_LENGTH_RANGE_M,
  RESONANCE_BANDWIDTH_FRACTION,
} from "../../StandingWavesConstants.js";
import { BULK_MODULUS } from "./acoustics.js";
import { displacementShape, pressureShape } from "./modeShapes.js";
import {
  allowedHarmonics,
  createPipeTerminationProperty,
  fundamentalFrequency,
  isModeAllowed,
  modeFrequency,
  modeWavenumber,
  type PipeTermination,
} from "./PipeTermination.js";

/**
 * Amplitude of the driving acceleration (m/s²). Chosen so that the fundamental
 * of the default pipe reaches about a millimetre of particle displacement at
 * resonance — the right order for a sounding organ pipe — via the resonant
 * amplitude F·Q/ωₕ².
 *
 * It is the *same* for every mode, deliberately. A mode's response therefore
 * falls off as 1/ωₕ² ∝ 1/h², and that 1/h² rolloff is what the Instruments
 * screen's spectrum shows: the ladder a broadband excitation produces is a
 * property of the pipe, not something painted on.
 */
const DRIVE_ACCELERATION_MPS2 = 250;

/**
 * Largest dimensionless step ωₕ·dt taken by the integrator. RK4 stays stable
 * well past this; the bound is set for *accuracy*, so that a mode's phase does
 * not creep over the thousands of cycles a build-up takes.
 */
const MAX_PHASE_STEP = 0.2;

export type PipeModalModelOptions = {
  /** Initial termination. Defaults to open–open, the plain flute/organ case. */
  termination?: PipeTermination;
  /** Initial pipe length (m). */
  pipeLength?: number;
  /** Quality factor shared by every mode. */
  qualityFactor?: number;
};

export class PipeModalModel {
  /** Pipe length L (m). */
  public readonly pipeLengthProperty: NumberProperty;

  /** How the two ends are terminated. */
  public readonly terminationProperty: Property<PipeTermination>;

  /** Frequency the pipe is being driven at (Hz). */
  public readonly driveFrequencyProperty: NumberProperty;

  /** Whether the driver is running. Switching it off lets the pipe ring down. */
  public readonly isDrivingProperty: BooleanProperty;

  /**
   * Accumulated drive phase Θ = ∫ω dt (radians). Integrated rather than computed
   * as ωt so that dragging the frequency slider does not make the drive jump
   * discontinuously — the same trick as Resonance's `drivingPhaseProperty`.
   */
  public readonly drivePhaseProperty: NumberProperty;

  /** Fundamental f₁ of the current pipe (Hz). */
  public readonly fundamentalFrequencyProperty: TReadOnlyProperty<number>;

  /**
   * Harmonic number nearest to the current drive frequency, or 0 when the drive
   * is closer to a gap in the ladder than to any mode the pipe supports.
   */
  public readonly nearestHarmonicProperty: TReadOnlyProperty<number>;

  /** Whether the drive sits inside the nearest mode's resonance band. */
  public readonly isAtResonanceProperty: TReadOnlyProperty<boolean>;

  /** Quality factor shared by every mode. */
  public readonly qualityFactor: number;

  /**
   * Modal displacement amplitudes aₕ (m), indexed by harmonic number − 1.
   * Disallowed harmonics stay identically zero. Mutated in place each step; read
   * through {@link modalAmplitude} rather than aliased.
   */
  private readonly amplitudes: Float64Array;

  /** Modal velocities ȧₕ (m/s), indexed by harmonic number − 1. */
  private readonly rates: Float64Array;

  /** Bumped whenever the modal state changes, so views can repaint. */
  public readonly stateChangeCountProperty: NumberProperty;

  public constructor(providedOptions?: PipeModalModelOptions) {
    const termination = providedOptions?.termination;
    this.qualityFactor = providedOptions?.qualityFactor ?? MODE_QUALITY_FACTOR;

    this.pipeLengthProperty = new NumberProperty(providedOptions?.pipeLength ?? PIPE_LENGTH_DEFAULT_M, {
      range: PIPE_LENGTH_RANGE_M,
      units: "m",
    });
    this.terminationProperty = createPipeTerminationProperty(termination);

    const initialFundamental = fundamentalFrequency(this.terminationProperty.value, this.pipeLengthProperty.value);
    this.driveFrequencyProperty = new NumberProperty(initialFundamental, {
      // The reachable span is set by the mode ladder, which moves with L and the
      // termination, so the range is generous and the control clamps to it.
      range: new Range(20, 20000),
      units: "Hz",
    });
    this.isDrivingProperty = new BooleanProperty(true);
    this.drivePhaseProperty = new NumberProperty(0);
    this.stateChangeCountProperty = new NumberProperty(0);

    this.amplitudes = new Float64Array(MODE_COUNT);
    this.rates = new Float64Array(MODE_COUNT);

    this.fundamentalFrequencyProperty = new DerivedProperty(
      [this.terminationProperty, this.pipeLengthProperty],
      (terminationValue: PipeTermination, length: number) => fundamentalFrequency(terminationValue, length),
    );

    this.nearestHarmonicProperty = new DerivedProperty(
      [this.terminationProperty, this.pipeLengthProperty, this.driveFrequencyProperty],
      (terminationValue: PipeTermination, length: number, driveFrequency: number) =>
        this.findNearestHarmonic(terminationValue, length, driveFrequency),
    );

    this.isAtResonanceProperty = new DerivedProperty(
      [this.nearestHarmonicProperty, this.terminationProperty, this.pipeLengthProperty, this.driveFrequencyProperty],
      (harmonic: number, terminationValue: PipeTermination, length: number, driveFrequency: number) => {
        if (harmonic === 0) {
          return false;
        }
        const resonant = modeFrequency(harmonic, terminationValue, length);
        // Half-power bandwidth of a lightly damped mode is fₕ/Q.
        const halfPowerBandwidth = resonant / this.qualityFactor;
        return Math.abs(driveFrequency - resonant) <= RESONANCE_BANDWIDTH_FRACTION * halfPowerBandwidth;
      },
    );

    // A pipe whose ladder moved out from under the drive, or whose modes no
    // longer exist, must not keep ringing in a mode it no longer has.
    this.terminationProperty.link(() => this.clearForbiddenModes());

    // A broad frequency sweep changes which mode the learner is inspecting.
    // Start that mode's build-up from rest; otherwise a low mode keeps ringing
    // against the much smaller scale of a high mode for many seconds.
    let selectedHarmonic = this.nearestHarmonicProperty.value;
    this.nearestHarmonicProperty.link((harmonic: number) => {
      if (harmonic !== selectedHarmonic) {
        selectedHarmonic = harmonic;
        this.amplitudes.fill(0);
        this.rates.fill(0);
        this.stateChangeCountProperty.value++;
      }
    });
  }

  /** Harmonic numbers the current pipe supports, ascending. */
  public getAllowedHarmonics(): number[] {
    return allowedHarmonics(this.terminationProperty.value, MODE_COUNT);
  }

  /** Resonant frequency of harmonic h for the current pipe (Hz). */
  public getModeFrequency(harmonicNumber: number): number {
    return modeFrequency(harmonicNumber, this.terminationProperty.value, this.pipeLengthProperty.value);
  }

  /** Current modal displacement amplitude aₕ (m). Zero for a harmonic the pipe lacks. */
  public modalAmplitude(harmonicNumber: number): number {
    if (harmonicNumber < 1 || harmonicNumber > MODE_COUNT) {
      return 0;
    }
    return this.amplitudes[harmonicNumber - 1] ?? 0;
  }

  /**
   * Steady-state displacement amplitude that harmonic h would settle to if the
   * pipe were driven exactly at its resonance (m): F·Q/ωₕ².
   *
   * This is the natural reference for drawing: normalising the plotted curve
   * against it makes an on-resonance mode fill the strip, an off-resonance drive
   * a visible sliver, and a build-up a growth from nothing to full height — all
   * on one honest scale.
   */
  public resonantAmplitude(harmonicNumber: number): number {
    const frequency = this.getModeFrequency(harmonicNumber);
    if (frequency <= 0) {
      return 0;
    }
    const omega = 2 * Math.PI * frequency;
    return (DRIVE_ACCELERATION_MPS2 * this.qualityFactor) / (omega * omega);
  }

  /**
   * Peak acoustic pressure harmonic h reaches at its own resonance (Pa):
   * ρc²·kₕ·aₕ.
   *
   * Not simply proportional to the displacement amplitude: pressure is a *gradient*
   * of displacement, so it carries a factor of kₕ. Since the resonant displacement
   * falls as 1/h² and kₕ rises as h, the resonant pressure falls only as 1/h — which
   * is why a chart scaled for the fundamental's pressure would clip a high harmonic.
   */
  public resonantPressureAmplitude(harmonicNumber: number): number {
    const k = modeWavenumber(harmonicNumber, this.terminationProperty.value, this.pipeLengthProperty.value);
    return BULK_MODULUS * k * this.resonantAmplitude(harmonicNumber);
  }

  /**
   * Steady-state displacement amplitude of harmonic h at a given drive
   * frequency (m) — the Lorentzian
   *
   *   aₕ = F / √( (ωₕ² − ω²)² + (ωₕω/Q)² )
   *
   * Answers for frequencies the pipe is *not* currently driven at, without
   * touching any Property, which is what a response curve samples.
   */
  public steadyStateAmplitude(harmonicNumber: number, driveFrequency: number): number {
    if (!isModeAllowed(harmonicNumber, this.terminationProperty.value)) {
      return 0;
    }
    const omegaMode = 2 * Math.PI * this.getModeFrequency(harmonicNumber);
    const omega = 2 * Math.PI * driveFrequency;
    const detuning = omegaMode * omegaMode - omega * omega;
    const loss = (omegaMode * omega) / this.qualityFactor;
    return DRIVE_ACCELERATION_MPS2 / Math.sqrt(detuning * detuning + loss * loss);
  }

  /**
   * Time constant of the amplitude build-up or ring-down of harmonic h (s):
   * τ = 2Q/ωₕ = Q/(πfₕ).
   */
  public buildUpTimeConstant(harmonicNumber: number): number {
    const frequency = this.getModeFrequency(harmonicNumber);
    return frequency > 0 ? this.qualityFactor / (Math.PI * frequency) : 0;
  }

  /** Particle displacement ξ at position x along the pipe (m). */
  public displacementAt(x: number): number {
    const termination = this.terminationProperty.value;
    const length = this.pipeLengthProperty.value;
    let total = 0;
    for (let h = 1; h <= MODE_COUNT; h++) {
      const amplitude = this.amplitudes[h - 1] ?? 0;
      if (amplitude !== 0) {
        total += amplitude * displacementShape(h, termination, length, x);
      }
    }
    return total;
  }

  /**
   * Acoustic pressure p at position x along the pipe (Pa).
   *
   * Each mode contributes ρc²kₕ·aₕ·ψₕ(x): the kₕ factor is the spatial
   * derivative in p = −ρc²∂ξ/∂x, so higher modes carry proportionally more
   * pressure for the same displacement.
   */
  public pressureAt(x: number): number {
    const termination = this.terminationProperty.value;
    const length = this.pipeLengthProperty.value;
    let total = 0;
    for (let h = 1; h <= MODE_COUNT; h++) {
      const amplitude = this.amplitudes[h - 1] ?? 0;
      if (amplitude !== 0) {
        const k = modeWavenumber(h, termination, length);
        total += BULK_MODULUS * k * amplitude * pressureShape(h, termination, length, x);
      }
    }
    return total;
  }

  /** Particle velocity u = ∂ξ/∂t at position x along the pipe (m/s). */
  public velocityAt(x: number): number {
    const termination = this.terminationProperty.value;
    const length = this.pipeLengthProperty.value;
    let total = 0;
    for (let h = 1; h <= MODE_COUNT; h++) {
      const rate = this.rates[h - 1] ?? 0;
      if (rate !== 0) {
        total += rate * displacementShape(h, termination, length, x);
      }
    }
    return total;
  }

  /** Sets the drive exactly onto harmonic h, if the pipe has one there. */
  public tuneToHarmonic(harmonicNumber: number): void {
    if (isModeAllowed(harmonicNumber, this.terminationProperty.value)) {
      this.driveFrequencyProperty.value = this.getModeFrequency(harmonicNumber);
    }
  }

  /**
   * Tunes to harmonic h **and jumps straight to the steady state** — the "show me
   * this mode" affordance behind the overtone ladder.
   *
   * Without the jump, a mode the pipe was previously ringing in keeps sounding while
   * it decays over its own τ = Q/(πfₕ), which at the fundamental is several seconds.
   * Pressing "3" would then show a mixture of modes 1 and 3 for long enough to hide
   * the mode-3 shape the learner just asked for. Jumping is not a cheat: it is the
   * exact steady state this drive produces, computed in closed form.
   *
   * The frequency *slider* deliberately does not do this — hunting for a resonance and
   * watching it fill is the whole point of that control.
   */
  public jumpToHarmonic(harmonicNumber: number): void {
    if (!isModeAllowed(harmonicNumber, this.terminationProperty.value)) {
      return;
    }
    this.tuneToHarmonic(harmonicNumber);
    this.settleToSteadyState();
  }

  /**
   * Phase lag δ of harmonic h behind the drive at a given drive frequency
   * (radians), from tan δ = (ωₕω/Q)/(ωₕ² − ω²). Runs 0 below resonance, π/2 at
   * resonance, and π above it — the sign flip that makes a driven system fight
   * its driver past resonance.
   */
  public steadyStatePhaseLag(harmonicNumber: number, driveFrequency: number): number {
    const omegaMode = 2 * Math.PI * this.getModeFrequency(harmonicNumber);
    const omega = 2 * Math.PI * driveFrequency;
    const detuning = omegaMode * omegaMode - omega * omega;
    const loss = (omegaMode * omega) / this.qualityFactor;
    return Math.atan2(loss, detuning);
  }

  /**
   * Places every allowed mode exactly on the steady state it would reach at the
   * current drive frequency, skipping the build-up. For "show me the mode now"
   * affordances and for tests that assert the steady state.
   *
   * This is the true particular solution aₕ(t) = A·cos(Θ − δ), evaluated at
   * Θ = 0 along with its derivative — not merely the amplitude with the rate
   * zeroed, which would still have a transient to shed.
   */
  public settleToSteadyState(): void {
    const termination = this.terminationProperty.value;
    const driveFrequency = this.driveFrequencyProperty.value;
    const omegaDrive = 2 * Math.PI * driveFrequency;
    for (let h = 1; h <= MODE_COUNT; h++) {
      if (isModeAllowed(h, termination)) {
        const amplitude = this.steadyStateAmplitude(h, driveFrequency);
        const lag = this.steadyStatePhaseLag(h, driveFrequency);
        // a(Θ) = A·cos(Θ − δ), so at Θ = 0: a = A·cos δ and ȧ = A·ω_d·sin δ.
        this.amplitudes[h - 1] = amplitude * Math.cos(lag);
        this.rates[h - 1] = amplitude * omegaDrive * Math.sin(lag);
      } else {
        this.amplitudes[h - 1] = 0;
        this.rates[h - 1] = 0;
      }
    }
    this.drivePhaseProperty.value = 0;
    this.stateChangeCountProperty.value++;
  }

  /**
   * Advances every mode by dt model seconds.
   *
   * Sub-stepped so that the fastest mode present takes steps of at most
   * MAX_PHASE_STEP radians of its own phase: the top of the ladder can be two
   * orders of magnitude faster than the fundamental, and a step sized for the
   * fundamental would integrate it into nonsense.
   *
   * @param dt - model seconds
   */
  public step(dt: number): void {
    if (dt <= 0) {
      return;
    }
    const termination = this.terminationProperty.value;
    const length = this.pipeLengthProperty.value;
    const driveFrequency = this.driveFrequencyProperty.value;
    const omegaDrive = 2 * Math.PI * driveFrequency;
    const force = this.isDrivingProperty.value ? DRIVE_ACCELERATION_MPS2 : 0;

    const highestFrequency = modeFrequency(MODE_COUNT, termination, length);
    const omegaMax = Math.max(2 * Math.PI * highestFrequency, omegaDrive);
    const subStepCount = Math.max(1, Math.ceil((omegaMax * dt) / MAX_PHASE_STEP));
    const subDt = dt / subStepCount;

    let phase = this.drivePhaseProperty.value;

    for (let step = 0; step < subStepCount; step++) {
      for (let h = 1; h <= MODE_COUNT; h++) {
        if (!isModeAllowed(h, termination)) {
          continue;
        }
        const omega = 2 * Math.PI * modeFrequency(h, termination, length);
        const damping = omega / this.qualityFactor;
        const index = h - 1;
        const integrated = integrateOscillator(
          this.amplitudes[index] ?? 0,
          this.rates[index] ?? 0,
          omega,
          damping,
          force,
          phase,
          omegaDrive,
          subDt,
        );
        this.amplitudes[index] = integrated.displacement;
        this.rates[index] = integrated.rate;
      }
      phase += omegaDrive * subDt;
    }

    // Keep the accumulated phase bounded; cos is 2π-periodic so this is exact.
    this.drivePhaseProperty.value = phase % (2 * Math.PI);
    this.stateChangeCountProperty.value++;
  }

  public reset(): void {
    this.pipeLengthProperty.reset();
    this.terminationProperty.reset();
    this.isDrivingProperty.reset();
    this.drivePhaseProperty.reset();
    this.driveFrequencyProperty.value = fundamentalFrequency(
      this.terminationProperty.value,
      this.pipeLengthProperty.value,
    );
    this.amplitudes.fill(0);
    this.rates.fill(0);
    this.stateChangeCountProperty.reset();
  }

  public dispose(): void {
    this.isAtResonanceProperty.dispose();
    this.nearestHarmonicProperty.dispose();
    this.fundamentalFrequencyProperty.dispose();
    this.stateChangeCountProperty.dispose();
    this.drivePhaseProperty.dispose();
    this.isDrivingProperty.dispose();
    this.driveFrequencyProperty.dispose();
    this.terminationProperty.dispose();
    this.pipeLengthProperty.dispose();
  }

  /** Silences any mode the current termination does not support. */
  private clearForbiddenModes(): void {
    const termination = this.terminationProperty.value;
    for (let h = 1; h <= MODE_COUNT; h++) {
      if (!isModeAllowed(h, termination)) {
        this.amplitudes[h - 1] = 0;
        this.rates[h - 1] = 0;
      }
    }
  }

  /** Harmonic whose frequency is closest to `driveFrequency`, or 0 if none. */
  private findNearestHarmonic(termination: PipeTermination, length: number, driveFrequency: number): number {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const h of allowedHarmonics(termination, MODE_COUNT)) {
      const distance = Math.abs(modeFrequency(h, termination, length) - driveFrequency);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = h;
      }
    }
    return best;
  }
}

/**
 * One RK4 step of ä + γȧ + ω²a = F·cos(Θ + ω_d·t).
 *
 * RK4 rather than the symplectic integrator used for the lattice on the
 * Reflection screen: this system is *not* conservative — the whole point is that
 * damping and drive balance — so there is no energy to preserve, and what
 * matters instead is that the amplitude converges to the right Lorentzian
 * without phase creep over the thousands of cycles a build-up spans.
 */
function integrateOscillator(
  displacement: number,
  rate: number,
  omega: number,
  damping: number,
  force: number,
  phase: number,
  omegaDrive: number,
  dt: number,
): { displacement: number; rate: number } {
  const omegaSquared = omega * omega;
  const acceleration = (x: number, v: number, t: number): number =>
    force * Math.cos(phase + omegaDrive * t) - damping * v - omegaSquared * x;

  const k1x = rate;
  const k1v = acceleration(displacement, rate, 0);

  const k2x = rate + (dt / 2) * k1v;
  const k2v = acceleration(displacement + (dt / 2) * k1x, rate + (dt / 2) * k1v, dt / 2);

  const k3x = rate + (dt / 2) * k2v;
  const k3v = acceleration(displacement + (dt / 2) * k2x, rate + (dt / 2) * k2v, dt / 2);

  const k4x = rate + dt * k3v;
  const k4v = acceleration(displacement + dt * k3x, rate + dt * k3v, dt);

  return {
    displacement: displacement + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    rate: rate + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  };
}
