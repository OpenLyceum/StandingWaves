/**
 * HarmonicSpectrumHotkeyData.ts
 *
 * Keys of the harmonic chart (HarmonicSpectrumNode), declared once so its
 * KeyboardListener and the Instruments keyboard-help rows cannot drift: the
 * arrows step through the modes the pipe can sound, Home and End jump to the
 * lowest and highest visible mode.
 */

import { HotkeyData } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";

const controls = StringManager.getInstance().getInstrumentsA11yStrings().controls;

export const HarmonicSpectrumHotkeyData = {
  STEP: new HotkeyData({
    keys: ["arrowRight", "arrowUp", "arrowLeft", "arrowDown"],
    repoName: "standing-waves",
    keyboardHelpDialogLabelStringProperty: controls.keyboardHelpStepStringProperty,
  }),
  JUMP_TO_END: new HotkeyData({
    keys: ["home", "end"],
    repoName: "standing-waves",
    keyboardHelpDialogLabelStringProperty: controls.keyboardHelpJumpStringProperty,
  }),
} as const;
