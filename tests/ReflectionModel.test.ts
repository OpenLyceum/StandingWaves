import { describe, expect, it } from "vitest";
import { PulseStage, ReflectionModel } from "../src/reflection/model/ReflectionModel.js";
import { LAUNCH_POSITION_FRACTION } from "../src/reflection/model/SpringChainModel.js";
import { SOUND_SPEED_MPS } from "../src/StandingWavesConstants.js";

describe("Reflection pulse narration", () => {
  it("tracks the far and near reflections over multiple round trips", () => {
    const model = new ReflectionModel();
    const length = model.pipeLength;
    const firstFarEnd = (1 - LAUNCH_POSITION_FRACTION) * length;
    const setTravelled = (distance: number): void => {
      model.timeSinceLaunchProperty.value = distance / SOUND_SPEED_MPS;
    };

    expect(model.pulseStageProperty.value).toBe(PulseStage.AT_REST);
    model.launchPulse();
    expect(model.pulseStageProperty.value).toBe(PulseStage.OUTBOUND);
    setTravelled(firstFarEnd);
    expect(model.pulseStageProperty.value).toBe(PulseStage.REFLECTING);
    setTravelled(firstFarEnd + 0.5 * length);
    expect(model.pulseStageProperty.value).toBe(PulseStage.RETURNING);
    setTravelled(firstFarEnd + length);
    expect(model.pulseStageProperty.value).toBe(PulseStage.NEAR_REFLECTING);
    setTravelled(firstFarEnd + 1.5 * length);
    expect(model.pulseStageProperty.value).toBe(PulseStage.OUTBOUND);
    setTravelled(firstFarEnd + 2 * length);
    expect(model.pulseStageProperty.value).toBe(PulseStage.REFLECTING);
    model.dispose();
  });
});
