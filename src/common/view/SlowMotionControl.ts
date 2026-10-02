/** Playback speed choice shared by all four screens. */

import { Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { TimeModel } from "../TimeModel.js";

export class SlowMotionControl extends Checkbox {
  public constructor(timer: TimeModel) {
    const label = StringManager.getInstance().getSharedControls().slowMotionStringProperty;
    super(
      timer.slowMotionProperty,
      new Text(label, {
        font: new PhetFont(13),
        fill: StandingWavesColors.textColorProperty,
      }),
      {
        checkboxColor: StandingWavesColors.textColorProperty,
        checkboxColorBackground: StandingWavesColors.panelBackgroundColorProperty,
        accessibleName: label,
      },
    );
  }
}
