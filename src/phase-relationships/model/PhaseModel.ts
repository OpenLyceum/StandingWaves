/**
 * PhaseModel.ts
 *
 * A single travelling sinusoid in the pipe, in closed form.
 *
 * ── Why closed form ──────────────────────────────────────────────────────────
 *
 * This screen makes one claim, and it is a claim about an *ideal* plane wave:
 * velocity and pressure are in phase in a forward-going wave and antiphase in a
 * backward-going one. Integrating a lattice here would add reflections, dispersion
 * and transients — three things that would muddy the only thing being shown. So
 * the wave is evaluated exactly:
 *
 *   ξ(x,t) = A·cos(ωt ∓ kx)
 *   u(x,t) = ∂ξ/∂t = −Aω·sin(ωt ∓ kx)
 *   p(x,t) = −ρc²·∂ξ/∂x = ±ρc·u
 *
 * with the upper sign for a forward-going wave. Both derivatives are analytic, so
 * the phase relationship the screen is about is exact rather than a numerical
 * artefact — and the sign lives in one place, `acoustics.ts`, shared with the
 * tests that pin it.
 *
 * ── Phase continuity ────────────────────────────────────────────────────────
 *
 * The wave's phase is *accumulated* (Θ += ω dt) rather than recomputed as ωt, so
 * dragging the wavelength slider — which changes ω — does not make the wave jump.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  BULK_MODULUS,
  directionSign,
  frequencyForWavelength,
  pressureFromVelocity,
  WaveDirection,
  WaveDirectionValues,
  wavenumberFor,
} from "../../common/model/acoustics.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  MAX_FRAME_DT_S,
  PHASE_TIME_SCALE,
  PHASE_WAVELENGTH_RANGE_FRACTION,
  PIPE_LENGTH_DEFAULT_M,
} from "../../StandingWavesConstants.js";

/**
 * Peak particle displacement (m). Arbitrary — the system is linear and nothing on
 * this screen reads an absolute amplitude — but a real acoustic value keeps the
 * derived velocity and pressure in a plausible range for the readouts.
 */
const AMPLITUDE_M = 1e-3;

/**
 * Equilibrium distance between the two particles of the neighbour pair, as a
 * fraction of the pipe length.
 *
 * Fixed rather than adjustable so that the *wavelength* slider is what changes how
 * far out of step the pair moves (kΔx): a twelfth of the pipe puts the pair 30°
 * apart at the default wavelength, and 20°–120° across the slider's range.
 */
const PAIR_SEPARATION_FRACTION = 1 / 12;

export class PhaseModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** Which way the wave travels. */
  public readonly directionProperty: Property<WaveDirection>;

  /** Wavelength λ (m). */
  public readonly wavelengthProperty: NumberProperty;

  /** Whether the equation readout is showing. */
  public readonly showEquationsProperty: BooleanProperty;

  /** Whether the reference marker (and its guide line through the traces) is showing. */
  public readonly showReferencePointProperty: BooleanProperty;

  /** Position of the draggable reference marker along the pipe (m). */
  public readonly referencePositionProperty: NumberProperty;

  /** Whether the air in the bore is drawn as slabs tinted by their density. */
  public readonly showDensityProperty: BooleanProperty;

  /** Whether the neighbour pair is showing. */
  public readonly showNeighbourPairProperty: BooleanProperty;

  /** Midpoint of the neighbour pair along the pipe (m). */
  public readonly pairPositionProperty: NumberProperty;

  /** Equilibrium distance between the two particles of the pair, Δx (m). */
  public readonly pairSeparation: number;

  /** How far out of step the pair moves, kΔx (degrees). */
  public readonly pairPhaseLagProperty: TReadOnlyProperty<number>;

  /** Accumulated wave phase Θ = ∫ω dt (radians). */
  public readonly phaseProperty: NumberProperty;

  /** Frequency of the wave (Hz), from f = c/λ. */
  public readonly frequencyProperty: TReadOnlyProperty<number>;

  /** Pipe length (m). Fixed: this screen is about phase, not about resonance. */
  public readonly pipeLength = PIPE_LENGTH_DEFAULT_M;

  public constructor() {
    this.directionProperty = new Property<WaveDirection>(WaveDirection.FORWARD, {
      validValues: [...WaveDirectionValues],
    });
    this.wavelengthProperty = new NumberProperty(this.pipeLength, {
      range: new Range(
        PHASE_WAVELENGTH_RANGE_FRACTION.min * this.pipeLength,
        PHASE_WAVELENGTH_RANGE_FRACTION.max * this.pipeLength,
      ),
      units: "m",
    });
    this.showEquationsProperty = new BooleanProperty(true);
    this.showReferencePointProperty = new BooleanProperty(false);
    this.referencePositionProperty = new NumberProperty(0.35 * this.pipeLength, {
      range: new Range(0, this.pipeLength),
      units: "m",
    });
    this.showDensityProperty = new BooleanProperty(false);
    this.showNeighbourPairProperty = new BooleanProperty(false);
    this.pairSeparation = PAIR_SEPARATION_FRACTION * this.pipeLength;
    this.pairPositionProperty = new NumberProperty(0.65 * this.pipeLength, {
      range: new Range(this.pairSeparation / 2, this.pipeLength - this.pairSeparation / 2),
      units: "m",
    });
    this.phaseProperty = new NumberProperty(0);

    this.frequencyProperty = new DerivedProperty([this.wavelengthProperty], (wavelength: number) =>
      frequencyForWavelength(wavelength),
    );
    this.pairPhaseLagProperty = new DerivedProperty(
      [this.wavelengthProperty],
      (wavelength: number) => (360 * this.pairSeparation) / wavelength,
    );
  }

  /** Particle displacement ξ at position x (m). */
  public displacementAt(x: number): number {
    return AMPLITUDE_M * Math.cos(this.phaseAt(x));
  }

  /** Particle velocity u = ∂ξ/∂t at position x (m/s). */
  public velocityAt(x: number): number {
    const omega = 2 * Math.PI * this.frequencyProperty.value;
    return -AMPLITUDE_M * omega * Math.sin(this.phaseAt(x));
  }

  /**
   * Acoustic pressure p at position x (Pa).
   *
   * Computed as ±ρc·u rather than from the displacement gradient, because that
   * identity is what the screen is teaching and it should be the code path the
   * screen actually runs. `acoustics.test.ts` proves the two agree.
   */
  public pressureAt(x: number): number {
    return pressureFromVelocity(this.velocityAt(x), this.directionProperty.value);
  }

  /**
   * Fractional density change δρ/ρ = −∂ξ/∂x = p/(ρc²) at position x.
   *
   * Taken from the pressure so that the density shading and the pressure trace are
   * one quantity by construction, not two that happen to agree.
   */
  public densityChangeAt(x: number): number {
    return this.pressureAt(x) / BULK_MODULUS;
  }

  /** Peak fractional density change of the wave, kA. */
  public get densityChangeAmplitude(): number {
    return this.pressureAmplitude / BULK_MODULUS;
  }

  /**
   * Fractional density change of the air *between* the two particles of the pair:
   * how much their gap has closed, as a fraction of its rest length.
   *
   * A finite difference, deliberately — this is what the pair shows, and it tends to
   * {@link densityChangeAt} as Δx → 0. At finite Δx it is smaller by sin(kΔx/2)/(kΔx/2).
   */
  public pairDensityChange(): number {
    const centre = this.pairPositionProperty.value;
    const half = this.pairSeparation / 2;
    return -(this.displacementAt(centre + half) - this.displacementAt(centre - half)) / this.pairSeparation;
  }

  /** Peak displacement of the wave (m) — the trace scale. */
  public get displacementAmplitude(): number {
    return AMPLITUDE_M;
  }

  /** Peak velocity of the wave (m/s). */
  public get velocityAmplitude(): number {
    return AMPLITUDE_M * 2 * Math.PI * this.frequencyProperty.value;
  }

  /** Peak pressure of the wave (Pa). */
  public get pressureAmplitude(): number {
    return Math.abs(pressureFromVelocity(this.velocityAmplitude, this.directionProperty.value));
  }

  /**
   * @param dt - wall-clock seconds since the last frame
   */
  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    const modelDt = this.toModelTime(dt);
    this.timer.step(modelDt);
    this.advancePhase(modelDt);
  }

  /** Advances one frame's worth of model time while paused. */
  public stepForward(): void {
    const modelDt = this.toModelTime(1 / 60);
    this.timer.stepForward(modelDt);
    this.advancePhase(modelDt);
  }

  public reset(): void {
    this.timer.reset();
    this.directionProperty.reset();
    this.wavelengthProperty.reset();
    this.showEquationsProperty.reset();
    this.showReferencePointProperty.reset();
    this.referencePositionProperty.reset();
    this.showDensityProperty.reset();
    this.showNeighbourPairProperty.reset();
    this.pairPositionProperty.reset();
    this.phaseProperty.reset();
  }

  public dispose(): void {
    this.pairPhaseLagProperty.dispose();
    this.pairPositionProperty.dispose();
    this.showNeighbourPairProperty.dispose();
    this.showDensityProperty.dispose();
    this.frequencyProperty.dispose();
    this.phaseProperty.dispose();
    this.referencePositionProperty.dispose();
    this.showReferencePointProperty.dispose();
    this.showEquationsProperty.dispose();
    this.wavelengthProperty.dispose();
    this.directionProperty.dispose();
    this.timer.dispose();
  }

  /** Total phase ωt ∓ kx at position x. */
  private phaseAt(x: number): number {
    const k = wavenumberFor(this.frequencyProperty.value);
    return this.phaseProperty.value - directionSign(this.directionProperty.value) * k * x;
  }

  private toModelTime(dt: number): number {
    return Math.min(dt, MAX_FRAME_DT_S) * PHASE_TIME_SCALE * this.timer.speedMultiplier;
  }

  private advancePhase(modelDt: number): void {
    const omega = 2 * Math.PI * this.frequencyProperty.value;
    // Kept inside one turn; cos and sin are 2π-periodic so this is exact.
    this.phaseProperty.value = (this.phaseProperty.value + omega * modelDt) % (2 * Math.PI);
  }
}
