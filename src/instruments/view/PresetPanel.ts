import { PRESET_PANEL_SETTINGS } from "../../StandingWavesConstants.js";
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

const TITLE_FONT = new PhetFont({ size: PRESET_PANEL_SETTINGS.TITLE_FONT_SIZE, weight: "bold" });
const LABEL_FONT = new PhetFont(PRESET_PANEL_SETTINGS.LABEL_FONT_SIZE);
const PANEL_WIDTH: number = PRESET_PANEL_SETTINGS.PANEL_WIDTH;

/**
 * Outer width shared by both Instruments panels, so the column of controls has one
 * width. Small enough that the column clears the pipe's right end.
 */
export const INSTRUMENTS_PANEL_MIN_WIDTH: number = PRESET_PANEL_SETTINGS.INSTRUMENTS_PANEL_MIN_WIDTH;

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
            maxWidth: PANEL_WIDTH - PRESET_PANEL_SETTINGS.PRESET_RADIO_BUTTONS_MAX_WIDTH_OFFSET,
          }),
        options: { accessibleName: presetNameProperty(preset) },
      })),
      {
        spacing: PRESET_PANEL_SETTINGS.PRESET_RADIO_BUTTONS_SPACING,
        accessibleName: a11y.controls.instrumentStringProperty,
      },
    );

    super(
      new VBox({
        align: "left",
        spacing: PRESET_PANEL_SETTINGS.CONSTRUCTOR_SPACING,
        children: [label, presetRadioButtons],
      }),
      { minWidth: INSTRUMENTS_PANEL_MIN_WIDTH },
    );

    this.presetRadioButtons = presetRadioButtons;
  }
}
