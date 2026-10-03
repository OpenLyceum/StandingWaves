/**
 * InstrumentsKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 *
 * The harmonic chart takes the arrow keys to choose the mode the pipe sounds; basic
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

export class InstrumentsKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const controls = StringManager.getInstance().getInstrumentsA11yStrings().controls;
    const harmonicSection = new KeyboardHelpSection(controls.keyboardHelpTitleStringProperty, [
      KeyboardHelpSectionRow.labelWithIcon(
        controls.keyboardHelpStepStringProperty,
        KeyboardHelpIconFactory.arrowKeysRowIcon(),
      ),
    ]);
    super([harmonicSection, new TimeControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
