/**
 * ReflectionControlPanel.ts
 *
 * Controls for the Reflection screen: which far end to test, whether to show both
 * at once, and the button that launches a pulse.
 */

import type { Property } from "scenerystack/axon";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, RectangularPushButton, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/StandingWavesButtonOptions.js";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { ReflectionModel } from "../model/ReflectionModel.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);

export class ReflectionControlPanel extends StandingWavesPanel {
  /** The far-end selector, for the screen's pdomOrder. */
  public readonly farEndRadioButtons: Node;

  /** The compare checkbox, for the screen's pdomOrder. */
  public readonly compareCheckbox: Node;

  /** The density checkbox, for the screen's pdomOrder. */
  public readonly densityCheckbox: Node;

  /** The launch button, for the screen's pdomOrder. */
  public readonly launchButton: Node;

  public constructor(model: ReflectionModel) {
    const strings = StringManager.getInstance();
    const reflection = strings.getReflectionStrings();
    const ends = strings.getEnds();
    const a11y = strings.getReflectionA11yStrings();

    const farEndLabel = new Text(reflection.farEndStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: 180,
    });

    const farEndRadioButtons = new VerticalAquaRadioButtonGroup<EndCondition>(
      model.farEndProperty as Property<EndCondition>,
      [
        {
          value: EndCondition.CLOSED,
          createNode: () =>
            new Text(ends.closedStringProperty, { font: LABEL_FONT, fill: StandingWavesColors.textColorProperty }),
          options: { accessibleName: ends.closedStringProperty },
        },
        {
          value: EndCondition.OPEN,
          createNode: () =>
            new Text(ends.openStringProperty, { font: LABEL_FONT, fill: StandingWavesColors.textColorProperty }),
          options: { accessibleName: ends.openStringProperty },
        },
      ],
      {
        spacing: 6,
        accessibleName: a11y.controls.farEndStringProperty,
      },
    );

    const compareCheckbox = new Checkbox(
      model.isComparingProperty,
      new Text(reflection.compareBothEndsStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: 180,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.compareStringProperty,
      },
    );

    const densityCheckbox = new Checkbox(
      model.showDensityProperty,
      new Text(strings.getDensityStrings().showDensityStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: 180,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showDensityStringProperty,
      },
    );

    const launchButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(reflection.launchPulseStringProperty, {
        font: TITLE_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 170,
      }),
      listener: () => model.launchPulse(),
      accessibleName: a11y.controls.launchPulseStringProperty,
    });

    // The far end is disabled while comparing: both are on screen, so choosing one
    // would mean nothing.
    model.isComparingProperty.link((isComparing) => {
      farEndRadioButtons.enabled = !isComparing;
      farEndLabel.opacity = isComparing ? 0.5 : 1;
    });

    const hint = new Text(reflection.hintStringProperty, {
      font: new PhetFont(11),
      fill: StandingWavesColors.axisColorProperty,
      maxWidth: 190,
    });

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [launchButton, farEndLabel, farEndRadioButtons, compareCheckbox, densityCheckbox, hint],
      }),
    );

    this.farEndRadioButtons = farEndRadioButtons;
    this.compareCheckbox = compareCheckbox;
    this.densityCheckbox = densityCheckbox;
    this.launchButton = launchButton;
  }
}
