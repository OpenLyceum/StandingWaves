/**
 * StandingWavesModel.ts
 *
 * The Standing Waves screen. Thin: the physics is the shared
 * {@link PipeModalModel}, which this composes rather than extends, and everything
 * added here is screen state — the clock, and whether the node markers and the
 * density shading show.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { TimeModel } from "../../common/TimeModel.js";
import { HARMONIC_TIME_SCALE, MAX_FRAME_DT_S } from "../../StandingWavesConstants.js";

export class StandingWavesModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** The air column: mode ladder, drive, and the modal amplitudes. */
  public readonly pipe = new PipeModalModel();

  /** Whether node / antinode markers are drawn along the pipe. */
  public readonly showNodesProperty = new BooleanProperty(true);

  /** Whether the air in the bore is drawn as slabs tinted by their density. */
  public readonly showDensityProperty = new BooleanProperty(false);

  /**
   * @param dt - wall-clock seconds since the last frame
   */
  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    const modelDt = this.toModelTime(dt);
    this.timer.step(modelDt);
    this.pipe.step(modelDt);
  }

  /** Advances one frame's worth of model time while paused. */
  public stepForward(): void {
    const modelDt = this.toModelTime(1 / 60);
    this.timer.stepForward(modelDt);
    this.pipe.step(modelDt);
  }

  public reset(): void {
    this.timer.reset();
    this.pipe.reset();
    this.showNodesProperty.reset();
    this.showDensityProperty.reset();
  }

  public dispose(): void {
    this.showDensityProperty.dispose();
    this.showNodesProperty.dispose();
    this.pipe.dispose();
    this.timer.dispose();
  }

  private toModelTime(dt: number): number {
    return Math.min(dt, MAX_FRAME_DT_S) * HARMONIC_TIME_SCALE * this.timer.speedMultiplier;
  }
}
