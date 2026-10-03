/**
 * PresetPanel.ts
 *
 * The instrument selector.
 *
 * Ordered as two same-length pairs — the two organ pipes, then flute and clarinet —
 * so that stepping down the list with the arrow keys walks straight into the
 * comparison the screen is for: each pair differs only in how one end is terminated.
 */

import type { Property } from "scenerystack/axon";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { InstrumentPreset } from "../model/instrumentPresets.js";
import { presetNameProperty } from "./presetNames.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);
const PANEL_WIDTH = 190;

/**
 * Outer width shared by both Instruments panels, so the column of controls has one
 * width. Small enough that the column clears the pipe's right end.
 */
export const INSTRUMENTS_PANEL_MIN_WIDTH = 184;

export class PresetPanel extends StandingWavesPanel {
  public readonly presetRadioButtons: Node;

  public constructor(model: InstrumentsModel) {
    const strings = StringManager.getInstance();
    const instruments = strings.getInstrumentsStrings();
    const a11y = strings.getInstrumentsA11yStrings();

    const label = new Text(instruments.instrumentStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    const presetRadioButtons = new VerticalAquaRadioButtonGroup<InstrumentPreset>(
      model.presetProperty as Property<InstrumentPreset>,
      [
        InstrumentPreset.OPEN_ORGAN_PIPE,
        InstrumentPreset.STOPPED_ORGAN_PIPE,
        InstrumentPreset.FLUTE,
        InstrumentPreset.CLARINET,
      ].map((preset) => ({
        value: preset,
        createNode: () =>
          new Text(presetNameProperty(preset), {
            font: LABEL_FONT,
            fill: StandingWavesColors.textColorProperty,
            maxWidth: PANEL_WIDTH - 30,
          }),
        options: { accessibleName: presetNameProperty(preset) },
      })),
      { spacing: 8, accessibleName: a11y.controls.instrumentStringProperty },
    );

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [label, presetRadioButtons],
      }),
      { minWidth: INSTRUMENTS_PANEL_MIN_WIDTH },
    );

    this.presetRadioButtons = presetRadioButtons;
  }
}
