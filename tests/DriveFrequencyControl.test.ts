/**
 * DriveFrequencyControl.test.ts
 *
 * The ticks are drawn by this sim, not by Slider, so nothing but this test holds
 * them in register with the thumb. Each tick must sit exactly where the slider
 * puts the thumb when the drive is tuned to that harmonic — for every pipe, since
 * the slider's range moves with the pipe while the ticks do not.
 */

import { StringProperty } from "scenerystack/axon";
import type { LinearFunction } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { PipeModalModel } from "../src/common/model/PipeModalModel.js";
import { PipeTermination } from "../src/common/model/PipeTermination.js";
import { DriveFrequencyControl } from "../src/standing-waves/view/DriveFrequencyControl.js";

function createControl(pipe: PipeModalModel): DriveFrequencyControl {
  return new DriveFrequencyControl(
    pipe,
    new StringProperty("Drive frequency"),
    new StringProperty("Drive frequency"),
    new StringProperty("{{value}} Hz"),
    { trackWidth: 180 },
  );
}

/** Where the slider puts the thumb's centre for a value, in the slider's frame. */
function thumbX(control: DriveFrequencyControl, value: number): number {
  // Slider's track is private; its value→position map is the ground truth here.
  const track = (control.slider as unknown as { track: { valueToPositionProperty: { value: LinearFunction } } }).track;
  return track.valueToPositionProperty.value.evaluate(value);
}

describe("DriveFrequencyControl ticks", () => {
  it("sit under the thumb at each harmonic, for every pipe", () => {
    const pipe = new PipeModalModel();
    const control = createControl(pipe);
    for (const termination of [PipeTermination.OPEN_OPEN, PipeTermination.CLOSED_OPEN]) {
      for (const length of [0.5, 1, 2]) {
        pipe.terminationProperty.value = termination;
        pipe.pipeLengthProperty.value = length;
        for (const tick of control.ticks) {
          expect(tick.line.x1).toBeCloseTo(thumbX(control, pipe.getModeFrequency(tick.harmonic)), 6);
        }
      }
    }
    control.dispose();
    pipe.dispose();
  });

  it("mark harmonics 1 to 8, hiding the even ones on a stopped pipe", () => {
    const pipe = new PipeModalModel();
    const control = createControl(pipe);
    expect(control.ticks.map((tick) => tick.harmonic)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(control.ticks.every((tick) => tick.line.visible)).toBe(true);

    pipe.terminationProperty.value = PipeTermination.CLOSED_OPEN;
    expect(control.ticks.filter((tick) => tick.line.visible).map((tick) => tick.harmonic)).toEqual([1, 3, 5, 7]);
    control.dispose();
    pipe.dispose();
  });
});
