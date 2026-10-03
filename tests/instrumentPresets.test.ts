/**
 * instrumentPresets.test.ts
 *
 * The four instruments, and the claim the Instruments screen is built to make:
 * a flute and a clarinet of the same bore length sound an octave apart, and the
 * clarinet sounds only the odd harmonics.
 *
 * Both facts are asserted from the presets' own geometry through `PipeTermination`,
 * so they cannot be satisfied by a hardcoded frequency in a preset table.
 */

import { describe, expect, it } from "vitest";
import {
  allowedHarmonics,
  fundamentalFrequency,
  isSymmetric,
  PipeTermination,
} from "../src/common/model/PipeTermination.js";
import { InstrumentsModel } from "../src/instruments/model/InstrumentsModel.js";
import {
  INSTRUMENT_SPECS,
  InstrumentPreset,
  InstrumentPresetValues,
  specFor,
} from "../src/instruments/model/instrumentPresets.js";
import { PIPE_LENGTH_RANGE_M, SOUND_SPEED_MPS } from "../src/StandingWavesConstants.js";

describe("the preset table", () => {
  it("describes every instrument with only a length and a termination", () => {
    for (const preset of InstrumentPresetValues) {
      const spec = specFor(preset);
      expect(spec.pipeLength).toBeGreaterThan(0);
      expect([PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]).toContain(spec.termination);
    }
    // Four presets, no more: a fifth would need a rung on the radio group.
    expect(Object.keys(INSTRUMENT_SPECS)).toHaveLength(4);
  });

  it("keeps every preset inside the pipe-length range the shared pipe accepts", () => {
    // A preset outside it trips the pipeLengthProperty range assertion the moment it
    // is selected, and with assertions off silently leaves the slider out of range.
    for (const preset of InstrumentPresetValues) {
      expect(PIPE_LENGTH_RANGE_M.contains(specFor(preset).pipeLength)).toBe(true);
    }
  });

  it("gives the flute and the clarinet the same bore length", () => {
    // This is the whole basis of the comparison; if it drifts, the screen's claim
    // ("same length, an octave apart") becomes false.
    expect(specFor(InstrumentPreset.FLUTE).pipeLength).toBeCloseTo(specFor(InstrumentPreset.CLARINET).pipeLength, 12);
  });

  it("gives the two organ pipes the same bore length", () => {
    expect(specFor(InstrumentPreset.OPEN_ORGAN_PIPE).pipeLength).toBeCloseTo(
      specFor(InstrumentPreset.STOPPED_ORGAN_PIPE).pipeLength,
      12,
    );
  });

  it("opens both ends of the flute and stops one end of the clarinet", () => {
    expect(specFor(InstrumentPreset.FLUTE).termination).toBe(PipeTermination.OPEN_OPEN);
    expect(specFor(InstrumentPreset.CLARINET).termination).toBe(PipeTermination.CLOSED_OPEN);
  });
});

describe("an octave apart at the same length", () => {
  it("puts the clarinet an octave below the flute", () => {
    const flute = specFor(InstrumentPreset.FLUTE);
    const clarinet = specFor(InstrumentPreset.CLARINET);
    const fluteF1 = fundamentalFrequency(flute.termination, flute.pipeLength);
    const clarinetF1 = fundamentalFrequency(clarinet.termination, clarinet.pipeLength);
    expect(fluteF1 / clarinetF1).toBeCloseTo(2, 9);
  });

  it("puts the stopped organ pipe an octave below the open one", () => {
    const open = specFor(InstrumentPreset.OPEN_ORGAN_PIPE);
    const stopped = specFor(InstrumentPreset.STOPPED_ORGAN_PIPE);
    expect(
      fundamentalFrequency(open.termination, open.pipeLength) /
        fundamentalFrequency(stopped.termination, stopped.pipeLength),
    ).toBeCloseTo(2, 9);
  });

  it("reproduces the flute's 0.6 m fundamental as c/2L", () => {
    const flute = specFor(InstrumentPreset.FLUTE);
    expect(fundamentalFrequency(flute.termination, flute.pipeLength)).toBeCloseTo(SOUND_SPEED_MPS / (2 * 0.6), 6);
  });
});

describe("which harmonics each instrument sounds", () => {
  it("gives the flute and the open organ pipe the complete series", () => {
    for (const preset of [InstrumentPreset.FLUTE, InstrumentPreset.OPEN_ORGAN_PIPE]) {
      const spec = specFor(preset);
      expect(isSymmetric(spec.termination)).toBe(true);
      expect(allowedHarmonics(spec.termination, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("gives the clarinet and the stopped organ pipe the odd harmonics only", () => {
    for (const preset of [InstrumentPreset.CLARINET, InstrumentPreset.STOPPED_ORGAN_PIPE]) {
      const spec = specFor(preset);
      expect(isSymmetric(spec.termination)).toBe(false);
      expect(allowedHarmonics(spec.termination, 6)).toEqual([1, 3, 5]);
    }
  });
});

describe("the screen model", () => {
  it("opens on the flute, sounding its fundamental", () => {
    const model = new InstrumentsModel();
    expect(model.presetProperty.value).toBe(InstrumentPreset.FLUTE);
    expect(model.pipe.pipeLengthProperty.value).toBeCloseTo(0.6, 9);
    expect(model.pipe.terminationProperty.value).toBe(PipeTermination.OPEN_OPEN);
    expect(model.pipe.driveFrequencyProperty.value).toBeCloseTo(model.pipe.fundamentalFrequencyProperty.value, 6);
    expect(model.pipe.isAtResonanceProperty.value).toBe(true);
    model.dispose();
  });

  it("arrives already sounding, without a build-up", () => {
    // The screen is about an instrument's steady tone, so a freshly selected preset
    // must already be ringing rather than filling up over several seconds.
    const model = new InstrumentsModel();
    let peak = 0;
    const period = 1 / model.pipe.driveFrequencyProperty.value;
    for (let i = 0; i < 200; i++) {
      model.pipe.step(period / 200);
      peak = Math.max(peak, Math.abs(model.pipe.modalAmplitude(1)));
    }
    expect(peak).toBeCloseTo(model.pipe.resonantAmplitude(1), 4);
    model.dispose();
  });

  it("re-tunes the pipe for every preset", () => {
    const model = new InstrumentsModel();
    for (const preset of InstrumentPresetValues) {
      model.presetProperty.value = preset;
      const spec = specFor(preset);
      expect(model.pipe.pipeLengthProperty.value).toBeCloseTo(spec.pipeLength, 9);
      expect(model.pipe.terminationProperty.value).toBe(spec.termination);
      // Always driven at the fundamental of whatever geometry it now has.
      expect(model.pipe.driveFrequencyProperty.value).toBeCloseTo(
        fundamentalFrequency(spec.termination, spec.pipeLength),
        6,
      );
      expect(model.pipe.isAtResonanceProperty.value).toBe(true);
    }
    model.dispose();
  });

  it("restores the preset's geometry on reset, not the pipe's own defaults", () => {
    // `pipe.reset()` returns the pipe to open–open at 1 m, which is no instrument.
    const model = new InstrumentsModel();
    model.presetProperty.value = InstrumentPreset.CLARINET;
    model.reset();

    expect(model.presetProperty.value).toBe(InstrumentPreset.FLUTE);
    expect(model.pipe.pipeLengthProperty.value).toBeCloseTo(0.6, 9);
    expect(model.pipe.terminationProperty.value).toBe(PipeTermination.OPEN_OPEN);
    expect(model.pipe.isAtResonanceProperty.value).toBe(true);
    model.dispose();
  });

  it("never rings an even harmonic on the clarinet", () => {
    const model = new InstrumentsModel();
    model.presetProperty.value = InstrumentPreset.CLARINET;
    for (let i = 0; i < 500; i++) {
      model.pipe.step(1e-4);
    }
    expect(model.pipe.modalAmplitude(2)).toBe(0);
    expect(model.pipe.modalAmplitude(4)).toBe(0);
    expect(Math.abs(model.pipe.modalAmplitude(1))).toBeGreaterThan(0);
    model.dispose();
  });
});
