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
import { MODE_QUALITY_FACTOR } from "../src/StandingWavesConstants.js";

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

  it("reaches F·Q/ω² at resonance", () => {
    const model = new PipeModalModel();
    for (const h of [1, 2, 3, 5]) {
      const resonant = model.getModeFrequency(h);
      expect(model.steadyStateAmplitude(h, resonant)).toBeCloseTo(model.resonantAmplitude(h), 12);
    }
    model.dispose();
  });

  it("falls to 1/√2 of the peak at the half-power points fₕ(1 ± 1/2Q)", () => {
    const model = new PipeModalModel();
    const resonant = model.getModeFrequency(1);
    const peak = model.steadyStateAmplitude(1, resonant);
    for (const sign of [-1, 1]) {
      const edge = resonant * (1 + (sign * 1) / (2 * MODE_QUALITY_FACTOR));
      // One decimal place: fₕ(1 ± 1/2Q) is itself the high-Q approximation to the
      // half-power point, good to O(1/Q) — 5% at Q = 20.
      expect(model.steadyStateAmplitude(1, edge) / peak).toBeCloseTo(Math.SQRT1_2, 1);
    }
    model.dispose();
  });

  it("rolls the resonant amplitude off as 1/h² — the spectrum the pipe itself imposes", () => {
    const model = new PipeModalModel();
    const first = model.resonantAmplitude(1);
    for (const h of [2, 3, 4, 6]) {
      expect(model.resonantAmplitude(h)).toBeCloseTo(first / (h * h), 12);
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
  it("computes τ = Q/(πfₕ)", () => {
    const model = new PipeModalModel();
    for (const h of [1, 2, 4]) {
      expect(model.buildUpTimeConstant(h)).toBeCloseTo(MODE_QUALITY_FACTOR / (Math.PI * model.getModeFrequency(h)), 12);
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

  it("makes higher harmonics build faster, since τ ∝ 1/fₕ", () => {
    const model = new PipeModalModel();
    expect(model.buildUpTimeConstant(4)).toBeLessThan(model.buildUpTimeConstant(1));
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
