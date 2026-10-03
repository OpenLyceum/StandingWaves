/**
 * PhaseControlPanel.ts
 *
 * Controls for the Phase screen, plus the verdict readout.
 *
 * The verdict — "velocity and pressure are IN phase" / "…180° OUT of phase" — is a
 * control-panel item rather than a caption on the graph on purpose: it is the
 * answer to the question the direction toggle right above it asks, and the two
 * belong next to each other.
 */

import { DerivedProperty, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { CHARACTERISTIC_IMPEDANCE, WaveDirection } from "../../common/model/acoustics.js";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StandingWavesNumberControl } from "../../common/view/StandingWavesNumberControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { PhaseModel } from "../model/PhaseModel.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);
const VERDICT_FONT = new PhetFont({ size: 13, weight: "bold" });
const NOTE_FONT = new PhetFont(11);

const PANEL_WIDTH = 210;

export class PhaseControlPanel extends StandingWavesPanel {
  public readonly directionRadioButtons: Node;
  public readonly wavelengthControl: Node;
  public readonly equationsCheckbox: Node;
  public readonly referencePointCheckbox: Node;
  public readonly densityCheckbox: Node;
  public readonly neighbourPairCheckbox: Node;

  private readonly disposePhaseControlPanel: () => void;

  public constructor(model: PhaseModel) {
    const strings = StringManager.getInstance();
    const phase = strings.getPhaseStrings();
    const a11y = strings.getPhaseA11yStrings();

    const directionLabel = new Text(phase.directionStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    const directionRadioButtons = new VerticalAquaRadioButtonGroup<WaveDirection>(
      model.directionProperty as Property<WaveDirection>,
      [
        {
          value: WaveDirection.FORWARD,
          createNode: () =>
            new Text(phase.forwardStringProperty, { font: LABEL_FONT, fill: StandingWavesColors.textColorProperty }),
          options: { accessibleName: phase.forwardStringProperty },
        },
        {
          value: WaveDirection.BACKWARD,
          createNode: () =>
            new Text(phase.backwardStringProperty, { font: LABEL_FONT, fill: StandingWavesColors.textColorProperty }),
          options: { accessibleName: phase.backwardStringProperty },
        },
      ],
      { spacing: 6, accessibleName: a11y.controls.directionStringProperty },
    );

    // The verdict. Coloured by neither quantity — it is a statement about the pair.
    const verdictProperty = new DerivedProperty(
      [model.directionProperty, phase.inPhaseStringProperty, phase.outOfPhaseStringProperty],
      (direction: WaveDirection, inPhase: string, outOfPhase: string) =>
        direction === WaveDirection.FORWARD ? inPhase : outOfPhase,
    );
    const verdict = new Text(verdictProperty, {
      font: VERDICT_FONT,
      fill: StandingWavesColors.resonanceBadgeColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    const wavelengthControl = new StandingWavesNumberControl(
      phase.wavelengthStringProperty,
      model.wavelengthProperty,
      model.wavelengthProperty.range,
      {
        accessibleName: a11y.controls.wavelengthStringProperty,
        valuePattern: strings.getUnits().metresStringProperty,
        decimals: 2,
        delta: 0.01,
        trackWidth: PANEL_WIDTH - 70,
      },
    );

    const equationsCheckbox = new Checkbox(
      model.showEquationsProperty,
      new Text(phase.showEquationsStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showEquationsStringProperty,
      },
    );

    const referencePointCheckbox = new Checkbox(
      model.showReferencePointProperty,
      new Text(phase.showReferencePointStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showReferencePointStringProperty,
      },
    );

    const densityCheckbox = new Checkbox(
      model.showDensityProperty,
      new Text(strings.getDensityStrings().showDensityStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showDensityStringProperty,
      },
    );

    const neighbourPairCheckbox = new Checkbox(
      model.showNeighbourPairProperty,
      new Text(phase.showNeighbourPairStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showNeighbourPairStringProperty,
      },
    );

    // The impedance, spelled out. ρc is the constant of proportionality in the
    // relation the whole screen is about, so it should be a number on screen and
    // not only a symbol in an equation.
    const impedanceValueProperty = new DerivedProperty([phase.impedanceValueStringProperty], (pattern: string) =>
      pattern.replace("{{value}}", toFixed(CHARACTERISTIC_IMPEDANCE, 0)),
    );
    const impedanceNote = new VBox({
      align: "left",
      spacing: 1,
      children: [
        new Text(phase.impedanceLabelStringProperty, {
          font: NOTE_FONT,
          fill: StandingWavesColors.axisColorProperty,
          maxWidth: PANEL_WIDTH,
        }),
        new Text(impedanceValueProperty, {
          font: NOTE_FONT,
          fill: StandingWavesColors.axisColorProperty,
          maxWidth: PANEL_WIDTH,
        }),
      ],
    });

    super(
      new VBox({
        align: "left",
        spacing: 12,
        children: [
          directionLabel,
          directionRadioButtons,
          verdict,
          wavelengthControl,
          equationsCheckbox,
          referencePointCheckbox,
          densityCheckbox,
          neighbourPairCheckbox,
          impedanceNote,
        ],
      }),
    );

    this.directionRadioButtons = directionRadioButtons;
    this.wavelengthControl = wavelengthControl;
    this.equationsCheckbox = equationsCheckbox;
    this.referencePointCheckbox = referencePointCheckbox;
    this.densityCheckbox = densityCheckbox;
    this.neighbourPairCheckbox = neighbourPairCheckbox;

    this.disposePhaseControlPanel = () => {
      impedanceValueProperty.dispose();
      verdictProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposePhaseControlPanel();
    super.dispose();
  }
}

/** The equation block, shown when the checkbox is ticked. */
export class EquationReadoutNode extends StandingWavesPanel {
  private readonly disposeEquationReadoutNode: () => void;

  public constructor(model: PhaseModel) {
    const phase = StringManager.getInstance().getPhaseStrings();

    const pressureProperty = pickByDirection(
      model.directionProperty,
      phase.equationPressureForwardStringProperty,
      phase.equationPressureBackwardStringProperty,
    );
    const velocityProperty = pickByDirection(
      model.directionProperty,
      phase.equationVelocityForwardStringProperty,
      phase.equationVelocityBackwardStringProperty,
    );

    super(
      new VBox({
        align: "left",
        spacing: 4,
        children: [
          new Text(pressureProperty, {
            font: new PhetFont(14),
            fill: StandingWavesColors.pressureColorProperty,
            maxWidth: 260,
          }),
          new Text(velocityProperty, {
            font: new PhetFont(14),
            fill: StandingWavesColors.velocityColorProperty,
            maxWidth: 260,
          }),
        ],
      }),
      { visibleProperty: model.showEquationsProperty },
    );

    this.disposeEquationReadoutNode = () => {
      pressureProperty.dispose();
      velocityProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeEquationReadoutNode();
    super.dispose();
  }
}

/** Picks one of two strings according to the wave's direction. */
function pickByDirection(
  directionProperty: TReadOnlyProperty<WaveDirection>,
  forward: TReadOnlyProperty<string>,
  backward: TReadOnlyProperty<string>,
): TReadOnlyProperty<string> {
  return new DerivedProperty(
    [directionProperty, forward, backward],
    (direction: WaveDirection, forwardText: string, backwardText: string) =>
      direction === WaveDirection.FORWARD ? forwardText : backwardText,
  );
}
