/**
 * The density the Phase screen shades, and the neighbour pair that explains it.
 *
 * Anchored to the plane wave ξ = A·cos(ωt ∓ kx) worked by hand — δρ/ρ = −∂ξ/∂x,
 * peak kA — not to the model's own output, so a wrong sign or a stray factor fails.
 */
import { describe, expect, it } from "vitest";
import { WaveDirection } from "../src/common/model/acoustics.js";
import { PhaseModel } from "../src/phase-relationships/model/PhaseModel.js";

/** Advances the wave to an arbitrary, unremarkable phase so nothing sits at a zero. */
function modelAtPhase(direction: WaveDirection, wavelength: number): PhaseModel {
  const model = new PhaseModel();
  model.directionProperty.value = direction;
  model.wavelengthProperty.value = wavelength;
  model.phaseProperty.value = 0.7;
  return model;
}

describe("PhaseModel density", () => {
  it.each([WaveDirection.FORWARD, WaveDirection.BACKWARD])("δρ/ρ = −∂ξ/∂x (%s)", (direction) => {
    const model = modelAtPhase(direction, 0.4);
    const h = 1e-6;
    for (const x of [0.05, 0.13, 0.27, 0.41]) {
      const gradient = (model.displacementAt(x + h) - model.displacementAt(x - h)) / (2 * h);
      expect(model.densityChangeAt(x)).toBeCloseTo(-gradient, 8);
    }
    model.dispose();
  });

  it("peaks at kA", () => {
    const model = modelAtPhase(WaveDirection.FORWARD, 0.4);
    expect(model.densityChangeAmplitude).toBeCloseTo(((2 * Math.PI) / 0.4) * 1e-3, 10);
    model.dispose();
  });

  it("is densest where a forward wave moves the air forward", () => {
    // In a forward wave the air at a compression is moving in the direction of travel.
    const model = modelAtPhase(WaveDirection.FORWARD, 0.5);
    for (const x of [0.06, 0.19, 0.33]) {
      expect(Math.sign(model.densityChangeAt(x))).toBe(Math.sign(model.velocityAt(x)));
    }
    model.dispose();
  });
});

describe("PhaseModel neighbour pair", () => {
  it("is out of step by kΔx: 30° at the default wavelength", () => {
    const model = new PhaseModel();
    expect(model.pairPhaseLagProperty.value).toBeCloseTo(30, 10);
    model.wavelengthProperty.value = model.pipeLength / 2;
    expect(model.pairPhaseLagProperty.value).toBeCloseTo(60, 10);
    model.dispose();
  });

  it("squeezes the gap by the finite-difference of ξ, which tends to δρ/ρ", () => {
    const model = modelAtPhase(WaveDirection.FORWARD, 0.5);
    const centre = model.pairPositionProperty.value;
    // ξ(c+Δ/2) − ξ(c−Δ/2) = +2A·sin(ωt−kc)·sin(kΔ/2), worked by hand; δρ/ρ is minus that over Δ.
    const k = (2 * Math.PI) / 0.5;
    const delta = model.pairSeparation;
    const expected = -(2e-3 * Math.sin(0.7 - k * centre) * Math.sin((k * delta) / 2)) / delta;
    expect(model.pairDensityChange()).toBeCloseTo(expected, 10);

    // The finite difference is smaller than the local value by sin(kΔ/2)/(kΔ/2).
    const sinc = Math.sin((k * delta) / 2) / ((k * delta) / 2);
    expect(model.pairDensityChange()).toBeCloseTo(model.densityChangeAt(centre) * sinc, 10);
    model.dispose();
  });

  it("resets", () => {
    const model = new PhaseModel();
    model.showDensityProperty.value = true;
    model.showNeighbourPairProperty.value = true;
    model.pairPositionProperty.value = 0.2;
    model.reset();
    expect(model.showDensityProperty.value).toBe(false);
    expect(model.showNeighbourPairProperty.value).toBe(false);
    expect(model.pairPositionProperty.value).toBeCloseTo(0.65 * model.pipeLength, 12);
    model.dispose();
  });
});
