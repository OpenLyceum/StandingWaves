/**
 * StandingWavesNumberControl.ts
 *
 * A NumberControl themed for this sim's panels: title left, value right, slider
 * underneath.
 *
 * It exists to make two things decisions rather than defaults:
 *
 *   - **an accessible name is required**, because a slider nobody can name is a
 *     slider a screen-reader user cannot use;
 *   - **the keyboard steps are explicit.** The drive-frequency slider in
 *     particular spans several harmonics, and a resonance is narrower than a
 *     hundredth of that range — so arrow keys have to move in useful jumps while
 *     shift-arrow can still land inside a resonance peak.
 *
 * With `coarseDelta` the control gains a second pair of arrow buttons, laid out
 * like FineCoarseSpinner beneath a full-width slider:
 *
 *     Title
 *     ━━━━━━━━━━●━━━━━━━━━━
 *       «  ‹  [ value ]  ›  »
 *
 * The single arrows step by `delta`, the double arrows by `coarseDelta`. All four
 * stay pointer-only: keyboard access is the slider's, as in NumberControl.
 */

import type { PhetioProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, type Range, roundToInterval } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, VBox } from "scenerystack/scenery";
import { NumberControl, type NumberControlOptions, PhetFont } from "scenerystack/scenery-phet";
import { ArrowButton } from "scenerystack/sun";
import StandingWavesColors from "../../StandingWavesColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../StandingWavesButtonOptions.js";

/** Track size shared by every slider in the sim, view pixels. */
export const TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by every slider in the sim, view pixels. */
export const THUMB_SIZE = new Dimension2(13, 24);

export const TITLE_FONT = new PhetFont(13);
export const VALUE_FONT = new PhetFont({ size: 13, weight: "bold" });

type SelfOptions = {
  /** Accessible name; required, since every control needs one. */
  readonly accessibleName: TReadOnlyProperty<string>;

  /** Unit pattern containing `{{value}}`; omit for a bare number. */
  readonly valuePattern?: TReadOnlyProperty<string>;

  /** Digits after the decimal point in the readout. */
  readonly decimals?: number;

  /** Value change per arrow key press. Defaults to a fiftieth of the range. */
  readonly keyboardStep?: number;

  /** Value change per shift-arrow press, for fine adjustment. */
  readonly shiftKeyboardStep?: number;

  /** Value change per page up / page down press. */
  readonly pageKeyboardStep?: number;

  /** Granularity the value snaps to while dragging. 0 for continuous. */
  readonly delta?: number;

  /** Width of the slider track, view pixels. */
  readonly trackWidth?: number;

  /**
   * Step of a second, double-arrow pair of buttons. When set, the slider gets a
   * row to itself and both arrow pairs sit around the value beneath it.
   */
  readonly coarseDelta?: number;
};

export type StandingWavesNumberControlOptions = SelfOptions & NumberControlOptions;

export class StandingWavesNumberControl extends NumberControl {
  private readonly disposeStandingWavesNumberControl: () => void;

  public constructor(
    title: TReadOnlyProperty<string> | string,
    valueProperty: PhetioProperty<number>,
    range: Range,
    providedOptions: StandingWavesNumberControlOptions,
  ) {
    const keyboardStep = providedOptions.keyboardStep ?? range.getLength() / 50;

    const delta = providedOptions.delta ?? 0;
    const coarseDelta = providedOptions.coarseDelta;

    // The coarse pair mirrors NumberControl's own arrow buttons: snapped to the
    // fine delta, clamped to the range, and with no PDOM content of their own.
    const createCoarseButton = (direction: "left" | "right"): ArrowButton =>
      new ArrowButton(
        direction,
        () => {
          const sign = direction === "left" ? -1 : 1;
          const step = valueProperty.value + sign * (coarseDelta ?? 0);
          valueProperty.value = range.constrainValue(delta > 0 ? roundToInterval(step, delta) : step);
        },
        { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, numberOfArrows: 2, arrowSpacing: -7, tagName: null },
      );
    const coarseButtons =
      coarseDelta === undefined
        ? null
        : { decrement: createCoarseButton("left"), increment: createCoarseButton("right") };

    const options = optionize<StandingWavesNumberControlOptions, EmptySelfOptions, NumberControlOptions>()(
      {
        layoutFunction: coarseButtons
          ? (titleNode, numberDisplay, slider, decrementButton, incrementButton) => {
              // Match the fine buttons, which NumberControl scales to the readout.
              const scale = decrementButton?.getScaleVector().x ?? 1;
              coarseButtons.decrement.setScaleMagnitude(scale);
              coarseButtons.increment.setScaleMagnitude(scale);
              titleNode.layoutOptions = { align: "left" };
              return new VBox({
                spacing: 4,
                children: [
                  titleNode,
                  slider,
                  new HBox({
                    spacing: 6,
                    children: [
                      coarseButtons.decrement,
                      ...(decrementButton ? [decrementButton] : []),
                      numberDisplay,
                      ...(incrementButton ? [incrementButton] : []),
                      coarseButtons.increment,
                    ],
                  }),
                ],
              });
            }
          : NumberControl.createLayoutFunction4({ verticalSpacing: 2 }),
        delta,
        titleNodeOptions: {
          font: TITLE_FONT,
          fill: StandingWavesColors.textColorProperty,
          maxWidth: 130,
        },
        numberDisplayOptions: {
          decimalPlaces: providedOptions.decimals ?? 1,
          textOptions: {
            font: VALUE_FONT,
            fill: StandingWavesColors.accentColorProperty,
          },
          backgroundFill: null,
          backgroundStroke: null,
          ...(providedOptions.valuePattern && { valuePattern: providedOptions.valuePattern }),
        },
        arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
        sliderOptions: {
          trackSize: new Dimension2(providedOptions.trackWidth ?? TRACK_SIZE.width, TRACK_SIZE.height),
          thumbSize: THUMB_SIZE,
          trackFillEnabled: StandingWavesColors.textColorProperty,
          thumbFill: StandingWavesColors.accentColorProperty,
          keyboardStep,
          shiftKeyboardStep: providedOptions.shiftKeyboardStep ?? keyboardStep / 10,
          pageKeyboardStep: providedOptions.pageKeyboardStep ?? keyboardStep * 5,
        },
      },
      providedOptions,
    );

    super(title, valueProperty, range, options);

    const updateCoarseEnabled = (value: number): void => {
      if (coarseButtons) {
        coarseButtons.decrement.enabled = value > range.min;
        coarseButtons.increment.enabled = value < range.max;
      }
    };
    valueProperty.link(updateCoarseEnabled);

    this.disposeStandingWavesNumberControl = () => {
      valueProperty.unlink(updateCoarseEnabled);
      coarseButtons?.decrement.dispose();
      coarseButtons?.increment.dispose();
    };
  }

  public override dispose(): void {
    this.disposeStandingWavesNumberControl();
    super.dispose();
  }
}
