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
 *
 * When the pipe is overblown it adds the mode it is sounding, and when the partner
 * overlay is on it says where the partner's harmonics fall: between these ones.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { isSymmetric } from "../../common/model/PipeTermination.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { InstrumentPresetValues } from "../model/instrumentPresets.js";
import { presetNameProperty } from "./presetNames.js";

export class InstrumentsScreenSummaryContent extends ScreenSummaryContent {
  private readonly currentDetailsProperty: TReadOnlyProperty<string>;

  public constructor(model: InstrumentsModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getInstrumentsA11yStrings();
    const details = a11y.currentDetails;
    const pipe = model.pipe;

    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.presetProperty,
        model.partnerPresetProperty,
        model.soundingHarmonicProperty,
        model.showPartnerProperty,
        pipe.terminationProperty,
        pipe.fundamentalFrequencyProperty,
        details.allHarmonicsStringProperty,
        details.oddHarmonicsStringProperty,
        details.soundingStringProperty,
        details.comparingStringProperty,
        ...InstrumentPresetValues.map(presetNameProperty),
      ],
      () => {
        const fundamental = pipe.fundamentalFrequencyProperty.value;
        const pattern = isSymmetric(pipe.terminationProperty.value)
          ? details.allHarmonicsStringProperty.value
          : details.oddHarmonicsStringProperty.value;
        const sentences = [
          pattern
            .replace("{{instrument}}", presetNameProperty(model.presetProperty.value).value)
            .replace("{{frequency}}", StringUtils.toFixedLTR(fundamental, 0)),
        ];

        const harmonic = model.soundingHarmonicProperty.value;
        if (harmonic !== 1) {
          sentences.push(
            details.soundingStringProperty.value
              .replace("{{harmonic}}", `${harmonic}`)
              .replace("{{frequency}}", StringUtils.toFixedLTR(harmonic * fundamental, 0)),
          );
        }
        if (model.showPartnerProperty.value) {
          sentences.push(
            details.comparingStringProperty.value.replace(
              "{{instrument}}",
              presetNameProperty(model.partnerPresetProperty.value).value,
            ),
          );
        }
        return sentences.join(" ");
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
