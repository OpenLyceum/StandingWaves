/**
 * InstrumentsKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 *
 * The harmonic chart takes the arrow keys to choose the mode the pipe sounds, and Home /
 * End to jump to the lowest / highest one (rows from HarmonicSpectrumHotkeyData); basic
 * actions cover the instrument radio group and the checkboxes. The playback section
 * is included because pausing is how a learner holds the standing wave still to
 * compare its shape with the next instrument's.
 */

import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import { HarmonicSpectrumHotkeyData } from "./HarmonicSpectrumHotkeyData.js";

export class InstrumentsKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const controls = StringManager.getInstance().getInstrumentsA11yStrings().controls;
    const harmonicSection = new KeyboardHelpSection(controls.keyboardHelpTitleStringProperty, [
      // One arrow-keys icon reads better than four alternatives joined by "or".
      KeyboardHelpSectionRow.fromHotkeyData(HarmonicSpectrumHotkeyData.STEP, {
        icon: KeyboardHelpIconFactory.arrowKeysRowIcon(),
      }),
      KeyboardHelpSectionRow.fromHotkeyData(HarmonicSpectrumHotkeyData.JUMP_TO_END),
    ]);
    super([harmonicSection, new TimeControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
