/**
 * StandingWavesControlPanel.ts
 *
 * Controls for the Standing Waves screen: the termination pair, the drive
 * frequency, the pipe length, the node markers and the density shading — plus the
 * resonance badge.
 *
 * ── The frequency slider and the ladder are two ways to do one thing ──────────
 *
 * The slider sweeps continuously over this pipe's own ladder (with fine and
 * coarse arrow buttons for the last few hertz, and a tick at every mode), so a
 * learner can *hunt* for a resonance and see that almost nowhere works. The ladder (a separate node) snaps to an exact mode,
 * so they can also just *be* at one. Neither alone teaches the whole idea: the
 * sweep shows that the pipe is selective, the ladder shows what it selects.
 *
 * The sweep button beside the slider's title runs the hunt automatically, from
 * the bottom of the range to the top, so every resonance swells and fades in turn
 * and the pipe's selectivity shows without any dragging.
 *
 * The badge reports which of the two states the pipe is currently in, and it is
 * derived from the same model Property the physics uses, so it cannot disagree with
 * what the pipe is doing.
 */

import type { Property } from "scenerystack/axon";
import { DerivedProperty } from "scenerystack/axon";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { PipeTermination } from "../../common/model/PipeTermination.js";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StandingWavesNumberControl } from "../../common/view/StandingWavesNumberControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { StandingWavesModel } from "../model/StandingWavesModel.js";
import { DriveFrequencyControl } from "./DriveFrequencyControl.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);
const BADGE_FONT = new PhetFont({ size: 13, weight: "bold" });

const PANEL_WIDTH = 200;

export class StandingWavesControlPanel extends StandingWavesPanel {
  public readonly terminationRadioButtons: Node;
  public readonly frequencyControl: Node;
  public readonly lengthControl: Node;
  public readonly driverCheckbox: Node;
  public readonly nodesCheckbox: Node;
  public readonly densityCheckbox: Node;

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

    const frequencyControl = new DriveFrequencyControl(
      pipe,
      standingWaves.driveFrequencyStringProperty,
      a11y.controls.driveFrequencyStringProperty,
      units.hertzStringProperty,
      { trackWidth: PANEL_WIDTH - 20, sweepAccessibleName: a11y.controls.sweepStringProperty },
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
          badge,
          lengthControl,
          driverCheckbox,
          nodesCheckbox,
          densityCheckbox,
        ],
      }),
    );

    this.terminationRadioButtons = terminationRadioButtons;
    this.frequencyControl = frequencyControl;
    this.lengthControl = lengthControl;
    this.driverCheckbox = driverCheckbox;
    this.nodesCheckbox = nodesCheckbox;
    this.densityCheckbox = densityCheckbox;

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
