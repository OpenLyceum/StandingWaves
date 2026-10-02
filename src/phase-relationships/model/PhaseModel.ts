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

export class PhaseModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** Which way the wave travels. */
  public readonly directionProperty: Property<WaveDirection>;

  /** Wavelength λ (m). */
  public readonly wavelengthProperty: NumberProperty;

  /** Whether the equation readout is showing. */
  public readonly showEquationsProperty: BooleanProperty;

  /** Position of the draggable reference marker along the pipe (m). */
  public readonly referencePositionProperty: NumberProperty;

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
    this.referencePositionProperty = new NumberProperty(0.35 * this.pipeLength, {
      range: new Range(0, this.pipeLength),
      units: "m",
    });
    this.phaseProperty = new NumberProperty(0);

    this.frequencyProperty = new DerivedProperty([this.wavelengthProperty], (wavelength: number) =>
      frequencyForWavelength(wavelength),
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
    this.referencePositionProperty.reset();
    this.phaseProperty.reset();
  }

  public dispose(): void {
    this.frequencyProperty.dispose();
    this.phaseProperty.dispose();
    this.referencePositionProperty.dispose();
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
