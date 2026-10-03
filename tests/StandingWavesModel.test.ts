import { describe, expect, it } from "vitest";
import { StandingWavesModel } from "../src/standing-waves/model/StandingWavesModel.js";

describe("Standing Waves frequency controls", () => {
  it("fine tunes around the last broad frequency choice", () => {
    const model = new StandingWavesModel();
    model.pipe.driveFrequencyProperty.value = 400;
    expect(model.fineTuneOffsetProperty.value).toBe(0);

    model.fineTuneOffsetProperty.value = 12.3;
    expect(model.pipe.driveFrequencyProperty.value).toBeCloseTo(412.3);
    model.fineTuneOffsetProperty.value = -5.5;
    expect(model.pipe.driveFrequencyProperty.value).toBeCloseTo(394.5);

    model.pipe.driveFrequencyProperty.value = 700;
    expect(model.fineTuneOffsetProperty.value).toBe(0);
    model.fineTuneOffsetProperty.value = 20;
    expect(model.pipe.driveFrequencyProperty.value).toBe(720);

    model.reset();
    expect(model.fineTuneOffsetProperty.value).toBe(0);
    expect(model.pipe.driveFrequencyProperty.value).toBeCloseTo(171.5);
    model.dispose();
  });
});
