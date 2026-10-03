/**
 * StandingWavesScreenSummaryContent.ts
 *
 * The accessible screen summary for the Standing Waves screen.
 *
 * The live paragraph answers the question the screen poses: is the pipe resonating,
 * and on what. Off resonance it says so explicitly — "very little standing wave
 * forms" — because the visual difference between a full-height wave and a sliver is
 * the whole feedback loop of the frequency slider, and a description that only ever
 * named the frequency would hide it.
 *
 * With density shading on, a second sentence says where the density swings: at the
 * displacement nodes, not the antinodes — the place a learner least expects it.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { StandingWavesModel } from "../model/StandingWavesModel.js";

export class StandingWavesScreenSummaryContent extends ScreenSummaryContent {
  private readonly currentDetailsProperty: TReadOnlyProperty<string>;

  public constructor(model: StandingWavesModel) {
    const a11y = StringManager.getInstance().getStandingWavesA11yStrings();
    const details = a11y.currentDetails;
    const pipe = model.pipe;

    const currentDetailsProperty = new DerivedProperty(
      [
        pipe.isAtResonanceProperty,
        pipe.isDrivingProperty,
        pipe.nearestHarmonicProperty,
        pipe.driveFrequencyProperty,
        model.showDensityProperty,
        details.atResonanceStringProperty,
        details.offResonanceStringProperty,
        details.silentStringProperty,
        details.densityStringProperty,
      ],
      (
        atResonance: boolean,
        isDriving: boolean,
        harmonic: number,
        frequency: number,
        showDensity: boolean,
        atPattern: string,
        offPattern: string,
        silent: string,
        density: string,
      ) => {
        const hertz = StringUtils.toFixedLTR(frequency, 0);
        const state = !isDriving
          ? silent
          : atResonance
            ? atPattern.replace("{{harmonic}}", `${harmonic}`).replace("{{frequency}}", hertz)
            : offPattern.replace("{{frequency}}", hertz);
        return showDensity ? `${state} ${density}` : state;
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });

    this.currentDetailsProperty = currentDetailsProperty;
  }

  public override dispose(): void {
    this.currentDetailsProperty.dispose();
    super.dispose();
  }
}
