/**
 * PipeModalModel.test.ts
 *
 * The driven modal bank. Three things are worth holding:
 *
 *   1. the steady-state response is the textbook Lorentzian, so the frequency
 *      slider really does have to be near a mode for anything to happen;
 *   2. the build-up takes τ = Q/(πfₕ), so the "fills up over a few seconds"
 *      behaviour is physics rather than an eased animation;
 *   3. a stopped pipe never rings in an even harmonic, however it is driven.
 *
 * The integrator is checked against the closed-form solution rather than against
 * a recorded trace, so a change of integrator is allowed to change the numbers
 * only within its own accuracy.
 */

import { describe, expect, it } from "vitest";
import { BULK_MODULUS } from "../src/common/model/acoustics.js";
import { displacementShape } from "../src/common/model/modeShapes.js";
import { PipeModalModel } from "../src/common/model/PipeModalModel.js";
import { PipeTermination } from "../src/common/model/PipeTermination.js";
import {
  FUNDAMENTAL_QUALITY_FACTOR,
  STANDING_MODE_HYSTERESIS,
  STANDING_MODE_MIN_FRACTION,
} from "../src/StandingWavesConstants.js";

/** Runs the model for `duration` model seconds in fixed steps. */
function run(model: PipeModalModel, duration: number, stepCount = 2000): void {
  const dt = duration / stepCount;
  for (let i = 0; i < stepCount; i++) {
    model.step(dt);
  }
}

/** Peak |aₕ| observed over one drive period, after settling. */
function peakAmplitude(model: PipeModalModel, harmonic: number, samples = 200): number {
  const period = 1 / model.driveFrequencyProperty.value;
  let peak = 0;
  for (let i = 0; i < samples; i++) {
    model.step(period / samples);
    peak = Math.max(peak, Math.abs(model.modalAmplitude(harmonic)));
  }
  return peak;
}

/**
 * Settles the pipe and then advances to the instant harmonic h is at its
 * extremum.
 *
 * `settleToSteadyState` leaves the drive phase at Θ = 0, where aₕ = A·cos(−δ).
 * On resonance δ = π/2, so the mode is at its *zero crossing* there and an
 * instantaneous snapshot of the pipe is dominated by the small, nearly in-phase
 * off-resonant modes instead. Stepping forward by δ/ω puts Θ = δ, i.e. the
 * resonant mode at full amplitude — which is the state a shape assertion means.
 */
function settleAtPeak(model: PipeModalModel, harmonic: number): void {
  model.settleToSteadyState();
  const driveFrequency = model.driveFrequencyProperty.value;
  const lag = model.steadyStatePhaseLag(harmonic, driveFrequency);
  const omega = 2 * Math.PI * driveFrequency;
  const quarterSteps = 400;
  const dt = lag / omega / quarterSteps;
  for (let i = 0; i < quarterSteps; i++) {
    model.step(dt);
  }
}

describe("construction and defaults", () => {
  it("opens on an open–open pipe driven at its own fundamental", () => {
    const model = new PipeModalModel();
    expect(model.terminationProperty.value).toBe(PipeTermination.OPEN_OPEN);
    expect(model.driveFrequencyProperty.value).toBeCloseTo(model.fundamentalFrequencyProperty.value, 9);
    // The 1 m default: f₁ = c/2L = 343/2.
    expect(model.fundamentalFrequencyProperty.value).toBeCloseTo(171.5, 6);
    model.dispose();
  });

  it("starts silent", () => {
    const model = new PipeModalModel();
    for (let h = 1; h <= 6; h++) {
      expect(model.modalAmplitude(h)).toBe(0);
    }
    expect(model.displacementAt(0.25)).toBe(0);
    expect(model.pressureAt(0.25)).toBe(0);
    model.dispose();
  });

  it("reports the allowed ladder per termination", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    expect(model.getAllowedHarmonics().slice(0, 4)).toEqual([1, 3, 5, 7]);
    model.terminationProperty.value = PipeTermination.CLOSED_CLOSED;
    expect(model.getAllowedHarmonics().slice(0, 4)).toEqual([1, 2, 3, 4]);
    model.dispose();
  });
});

describe("steady-state response is a Lorentzian", () => {
  it("peaks exactly at resonance", () => {
    const model = new PipeModalModel();
    const resonant = model.getModeFrequency(1);
    const onPeak = model.steadyStateAmplitude(1, resonant);
    expect(model.steadyStateAmplitude(1, resonant * 0.9)).toBeLessThan(onPeak);
    expect(model.steadyStateAmplitude(1, resonant * 1.1)).toBeLessThan(onPeak);
    model.dispose();
  });

  it("reaches F·Qₕ/ωₕ² at resonance", () => {
    const model = new PipeModalModel();
    for (const h of [1, 2, 3, 5]) {
      const resonant = model.getModeFrequency(h);
      expect(model.steadyStateAmplitude(h, resonant)).toBeCloseTo(model.resonantAmplitude(h), 12);
    }
    model.dispose();
  });

  it("falls to 1/√2 of the peak at the half-power points fₕ ± f₁/2Q₁ — one width in Hz for every mode", () => {
    const model = new PipeModalModel();
    const halfWidth = model.getModeFrequency(1) / (2 * FUNDAMENTAL_QUALITY_FACTOR);
    for (const h of [1, 3, 6]) {
      const resonant = model.getModeFrequency(h);
      const peak = model.steadyStateAmplitude(h, resonant);
      for (const sign of [-1, 1]) {
        // One decimal place: fₕ(1 ± 1/2Qₕ) is itself the high-Q approximation to the
        // half-power point, good to O(1/Qₕ) — 8% at Q = 12.
        expect(model.steadyStateAmplitude(h, resonant + sign * halfWidth) / peak).toBeCloseTo(Math.SQRT1_2, 1);
      }
    }
    model.dispose();
  });

  it("gives harmonic h a quality factor of h·Q₁", () => {
    const model = new PipeModalModel();
    for (const h of [1, 2, 3, 7]) {
      expect(model.modeQualityFactor(h)).toBe(h * FUNDAMENTAL_QUALITY_FACTOR);
    }
    model.dispose();
  });

  it("rolls the resonant amplitude off as 1/h — the spectrum the pipe itself imposes", () => {
    const model = new PipeModalModel();
    const first = model.resonantAmplitude(1);
    for (const h of [2, 3, 4, 6]) {
      expect(model.resonantAmplitude(h)).toBeCloseTo(first / h, 12);
    }
    model.dispose();
  });

  it("reports zero response for a harmonic the pipe does not have", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    expect(model.steadyStateAmplitude(2, model.getModeFrequency(2))).toBe(0);
    expect(model.steadyStateAmplitude(4, 500)).toBe(0);
    model.dispose();
  });

  it("lags the drive by 0, π/2 and π below, at and above resonance", () => {
    const model = new PipeModalModel();
    const resonant = model.getModeFrequency(1);
    expect(model.steadyStatePhaseLag(1, resonant * 0.5)).toBeLessThan(0.1);
    expect(model.steadyStatePhaseLag(1, resonant)).toBeCloseTo(Math.PI / 2, 6);
    expect(model.steadyStatePhaseLag(1, resonant * 2)).toBeGreaterThan(Math.PI - 0.1);
    model.dispose();
  });
});

describe("the integrator agrees with the closed form", () => {
  it("settles to the analytic steady-state amplitude when driven on resonance", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(1);
    // Several time constants of build-up, then measure over one period.
    run(model, 8 * model.buildUpTimeConstant(1), 20000);
    const observed = peakAmplitude(model, 1);
    expect(observed).toBeCloseTo(model.resonantAmplitude(1), 5);
    model.dispose();
  });

  it("settles to the analytic steady-state amplitude when driven off resonance", () => {
    const model = new PipeModalModel();
    const detuned = model.getModeFrequency(1) * 1.05;
    model.driveFrequencyProperty.value = detuned;
    run(model, 10 * model.buildUpTimeConstant(1), 30000);
    const observed = peakAmplitude(model, 1);
    expect(observed / model.steadyStateAmplitude(1, detuned)).toBeCloseTo(1, 1);
    model.dispose();
  });

  it("leaves settleToSteadyState already settled — no residual transient", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(1);
    model.settleToSteadyState();
    const beforePeak = peakAmplitude(model, 1);
    run(model, 3 * model.buildUpTimeConstant(1), 10000);
    const afterPeak = peakAmplitude(model, 1);
    // A residual transient would decay over these three time constants and move
    // the peak; a true steady state does not.
    expect(afterPeak).toBeCloseTo(beforePeak, 5);
    model.dispose();
  });
});

describe("build-up and ring-down timing", () => {
  it("computes τ = Qₕ/(πfₕ) = Q₁/(πf₁) for every harmonic", () => {
    const model = new PipeModalModel();
    // Default pipe: f₁ = 171.5 Hz, so τ = 12/(π·171.5) ≈ 22.3 ms of model time.
    for (const h of [1, 2, 4]) {
      expect(model.buildUpTimeConstant(h)).toBeCloseTo(FUNDAMENTAL_QUALITY_FACTOR / (Math.PI * 171.5), 12);
    }
    model.dispose();
  });

  it("reaches about 1 − 1/e of the steady state after one time constant", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(1);
    const tau = model.buildUpTimeConstant(1);
    run(model, tau, 20000);
    const fraction = peakAmplitude(model, 1) / model.resonantAmplitude(1);
    expect(fraction).toBeGreaterThan(0.55);
    expect(fraction).toBeLessThan(0.72);
    model.dispose();
  });

  it("rings down by about 1/e per time constant once the drive stops", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(1);
    model.settleToSteadyState();
    const initial = peakAmplitude(model, 1);
    model.isDrivingProperty.value = false;
    const tau = model.buildUpTimeConstant(1);
    run(model, tau, 20000);
    const remaining = peakAmplitude(model, 1) / initial;
    expect(remaining).toBeGreaterThan(0.3);
    expect(remaining).toBeLessThan(0.42);
    model.dispose();
  });

  it("builds a high harmonic up as fast as the fundamental, from one shared damping rate", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(4);
    run(model, model.buildUpTimeConstant(1), 20000);
    const fraction = peakAmplitude(model, 4) / model.resonantAmplitude(4);
    expect(fraction).toBeGreaterThan(0.55);
    expect(fraction).toBeLessThan(0.72);
    model.dispose();
  });
});

describe("retuning", () => {
  it("clears an old mode when a frequency sweep selects a new harmonic", () => {
    const model = new PipeModalModel();
    model.jumpToHarmonic(1);
    const period = 1 / model.driveFrequencyProperty.value;
    model.step(period / 4);
    expect(Math.abs(model.modalAmplitude(1))).toBeGreaterThan(0.5 * model.resonantAmplitude(1));

    model.driveFrequencyProperty.value = model.getModeFrequency(6);
    expect(model.nearestHarmonicProperty.value).toBe(6);
    expect(model.modalAmplitude(1)).toBe(0);
    expect(model.modalAmplitude(6)).toBe(0);

    model.step(1 / model.driveFrequencyProperty.value);
    expect(Math.abs(model.modalAmplitude(6))).toBeGreaterThan(0);
    model.dispose();
  });

  it("preserves a mode while fine tuning within that harmonic", () => {
    const model = new PipeModalModel();
    model.jumpToHarmonic(1);
    model.step(1 / (4 * model.driveFrequencyProperty.value));
    const before = model.modalAmplitude(1);
    model.driveFrequencyProperty.value += 3;
    expect(model.nearestHarmonicProperty.value).toBe(1);
    expect(model.modalAmplitude(1)).toBe(before);
    model.dispose();
  });
});

describe("a stopped pipe never rings in an even harmonic", () => {
  it("stays silent in mode 2 even when driven exactly at 2f₁", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    model.driveFrequencyProperty.value = 2 * model.fundamentalFrequencyProperty.value;
    run(model, 20 * model.buildUpTimeConstant(1), 20000);
    expect(model.modalAmplitude(2)).toBe(0);
    expect(model.modalAmplitude(4)).toBe(0);
    // …while the odd modes it does have are excited.
    expect(Math.abs(model.modalAmplitude(1))).toBeGreaterThan(0);
    expect(Math.abs(model.modalAmplitude(3))).toBeGreaterThan(0);
    model.dispose();
  });

  it("silences a mode that a change of termination removes", () => {
    const model = new PipeModalModel({ termination: PipeTermination.OPEN_OPEN });
    model.tuneToHarmonic(2);
    model.settleToSteadyState();
    expect(Math.abs(model.modalAmplitude(2))).toBeGreaterThan(0);

    model.terminationProperty.value = PipeTermination.CLOSED_OPEN;
    expect(model.modalAmplitude(2)).toBe(0);
    model.dispose();
  });
});

describe("the pipe's shape", () => {
  it("takes the shape of the mode it is driven at", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(3);
    settleAtPeak(model, 3);

    const L = model.pipeLengthProperty.value;
    // Normalise by the mode's own amplitude: with only mode 3 resonant,
    // ξ(x) = a₃·φ₃(x) up to the ~1/3Q leakage from the detuned modes.
    const amplitude = model.modalAmplitude(3);
    for (const fraction of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
      const x = fraction * L;
      const expected = displacementShape(3, PipeTermination.OPEN_OPEN, L, x);
      expect(model.displacementAt(x) / amplitude).toBeCloseTo(expected, 1);
    }
    model.dispose();
  });

  it("pins displacement at a closed end and pressure at an open one", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    model.tuneToHarmonic(3);
    settleAtPeak(model, 3);
    const L = model.pipeLengthProperty.value;

    // These hold identically, at every instant, for every mode: they are the
    // boundary conditions, not a consequence of the phase we sampled at.
    expect(model.displacementAt(0)).toBeCloseTo(0, 12);
    expect(model.pressureAt(L)).toBeCloseTo(0, 6);
    // And the converse: each end peaks in the other quantity.
    expect(Math.abs(model.pressureAt(0))).toBeGreaterThan(0);
    expect(Math.abs(model.displacementAt(L))).toBeGreaterThan(0);
    model.dispose();
  });

  it("scales pressure by ρc²kₕ relative to displacement", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(1);
    settleAtPeak(model, 1);
    const L = model.pipeLengthProperty.value;
    // Mode 1 of an open–open pipe: displacement antinode at the open end,
    // pressure antinode at the centre. Both carry the same a₁(t), so the ratio
    // is the ρc²k₁ from p = −ρc²·∂ξ/∂x and nothing else.
    const displacementPeak = Math.abs(model.displacementAt(0));
    const pressurePeak = Math.abs(model.pressureAt(L / 2));
    const k = Math.PI / L;
    // Within 5%: the detuned modes leak into the displacement at x = 0, where
    // every open–open mode has an antinode.
    expect(pressurePeak / displacementPeak / (BULK_MODULUS * k)).toBeCloseTo(1, 1);
    model.dispose();
  });
});

describe("the nodes stay put through the cycle", () => {
  // The drawn field is every mode summed. The resonant mode lags the drive by π/2
  // while the off-resonant ones move with it, so their share makes the nodes swim
  // back and forth each cycle. With one Q for every mode, that share reached half
  // the resonant amplitude at h = 3 and the middle node of an open pipe wandered
  // over 0.475 L – 0.525 L even while the mode was at 70% of its peak. Qₕ = h·Q₁
  // keeps it within ±0.015 L of the textbook positions.
  it("holds the third harmonic's displacement nodes at L/6, L/2 and 5L/6", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(3);
    model.settleToSteadyState();
    const length = model.pipeLengthProperty.value;
    const peak = model.resonantAmplitude(3);
    const period = 1 / model.driveFrequencyProperty.value;
    let checked = 0;
    for (let i = 0; i < 64; i++) {
      model.step(period / 64);
      // Only while the mode is well away from its own zero crossing, where the
      // off-resonant remainder is all there is to draw.
      if (Math.abs(model.modalAmplitude(3)) >= 0.7 * peak) {
        for (const node of [1 / 6, 1 / 2, 5 / 6]) {
          const tolerance = 0.015;
          const left = model.displacementAt((node - tolerance) * length);
          const right = model.displacementAt((node + tolerance) * length);
          expect(left * right).toBeLessThan(0);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
    model.dispose();
  });
});

describe("resonance reporting", () => {
  it("flags resonance when tuned to a harmonic and not when detuned", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(2);
    expect(model.nearestHarmonicProperty.value).toBe(2);
    expect(model.isAtResonanceProperty.value).toBe(true);

    model.driveFrequencyProperty.value = model.getModeFrequency(2) * 1.2;
    expect(model.isAtResonanceProperty.value).toBe(false);
    model.dispose();
  });

  it("names the nearest allowed harmonic, skipping a stopped pipe's gaps", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    // Exactly on the missing even harmonic: nearest is 1 or 3, never 2.
    model.driveFrequencyProperty.value = 2 * model.fundamentalFrequencyProperty.value;
    expect([1, 3]).toContain(model.nearestHarmonicProperty.value);
    model.dispose();
  });

  it("refuses to tune to a harmonic the pipe does not have", () => {
    const model = new PipeModalModel({ termination: PipeTermination.CLOSED_OPEN });
    const before = model.driveFrequencyProperty.value;
    model.tuneToHarmonic(2);
    expect(model.driveFrequencyProperty.value).toBe(before);
    model.dispose();
  });
});

describe("the drive's range follows the pipe", () => {
  it("spans 0.5 f₁ to 8.5 f₁ of the current pipe", () => {
    const model = new PipeModalModel();
    // Open–open, 1 m: f₁ = c/2L = 171.5 Hz.
    expect(model.driveFrequencyRangeProperty.value.min).toBeCloseTo(85.75, 6);
    expect(model.driveFrequencyRangeProperty.value.max).toBeCloseTo(1457.75, 6);

    // Closed–open, 1 m: f₁ = c/4L = 85.75 Hz, an octave lower, and so is the range.
    model.terminationProperty.value = PipeTermination.CLOSED_OPEN;
    expect(model.driveFrequencyRangeProperty.value.min).toBeCloseTo(42.875, 6);
    expect(model.driveFrequencyRangeProperty.value.max).toBeCloseTo(728.875, 6);
    model.dispose();
  });

  it("puts harmonic h at the same fraction of the range for every pipe", () => {
    const model = new PipeModalModel();
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      for (const length of [0.5, 1, 2]) {
        model.terminationProperty.value = termination;
        model.pipeLengthProperty.value = length;
        const range = model.driveFrequencyRangeProperty.value;
        expect((model.getModeFrequency(1) - range.min) / range.getLength()).toBeCloseTo(0.5 / 8, 9);
        expect((model.getModeFrequency(5) - range.min) / range.getLength()).toBeCloseTo(4.5 / 8, 9);
      }
    }
    model.dispose();
  });

  it("leaves the drive alone when the ladder moves past it", () => {
    const model = new PipeModalModel();
    model.pipeLengthProperty.value = 1.2;
    expect(model.driveFrequencyProperty.value).toBeCloseTo(171.5, 9);
    model.dispose();
  });

  it("clamps the drive when the range moves off it", () => {
    const model = new PipeModalModel();
    model.tuneToHarmonic(8); // 1372 Hz
    // Open–open, 2 m: f₁ = 85.75 Hz, so the top of the range falls to 728.875 Hz.
    model.pipeLengthProperty.value = 2;
    expect(model.driveFrequencyProperty.value).toBeCloseTo(728.875, 6);
    model.dispose();
  });

  it("reaches every rung of the ladder", () => {
    const model = new PipeModalModel();
    for (let harmonic = 1; harmonic <= 8; harmonic++) {
      model.tuneToHarmonic(harmonic);
      expect(model.driveFrequencyProperty.value).toBeCloseTo(harmonic * 171.5, 6);
    }
    model.dispose();
  });
});

describe("reset", () => {
  it("returns to a silent pipe at its fundamental", () => {
    const model = new PipeModalModel();
    model.terminationProperty.value = PipeTermination.CLOSED_OPEN;
    model.pipeLengthProperty.value = 0.8;
    model.tuneToHarmonic(3);
    model.settleToSteadyState();

    model.reset();

    expect(model.terminationProperty.value).toBe(PipeTermination.OPEN_OPEN);
    expect(model.pipeLengthProperty.value).toBeCloseTo(1, 9);
    expect(model.driveFrequencyProperty.value).toBeCloseTo(171.5, 6);
    expect(model.modalAmplitude(1)).toBe(0);
    expect(model.displacementAt(0.25)).toBe(0);
    model.dispose();
  });
});

describe("automatic frequency sweep", () => {
  /** One 60 Hz frame of model time on the Standing Waves screen at Normal speed. */
  const FRAME_DT = 1 / 60 / 200;

  /** Runs a sweep to completion; returns each mode's peak |aₕ| over its resonant amplitude. */
  function sweepPeaks(model: PipeModalModel): number[] {
    model.isSweepingProperty.value = true;
    const peaks = new Array<number>(9).fill(0);
    let previous = model.driveFrequencyProperty.value;
    for (let frame = 0; model.isSweepingProperty.value; frame++) {
      expect(frame).toBeLessThan(1e5);
      model.step(FRAME_DT);
      const frequency = model.driveFrequencyProperty.value;
      expect(frequency).toBeGreaterThanOrEqual(previous);
      previous = frequency;
      for (let h = 1; h <= 8; h++) {
        const ratio = Math.abs(model.modalAmplitude(h)) / model.resonantAmplitude(h);
        peaks[h] = Math.max(peaks[h] ?? 0, ratio);
      }
    }
    return peaks;
  }

  it("starts at the bottom of the range with the driver on, and stops at the top", () => {
    const model = new PipeModalModel();
    model.isDrivingProperty.value = false;
    model.tuneToHarmonic(4);
    const range = model.driveFrequencyRangeProperty.value;
    model.isSweepingProperty.value = true;
    expect(model.isDrivingProperty.value).toBe(true);
    expect(model.driveFrequencyProperty.value).toBe(range.min);
    sweepPeaks(model);
    expect(model.isSweepingProperty.value).toBe(false);
    expect(model.driveFrequencyProperty.value).toBe(range.max);
    model.dispose();
  });

  it("raises every mode to the same clear peak, since its pace is set in units of τ", () => {
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      const model = new PipeModalModel({ termination });
      const peaks = sweepPeaks(model);
      const allowed = model.getAllowedHarmonics().filter((h) => h <= 8);
      const fundamentalPeak = peaks[1] ?? 0;
      // A chirped oscillator crossing its width in 0.3 τ reaches roughly 0.6 of
      // its steady state (√(π·0.3) ≈ 0.97 is the fast-sweep upper estimate).
      expect(fundamentalPeak).toBeGreaterThan(0.3);
      expect(fundamentalPeak).toBeLessThan(0.8);
      for (const h of allowed) {
        expect(peaks[h]).toBeCloseTo(fundamentalPeak, 1);
      }
      for (let h = 1; h <= 8; h++) {
        if (!allowed.includes(h)) {
          expect(peaks[h]).toBe(0);
        }
      }
      model.dispose();
    }
  });

  it("sweeps at a rate proportional to f₁², so a half-length pipe sweeps 4× faster", () => {
    const model = new PipeModalModel();
    const longRate = model.getSweepRate();
    model.pipeLengthProperty.value /= 2;
    expect(model.getSweepRate()).toBeCloseTo(4 * longRate, 6);
    model.dispose();
  });

  it("advances only in model time", () => {
    const model = new PipeModalModel();
    model.isSweepingProperty.value = true;
    const start = model.driveFrequencyProperty.value;
    model.step(0);
    expect(model.driveFrequencyProperty.value).toBe(start);
    model.step(FRAME_DT);
    expect(model.driveFrequencyProperty.value).toBeCloseTo(start + model.getSweepRate() * FRAME_DT, 9);
    model.dispose();
  });

  it("keeps the passed mode ringing across the midpoint between harmonics", () => {
    const model = new PipeModalModel();
    model.isSweepingProperty.value = true;
    while (model.nearestHarmonicProperty.value < 2) {
      model.step(FRAME_DT);
    }
    // Outside a sweep, crossing into harmonic 2 would zero mode 1 here.
    expect(model.modalAmplitude(1)).not.toBe(0);
    model.dispose();
  });

  it("ends when the driver is switched off, the drive is retuned, or on reset", () => {
    const model = new PipeModalModel();
    model.isSweepingProperty.value = true;
    model.isDrivingProperty.value = false;
    expect(model.isSweepingProperty.value).toBe(false);

    model.isSweepingProperty.value = true;
    model.jumpToHarmonic(3);
    expect(model.isSweepingProperty.value).toBe(false);
    expect(model.nearestHarmonicProperty.value).toBe(3);

    model.isSweepingProperty.value = true;
    model.reset();
    expect(model.isSweepingProperty.value).toBe(false);
    model.dispose();
  });
});

describe("standing mode — when there are nodes to mark", () => {
  /** One 60 Hz frame of model time on the Standing Waves screen at Normal speed. */
  const FRAME_DT = 1 / 60 / 200;

  /** Steps until `done` or `limit` model seconds; returns the model time taken. */
  function runUntil(model: PipeModalModel, done: () => boolean, limit: number): number {
    let t = 0;
    while (!done() && t < limit) {
      model.step(FRAME_DT);
      t += FRAME_DT;
    }
    return t;
  }

  it("holds every allowed rung through whole cycles once settled", () => {
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      const model = new PipeModalModel({ termination });
      for (const h of model.getAllowedHarmonics().filter((n) => n <= 8)) {
        model.jumpToHarmonic(h);
        expect(model.standingModeProperty.value).toBe(h);
        // Several of the fundamental's periods, so every phase of every mode is seen.
        const periods = 3 / model.fundamentalFrequencyProperty.value;
        for (let t = 0; t < periods; t += FRAME_DT) {
          model.step(FRAME_DT);
          expect(model.standingModeProperty.value).toBe(h);
        }
      }
      model.dispose();
    }
  });

  it("marks nothing at rest, or when driven midway between two rungs", () => {
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      const model = new PipeModalModel({ termination });
      expect(model.standingModeProperty.value).toBe(0);
      const f1 = model.fundamentalFrequencyProperty.value;
      const allowed = model.getAllowedHarmonics().filter((h) => h <= 8);
      for (let i = 0; i + 1 < allowed.length; i++) {
        model.driveFrequencyProperty.value = (((allowed[i] ?? 0) + (allowed[i + 1] ?? 0)) / 2) * f1;
        model.settleToSteadyState();
        run(model, 2 / f1, 200);
        expect(model.standingModeProperty.value).toBe(0);
      }
      model.dispose();
    }
  });

  it("appears once a resonance has built to the threshold, not when the drive arrives", () => {
    const model = new PipeModalModel();
    const tau = model.buildUpTimeConstant(1);
    // From rest the envelope grows as 1 − e^(−t/τ).
    const expected = -tau * Math.log(1 - STANDING_MODE_MIN_FRACTION);
    model.step(FRAME_DT);
    expect(model.standingModeProperty.value).toBe(0);
    const t = runUntil(model, () => model.standingModeProperty.value === 1, 5 * tau);
    expect(t).toBeGreaterThan(0.8 * expected);
    expect(t).toBeLessThan(1.3 * expected);
    model.dispose();
  });

  it("stays through the ring-down after the driver stops, until it has died away", () => {
    const model = new PipeModalModel();
    model.jumpToHarmonic(1);
    const tau = model.buildUpTimeConstant(1);
    model.isDrivingProperty.value = false;
    // A free mode decays as e^(−t/τ) from full resonant amplitude to the exit threshold.
    const expected = -tau * Math.log(STANDING_MODE_HYSTERESIS * STANDING_MODE_MIN_FRACTION);
    const t = runUntil(model, () => model.standingModeProperty.value !== 1, 10 * tau);
    expect(model.standingModeProperty.value).toBe(0);
    expect(t).toBeGreaterThan(0.95 * expected);
    expect(t).toBeLessThan(1.05 * expected);
    model.dispose();
  });

  it("lights each mode once, in ladder order, as a sweep passes it", () => {
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      const model = new PipeModalModel({ termination });
      model.isSweepingProperty.value = true;
      const seen: number[] = [];
      let previous = 0;
      runUntil(
        model,
        () => {
          const mode = model.standingModeProperty.value;
          if (mode !== previous && mode !== 0) {
            seen.push(mode);
          }
          previous = mode;
          return !model.isSweepingProperty.value;
        },
        1e3,
      );
      expect(seen).toEqual(model.getAllowedHarmonics().filter((h) => h <= 8));
      model.dispose();
    }
  });
});
