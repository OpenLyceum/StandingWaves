import { describe, expect, it } from "vitest";
import { InstrumentsModel } from "../src/instruments/model/InstrumentsModel.js";
import { PhaseModel } from "../src/phase-relationships/model/PhaseModel.js";
import { ReflectionModel } from "../src/reflection/model/ReflectionModel.js";
import { StandingWavesModel } from "../src/standing-waves/model/StandingWavesModel.js";

describe("screen playback speed", () => {
  it.each([ReflectionModel, PhaseModel, StandingWavesModel, InstrumentsModel])(
    "%s advances model time more slowly by default",
    (Model) => {
      const model = new Model();
      model.step(0.05);
      const slowAdvance = model.timer.timeProperty.value;
      model.timer.slowMotionProperty.value = false;
      model.step(0.05);
      const normalAdvance = model.timer.timeProperty.value - slowAdvance;
      expect(normalAdvance / slowAdvance).toBeCloseTo(2.5);
      model.dispose();
    },
  );
});
