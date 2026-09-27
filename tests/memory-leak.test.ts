/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 *
 * ── Two kinds of assertion, and when to use which ─────────────────────────────
 *
 * **Models** are asserted with a `WeakRef`: nothing long-lived should reach them once
 * they are disposed, so collection is the right test.
 *
 * **View nodes** are asserted by checking that the model Property they linked has no
 * listeners left. A scenery `Node` is reachable from enough long-lived machinery that
 * WeakRef collection is a flaky proxy, whereas the leftover listener is the actual
 * defect — a model that keeps calling into a discarded node.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { describe, expect, it } from "vitest";
import { PipeModalModel } from "../src/common/model/PipeModalModel.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { InstrumentsModel } from "../src/instruments/model/InstrumentsModel.js";
import { HarmonicSpectrumNode } from "../src/instruments/view/HarmonicSpectrumNode.js";
import { PhaseModel } from "../src/phase-relationships/model/PhaseModel.js";
import { ReflectionModel } from "../src/reflection/model/ReflectionModel.js";
import { StandingWavesModel } from "../src/standing-waves/model/StandingWavesModel.js";
import { NodeMarkersNode } from "../src/standing-waves/view/NodeMarkersNode.js";
import { OvertoneLadderNode } from "../src/standing-waves/view/OvertoneLadderNode.js";
import { describeDisposalLeaks, forceGC } from "./helpers/memoryLeak.js";

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

/**
 * Number of listeners currently attached to `property`.
 *
 * Axon's TinyEmitter exposes getListenerCount() publicly but ReadOnlyProperty
 * re-declares it private, so the cast is deliberate. The public alternative,
 * hasListeners(), is too coarse when the property always carries baseline listeners —
 * which every Property of PipeModalModel does.
 */
function listenerCount(property: TReadOnlyProperty<unknown>): number {
  return (property as unknown as { getListenerCount(): number }).getListenerCount();
}

/** Builds a model, disposes it, and returns a WeakRef to it — all inside a function. */
function createAndDispose(factory: () => { dispose(): void }): WeakRef<object> {
  const model = factory();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("TimeModel is collected after dispose", async () => {
    const ref = createAndDisposeTimeModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const model = new TimeModel();
    model.dispose();
    expect(() => model.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC(refs);
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});

describe("Screen models are collected after dispose", () => {
  it("PipeModalModel", async () => {
    const ref = createAndDispose(() => new PipeModalModel());
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("ReflectionModel", async () => {
    const ref = createAndDispose(() => new ReflectionModel());
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("PhaseModel", async () => {
    const ref = createAndDispose(() => new PhaseModel());
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("StandingWavesModel", async () => {
    const ref = createAndDispose(() => new StandingWavesModel());
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("InstrumentsModel", async () => {
    const ref = createAndDispose(() => new InstrumentsModel());
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("survives a run before being disposed", async () => {
    // A model that has been stepped has integrated state and, for the modal bank, a
    // populated Float64Array; make sure that does not change the answer.
    const ref = createAndDispose(() => {
      const model = new StandingWavesModel();
      for (let i = 0; i < 30; i++) {
        model.step(1 / 60);
      }
      return model;
    });
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });
});

describe("View nodes release the model Properties they linked", () => {
  /**
   * Asserts that building `createNode` and then disposing it leaves every one of the
   * pipe's Properties with exactly the listener count it started with.
   *
   * A *baseline* comparison rather than `hasListeners()`, because PipeModalModel puts
   * its own DerivedProperties (fundamental, nearest harmonic, resonance) on its
   * geometry Properties — so those always carry listeners and `hasListeners()` can
   * never fall to false however clean the node is.
   */
  function expectNoLeakedListeners(pipe: PipeModalModel, createNode: () => { dispose(): void }): void {
    // Typed as the read-only base so the heterogeneous list (numbers, booleans, the
    // termination union) maps under one signature.
    const watched: readonly TReadOnlyProperty<unknown>[] = [
      pipe.pipeLengthProperty,
      pipe.terminationProperty,
      pipe.driveFrequencyProperty,
      pipe.nearestHarmonicProperty,
      pipe.isAtResonanceProperty,
      pipe.isDrivingProperty,
    ];
    const before = watched.map(listenerCount);

    const node = createNode();
    // The node must actually have subscribed to something, or this proves nothing.
    const during = watched.map(listenerCount);
    expect(during.some((count, index) => count > (before[index] ?? 0))).toBe(true);

    node.dispose();

    expect(watched.map(listenerCount)).toEqual(before);
  }

  it("NodeMarkersNode", () => {
    const pipe = new PipeModalModel();
    expectNoLeakedListeners(pipe, () => new NodeMarkersNode(pipe, { viewLength: 400 }));
    pipe.dispose();
  });

  it("HarmonicSpectrumNode", () => {
    const pipe = new PipeModalModel();
    expectNoLeakedListeners(pipe, () => new HarmonicSpectrumNode(pipe, { viewWidth: 260, viewHeight: 150 }));
    pipe.dispose();
  });

  it("OvertoneLadderNode", () => {
    const model = new StandingWavesModel();
    expectNoLeakedListeners(model.pipe, () => new OvertoneLadderNode(model));
    model.dispose();
  });
});

describeDisposalLeaks([
  { name: "InstrumentsModel", create: () => new InstrumentsModel() },
  { name: "PhaseModel", create: () => new PhaseModel() },
  { name: "ReflectionModel", create: () => new ReflectionModel() },
  { name: "StandingWavesModel", create: () => new StandingWavesModel() },
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "PipeModalModel", create: () => new PipeModalModel() },
]);
