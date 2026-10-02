/**
 * Play / pause / step plus SceneryStack's Normal and Slow speed radios.
 *
 * The play/pause button stays the layout origin inside TimeControlNode, and the
 * speed radios sit to its left so a right-aligned control grows into the screen
 * rather than past the right edge.
 */

import { TimeControlNode, TimeSpeed } from "scenerystack/scenery-phet";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../StandingWavesButtonOptions.js";
import type { TimeModel } from "../TimeModel.js";

const SPEED_RADIO_SPACING = 16;

export function createTimeControl(timer: TimeModel, stepListener: () => void): TimeControlNode {
  return new TimeControlNode(timer.isPlayingProperty, {
    timeSpeedProperty: timer.timeSpeedProperty,
    timeSpeeds: [TimeSpeed.NORMAL, TimeSpeed.SLOW],
    speedRadioButtonGroupPlacement: "left",
    flowBoxSpacing: SPEED_RADIO_SPACING,
    ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    playPauseStepButtonOptions: {
      ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
      stepForwardButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
        listener: stepListener,
      },
    },
  });
}
