/**
 * ReflectionScreenSummaryContent.ts
 *
 * The accessible screen summary for the Reflection screen.
 *
 * ── What the live paragraph says ──────────────────────────────────────────────
 *
 * It narrates the pulse's journey — outbound, at the far end, coming back — and
 * then, once the reflection has happened, states **the result**: which of the two
 * quantities flipped and which did not.
 *
 * That last sentence is the point. A sighted learner reads the inversion off the
 * two traces in an instant; without it stated in words, a screen-reader user gets
 * a description of two graphs and none of the physics they are for.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { StringManager } from "../../i18n/StringManager.js";
import { PulseStage, type ReflectionModel } from "../model/ReflectionModel.js";

export class ReflectionScreenSummaryContent extends ScreenSummaryContent {
  private readonly currentDetailsProperty: TReadOnlyProperty<string>;

  public constructor(model: ReflectionModel) {
    const a11y = StringManager.getInstance().getReflectionA11yStrings();
    const details = a11y.currentDetails;

    const currentDetailsProperty = new DerivedProperty(
      [
        model.pulseStageProperty,
        model.farEndProperty,
        model.isComparingProperty,
        details.atRestStringProperty,
        details.travellingTowardStringProperty,
        details.reflectingStringProperty,
        details.nearReflectingStringProperty,
        details.travellingBackStringProperty,
        details.closedResultStringProperty,
        details.openResultStringProperty,
      ],
      (
        stage: PulseStage,
        farEnd: EndCondition,
        isComparing: boolean,
        atRest: string,
        travellingToward: string,
        reflecting: string,
        nearReflecting: string,
        travellingBack: string,
        closedResult: string,
        openResult: string,
      ) => {
        if (stage === PulseStage.AT_REST) {
          return atRest;
        }
        if (stage === PulseStage.OUTBOUND) {
          return travellingToward;
        }
        if (stage === PulseStage.REFLECTING) {
          return reflecting;
        }
        if (stage === PulseStage.NEAR_REFLECTING) {
          return nearReflecting;
        }
        // Returning: say what happened. While comparing, both ends are on screen,
        // so report both results rather than picking one.
        if (isComparing) {
          return `${travellingBack} ${closedResult} ${openResult}`;
        }
        const result = farEnd === EndCondition.CLOSED ? closedResult : openResult;
        return `${travellingBack} ${result}`;
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
