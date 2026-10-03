/**
 * StandingWavesControlPanel.ts
 *
 * Controls for the Standing Waves screen: the termination pair, the drive
 * frequency, the pipe length, and the node markers — plus the resonance badge.
 *
 * ── The frequency slider and the ladder are two ways to do one thing ──────────
 *
 * The slider sweeps continuously, so a learner can *hunt* for a resonance and see
 * that almost nowhere works. The ladder (a separate node) snaps to an exact mode,
 * so they can also just *be* at one. Neither alone teaches the whole idea: the
 * sweep shows that the pipe is selective, the ladder shows what it selects.
 *
 * The badge reports which of the two states the pipe is currently in, and it is
 * derived from the same model Property the physics uses, so it cannot disagree with
 * what the pipe is doing.
 */

import type { Property } from "scenerystack/axon";
import { DerivedProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { fundamentalFrequency, PipeTermination } from "../../common/model/PipeTermination.js";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StandingWavesNumberControl } from "../../common/view/StandingWavesNumberControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { DRIVE_FREQUENCY_RANGE_HARMONICS, PIPE_LENGTH_RANGE_M } from "../../StandingWavesConstants.js";
import type { StandingWavesModel } from "../model/StandingWavesModel.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);
const BADGE_FONT = new PhetFont({ size: 13, weight: "bold" });

const PANEL_WIDTH = 200;

export class StandingWavesControlPanel extends StandingWavesPanel {
  public readonly terminationRadioButtons: Node;
  public readonly frequencyControl: Node;
  public readonly fineTuneControl: Node;
  public readonly lengthControl: Node;
  public readonly driverCheckbox: Node;
  public readonly nodesCheckbox: Node;

  private readonly disposeStandingWavesControlPanel: () => void;

  public constructor(model: StandingWavesModel) {
    const strings = StringManager.getInstance();
    const standingWaves = strings.getStandingWavesStrings();
    const terminations = strings.getTerminations();
    const shared = strings.getSharedControls();
    const units = strings.getUnits();
    const a11y = strings.getStandingWavesA11yStrings();
    const pipe = model.pipe;

    const terminationLabel = new Text(standingWaves.terminationStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    const terminationRadioButtons = new VerticalAquaRadioButtonGroup<PipeTermination>(
      pipe.terminationProperty as Property<PipeTermination>,
      [
        {
          value: PipeTermination.OPEN_OPEN,
          createNode: () =>
            new Text(terminations.openOpenStringProperty, {
              font: LABEL_FONT,
              fill: StandingWavesColors.textColorProperty,
            }),
          options: { accessibleName: terminations.openOpenStringProperty },
        },
        {
          value: PipeTermination.CLOSED_CLOSED,
          createNode: () =>
            new Text(terminations.closedClosedStringProperty, {
              font: LABEL_FONT,
              fill: StandingWavesColors.textColorProperty,
            }),
          options: { accessibleName: terminations.closedClosedStringProperty },
        },
        {
          value: PipeTermination.CLOSED_OPEN,
          createNode: () =>
            new Text(terminations.closedOpenStringProperty, {
              font: LABEL_FONT,
              fill: StandingWavesColors.textColorProperty,
            }),
          options: { accessibleName: terminations.closedOpenStringProperty },
        },
      ],
      { spacing: 6, accessibleName: a11y.controls.terminationStringProperty },
    );

    // The reachable frequency span is expressed in *harmonics of the current pipe*,
    // so it keeps covering the same set of modes when the length or termination
    // changes rather than sliding off the ladder.
    const frequencyRange = new Range(
      DRIVE_FREQUENCY_RANGE_HARMONICS.min * fundamentalFrequency(PipeTermination.CLOSED_OPEN, PIPE_LENGTH_RANGE_M.max),
      DRIVE_FREQUENCY_RANGE_HARMONICS.max * fundamentalFrequency(PipeTermination.OPEN_OPEN, PIPE_LENGTH_RANGE_M.min),
    );

    const frequencyControl = new StandingWavesNumberControl(
      standingWaves.driveFrequencyStringProperty,
      pipe.driveFrequencyProperty,
      frequencyRange,
      {
        accessibleName: a11y.controls.driveFrequencyStringProperty,
        valuePattern: units.hertzStringProperty,
        decimals: 0,
        delta: 1,
        // A resonance is fₕ/Q wide — about 14 Hz at the default fundamental — so an
        // arrow key has to move less than that or it would step straight over every
        // peak on the ladder.
        keyboardStep: 10,
        shiftKeyboardStep: 1,
        pageKeyboardStep: 50,
        trackWidth: PANEL_WIDTH - 70,
      },
    );

    // The broad track spans every pipe setup. Its subpixel resonance bands are
    // explored with this local ±50 Hz track after choosing a nearby frequency.
    const fineTuneControl = new StandingWavesNumberControl(
      standingWaves.fineTuneStringProperty,
      model.fineTuneOffsetProperty,
      model.fineTuneOffsetProperty.range,
      {
        accessibleName: a11y.controls.fineTuneStringProperty,
        valuePattern: units.hertzStringProperty,
        decimals: 1,
        delta: 0.1,
        keyboardStep: 1,
        shiftKeyboardStep: 0.1,
        pageKeyboardStep: 10,
        trackWidth: PANEL_WIDTH - 70,
      },
    );

    const lengthControl = new StandingWavesNumberControl(
      shared.pipeLengthStringProperty,
      pipe.pipeLengthProperty,
      pipe.pipeLengthProperty.range,
      {
        accessibleName: a11y.controls.pipeLengthStringProperty,
        valuePattern: units.metresStringProperty,
        decimals: 2,
        delta: 0.01,
        trackWidth: PANEL_WIDTH - 70,
      },
    );

    const driverCheckbox = new Checkbox(
      pipe.isDrivingProperty,
      new Text(standingWaves.driverOnStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.driverOnStringProperty,
      },
    );

    const nodesCheckbox = new Checkbox(
      model.showNodesProperty,
      new Text(standingWaves.showNodesStringProperty, {
        font: LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: PANEL_WIDTH - 30,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: a11y.controls.showNodesStringProperty,
      },
    );

    // ── The resonance badge ───────────────────────────────────────────────────
    const badgeTextProperty = new DerivedProperty(
      [
        pipe.isAtResonanceProperty,
        pipe.isDrivingProperty,
        standingWaves.atResonanceStringProperty,
        standingWaves.offResonanceStringProperty,
        standingWaves.buildingUpStringProperty,
      ],
      (atResonance: boolean, isDriving: boolean, at: string, off: string, building: string) => {
        if (!isDriving) {
          return building;
        }
        return atResonance ? at : off;
      },
    );
    const badgeColorProperty = new DerivedProperty(
      [pipe.isAtResonanceProperty, pipe.isDrivingProperty],
      (atResonance: boolean, isDriving: boolean) =>
        atResonance && isDriving
          ? StandingWavesColors.resonanceBadgeColorProperty.value
          : StandingWavesColors.axisColorProperty.value,
    );
    const badge = new Text(badgeTextProperty, {
      font: BADGE_FONT,
      fill: badgeColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    super(
      new VBox({
        align: "left",
        spacing: 11,
        children: [
          terminationLabel,
          terminationRadioButtons,
          frequencyControl,
          fineTuneControl,
          badge,
          lengthControl,
          driverCheckbox,
          nodesCheckbox,
        ],
      }),
    );

    this.terminationRadioButtons = terminationRadioButtons;
    this.frequencyControl = frequencyControl;
    this.fineTuneControl = fineTuneControl;
    this.lengthControl = lengthControl;
    this.driverCheckbox = driverCheckbox;
    this.nodesCheckbox = nodesCheckbox;

    this.disposeStandingWavesControlPanel = () => {
      badgeColorProperty.dispose();
      badgeTextProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeStandingWavesControlPanel();
    super.dispose();
  }
}
