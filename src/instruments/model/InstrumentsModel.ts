/**
 * InstrumentsModel.ts
 *
 * The Instruments screen: the same {@link PipeModalModel} as the Standing Waves
 * screen, with its length and termination set from a preset instead of by hand.
 *
 * The pipe sounds one of its own modes — the fundamental unless the learner picks
 * another bar on the spectrum or presses the register key — and the spectrum beside
 * it is the ladder of harmonics that pipe supports.
 *
 * ── The register key ──────────────────────────────────────────────────────────
 *
 * Overblowing a wind instrument makes it jump to the next mode its bore has. For an
 * open pipe that is h = 2, an octave up; for a stopped pipe h = 2 does not exist, so
 * it jumps to h = 3, an octave and a fifth (a twelfth). That is why a clarinet's
 * register key gives a twelfth where a flute's gives an octave, and here it is not a
 * rule: `registerKeyProperty` sounds `allowedHarmonics(...)[1]`, whatever that is.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { allowedHarmonics, isModeAllowed, type PipeTermination } from "../../common/model/PipeTermination.js";
import { TimeModel } from "../../common/TimeModel.js";
import { INSTRUMENTS_MODE_COUNT, INSTRUMENTS_TIME_SCALE, MAX_FRAME_DT_S } from "../../StandingWavesConstants.js";
import { InstrumentPreset, InstrumentPresetValues, partnerOf, specFor } from "./instrumentPresets.js";

/** One sine component of the tone the pipe sounds. */
export type TonePartial = {
  /** Frequency (Hz), a true SI value. */
  readonly frequency: number;
  /** Amplitude relative to the sounding mode, which is 1. */
  readonly amplitude: number;
};

export class InstrumentsModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** The air column. */
  public readonly pipe = new PipeModalModel({ modeCount: INSTRUMENTS_MODE_COUNT });

  /** Which instrument the pipe is currently set up as. */
  public readonly presetProperty = new Property<InstrumentPreset>(InstrumentPreset.FLUTE, {
    validValues: [...InstrumentPresetValues],
  });

  /** The same-length instrument with the other termination. */
  public readonly partnerPresetProperty: TReadOnlyProperty<InstrumentPreset>;

  /**
   * The mode the pipe is sounding. Always one the current pipe has; written only
   * through {@link selectHarmonic}, so it can never name a missing even harmonic.
   */
  public readonly soundingHarmonicProperty: TReadOnlyProperty<number>;
  private readonly soundingHarmonicNumberProperty = new NumberProperty(1, { numberType: "Integer" });

  /** The mode the register key jumps to: the pipe's second rung, 2 or 3. */
  public readonly secondRegisterHarmonicProperty: TReadOnlyProperty<number>;

  /** Whether the register key is held — the pipe overblown into its second register. */
  public readonly registerKeyProperty = new BooleanProperty(false);

  /** Whether the partner instrument's spectrum is drawn behind this one. */
  public readonly showPartnerProperty = new BooleanProperty(false);

  /** Whether the tone is played aloud. Off by default: a sustained tone is intrusive. */
  public readonly isToneOnProperty = new BooleanProperty(false);

  /** Guards the two-way link between the register key and the sounding harmonic. */
  private isSelecting = false;

  public constructor() {
    this.soundingHarmonicProperty = this.soundingHarmonicNumberProperty;

    this.partnerPresetProperty = new DerivedProperty([this.presetProperty], partnerOf);

    this.secondRegisterHarmonicProperty = new DerivedProperty(
      [this.pipe.terminationProperty],
      (termination: PipeTermination) => allowedHarmonics(termination, this.pipe.modeCount)[1] ?? 1,
    );

    // Pressing the key overblows; releasing it falls back to the fundamental. A key
    // state set *by* selectHarmonic (a bar that happens to be the second register)
    // must not echo back into another selection.
    this.registerKeyProperty.lazyLink((isPressed: boolean) => {
      if (!this.isSelecting) {
        this.selectHarmonic(isPressed ? this.secondRegisterHarmonicProperty.value : 1);
      }
    });

    // Selecting a preset writes its geometry into the shared pipe and tunes the
    // drive to a mode of that geometry — so the preset is only ever a shortcut for
    // two numbers, never a separate source of truth about frequencies.
    this.presetProperty.link(() => this.applyPreset());
  }

  /**
   * Sounds harmonic h, if the pipe has a mode there, skipping the build-up. Returns
   * false — and changes nothing — for a harmonic the pipe lacks, so the view can say
   * why the even slots of a stopped pipe do not answer.
   */
  public selectHarmonic(harmonic: number): boolean {
    if (
      harmonic < 1 ||
      harmonic > this.pipe.modeCount ||
      !isModeAllowed(harmonic, this.pipe.terminationProperty.value)
    ) {
      return false;
    }
    this.isSelecting = true;
    this.registerKeyProperty.value = harmonic !== 1 && harmonic === this.secondRegisterHarmonicProperty.value;
    this.isSelecting = false;

    this.soundingHarmonicNumberProperty.value = harmonic;
    // jumpToHarmonic rather than tuneToHarmonic, as on the overtone ladder: a mode the
    // pipe was ringing in would otherwise linger for seconds and muddy the new shape.
    this.pipe.jumpToHarmonic(harmonic);
    return true;
  }

  /**
   * The sine components of the note the pipe sounds: every mode the pipe has at a
   * whole multiple of the sounding frequency, weighted as the spectrum bars are.
   *
   * A periodic tone at f can only contain multiples of f, and the pipe can only
   * reinforce the multiples it has a mode at — so a stopped pipe's fundamental gets
   * 1, 1/3, 1/5, … (a square wave's series) and an open pipe's gets 1, 1/2, 1/3, …
   * (a sawtooth's). Those are the textbook clarinet-like and flute-like timbres,
   * produced here by the pipe's own resonant response rather than chosen.
   */
  public getTonePartials(): TonePartial[] {
    const harmonic = this.soundingHarmonicProperty.value;
    const reference = this.pipe.resonantAmplitude(harmonic);
    const partials: TonePartial[] = [];
    if (reference <= 0) {
      return partials;
    }
    for (let mode = harmonic; mode <= this.pipe.modeCount; mode += harmonic) {
      if (isModeAllowed(mode, this.pipe.terminationProperty.value)) {
        partials.push({
          frequency: this.pipe.getModeFrequency(mode),
          amplitude: this.pipe.resonantAmplitude(mode) / reference,
        });
      }
    }
    return partials;
  }

  /** Writes the current preset's geometry into the pipe and sounds its fundamental. */
  private applyPreset(): void {
    const spec = specFor(this.presetProperty.value);
    this.pipe.pipeLengthProperty.value = spec.pipeLength;
    this.pipe.terminationProperty.value = spec.termination;
    // A held register key stays held across instruments, so stepping flute →
    // clarinet with it down compares an octave jump with a twelfth. Any other
    // selection goes back to the fundamental, which every pipe has.
    // Skip the build-up either way: this screen is about the steady tone of an
    // instrument, and watching each preset fill for several seconds would get in the
    // way of flipping between them to compare.
    this.selectHarmonic(this.registerKeyProperty.value ? this.secondRegisterHarmonicProperty.value : 1);
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
    this.showPartnerProperty.reset();
    this.isToneOnProperty.reset();
    this.isSelecting = true;
    this.registerKeyProperty.reset();
    this.isSelecting = false;
    this.presetProperty.reset();
    // `pipe.reset()` puts the pipe back to *its* defaults, not the preset's, and
    // resetting an already-default preset fires no listener — so re-apply explicitly
    // or the screen would come back showing a pipe that matches no instrument.
    this.applyPreset();
  }

  public dispose(): void {
    this.partnerPresetProperty.dispose();
    this.secondRegisterHarmonicProperty.dispose();
    this.presetProperty.dispose();
    this.registerKeyProperty.dispose();
    this.showPartnerProperty.dispose();
    this.isToneOnProperty.dispose();
    this.soundingHarmonicNumberProperty.dispose();
    this.pipe.dispose();
    this.timer.dispose();
  }

  private toModelTime(dt: number): number {
    return Math.min(dt, MAX_FRAME_DT_S) * INSTRUMENTS_TIME_SCALE * this.timer.speedMultiplier;
  }
}
