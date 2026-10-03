/**
 * HarmonicSpectrumNode.ts
 *
 * The harmonics a pipe can sound, as bars against frequency.
 *
 * ── Why bars, and why against frequency ───────────────────────────────────────
 *
 * Placing the bars at their **frequencies** rather than at their harmonic numbers is
 * what makes the flute/clarinet comparison land. Two pipes of the same length put
 * their bars in visibly different places: the flute's are evenly spaced from c/2L
 * up, the clarinet's start an octave lower at c/4L and then skip every other slot.
 * Plotted against harmonic number instead, both would be a row of bars at 1, 2, 3, …
 * and the octave would vanish.
 *
 * ── What sets a bar's height ──────────────────────────────────────────────────
 *
 * The steady-state amplitude the pipe gives that mode under an equal-per-mode
 * excitation — `PipeModalModel.resonantAmplitude`, F·Qₕ/ωₕ², which falls as 1/h. That rolloff
 * is a property of the pipe's own response, derived by the model, not a timbre curve
 * painted on to make the picture look plausible. The bars are the *pipe's*
 * contribution to the sound; the reed or jet supplies its own envelope on top, which
 * this screen deliberately does not model (see doc/model.md).
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { BarPlot } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import type { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { allowedHarmonics, PipeTermination } from "../../common/model/PipeTermination.js";
import { ChartFrame } from "../../common/view/ChartFrame.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { MODE_COUNT } from "../../StandingWavesConstants.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const TICK_FONT = new PhetFont(10);

/** Bar width in view pixels. */
const BAR_WIDTH = 9;

/**
 * Top of the frequency axis (Hz). Fixed across every preset — a per-instrument axis
 * would rescale under the learner and destroy the comparison the screen exists for.
 * Wide enough to hold the first several harmonics of the longest pipe here.
 */
const MAX_FREQUENCY_HZ = 2600;

export type HarmonicSpectrumNodeOptions = {
  viewWidth: number;
  viewHeight: number;
};

export class HarmonicSpectrumNode extends Node {
  private readonly bars: BarPlot;
  private readonly pipe: PipeModalModel;
  private readonly disposeHarmonicSpectrumNode: () => void;

  public constructor(pipe: PipeModalModel, options: HarmonicSpectrumNodeOptions) {
    super();
    this.pipe = pipe;

    const strings = StringManager.getInstance();
    const instruments = strings.getInstrumentsStrings();

    const title = new Text(instruments.spectrumTitleStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: options.viewWidth,
    });

    const frame = new ChartFrame({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      xRange: new Range(0, MAX_FREQUENCY_HZ),
      // Heights are normalised against the fundamental of the *loudest* case, so the
      // axis is 0…1 and a bar's height is readable as a fraction.
      yRange: new Range(0, 1),
      xSpacing: 500,
      xLabel: strings.getAxes().frequencyStringProperty,
      yLabel: strings.getAxes().relativeAmplitudeStringProperty,
      showZeroLine: false,
      createXTickLabel: (value: number) =>
        new Text(`${value}`, { font: TICK_FONT, fill: StandingWavesColors.axisColorProperty }),
    });

    this.bars = new BarPlot(frame.chartTransform, [], {
      barWidth: BAR_WIDTH,
      pointToPaintableFields: () => ({ fill: StandingWavesColors.pressureColorProperty.value }),
    });
    frame.plotLayer.addChild(this.bars);

    title.left = 0;
    title.bottom = -6;
    frame.y = 0;
    this.addChild(title);
    this.addChild(frame);

    // The bar set is a function of the pipe's geometry alone, not of the frame clock,
    // so it is rebuilt only when the geometry changes.
    const rebuild = (): void => this.updateBars();
    pipe.terminationProperty.link(rebuild);
    pipe.pipeLengthProperty.link(rebuild);

    this.disposeHarmonicSpectrumNode = () => {
      pipe.terminationProperty.unlink(rebuild);
      pipe.pipeLengthProperty.unlink(rebuild);
    };

    this.updateBars();
  }

  /** Rebuilds the bar set from the pipe's current mode ladder. */
  private updateBars(): void {
    const termination: PipeTermination = this.pipe.terminationProperty.value;
    const harmonics = allowedHarmonics(termination, MODE_COUNT);

    // Normalised against this pipe's own fundamental, so the tallest bar is always 1
    // and the *shape* of the rolloff is what differs between instruments — not an
    // overall loudness, which this model has no business claiming.
    const reference = this.pipe.resonantAmplitude(harmonics[0] ?? 1);

    const dataSet: Vector2[] = [];
    for (const harmonic of harmonics) {
      const frequency = this.pipe.getModeFrequency(harmonic);
      if (frequency > MAX_FREQUENCY_HZ) {
        break;
      }
      const height = reference > 0 ? this.pipe.resonantAmplitude(harmonic) / reference : 0;
      dataSet.push(new Vector2(frequency, height));
    }
    this.bars.setDataSet(dataSet);
  }

  public override dispose(): void {
    this.disposeHarmonicSpectrumNode();
    super.dispose();
  }
}

/** "All harmonics" / "Odd harmonics only", from the current termination. */
export function createHarmonicSeriesLabelProperty(pipe: PipeModalModel): TReadOnlyProperty<string> {
  const instruments = StringManager.getInstance().getInstrumentsStrings();
  return new DerivedProperty(
    [pipe.terminationProperty, instruments.allHarmonicsStringProperty, instruments.oddHarmonicsOnlyStringProperty],
    (termination: PipeTermination, all: string, odd: string) =>
      termination === PipeTermination.CLOSED_OPEN ? odd : all,
  );
}
