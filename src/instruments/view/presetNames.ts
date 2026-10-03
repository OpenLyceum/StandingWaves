/**
 * presetNames.ts
 *
 * The localized name of each instrument preset, in one place for the selector, the
 * compare checkbox and the screen summary.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../../i18n/StringManager.js";
import { InstrumentPreset } from "../model/instrumentPresets.js";

/** The StringProperty naming a preset. */
export function presetNameProperty(preset: InstrumentPreset): TReadOnlyProperty<string> {
  const instruments = StringManager.getInstance().getInstrumentsStrings();
  return {
    [InstrumentPreset.OPEN_ORGAN_PIPE]: instruments.openOrganPipeStringProperty,
    [InstrumentPreset.STOPPED_ORGAN_PIPE]: instruments.stoppedOrganPipeStringProperty,
    [InstrumentPreset.FLUTE]: instruments.fluteStringProperty,
    [InstrumentPreset.CLARINET]: instruments.clarinetStringProperty,
  }[preset];
}
