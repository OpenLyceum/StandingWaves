/**
 * HarmonicSpectrumNode.ts
 *
 * The harmonics a pipe can sound, as bars against frequency — and the control for
 * which one it sounds.
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
 *
 * ── Choosing a harmonic ───────────────────────────────────────────────────────
 *
 * Clicking a bar sounds that mode. The slots a stopped pipe lacks are drawn as empty
 * sockets and are clickable too: they answer "no mode here" rather than nothing, so
 * the missing harmonics are something a learner tries and fails at, not only a gap.
 * The bars of the note being sounded — the sounding mode and the modes at whole
 * multiples of it, which is what the tone plays — are drawn solid; the rest dim.
 *
 * Keyboard users step through the *existing* modes with the arrow keys. They never
 * land on a missing slot; for them the screen summary states the odd-only series.
 *
 * ── The partner overlay ───────────────────────────────────────────────────────
 *
 * "Compare" draws the same-length partner's bars as dashed outlines, normalised the
 * same way. A flute's bars land exactly in a clarinet's empty sockets and between its
 * bars, so the octave and the missing harmonics are visible at once rather than by
 * flipping back and forth.
 */

import { DerivedProperty, stepTimer, type TimerListener, type TReadOnlyProperty } from "scenerystack/axon";
import { BarPlot } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { KeyboardListener, Node, Path, Rectangle, type SceneryEvent, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import type { PipeModalModel } from "../../common/model/PipeModalModel.js";
import { fundamentalFrequency, isModeAllowed, PipeTermination } from "../../common/model/PipeTermination.js";
import { ChartFrame } from "../../common/view/ChartFrame.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { type InstrumentPreset, specFor } from "../model/instrumentPresets.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const HINT_FONT = new PhetFont(11);
const TICK_FONT = new PhetFont(10);
const MESSAGE_FONT = new PhetFont({ size: 12, weight: "bold" });

/**
 * Bar width in view pixels. Narrow enough that a pipe's bars and its partner's
 * outlines, which interleave one slot apart, stay separate on the stopped organ
 * pipe, whose slots are closest (70 Hz, about 8 px).
 */
const BAR_WIDTH = 4;

/** Partner outlines match the bars: the two sets interleave and never coincide. */
const GHOST_WIDTH = BAR_WIDTH;

/** Gap between a sounding bar and its selection outline, in view pixels. */
const OUTLINE_PAD = 2;

/** Height of an empty socket, in view pixels. */
const SOCKET_HEIGHT = 10;

/** Opacity of a bar that is not part of the note being sounded. */
const DIMMED_OPACITY = 0.35;

/** How long the "no mode here" message stays up (ms of wall time). */
const MESSAGE_DURATION_MS = 2500;

/**
 * Top of the frequency axis (Hz). Fixed across every preset — a per-instrument axis
 * would rescale under the learner and destroy the comparison the screen exists for.
 * Wide enough to hold the first several harmonics of the longest pipe here.
 */
const MAX_FREQUENCY_HZ = 3500;

/**
 * Top of the amplitude axis. Heights are normalised against the pipe's own
 * fundamental, so the tallest bar is 1; the margin above it leaves room inside the
 * clipped plot for the selection outline.
 */
const MAX_RELATIVE_AMPLITUDE = 1.12;

export type HarmonicSpectrumNodeOptions = {
  viewWidth: number;
  viewHeight: number;
};

export class HarmonicSpectrumNode extends Node {
  private readonly model: InstrumentsModel;
  private readonly frame: ChartFrame;
  private readonly soundingBars: BarPlot;
  private readonly otherBars: BarPlot;
  private readonly ghostPath: Path;
  private readonly socketsPath: Path;
  private readonly selectionOutline: Path;
  private readonly message: Text;
  private messageTimer: TimerListener | null = null;
  private readonly disposeHarmonicSpectrumNode: () => void;

  public constructor(model: InstrumentsModel, options: HarmonicSpectrumNodeOptions) {
    super();
    this.model = model;
    const pipe = model.pipe;

    const strings = StringManager.getInstance();
    const instruments = strings.getInstrumentsStrings();
    const a11y = strings.getInstrumentsA11yStrings();

    const title = new Text(instruments.spectrumTitleStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: options.viewWidth * 0.6,
    });
    const hint = new Text(instruments.spectrumHintStringProperty, {
      font: HINT_FONT,
      fill: StandingWavesColors.axisColorProperty,
      maxWidth: options.viewWidth * 0.38,
    });

    this.frame = new ChartFrame({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      xRange: new Range(0, MAX_FREQUENCY_HZ),
      yRange: new Range(0, MAX_RELATIVE_AMPLITUDE),
      xSpacing: 500,
      xLabel: strings.getAxes().frequencyStringProperty,
      yLabel: strings.getAxes().relativeAmplitudeStringProperty,
      showZeroLine: false,
      createXTickLabel: (value: number) =>
        new Text(`${value}`, { font: TICK_FONT, fill: StandingWavesColors.axisColorProperty }),
    });
    const plot = this.frame.plotLayer;

    this.ghostPath = new Path(null, {
      stroke: StandingWavesColors.pressureColorProperty,
      lineWidth: 1,
      lineDash: [3, 2],
    });
    this.socketsPath = new Path(null, {
      stroke: StandingWavesColors.forbiddenHarmonicColorProperty,
      lineWidth: 1,
      lineDash: [2, 2],
    });
    const barOptions = {
      barWidth: BAR_WIDTH,
      pointToPaintableFields: () => ({ fill: StandingWavesColors.pressureColorProperty.value }),
    };
    this.otherBars = new BarPlot(this.frame.chartTransform, [], { ...barOptions, opacity: DIMMED_OPACITY });
    this.soundingBars = new BarPlot(this.frame.chartTransform, [], barOptions);
    this.selectionOutline = new Path(null, {
      stroke: StandingWavesColors.textColorProperty,
      lineWidth: 1.5,
    });

    this.message = new Text("", {
      font: MESSAGE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: options.viewWidth - 20,
      visible: false,
    });

    // One hit target over the whole plot, mapped to the nearest slot. It is also the
    // keyboard focus target, so its focus highlight frames the chart it controls.
    const hitArea = new Rectangle(0, 0, options.viewWidth, options.viewHeight, {
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.harmonicStringProperty,
      accessibleHelpText: a11y.controls.harmonicHelpStringProperty,
    });

    plot.children = [this.ghostPath, this.socketsPath, this.otherBars, this.soundingBars, this.selectionOutline];
    this.message.centerX = options.viewWidth / 2;
    this.message.top = 4;
    this.frame.addChild(this.message);
    this.frame.addChild(hitArea);

    title.left = 0;
    title.bottom = -6;
    hint.right = options.viewWidth;
    hint.bottom = title.bottom;
    this.addChild(title);
    this.addChild(hint);
    this.addChild(this.frame);

    hitArea.addInputListener({
      down: (event: SceneryEvent) => {
        if (!event.canStartPress()) {
          return;
        }
        const x = hitArea.globalToLocalPoint(event.pointer.point).x;
        const slot = this.slotAt(this.frame.chartTransform.viewToModelX(x));
        if (slot !== null) {
          this.choose(slot, hitArea);
        }
      },
    });

    const harmonicResponse = (harmonic: number): string =>
      a11y.controls.harmonicResponseStringProperty.value
        .replace("{{harmonic}}", `${harmonic}`)
        .replace("{{frequency}}", pipe.getModeFrequency(harmonic).toFixed(0));

    // Arrow keys walk the modes the pipe has, in either direction; Home and End jump
    // to the ends of the visible ladder.
    hitArea.addInputListener(
      new KeyboardListener({
        keys: ["arrowRight", "arrowUp", "arrowLeft", "arrowDown", "home", "end"] as const,
        fire: (_event, keysPressed) => {
          const harmonics = this.visibleHarmonics();
          const index = harmonics.indexOf(model.soundingHarmonicProperty.value);
          const last = harmonics.length - 1;
          const next =
            keysPressed === "home"
              ? 0
              : keysPressed === "end"
                ? last
                : keysPressed === "arrowRight" || keysPressed === "arrowUp"
                  ? Math.min(index + 1, last)
                  : Math.max(index - 1, 0);
          const harmonic = harmonics[next];
          if (harmonic !== undefined && harmonic !== model.soundingHarmonicProperty.value) {
            model.selectHarmonic(harmonic);
            hitArea.addAccessibleResponse(harmonicResponse(harmonic));
          }
        },
      }),
    );

    // The bar set is a function of the pipe's geometry and the sounding mode, not of
    // the frame clock, so it is rebuilt only when one of those changes.
    const rebuild = (): void => this.updateBars();
    pipe.terminationProperty.link(rebuild);
    pipe.pipeLengthProperty.link(rebuild);
    model.soundingHarmonicProperty.link(rebuild);

    const partnerSpecProperty = new DerivedProperty([model.partnerPresetProperty], (preset: InstrumentPreset) =>
      specFor(preset),
    );
    const updateGhost = (): void => this.updateGhost(partnerSpecProperty.value);
    partnerSpecProperty.link(updateGhost);
    const onShowPartner = (show: boolean): void => {
      this.ghostPath.visible = show;
    };
    model.showPartnerProperty.link(onShowPartner);

    this.disposeHarmonicSpectrumNode = () => {
      pipe.terminationProperty.unlink(rebuild);
      pipe.pipeLengthProperty.unlink(rebuild);
      model.soundingHarmonicProperty.unlink(rebuild);
      model.showPartnerProperty.unlink(onShowPartner);
      partnerSpecProperty.unlink(updateGhost);
      partnerSpecProperty.dispose();
      this.clearMessageTimer();
      hitArea.dispose();
      title.dispose();
      hint.dispose();
    };
  }

  /** Sounds the slot, or says why a missing one does not answer. */
  private choose(harmonic: number, responder: Node): void {
    if (this.model.selectHarmonic(harmonic)) {
      this.hideMessage();
      return;
    }
    const strings = StringManager.getInstance();
    this.message.string = strings
      .getInstrumentsStrings()
      .noModeHereStringProperty.value.replace("{{harmonic}}", `${harmonic}`);
    this.message.centerX = this.frame.viewWidth / 2;
    this.message.visible = true;
    responder.addAccessibleResponse(
      strings
        .getInstrumentsA11yStrings()
        .controls.noModeResponseStringProperty.value.replace("{{harmonic}}", `${harmonic}`),
    );
    this.clearMessageTimer();
    this.messageTimer = stepTimer.setTimeout(() => {
      this.messageTimer = null;
      this.hideMessage();
    }, MESSAGE_DURATION_MS);
  }

  private hideMessage(): void {
    this.clearMessageTimer();
    this.message.visible = false;
  }

  private clearMessageTimer(): void {
    if (this.messageTimer) {
      stepTimer.clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
  }

  /**
   * The slot (harmonic number, allowed or not) nearest a frequency, or null when the
   * frequency is off the end of the chart's ladder.
   */
  private slotAt(frequency: number): number | null {
    const fundamental = this.model.pipe.fundamentalFrequencyProperty.value;
    const slot = Math.round(frequency / fundamental);
    return slot >= 1 && slot <= this.slotCount() ? slot : null;
  }

  /** How many harmonic slots fit on the chart. */
  private slotCount(): number {
    const fundamental = this.model.pipe.fundamentalFrequencyProperty.value;
    return Math.min(this.model.pipe.modeCount, Math.floor(MAX_FREQUENCY_HZ / fundamental));
  }

  /** The modes the pipe has that are on the chart, ascending. */
  private visibleHarmonics(): number[] {
    const count = this.slotCount();
    return this.model.pipe.getAllowedHarmonics().filter((harmonic) => harmonic <= count);
  }

  /** Rebuilds the bars, sockets and selection from the pipe and its sounding mode. */
  private updateBars(): void {
    const pipe: PipeModalModel = this.model.pipe;
    const termination = pipe.terminationProperty.value;
    const sounding = this.model.soundingHarmonicProperty.value;
    const transform = this.frame.chartTransform;

    // Normalised against this pipe's own fundamental, so the tallest bar is always 1
    // and the *shape* of the rolloff is what differs between instruments — not an
    // overall loudness, which this model has no business claiming.
    const reference = pipe.resonantAmplitude(1);

    const soundingPoints: Vector2[] = [];
    const otherPoints: Vector2[] = [];
    const sockets = new Shape();
    const outline = new Shape();
    const count = this.slotCount();
    for (let harmonic = 1; harmonic <= count; harmonic++) {
      const frequency = harmonic * pipe.fundamentalFrequencyProperty.value;
      const x = transform.modelToViewX(frequency);
      if (!isModeAllowed(harmonic, termination)) {
        sockets.rect(x - BAR_WIDTH / 2, transform.modelToViewY(0) - SOCKET_HEIGHT, BAR_WIDTH, SOCKET_HEIGHT);
        continue;
      }
      const height = reference > 0 ? pipe.resonantAmplitude(harmonic) / reference : 0;
      // The note at the sounding mode contains that mode and its whole multiples.
      (harmonic % sounding === 0 ? soundingPoints : otherPoints).push(new Vector2(frequency, height));
      if (harmonic === sounding) {
        const top = transform.modelToViewY(height) - OUTLINE_PAD;
        const bottom = transform.modelToViewY(0);
        outline.rect(x - BAR_WIDTH / 2 - OUTLINE_PAD, top, BAR_WIDTH + 2 * OUTLINE_PAD, bottom - top);
      }
    }
    this.soundingBars.setDataSet(soundingPoints);
    this.otherBars.setDataSet(otherPoints);
    this.socketsPath.shape = sockets;
    this.selectionOutline.shape = outline;
  }

  /** Redraws the partner instrument's bars as outlines, on the same footing. */
  private updateGhost(spec: { pipeLength: number; termination: PipeTermination }): void {
    const pipe = this.model.pipe;
    const transform = this.frame.chartTransform;
    const fundamental = fundamentalFrequency(spec.termination, spec.pipeLength);
    const reference = pipe.resonantAmplitudeFor(1, spec.termination, spec.pipeLength);
    const shape = new Shape();
    for (let harmonic = 1; harmonic <= pipe.modeCount; harmonic++) {
      const frequency = harmonic * fundamental;
      if (frequency > MAX_FREQUENCY_HZ) {
        break;
      }
      if (!isModeAllowed(harmonic, spec.termination)) {
        continue;
      }
      const height =
        reference > 0 ? pipe.resonantAmplitudeFor(harmonic, spec.termination, spec.pipeLength) / reference : 0;
      const x = transform.modelToViewX(frequency);
      const top = transform.modelToViewY(height);
      shape.rect(x - GHOST_WIDTH / 2, top, GHOST_WIDTH, transform.modelToViewY(0) - top);
    }
    this.ghostPath.shape = shape;
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
