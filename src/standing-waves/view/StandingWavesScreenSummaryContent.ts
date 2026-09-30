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
        details.atResonanceStringProperty,
        details.offResonanceStringProperty,
        details.silentStringProperty,
      ],
      (
        atResonance: boolean,
        isDriving: boolean,
        harmonic: number,
        frequency: number,
        atPattern: string,
        offPattern: string,
        silent: string,
      ) => {
        if (!isDriving) {
          return silent;
        }
        const hertz = StringUtils.toFixedLTR(frequency, 0);
        if (atResonance) {
          return atPattern.replace("{{harmonic}}", `${harmonic}`).replace("{{frequency}}", hertz);
        }
        return offPattern.replace("{{frequency}}", hertz);
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
