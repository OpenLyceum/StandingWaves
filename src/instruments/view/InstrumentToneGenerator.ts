/**
 * InstrumentToneGenerator.ts
 *
 * Plays the note the pipe is sounding, at its true frequency.
 *
 * The animation runs hundreds of times slower than real sound, but the tone does
 * not: every partial is the SI frequency the readouts report, so the flute/clarinet
 * octave and the register key's octave-versus-twelfth are heard as they really are.
 *
 * The partials and their weights come from `InstrumentsModel.getTonePartials()` —
 * the same resonant response the spectrum bars draw — so what is heard is the chart.
 * One sine oscillator per model mode is created the first time the tone is wanted
 * and reused after that; changing the instrument or the sounding mode glides their
 * frequencies and gains rather than rebuilding the graph, so there is no click.
 *
 * It sounds only while the "Play sound" box is ticked, the clock is running and
 * tambo has sound enabled for this screen: a paused pipe is not vibrating.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import type { Node } from "scenerystack/scenery";
import { SoundGenerator, soundManager } from "scenerystack/tambo";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";

/**
 * Sum of all partial gains. Bounding the sum, not each gain, bounds the waveform's
 * peak however many partials the note has.
 */
const TOTAL_GAIN = 0.3;

/** Time constant of every gain and frequency change (s): fast, but click-free. */
const RAMP_TIME_CONSTANT_S = 0.02;

type Voice = { readonly oscillator: OscillatorNode; readonly gain: GainNode };

export class InstrumentToneGenerator extends SoundGenerator {
  private readonly model: InstrumentsModel;
  private voices: Voice[] | null = null;
  private readonly shouldSoundProperty: TReadOnlyProperty<boolean>;
  private readonly multilink: UnknownMultilink;

  public constructor(model: InstrumentsModel, associatedViewNode: Node) {
    super({ initialOutputLevel: 1, associatedViewNode });
    this.model = model;

    this.shouldSoundProperty = new DerivedProperty(
      [model.isToneOnProperty, model.timer.isPlayingProperty, this.fullyEnabledProperty],
      (isOn: boolean, isPlaying: boolean, isEnabled: boolean) => isOn && isPlaying && isEnabled,
    );

    this.multilink = Multilink.multilinkAny(
      [
        this.shouldSoundProperty,
        model.soundingHarmonicProperty,
        model.pipe.terminationProperty,
        model.pipe.pipeLengthProperty,
      ],
      () => this.update(),
    );

    soundManager.addSoundGenerator(this);
  }

  /** Retunes every voice to the current note, or fades them all out. */
  private update(): void {
    const shouldSound = this.shouldSoundProperty.value;
    if (!(shouldSound || this.voices)) {
      // Never wanted yet: leave the audio graph untouched.
      return;
    }
    const voices = this.getVoices();
    const now = this.audioContext.currentTime;
    const partials = shouldSound ? this.model.getTonePartials() : [];
    const total = partials.reduce((sum, partial) => sum + partial.amplitude, 0);

    voices.forEach((voice, index) => {
      const partial = partials[index];
      if (partial && total > 0) {
        voice.oscillator.frequency.setTargetAtTime(partial.frequency, now, RAMP_TIME_CONSTANT_S);
        voice.gain.gain.setTargetAtTime((TOTAL_GAIN * partial.amplitude) / total, now, RAMP_TIME_CONSTANT_S);
      } else {
        voice.gain.gain.setTargetAtTime(0, now, RAMP_TIME_CONSTANT_S);
      }
    });
  }

  /** The oscillator bank, built on first use. A note never has more partials than modes. */
  private getVoices(): Voice[] {
    if (!this.voices) {
      const now = this.audioContext.currentTime;
      this.voices = [];
      for (let i = 0; i < this.model.pipe.modeCount; i++) {
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = "sine";
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        oscillator.connect(gain);
        gain.connect(this.soundSourceDestination);
        oscillator.start(now);
        this.voices.push({ oscillator, gain });
      }
    }
    return this.voices;
  }

  public override dispose(): void {
    this.multilink.dispose();
    this.shouldSoundProperty.dispose();
    if (this.voices) {
      for (const voice of this.voices) {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.gain.disconnect();
      }
      this.voices = null;
    }
    soundManager.removeSoundGenerator(this);
    super.dispose();
  }
}
