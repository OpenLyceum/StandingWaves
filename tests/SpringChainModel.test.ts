/**
 * SpringChainModel.test.ts
 *
 * The lattice, and the one result the Reflection screen exists to show:
 *
 *   at a **closed** end, displacement inverts on reflection and pressure does not;
 *   at an **open** end, pressure inverts and displacement does not.
 *
 * Nothing in the model special-cases that sign, so these tests are checking that
 * it really does fall out of the boundary condition. They are the reason the
 * screen integrates a lattice instead of drawing an image-source formula.
 */

import { describe, expect, it } from "vitest";
import { EndCondition } from "../src/common/model/PipeTermination.js";
import { SpringChainModel } from "../src/reflection/model/SpringChainModel.js";
import {
  CHAIN_MASS_COUNT,
  PIPE_LENGTH_DEFAULT_M,
  PULSE_AMPLITUDE_CELLS,
  SOUND_SPEED_MPS,
} from "../src/StandingWavesConstants.js";

const L = PIPE_LENGTH_DEFAULT_M;

function makeChain(farEnd: EndCondition): SpringChainModel {
  return new SpringChainModel({ massCount: CHAIN_MASS_COUNT, pipeLength: L, farEnd });
}

/** Runs the chain for `duration` model seconds. */
function run(chain: SpringChainModel, duration: number, stepCount = 400): void {
  const dt = duration / stepCount;
  for (let i = 0; i < stepCount; i++) {
    chain.step(dt);
  }
}

/** Signed displacement extremum over the masses whose equilibrium lies in [from, to]. */
function displacementExtremum(chain: SpringChainModel, from: number, to: number): number {
  let extremum = 0;
  for (let i = 0; i < chain.massCount; i++) {
    const x = chain.equilibriumPosition(i);
    if (x >= from && x <= to) {
      const value = chain.displacementAt(i);
      if (Math.abs(value) > Math.abs(extremum)) {
        extremum = value;
      }
    }
  }
  return extremum;
}

/** Equilibrium position of the mass with the largest |ξ| (m). */
function pulsePosition(chain: SpringChainModel): number {
  let best = 0;
  let bestIndex = 0;
  for (let i = 0; i < chain.massCount; i++) {
    const value = Math.abs(chain.displacementAt(i));
    if (value > best) {
      best = value;
      bestIndex = i;
    }
  }
  return chain.equilibriumPosition(bestIndex);
}

/** Largest |ξ| anywhere on the chain. */
function peakDisplacement(chain: SpringChainModel): number {
  let peak = 0;
  for (let i = 0; i < chain.massCount; i++) {
    peak = Math.max(peak, Math.abs(chain.displacementAt(i)));
  }
  return peak;
}

/** Largest |p| anywhere on the chain. */
function peakPressure(chain: SpringChainModel): number {
  let peak = 0;
  for (let i = 0; i < chain.springCount; i++) {
    peak = Math.max(peak, Math.abs(chain.pressureAt(i)));
  }
  return peak;
}

describe("lattice calibration", () => {
  it("carries waves at the speed of sound", () => {
    const chain = makeChain(EndCondition.CLOSED);
    expect(chain.waveSpeed).toBeCloseTo(SOUND_SPEED_MPS, 6);
  });

  it("spaces the masses evenly across the pipe", () => {
    const chain = makeChain(EndCondition.CLOSED);
    expect(chain.spacing).toBeCloseTo(L / (CHAIN_MASS_COUNT - 1), 12);
    expect(chain.equilibriumPosition(0)).toBe(0);
    expect(chain.equilibriumPosition(CHAIN_MASS_COUNT - 1)).toBeCloseTo(L, 12);
  });

  it("has one fewer spring than masses, with pressure on the midpoints", () => {
    const chain = makeChain(EndCondition.OPEN);
    expect(chain.springCount).toBe(CHAIN_MASS_COUNT - 1);
    // The half-cell offset: the first pressure sample sits half a spacing in.
    expect(chain.pressurePosition(0)).toBeCloseTo(chain.spacing / 2, 12);
  });

  it("reports a stability limit of √(m/k)", () => {
    const chain = makeChain(EndCondition.CLOSED);
    // ω_max = 2√(k/m), and the explicit limit is dt < 2/ω_max.
    const omegaMax = 2 * Math.sqrt(chain.springConstant);
    expect(chain.maxStableStep).toBeCloseTo(2 / omegaMax, 12);
  });
});

describe("a launched pulse", () => {
  it("starts at rest and stays at rest until launched", () => {
    const chain = makeChain(EndCondition.OPEN);
    expect(peakDisplacement(chain)).toBe(0);
    run(chain, 1e-3);
    expect(peakDisplacement(chain)).toBe(0);
    expect(chain.totalEnergy()).toBe(0);
  });

  it("launches with about the requested amplitude", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    // Relative, not absolute: the Gaussian's peak falls between lattice sites, so
    // the largest *sampled* displacement sits a fraction of a percent below it.
    expect(peakDisplacement(chain) / (PULSE_AMPLITUDE_CELLS * chain.spacing)).toBeCloseTo(1, 2);
  });

  it("travels toward the far end, not both ways", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const start = pulsePosition(chain);
    // Long enough to carry the pulse two pulse-widths clear of where it started.
    run(chain, (0.2 * L) / SOUND_SPEED_MPS);
    const later = pulsePosition(chain);
    expect(later).toBeGreaterThan(start);
    // A pulse that had split in two would have left half its amplitude behind,
    // travelling the other way.
    expect(displacementExtremum(chain, 0, start - 3 * chain.spacing)).toBeLessThan(0.15 * peakDisplacement(chain));
  });

  it("travels at the speed of sound", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const start = pulsePosition(chain);
    const duration = 4e-4; // s — short of reaching the far end
    run(chain, duration);
    const travelled = pulsePosition(chain) - start;
    // Within a couple of lattice cells: the peak can only be located to the
    // nearest mass.
    expect(travelled / duration).toBeGreaterThan(0.9 * SOUND_SPEED_MPS);
    expect(travelled / duration).toBeLessThan(1.1 * SOUND_SPEED_MPS);
  });
});

describe("energy conservation", () => {
  it("holds the energy over many round trips", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const initial = chain.totalEnergy();
    expect(initial).toBeGreaterThan(0);

    // Ten pipe traversals.
    for (let trip = 0; trip < 10; trip++) {
      run(chain, L / SOUND_SPEED_MPS, 200);
      expect(chain.totalEnergy() / initial).toBeCloseTo(1, 2);
    }
  });

  it("holds the energy with a rigid far end too", () => {
    const chain = makeChain(EndCondition.CLOSED);
    chain.launchPulse();
    const initial = chain.totalEnergy();
    run(chain, (10 * L) / SOUND_SPEED_MPS, 2000);
    expect(chain.totalEnergy() / initial).toBeCloseTo(1, 2);
  });
});

describe("the boundary conditions themselves", () => {
  it("never moves a rigid end", () => {
    const chain = makeChain(EndCondition.CLOSED);
    chain.launchPulse();
    for (let i = 0; i < 200; i++) {
      chain.step(1e-5);
      expect(chain.displacementAt(0)).toBe(0);
      expect(chain.displacementAt(chain.massCount - 1)).toBe(0);
    }
  });

  it("lets a free end move", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const last = chain.massCount - 1;

    let maxFarDisplacement = 0;
    for (let i = 0; i < 600; i++) {
      chain.step(5e-6);
      maxFarDisplacement = Math.max(maxFarDisplacement, Math.abs(chain.displacementAt(last)));
    }
    expect(maxFarDisplacement).toBeGreaterThan(0);
  });

  it("decays the pressure toward zero approaching a free end", () => {
    // The pressure node is at x = L exactly, but the outermost *sample* sits half
    // a lattice cell inside it, so it is small rather than zero. What identifies
    // it as a node is the profile falling monotonically toward the end.
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    run(chain, (0.7 * L) / SOUND_SPEED_MPS, 2000); // pulse now at the far end

    const outermost = Math.abs(chain.pressureAt(chain.springCount - 1));
    const oneIn = Math.abs(chain.pressureAt(chain.springCount - 2));
    const fourIn = Math.abs(chain.pressureAt(chain.springCount - 5));
    expect(outermost).toBeLessThan(oneIn);
    expect(oneIn).toBeLessThan(fourIn);
  });

  it("converges to p = 0 at a free end as the lattice is refined", () => {
    // First-order convergence: halving the spacing should roughly halve the
    // residual at the outermost sample. This is what makes the previous test a
    // statement about the boundary condition rather than about the mesh.
    const residualFor = (massCount: number): number => {
      const chain = new SpringChainModel({ massCount, pipeLength: L, farEnd: EndCondition.OPEN });
      chain.launchPulse();
      run(chain, (0.7 * L) / SOUND_SPEED_MPS, 4000);
      const outermost = Math.abs(chain.pressureAt(chain.springCount - 1));
      return outermost / peakPressure(chain);
    };

    const coarse = residualFor(80);
    const fine = residualFor(160);
    expect(fine).toBeLessThan(coarse);
    expect(fine / coarse).toBeLessThan(0.75);
  });
});

describe("reflection at a CLOSED end", () => {
  it("inverts the displacement", () => {
    const chain = makeChain(EndCondition.CLOSED);
    chain.launchPulse();
    const launchPosition = pulsePosition(chain);
    const incident = displacementExtremum(chain, 0, L);
    expect(incident).toBeGreaterThan(0); // launched as a bump

    // Out to the far end and back to where it started.
    const distance = 2 * (L - launchPosition);
    run(chain, distance / SOUND_SPEED_MPS, 2000);

    const reflected = displacementExtremum(chain, launchPosition - 0.12 * L, launchPosition + 0.12 * L);
    expect(reflected).toBeLessThan(0); // came back a dip
    expect(Math.abs(reflected)).toBeGreaterThan(0.5 * Math.abs(incident));
  });

  it("doubles the pressure at the wall — a pressure antinode", () => {
    const chain = makeChain(EndCondition.CLOSED);
    chain.launchPulse();
    const incidentPressure = peakPressure(chain);

    let maxWallPressure = 0;
    const steps = 3000;
    const dt = (2 * L) / SOUND_SPEED_MPS / steps;
    for (let i = 0; i < steps; i++) {
      chain.step(dt);
      maxWallPressure = Math.max(maxWallPressure, Math.abs(chain.pressureAt(chain.springCount - 1)));
    }

    // Incident and reflected pressure add in phase at a rigid wall.
    expect(maxWallPressure).toBeGreaterThan(1.5 * incidentPressure);
  });
});

describe("reflection at an OPEN end", () => {
  it("leaves the displacement upright", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const launchPosition = pulsePosition(chain);
    const incident = displacementExtremum(chain, 0, L);
    expect(incident).toBeGreaterThan(0);

    const distance = 2 * (L - launchPosition);
    run(chain, distance / SOUND_SPEED_MPS, 2000);

    const reflected = displacementExtremum(chain, launchPosition - 0.12 * L, launchPosition + 0.12 * L);
    expect(reflected).toBeGreaterThan(0); // came back a bump
    expect(reflected).toBeGreaterThan(0.5 * incident);
  });

  it("doubles the displacement at the end — a displacement antinode", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    const incident = peakDisplacement(chain);

    let maxEndDisplacement = 0;
    const steps = 3000;
    const dt = (2 * L) / SOUND_SPEED_MPS / steps;
    for (let i = 0; i < steps; i++) {
      chain.step(dt);
      maxEndDisplacement = Math.max(maxEndDisplacement, Math.abs(chain.displacementAt(chain.massCount - 1)));
    }

    expect(maxEndDisplacement).toBeGreaterThan(1.5 * incident);
  });
});

describe("the two ends disagree — the whole point of the screen", () => {
  it("sends back opposite-signed pulses from identical launches", () => {
    const closed = makeChain(EndCondition.CLOSED);
    const open = makeChain(EndCondition.OPEN);
    closed.launchPulse();
    open.launchPulse();

    const launchPosition = pulsePosition(closed);
    const distance = 2 * (L - launchPosition);
    const duration = distance / SOUND_SPEED_MPS;
    // Stepped from the same clock, exactly as the comparison view does.
    run(closed, duration, 2000);
    run(open, duration, 2000);

    const window: [number, number] = [launchPosition - 0.12 * L, launchPosition + 0.12 * L];
    const closedReflection = displacementExtremum(closed, ...window);
    const openReflection = displacementExtremum(open, ...window);

    expect(Math.sign(closedReflection)).toBe(-Math.sign(openReflection));
    // Same magnitude — only the sign differs.
    expect(Math.abs(closedReflection) / Math.abs(openReflection)).toBeCloseTo(1, 1);
  });
});

describe("reset", () => {
  it("returns the chain to rest", () => {
    const chain = makeChain(EndCondition.OPEN);
    chain.launchPulse();
    run(chain, 5e-4);
    expect(chain.totalEnergy()).toBeGreaterThan(0);

    chain.reset();

    expect(chain.totalEnergy()).toBe(0);
    expect(peakDisplacement(chain)).toBe(0);
    expect(peakPressure(chain)).toBe(0);
  });
});
