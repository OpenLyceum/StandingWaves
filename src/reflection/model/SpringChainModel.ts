/**
 * SpringChainModel.ts
 *
 * A chain of point masses joined by springs — the mechanical analog of an air
 * column, and the model behind the Reflection screen.
 *
 * ── Why a lattice and not a formula ───────────────────────────────────────────
 *
 * The screen's whole claim is that a pulse *inverts* on reflection from a rigid
 * end and *does not* from a free one. Drawing that with an image-source formula
 * would be circular: the sign the screen is meant to demonstrate would be the
 * sign we typed in. Here nothing is special-cased at either end. Each mass obeys
 * the same law,
 *
 *   m·ξ̈ᵢ = k·(ξᵢ₊₁ − 2ξᵢ + ξᵢ₋₁)
 *
 * and an end differs only in which neighbours it has:
 *
 *   **closed** (rigid)  the end mass is pinned:  ξ = 0
 *   **open**   (free)   the end mass has no spring beyond it, so it feels only
 *                       m·ξ̈ = k·(ξ_{N−2} − ξ_{N−1}) — which is the discrete form
 *                       of ∂ξ/∂x = 0, i.e. p = 0
 *
 * The inversion then *emerges*. It is a consequence of the boundary condition,
 * which is exactly the thing being taught.
 *
 * ── Integrator ───────────────────────────────────────────────────────────────
 *
 * Velocity Verlet, sub-stepped. This lattice is undamped and conservative, and a
 * pulse is watched over many round trips; a Runge-Kutta method would bleed
 * amplitude visibly over that span, while Verlet is symplectic and holds the
 * energy to a bounded oscillation. The explicit stability limit is
 * dt < 2/ω_max = √(m/k), and {@link CHAIN_STABILITY_SAFETY} keeps the actual
 * sub-step below a fraction of it.
 *
 * ── Discreteness, honestly ───────────────────────────────────────────────────
 *
 * A lattice is dispersive: ω = 2√(k/m)·|sin(qa/2)| rather than the continuum
 * ω = cq, so short-wavelength components travel slower than long ones and a
 * pulse slowly spreads. That is a property of the model, not a bug, and it is why
 * the launched pulse is several cells wide — see doc/model.md.
 *
 * ── Units ────────────────────────────────────────────────────────────────────
 *
 * SI throughout. The lattice is calibrated to the medium: given the pipe length L
 * and the mass count N, the spacing is a = L/(N−1) and the stiffness ratio is set
 * by k/m = (c/a)², so the chain carries waves at the real speed of sound.
 */

import { pressureFromGradient } from "../../common/model/acoustics.js";
import { EndCondition } from "../../common/model/PipeTermination.js";
import {
  CHAIN_STABILITY_SAFETY,
  PULSE_AMPLITUDE_CELLS,
  PULSE_WIDTH_FRACTION,
  SOUND_SPEED_MPS,
} from "../../StandingWavesConstants.js";

/**
 * Where the pulse is launched from, as a fraction of the pipe length. Far enough
 * from the far end that the incident pulse is clear of it before the reflection
 * forms, so the two can be told apart.
 *
 * Exported because the screen model times the pulse's journey from it rather than
 * hunting for a peak on the chain.
 */
export const LAUNCH_POSITION_FRACTION = 0.3;

/** Unit mass per lattice site (kg). Only the ratio k/m affects the dynamics. */
const SITE_MASS_KG = 1;

export type SpringChainModelOptions = {
  /** Number of masses in the chain. */
  massCount: number;
  /** Pipe length the chain spans (m). */
  pipeLength: number;
  /**
   * Condition at the far (x = L) end — the one under test. The near end is
   * always rigid: it stands in for the driver/piston, and having one end fixed
   * means the pulse comes back for a second, contrasting reflection.
   */
  farEnd: EndCondition;
};

export class SpringChainModel {
  /** Condition at the far end. Fixed for the life of the chain. */
  public readonly farEnd: EndCondition;

  /** Number of masses. */
  public readonly massCount: number;

  /** Equilibrium spacing between neighbouring masses (m). */
  public readonly spacing: number;

  /** Pipe length the chain spans (m). */
  public readonly pipeLength: number;

  /** Spring constant (N/m), set so the chain carries waves at the speed of sound. */
  public readonly springConstant: number;

  /** Displacement ξᵢ of each mass from equilibrium (m). */
  private readonly displacements: Float64Array;

  /** Velocity ξ̇ᵢ of each mass (m/s). */
  private readonly velocities: Float64Array;

  /** Scratch acceleration buffer, reused each sub-step to avoid per-frame allocation. */
  private readonly accelerations: Float64Array;

  public constructor(options: SpringChainModelOptions) {
    this.massCount = options.massCount;
    this.pipeLength = options.pipeLength;
    this.farEnd = options.farEnd;
    this.spacing = options.pipeLength / (options.massCount - 1);

    // c = a·√(k/m) ⇒ k = m·(c/a)².
    const speedRatio = SOUND_SPEED_MPS / this.spacing;
    this.springConstant = SITE_MASS_KG * speedRatio * speedRatio;

    this.displacements = new Float64Array(this.massCount);
    this.velocities = new Float64Array(this.massCount);
    this.accelerations = new Float64Array(this.massCount);
  }

  /** Wave speed on this lattice in the long-wavelength limit (m/s). */
  public get waveSpeed(): number {
    return this.spacing * Math.sqrt(this.springConstant / SITE_MASS_KG);
  }

  /** Peak displacement of a freshly launched pulse (m). */
  public get launchPeakDisplacement(): number {
    return PULSE_AMPLITUDE_CELLS * this.spacing;
  }

  /**
   * Peak |∂ξ/∂x| of a freshly launched pulse (dimensionless).
   *
   * For a Gaussian of amplitude A and width w the gradient peaks at s = ±w, where
   * it is A/(w·√e). The view needs this to choose trace scales that the doubled
   * peak of a reflection still fits inside — guessing it there would put a
   * property of the pulse in two places.
   */
  public get launchPeakGradient(): number {
    return this.launchPeakDisplacement / (PULSE_WIDTH_FRACTION * this.pipeLength * Math.sqrt(Math.E));
  }

  /** Peak particle velocity of a freshly launched pulse (m/s), from u = −c·∂ξ/∂x. */
  public get launchPeakVelocity(): number {
    return this.waveSpeed * this.launchPeakGradient;
  }

  /** Peak acoustic pressure of a freshly launched pulse (Pa). */
  public get launchPeakPressure(): number {
    return Math.abs(pressureFromGradient(this.launchPeakGradient));
  }

  /**
   * Largest stable sub-step for velocity Verlet on this lattice (s):
   * dt < 2/ω_max with ω_max = 2√(k/m), i.e. dt < √(m/k).
   */
  public get maxStableStep(): number {
    return Math.sqrt(SITE_MASS_KG / this.springConstant);
  }

  /** Equilibrium position of mass i along the pipe (m). */
  public equilibriumPosition(index: number): number {
    return index * this.spacing;
  }

  /** Displacement of mass i (m). */
  public displacementAt(index: number): number {
    return this.displacements[index] ?? 0;
  }

  /** Velocity of mass i (m/s). */
  public velocityAt(index: number): number {
    return this.velocities[index] ?? 0;
  }

  /**
   * Acoustic pressure in the spring between masses i and i+1 (Pa).
   *
   * Pressure lives on the **midpoints**, not on the masses: it is a gradient of
   * displacement, and the natural discrete gradient sits between two sites. That
   * half-cell offset is not an implementation detail to be smoothed away — it is
   * the same quarter-wave offset between displacement and pressure that the
   * standing-wave screen makes its centrepiece, showing up here for free.
   *
   * @param index - spring index, 0 … massCount − 2
   */
  public pressureAt(index: number): number {
    const left = this.displacements[index] ?? 0;
    const right = this.displacements[index + 1] ?? 0;
    return pressureFromGradient((right - left) / this.spacing);
  }

  /** Midpoint position of spring i along the pipe (m). */
  public pressurePosition(index: number): number {
    return (index + 0.5) * this.spacing;
  }

  /** Number of springs, i.e. the number of pressure samples. */
  public get springCount(): number {
    return this.massCount - 1;
  }

  /**
   * Total mechanical energy of the chain (J): ½mΣξ̇² + ½kΣ(ξᵢ₊₁ − ξᵢ)².
   *
   * Conserved by construction — the lattice is undamped and the integrator is
   * symplectic — so it is the natural check that the chain is behaving, and the
   * tests assert it over many round trips.
   */
  public totalEnergy(): number {
    let kinetic = 0;
    for (let i = 0; i < this.massCount; i++) {
      const v = this.velocities[i] ?? 0;
      kinetic += v * v;
    }
    let potential = 0;
    for (let i = 0; i < this.springCount; i++) {
      const stretch = (this.displacements[i + 1] ?? 0) - (this.displacements[i] ?? 0);
      potential += stretch * stretch;
    }
    return 0.5 * SITE_MASS_KG * kinetic + 0.5 * this.springConstant * potential;
  }

  /**
   * Places a Gaussian displacement pulse travelling toward the far end,
   * replacing whatever was on the chain.
   *
   * The velocities are set to −c·∂ξ/∂x, which is what makes the pulse move in
   * one direction only. Initialising displacement alone would split it into two
   * half-amplitude pulses running opposite ways, and the screen would then be
   * showing two reflections at once.
   *
   * The pulse is a displacement *bump*, so its pressure signature — the
   * gradient — is a rarefaction lobe followed by a compression lobe, with
   * compression on the leading edge. What happens to that ordering on reflection
   * is the whole comparison the screen draws.
   */
  public launchPulse(): void {
    const amplitude = PULSE_AMPLITUDE_CELLS * this.spacing;
    const width = PULSE_WIDTH_FRACTION * this.pipeLength;
    const center = LAUNCH_POSITION_FRACTION * this.pipeLength;
    const speed = this.waveSpeed;

    for (let i = 0; i < this.massCount; i++) {
      const offset = this.equilibriumPosition(i) - center;
      const gaussian = Math.exp((-offset * offset) / (2 * width * width));
      this.displacements[i] = amplitude * gaussian;
      // d/dx of the Gaussian is −(offset/width²)·gaussian; a rightward-travelling
      // solution f(x − ct) has ξ̇ = −c·∂ξ/∂x.
      const gradient = (-offset / (width * width)) * amplitude * gaussian;
      this.velocities[i] = -speed * gradient;
    }

    this.applyBoundaryConditions();
  }

  /**
   * Advances the chain by dt model seconds.
   *
   * @param dt - model seconds
   */
  public step(dt: number): void {
    if (dt <= 0) {
      return;
    }
    const stepLimit = CHAIN_STABILITY_SAFETY * this.maxStableStep;
    // Cap sub-steps so a degenerate dt/stepLimit under fuzz cannot hang the frame.
    const subStepCount = Math.min(2000, Math.max(1, Math.ceil(dt / stepLimit)));
    const subDt = dt / subStepCount;
    for (let step = 0; step < subStepCount; step++) {
      this.verletStep(subDt);
    }
  }

  /** Returns the chain to rest. */
  public reset(): void {
    this.displacements.fill(0);
    this.velocities.fill(0);
    this.accelerations.fill(0);
  }

  /** One velocity-Verlet step. */
  private verletStep(dt: number): void {
    this.computeAccelerations();
    for (let i = 0; i < this.massCount; i++) {
      const halfKick = 0.5 * dt * (this.accelerations[i] ?? 0);
      this.velocities[i] = (this.velocities[i] ?? 0) + halfKick;
      this.displacements[i] = (this.displacements[i] ?? 0) + dt * (this.velocities[i] ?? 0);
    }
    this.applyBoundaryConditions();

    this.computeAccelerations();
    for (let i = 0; i < this.massCount; i++) {
      this.velocities[i] = (this.velocities[i] ?? 0) + 0.5 * dt * (this.accelerations[i] ?? 0);
    }
    this.applyBoundaryConditions();
  }

  /**
   * Fills the acceleration buffer from the current displacements.
   *
   * Interior masses see both neighbours. A **free** end sees only its one
   * neighbour, which is the discrete ∂ξ/∂x = 0 condition and needs no special
   * coefficient — it falls out of simply having no spring on the far side. A
   * pinned end is handled in {@link applyBoundaryConditions} instead.
   */
  private computeAccelerations(): void {
    const stiffnessOverMass = this.springConstant / SITE_MASS_KG;
    const last = this.massCount - 1;

    for (let i = 0; i < this.massCount; i++) {
      const self = this.displacements[i] ?? 0;
      let restoring: number;
      if (i === 0) {
        // The near end is always rigid, so its value never matters; keep the
        // one-sided form for symmetry with the far end.
        restoring = (this.displacements[1] ?? 0) - self;
      } else if (i === last) {
        restoring = (this.displacements[last - 1] ?? 0) - self;
      } else {
        restoring = (this.displacements[i + 1] ?? 0) - 2 * self + (this.displacements[i - 1] ?? 0);
      }
      this.accelerations[i] = stiffnessOverMass * restoring;
    }
  }

  /**
   * Pins whichever end masses are rigid. The near end always; the far end only
   * when it is closed.
   */
  private applyBoundaryConditions(): void {
    this.displacements[0] = 0;
    this.velocities[0] = 0;
    this.accelerations[0] = 0;

    if (this.farEnd === EndCondition.CLOSED) {
      const last = this.massCount - 1;
      this.displacements[last] = 0;
      this.velocities[last] = 0;
      this.accelerations[last] = 0;
    }
  }
}
