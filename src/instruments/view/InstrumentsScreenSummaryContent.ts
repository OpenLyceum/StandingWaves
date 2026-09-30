/**
 * InstrumentsScreenSummaryContent.ts
 *
 * The accessible screen summary for the Instruments screen.
 *
 * The live paragraph names the instrument, whether its series is complete or
 * odd-only, and its fundamental — and, for a stopped pipe, says outright that it
 * sounds an octave below an open pipe of the same length. That last clause is the
 * conclusion a sighted learner draws by comparing two bar charts, so it has to be
 * stated rather than left to be inferred from two numbers read minutes apart.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { isSymmetric, type PipeTermination } from "../../common/model/PipeTermination.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { InstrumentPreset } from "../model/instrumentPresets.js";

export class InstrumentsScreenSummaryContent extends ScreenSummaryContent {
  private readonly currentDetailsProperty: TReadOnlyProperty<string>;

  public constructor(model: InstrumentsModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getInstrumentsA11yStrings();
    const instruments = strings.getInstrumentsStrings();
    const details = a11y.currentDetails;
    const pipe = model.pipe;

    const currentDetailsProperty = new DerivedProperty(
      [
        model.presetProperty,
        pipe.terminationProperty,
        pipe.fundamentalFrequencyProperty,
        details.allHarmonicsStringProperty,
        details.oddHarmonicsStringProperty,
        instruments.openOrganPipeStringProperty,
        instruments.stoppedOrganPipeStringProperty,
        instruments.fluteStringProperty,
        instruments.clarinetStringProperty,
      ],
      (
        preset: InstrumentPreset,
        termination: PipeTermination,
        fundamental: number,
        allPattern: string,
        oddPattern: string,
        openOrgan: string,
        stoppedOrgan: string,
        flute: string,
        clarinet: string,
      ) => {
        const name = {
          [InstrumentPreset.OPEN_ORGAN_PIPE]: openOrgan,
          [InstrumentPreset.STOPPED_ORGAN_PIPE]: stoppedOrgan,
          [InstrumentPreset.FLUTE]: flute,
          [InstrumentPreset.CLARINET]: clarinet,
        }[preset];

        const pattern = isSymmetric(termination) ? allPattern : oddPattern;
        return pattern.replace("{{instrument}}", name).replace("{{frequency}}", StringUtils.toFixedLTR(fundamental, 0));
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
