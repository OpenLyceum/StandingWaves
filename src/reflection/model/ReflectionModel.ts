/**
 * ReflectionModel.ts
 *
 * The Reflection screen: a pulse launched down a pipe whose far end is either
 * rigid or open.
 *
 * ── Two chains, always ────────────────────────────────────────────────────────
 *
 * The model holds **both** a closed-ended and an open-ended chain at all times,
 * launches them together, and steps them from the same clock. The "compare both
 * ends" checkbox only decides whether the second one is drawn.
 *
 * That is deliberate. The comparison is the pedagogy — Russell's side-by-side
 * panel — and it is only honest if the two chains are at the same instant of the
 * same pulse. Keeping both alive makes that true by construction rather than by
 * remembering to re-sync them, and switching the far end becomes a change of
 * which chain is visible rather than a rebuild that would discard the pulse.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  CHAIN_MASS_COUNT,
  MAX_FRAME_DT_S,
  PIPE_LENGTH_DEFAULT_M,
  REFLECTION_TIME_SCALE,
  SOUND_SPEED_MPS,
} from "../../StandingWavesConstants.js";
import { LAUNCH_POSITION_FRACTION, SpringChainModel } from "./SpringChainModel.js";

/** Where the pulse is in its journey — drives the live a11y description. */
export const PulseStage = {
  /** Nothing launched yet. */
  AT_REST: "atRest",
  /** Heading for the far end. */
  OUTBOUND: "outbound",
  /** Interacting with the far end. */
  REFLECTING: "reflecting",
  /** Interacting with the rigid near end on a later round trip. */
  NEAR_REFLECTING: "nearReflecting",
  /** Heading back, having reflected at least once. */
  RETURNING: "returning",
} as const;

export type PulseStage = (typeof PulseStage)[keyof typeof PulseStage];

/**
 * Fraction of the pipe length within which the pulse counts as "at the far end".
 * Roughly the half-width of the launched pulse, so the stage reads REFLECTING for
 * about as long as the pulse is actually touching the boundary.
 */
const REFLECTION_ZONE_FRACTION = 0.12;

export class ReflectionModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** The chain whose far end is rigid. */
  public readonly closedChain: SpringChainModel;

  /** The chain whose far end is free. */
  public readonly openChain: SpringChainModel;

  /** Which far end the single-pipe view shows. */
  public readonly farEndProperty: Property<EndCondition>;

  /** Whether both far ends are shown at once. */
  public readonly isComparingProperty: BooleanProperty;

  /** Whether the air in the bore is drawn as slabs tinted by their density. */
  public readonly showDensityProperty: BooleanProperty;

  /** Whether a pulse has been launched since the last reset. */
  public readonly hasLaunchedProperty: BooleanProperty;

  /** Model time since the pulse was launched (s). */
  public readonly timeSinceLaunchProperty: NumberProperty;

  /** Where the pulse is in its journey. */
  public readonly pulseStageProperty: TReadOnlyProperty<PulseStage>;

  /** Bumped whenever the chains advance, so the view repaints. */
  public readonly stateChangeCountProperty = new NumberProperty(0);

  /** Pipe length shared by both chains (m). */
  public readonly pipeLength = PIPE_LENGTH_DEFAULT_M;

  public constructor() {
    this.closedChain = new SpringChainModel({
      massCount: CHAIN_MASS_COUNT,
      pipeLength: this.pipeLength,
      farEnd: EndCondition.CLOSED,
    });
    this.openChain = new SpringChainModel({
      massCount: CHAIN_MASS_COUNT,
      pipeLength: this.pipeLength,
      farEnd: EndCondition.OPEN,
    });

    this.farEndProperty = new Property<EndCondition>(EndCondition.CLOSED, {
      validValues: [EndCondition.CLOSED, EndCondition.OPEN],
    });
    this.isComparingProperty = new BooleanProperty(false);
    this.showDensityProperty = new BooleanProperty(false);
    this.hasLaunchedProperty = new BooleanProperty(false);
    this.timeSinceLaunchProperty = new NumberProperty(0, { units: "s" });

    this.pulseStageProperty = new DerivedProperty(
      [this.hasLaunchedProperty, this.timeSinceLaunchProperty],
      (hasLaunched: boolean, timeSinceLaunch: number) => {
        if (!hasLaunched) {
          return PulseStage.AT_REST;
        }
        // The pulse travels at c, so its position follows from the clock alone —
        // no need to search the chain for a peak, and the answer stays stable
        // when the pulse has spread.
        const travelled = timeSinceLaunch * SOUND_SPEED_MPS;
        const toFarEnd = (1 - LAUNCH_POSITION_FRACTION) * this.pipeLength;
        const zone = REFLECTION_ZONE_FRACTION * this.pipeLength;
        if (travelled < toFarEnd - zone) {
          return PulseStage.OUTBOUND;
        }
        const cycleDistance = (travelled - toFarEnd) % (2 * this.pipeLength);
        const distanceToFarEnd = Math.min(Math.abs(cycleDistance), Math.abs(cycleDistance - 2 * this.pipeLength));
        if (distanceToFarEnd < zone) {
          return PulseStage.REFLECTING;
        }
        if (Math.abs(cycleDistance - this.pipeLength) < zone) {
          return PulseStage.NEAR_REFLECTING;
        }
        return cycleDistance < this.pipeLength ? PulseStage.RETURNING : PulseStage.OUTBOUND;
      },
    );
  }

  /** The chain currently shown on its own. */
  public get selectedChain(): SpringChainModel {
    return this.farEndProperty.value === EndCondition.CLOSED ? this.closedChain : this.openChain;
  }

  /** Launches the same pulse on both chains. */
  public launchPulse(): void {
    this.closedChain.launchPulse();
    this.openChain.launchPulse();
    this.hasLaunchedProperty.value = true;
    this.timeSinceLaunchProperty.value = 0;
    this.stateChangeCountProperty.value++;
  }

  /**
   * @param dt - wall-clock seconds since the last frame
   */
  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.advance(this.toModelTime(dt));
  }

  /** Advances one frame's worth of model time while paused. */
  public stepForward(): void {
    const modelDt = this.toModelTime(1 / 60);
    this.timer.stepForward(modelDt);
    this.advanceChains(modelDt);
  }

  public reset(): void {
    this.timer.reset();
    this.closedChain.reset();
    this.openChain.reset();
    this.farEndProperty.reset();
    this.isComparingProperty.reset();
    this.showDensityProperty.reset();
    this.hasLaunchedProperty.reset();
    this.timeSinceLaunchProperty.reset();
    this.stateChangeCountProperty.reset();
  }

  public dispose(): void {
    this.pulseStageProperty.dispose();
    this.stateChangeCountProperty.dispose();
    this.timeSinceLaunchProperty.dispose();
    this.hasLaunchedProperty.dispose();
    this.showDensityProperty.dispose();
    this.isComparingProperty.dispose();
    this.farEndProperty.dispose();
    this.timer.dispose();
  }

  /**
   * Converts a frame's wall-clock dt into model seconds, in slow motion.
   *
   * The clamp is what keeps a backgrounded tab from handing over one enormous dt,
   * which the lattice would answer by taking thousands of sub-steps at once.
   */
  private toModelTime(dt: number): number {
    return Math.min(dt, MAX_FRAME_DT_S) * REFLECTION_TIME_SCALE * this.timer.speedMultiplier;
  }

  private advance(modelDt: number): void {
    this.timer.step(modelDt);
    this.advanceChains(modelDt);
  }

  private advanceChains(modelDt: number): void {
    this.closedChain.step(modelDt);
    this.openChain.step(modelDt);
    if (this.hasLaunchedProperty.value) {
      this.timeSinceLaunchProperty.value += modelDt;
    }
    this.stateChangeCountProperty.value++;
  }
}
