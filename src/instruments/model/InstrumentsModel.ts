/**
 * InstrumentsModel.ts
 *
 * The Instruments screen: the same {@link PipeModalModel} as the Standing Waves
 * screen, with its length and termination set from a preset instead of by hand.
 *
 * The pipe is always driven at its own fundamental, so what the screen shows is the
 * instrument sounding its lowest note — and the spectrum beside it is the ladder of
 * harmonics that pipe supports.
 */

import { Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { TimeModel } from "../../common/TimeModel.js";
import { HARMONIC_TIME_SCALE, MAX_FRAME_DT_S } from "../../StandingWavesConstants.js";
import { InstrumentPreset, InstrumentPresetValues, specFor } from "./instrumentPresets.js";

export class InstrumentsModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** The air column. */
  public readonly pipe = new PipeModalModel();

  /** Which instrument the pipe is currently set up as. */
  public readonly presetProperty = new Property<InstrumentPreset>(InstrumentPreset.FLUTE, {
    validValues: [...InstrumentPresetValues],
  });

  public constructor() {
    // Selecting a preset writes its geometry into the shared pipe and tunes the
    // drive to the fundamental that geometry produces — so the preset is only ever a
    // shortcut for two numbers, never a separate source of truth about frequencies.
    this.presetProperty.link(() => this.applyPreset());
  }

  /** Writes the current preset's geometry into the pipe and sounds its fundamental. */
  private applyPreset(): void {
    const spec = specFor(this.presetProperty.value);
    this.pipe.pipeLengthProperty.value = spec.pipeLength;
    this.pipe.terminationProperty.value = spec.termination;
    this.pipe.tuneToHarmonic(1);
    // Skip the build-up: this screen is about the steady tone of an instrument, and
    // watching each preset fill for three seconds would get in the way of flipping
    // between them to compare.
    this.pipe.settleToSteadyState();
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
    this.presetProperty.reset();
    // `pipe.reset()` puts the pipe back to *its* defaults, not the preset's, and
    // resetting an already-default preset fires no listener — so re-apply explicitly
    // or the screen would come back showing a pipe that matches no instrument.
    this.applyPreset();
  }

  public dispose(): void {
    this.presetProperty.dispose();
    this.pipe.dispose();
    this.timer.dispose();
  }

  private toModelTime(dt: number): number {
    return Math.min(dt, MAX_FRAME_DT_S) * HARMONIC_TIME_SCALE * this.timer.speedMultiplier;
  }
}
