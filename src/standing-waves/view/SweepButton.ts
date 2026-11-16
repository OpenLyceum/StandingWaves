import { SWEEP_BUTTON_SETTINGS } from "../../StandingWavesConstants.js";
/**
 * SweepButton.ts
 *
 * The toggle that starts and stops the automatic drive-frequency sweep, after the
 * Resonance sim's SweepButton: a chirp — a wave whose cycles crowd together from
 * left to right — while idle, and a stop square while a sweep is running.
 *
 * A toggle bound to `PipeModalModel.isSweepingProperty` rather than a push button
 * with a callback, so that a sweep the model ends on its own (at the top of the
 * range, or when the driver is switched off) flips the icon back without the view
 * having to be told, and so assistive technology hears the pressed state.
 */

import type { Property, TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { BooleanRectangularToggleButton } from "scenerystack/sun";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/StandingWavesButtonOptions.js";
import StandingWavesColors from "../../StandingWavesColors.js";

const ICON_WIDTH: number = SWEEP_BUTTON_SETTINGS.ICON_WIDTH;
const ICON_HEIGHT: number = SWEEP_BUTTON_SETTINGS.ICON_HEIGHT;
const ICON_LINE_WIDTH: number = SWEEP_BUTTON_SETTINGS.ICON_LINE_WIDTH;

/** Cycles per icon width at its left and right edges. */
const CHIRP_START_CYCLES: number = SWEEP_BUTTON_SETTINGS.CHIRP_START_CYCLES;
const CHIRP_END_CYCLES: number = SWEEP_BUTTON_SETTINGS.CHIRP_END_CYCLES;
const CHIRP_POINT_COUNT: number = SWEEP_BUTTON_SETTINGS.CHIRP_POINT_COUNT;

/** Sine whose instantaneous frequency rises linearly across the icon. */
function createChirpShape(): Shape {
  const shape = new Shape();
  for (let i = 0; i <= CHIRP_POINT_COUNT; i++) {
    const t = i / CHIRP_POINT_COUNT;
    const phase = 2 * Math.PI * (CHIRP_START_CYCLES * t + ((CHIRP_END_CYCLES - CHIRP_START_CYCLES) * t * t) / 2);
    const x = t * ICON_WIDTH;
    const y = (-ICON_HEIGHT / 2) * Math.sin(phase);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  return shape;
}

export class SweepButton extends BooleanRectangularToggleButton {
  public constructor(isSweepingProperty: Property<boolean>, accessibleName: TReadOnlyProperty<string>) {
    const chirpIcon = new Path(createChirpShape(), {
      stroke: LIGHT_SURFACE_TEXT_FILL,
      lineWidth: ICON_LINE_WIDTH,
      lineCap: "round",
      lineJoin: "round",
    });

    // Padded to the chirp's footprint, so the button does not resize when it toggles.
    const stopSide = ICON_HEIGHT - 2;
    const stopSquare = new Rectangle(0, 0, stopSide, stopSide, { fill: LIGHT_SURFACE_TEXT_FILL });
    stopSquare.center = chirpIcon.center;
    const stopIcon = new Node({ children: [Rectangle.bounds(chirpIcon.bounds), stopSquare] });

    super(isSweepingProperty, stopIcon, chirpIcon, {
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      baseColor: StandingWavesColors.controlSurfaceColorProperty,
      xMargin: SWEEP_BUTTON_SETTINGS.CONSTRUCTOR_X_MARGIN,
      yMargin: SWEEP_BUTTON_SETTINGS.CONSTRUCTOR_Y_MARGIN,
      accessibleName,
    });
  }
}
