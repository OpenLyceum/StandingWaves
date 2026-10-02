/**
 * TimeModel.ts
 *
 * A reusable, composable timing model for simulations that need play/pause and
 * elapsed-time tracking. Compose it into your screen model rather than
 * extending it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In YourModel.ts
 *   import { TimeModel } from "../../common/TimeModel.js";
 *
 *   export class YourModel implements TModel {
 *     public readonly timer = new TimeModel();
 *
 *     public step( dt: number ): void {
 *       this.timer.step( dt );
 *       // use this.timer.timeProperty.value for physics calculations
 *     }
 *
 *     public reset(): void {
 *       this.timer.reset();
 *       // reset other state …
 *     }
 *   }
 *
 * ── View wiring ───────────────────────────────────────────────────────────────
 *
 *   SceneryStack ships a TimeControlNode that binds directly to isPlayingProperty:
 *
 *   import { TimeControlNode } from "scenerystack/scenery-phet";
 *
 *   const timeControl = new TimeControlNode( model.timer.isPlayingProperty, {
 *     playPauseStepButtonOptions: {
 *       stepForwardButtonOptions: {
 *         listener: () => model.step( 1 / 60 ),
 *       },
 *     },
 *   });
 *
 * ── Start paused vs. playing ──────────────────────────────────────────────────
 *
 *   new TimeModel()           // starts paused  (most physics sims)
 *   new TimeModel( true )     // starts playing  (continuous animations)
 */

import { BooleanProperty, NumberProperty } from "scenerystack/axon";
import { SLOW_MOTION_MULTIPLIER } from "../StandingWavesConstants.js";

export class TimeModel {
  /** Whether the simulation clock is running. Bind to TimeControlNode. */
  public readonly isPlayingProperty: BooleanProperty;

  /** Slows animation to 40% of the usual rate without changing model units. */
  public readonly slowMotionProperty: BooleanProperty;

  /** Elapsed simulation time in seconds. Resets to 0 on reset(). */
  public readonly timeProperty: NumberProperty;

  public constructor(initiallyPlaying = false) {
    this.isPlayingProperty = new BooleanProperty(initiallyPlaying);
    this.slowMotionProperty = new BooleanProperty(true);
    this.timeProperty = new NumberProperty(0, { units: "s" });
  }

  public get speedMultiplier(): number {
    return this.slowMotionProperty.value ? SLOW_MOTION_MULTIPLIER : 1;
  }

  /**
   * Advance the simulation clock by dt seconds.
   * Call this from your model's step() method.
   */
  public step(dt: number): void {
    if (this.isPlayingProperty.value) {
      this.timeProperty.value += dt;
    }
  }

  /**
   * Advance the clock by dt seconds regardless of whether it is running.
   *
   * This is what a step-forward button needs: it is only ever pressed while
   * paused, and {@link step} ignores dt in exactly that state.
   */
  public stepForward(dt: number): void {
    this.timeProperty.value += dt;
  }

  /** Resets clock and playback state to their initial values. */
  public reset(): void {
    this.isPlayingProperty.reset();
    this.slowMotionProperty.reset();
    this.timeProperty.reset();
  }

  /** Call when the model is no longer needed to free AXON listeners. */
  public dispose(): void {
    this.isPlayingProperty.dispose();
    this.slowMotionProperty.dispose();
    this.timeProperty.dispose();
  }
}
