/**
 * DriveFrequencyControl.ts
 *
 * The drive-frequency slider of the Standing Waves screen, with a tick at every
 * mode the current pipe has.
 *
 *     Drive frequency
 *      1    2    3    4    5    6    7    8
 *     ━┿━━━━┿━━━━┿━━━━●━━━━┿━━━━┿━━━━┿━━━━┿━
 *       «  ‹  [ 686 Hz ]  ›  »
 *
 * ── Why not StandingWavesNumberControl ──────────────────────────────────────
 *
 * NumberControl takes a fixed Range. A fixed range has to cover every pipe the
 * learner can build — 21 Hz to 2.2 kHz — which leaves a resonance about one pixel
 * wide. This slider's range is the model's `driveFrequencyRangeProperty`, a fixed
 * span of *this pipe's* harmonics, which Slider accepts directly.
 *
 * Because that span is a multiple of f₁, harmonic h always sits at the same
 * fraction of the track, so the ticks are placed once and only their visibility
 * changes: a stopped pipe hides the even ones, since it has no mode there.
 * Slider's own ticks can't do this — they are pinned to a value, not to a
 * fraction, and can be neither moved nor removed.
 *
 * The look matches StandingWavesNumberControl's coarse/fine layout, and the
 * readout supplies the slider's aria-valuetext exactly as NumberControl does.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import { Dimension2, Range, roundToInterval } from "scenerystack/dot";
import { HBox, Line, Node, Text, VBox } from "scenerystack/scenery";
import { NumberDisplay, PhetFont } from "scenerystack/scenery-phet";
import { ArrowButton, Slider } from "scenerystack/sun";
import type { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { isModeAllowed } from "../../common/model/PipeTermination.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/StandingWavesButtonOptions.js";
import { THUMB_SIZE, TITLE_FONT, TRACK_SIZE, VALUE_FONT } from "../../common/view/StandingWavesNumberControl.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { DRIVE_FREQUENCY_RANGE_HARMONICS } from "../../StandingWavesConstants.js";

/** Snap while dragging, and the fine arrows' step (Hz). */
const FINE_STEP_HZ = 1;

/**
 * The coarse arrows' step (Hz). Every resonance is f₁/Q₁ wide — about 14 Hz at
 * the default pipe — so both arrow steps stay under it and neither can jump over
 * a peak.
 */
const COARSE_STEP_HZ = 10;

/**
 * Stroke of the slider track. Set explicitly because Slider maps the range onto
 * the track's interior, trackWidth − lineWidth, and the ticks must use the same.
 */
const TRACK_LINE_WIDTH = 1;

/** Tick length above the top of the track (view px), clear of the thumb's top. */
const TICK_LENGTH = 16;

const TICK_LABEL_FONT = new PhetFont(10);

export type DriveFrequencyControlOptions = {
  /** Width of the slider track, view pixels. */
  readonly trackWidth: number;
};

/** One tick: the harmonic it marks, its line, and its number. */
export type DriveFrequencyTick = {
  readonly harmonic: number;
  readonly line: Line;
  readonly label: Text;
};

export class DriveFrequencyControl extends VBox {
  /** The slider; tick x positions are in its local frame. */
  public readonly slider: Slider;

  /** One tick per harmonic within reach, in ascending order. */
  public readonly ticks: readonly DriveFrequencyTick[];

  private readonly disposeDriveFrequencyControl: () => void;

  public constructor(
    pipe: PipeModalModel,
    title: TReadOnlyProperty<string>,
    accessibleName: TReadOnlyProperty<string>,
    valuePattern: TReadOnlyProperty<string>,
    options: DriveFrequencyControlOptions,
  ) {
    const frequencyProperty = pipe.driveFrequencyProperty;
    const rangeProperty = pipe.driveFrequencyRangeProperty;

    // Sized for the widest value any pipe can reach, so the layout never jumps.
    const numberDisplay = new NumberDisplay(frequencyProperty, new Range(0, 9999), {
      decimalPlaces: 0,
      valuePattern,
      textOptions: { font: VALUE_FONT, fill: StandingWavesColors.accentColorProperty },
      backgroundFill: null,
      backgroundStroke: null,
    });

    // The slider gets a proxy of the model's range, owned and disposed here, for
    // two reasons: given only a range Property, Slider adopts it as its enabled
    // range and disposes it with itself; and SliderTrack never disposes the
    // DerivedProperty it hangs on the range, which would leave a listener on the
    // model's Property after this control is gone.
    const sliderRangeProperty = new DerivedProperty([rangeProperty], (range: Range) => range);

    const slider = new Slider(frequencyProperty, sliderRangeProperty, {
      enabledRangeProperty: sliderRangeProperty,
      trackSize: new Dimension2(options.trackWidth, TRACK_SIZE.height),
      trackLineWidth: TRACK_LINE_WIDTH,
      thumbSize: THUMB_SIZE,
      thumbTouchAreaXDilation: 6,
      trackFillEnabled: StandingWavesColors.textColorProperty,
      thumbFill: StandingWavesColors.accentColorProperty,
      constrainValue: (value: number) => roundToInterval(value, FINE_STEP_HZ),
      keyboardStep: COARSE_STEP_HZ,
      shiftKeyboardStep: FINE_STEP_HZ,
      pageKeyboardStep: 50,
      accessibleName,
      pdomCreateAriaValueText: () => numberDisplay.accessibleValueStringProperty.value,
      pdomDependencies: [numberDisplay.accessibleValueStringProperty],
    });

    // ── Ticks, one per rung of this pipe's ladder ─────────────────────────────
    // Positioned by .x against the slider's own origin (the left end of the track
    // interior), never by bounds, so a tick sits exactly where the thumb centres
    // when the drive is on that harmonic.
    const interiorWidth = options.trackWidth - TRACK_LINE_WIDTH;
    const span = DRIVE_FREQUENCY_RANGE_HARMONICS;
    const ticks: DriveFrequencyTick[] = [];
    for (let harmonic = Math.ceil(span.min); harmonic <= Math.floor(span.max); harmonic++) {
      const x = (interiorWidth * (harmonic - span.min)) / span.getLength();
      const line = new Line(x, 0, x, -TICK_LENGTH, { lineWidth: 1 });
      const label = new Text(`${harmonic}`, { font: TICK_LABEL_FONT, centerX: x, bottom: -TICK_LENGTH - 1 });
      ticks.push({ harmonic, line, label });
    }
    // Behind the slider, so the thumb passes over the ticks rather than under them.
    const sliderWithTicks = new Node({
      children: [...ticks.flatMap((tick) => [tick.line, tick.label]), slider],
    });

    const terminationListener = (): void => {
      for (const tick of ticks) {
        const visible = isModeAllowed(tick.harmonic, pipe.terminationProperty.value);
        tick.line.visible = visible;
        tick.label.visible = visible;
      }
    };
    pipe.terminationProperty.link(terminationListener);

    // The tick of the mode the pipe is resonating in takes the badge's colour.
    const tickColorMultilink: UnknownMultilink = Multilink.multilink(
      [pipe.nearestHarmonicProperty, pipe.isAtResonanceProperty, pipe.isDrivingProperty],
      (nearest: number, atResonance: boolean, isDriving: boolean) => {
        for (const tick of ticks) {
          const lit = isDriving && atResonance && tick.harmonic === nearest;
          const color = lit ? StandingWavesColors.resonanceBadgeColorProperty : StandingWavesColors.axisColorProperty;
          tick.line.stroke = color;
          tick.label.fill = color;
        }
      },
    );

    // ── Fine and coarse arrows, pointer-only like NumberControl's ─────────────
    const createArrow = (direction: "left" | "right", step: number, numberOfArrows: 1 | 2): ArrowButton =>
      new ArrowButton(
        direction,
        () => {
          const sign = direction === "left" ? -1 : 1;
          const proposed = roundToInterval(frequencyProperty.value + sign * step, FINE_STEP_HZ);
          frequencyProperty.value = rangeProperty.value.constrainValue(proposed);
        },
        {
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          tagName: null,
          ...(numberOfArrows === 2 && { numberOfArrows: 2, arrowSpacing: -7 }),
        },
      );
    const coarseDecrement = createArrow("left", COARSE_STEP_HZ, 2);
    const fineDecrement = createArrow("left", FINE_STEP_HZ, 1);
    const fineIncrement = createArrow("right", FINE_STEP_HZ, 1);
    const coarseIncrement = createArrow("right", COARSE_STEP_HZ, 2);
    const arrows = [coarseDecrement, fineDecrement, fineIncrement, coarseIncrement];

    // Scaled to the readout, as NumberControl scales its own arrows.
    const arrowScale = numberDisplay.height / fineDecrement.height;
    for (const arrow of arrows) {
      arrow.setScaleMagnitude(arrowScale);
    }

    const arrowEnabledMultilink: UnknownMultilink = Multilink.multilink(
      [frequencyProperty, rangeProperty],
      (frequency: number, range: Range) => {
        coarseDecrement.enabled = fineDecrement.enabled = frequency > range.min;
        coarseIncrement.enabled = fineIncrement.enabled = frequency < range.max;
      },
    );

    const titleText = new Text(title, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: 130,
    });

    super({
      align: "left",
      spacing: 4,
      children: [
        titleText,
        sliderWithTicks,
        new HBox({
          spacing: 6,
          children: [coarseDecrement, fineDecrement, numberDisplay, fineIncrement, coarseIncrement],
          layoutOptions: { align: "center" },
        }),
      ],
    });

    this.slider = slider;
    this.ticks = ticks;

    this.disposeDriveFrequencyControl = () => {
      arrowEnabledMultilink.dispose();
      tickColorMultilink.dispose();
      pipe.terminationProperty.unlink(terminationListener);
      for (const arrow of arrows) {
        arrow.dispose();
      }
      for (const tick of ticks) {
        tick.label.dispose();
      }
      slider.dispose();
      sliderRangeProperty.dispose();
      numberDisplay.dispose();
      titleText.dispose();
    };
  }

  public override dispose(): void {
    this.disposeDriveFrequencyControl();
    super.dispose();
  }
}
