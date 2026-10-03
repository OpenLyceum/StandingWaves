/**
 * PlayPanel.ts
 *
 * What the learner does with the instrument once it is chosen: overblow it with the
 * register key, lay its same-length partner's spectrum behind its own, and hear it.
 *
 * The note under the register key says what the key *will* do on this pipe — an
 * octave on an open pipe, a twelfth on a stopped one — and changes with the
 * instrument. It is the screen's second lesson stated where the control is, the
 * same way the readout states the first.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { InstrumentPresetValues } from "../model/instrumentPresets.js";
import { INSTRUMENTS_PANEL_MIN_WIDTH } from "./PresetPanel.js";
import { presetNameProperty } from "./presetNames.js";

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_FONT = new PhetFont(14);
const NOTE_FONT = new PhetFont(11);
/** The panel content inside StandingWavesPanel's 12 px side margins. */
const CONTENT_WIDTH = INSTRUMENTS_PANEL_MIN_WIDTH - 24;
const LABEL_MAX_WIDTH = CONTENT_WIDTH - 30;

/** Indent of the register-key note, so it sits under the label rather than the box. */
const NOTE_INDENT = 26;

export class PlayPanel extends StandingWavesPanel {
  public readonly registerKeyCheckbox: Node;
  public readonly compareCheckbox: Node;
  public readonly soundCheckbox: Node;
  private readonly disposePlayPanel: () => void;

  public constructor(model: InstrumentsModel) {
    const strings = StringManager.getInstance();
    const instruments = strings.getInstrumentsStrings();
    const a11y = strings.getInstrumentsA11yStrings();

    const checkboxOptions = {
      checkboxColor: StandingWavesColors.textColorProperty,
      checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
    };
    const label = (text: TReadOnlyProperty<string>): Text =>
      new Text(text, { font: LABEL_FONT, fill: StandingWavesColors.textColorProperty, maxWidth: LABEL_MAX_WIDTH });

    const title = new Text(instruments.playTitleStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: CONTENT_WIDTH,
    });

    // What the key does on *this* pipe: a jump to its second mode, 2 or 3.
    const registerNoteProperty = new DerivedProperty(
      [
        model.secondRegisterHarmonicProperty,
        instruments.registerKeyOctaveStringProperty,
        instruments.registerKeyTwelfthStringProperty,
      ],
      (second: number, octave: string, twelfth: string) => (second === 2 ? octave : twelfth),
    );
    const registerKeyCheckbox = new Checkbox(model.registerKeyProperty, label(instruments.registerKeyStringProperty), {
      ...checkboxOptions,
      accessibleName: a11y.controls.registerKeyStringProperty,
      accessibleHelpText: registerNoteProperty,
    });
    const registerNote = new Text(registerNoteProperty, {
      font: NOTE_FONT,
      fill: StandingWavesColors.axisColorProperty,
      maxWidth: CONTENT_WIDTH - NOTE_INDENT,
      x: NOTE_INDENT,
    });

    // Depends on every instrument name, so the label follows a locale change of
    // whichever one is the partner.
    const compareLabelProperty = DerivedProperty.deriveAny(
      [
        model.partnerPresetProperty,
        instruments.compareWithStringProperty,
        ...InstrumentPresetValues.map(presetNameProperty),
      ],
      () =>
        instruments.compareWithStringProperty.value.replace(
          "{{instrument}}",
          presetNameProperty(model.partnerPresetProperty.value).value,
        ),
    );
    const compareCheckbox = new Checkbox(model.showPartnerProperty, label(compareLabelProperty), {
      ...checkboxOptions,
      accessibleName: compareLabelProperty,
    });

    const soundCheckbox = new Checkbox(model.isToneOnProperty, label(instruments.playSoundStringProperty), {
      ...checkboxOptions,
      accessibleName: a11y.controls.playSoundStringProperty,
    });

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          title,
          new VBox({ align: "left", spacing: 3, children: [registerKeyCheckbox, registerNote] }),
          compareCheckbox,
          soundCheckbox,
        ],
      }),
      { minWidth: INSTRUMENTS_PANEL_MIN_WIDTH },
    );

    this.registerKeyCheckbox = registerKeyCheckbox;
    this.compareCheckbox = compareCheckbox;
    this.soundCheckbox = soundCheckbox;

    this.disposePlayPanel = () => {
      registerKeyCheckbox.dispose();
      compareCheckbox.dispose();
      soundCheckbox.dispose();
      registerNote.dispose();
      registerNoteProperty.dispose();
      compareLabelProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposePlayPanel();
    super.dispose();
  }
}
