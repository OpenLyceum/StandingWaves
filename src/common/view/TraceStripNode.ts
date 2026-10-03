/**
 * TraceStripNode.ts
 *
 * One or more curves of a quantity against **position along the pipe**, sharing a
 * single x axis and a single vertical scale each.
 *
 * ── Why this and not ACPhasor's WaveformNode ──────────────────────────────────
 *
 * `ACPhasor/src/common/view/WaveformNode.ts` is the fleet's multi-trace scope and
 * was the obvious candidate, but its traces are *analytic sinusoids* —
 * `setTrace(index, amplitude, ω, φ)`. Two of this sim's four screens plot things
 * that are not sinusoids: a dispersing pulse on a lattice, and a sum of a dozen
 * modes with independent amplitudes. So traces here are supplied as a sampling
 * callback, and the same node then serves every screen.
 *
 * It keeps WaveformNode's rules that matter, though:
 *
 *   - **the footprint is frozen at construction**, so a growing amplitude can
 *     never move this node or anything laid out below it;
 *   - **each trace has its own full scale**, so displacement in metres and
 *     pressure in pascals can share one x axis. Sharing the x axis is the whole
 *     point: the quarter-wave offset between two quantities is then a
 *     *horizontal* offset a learner can point at;
 *   - **each caption is drawn in its own trace colour**, so no separate legend is
 *     needed.
 *
 * Sampling is done in a `CanvasNode`: at 240 samples × up to three traces, every
 * frame, allocating Vector2s and rebuilding bamboo plots would dominate the frame.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range } from "scenerystack/dot";
import type { Color } from "scenerystack/scenery";
import { CanvasNode, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import StandingWavesColors from "../../StandingWavesColors.js";
import { TRACE_SAMPLE_COUNT } from "../../StandingWavesConstants.js";
import { ChartFrame } from "./ChartFrame.js";

const CAPTION_FONT = new PhetFont({ size: 12, weight: "bold" });
const CAPTION_MARGIN = 6;
const NOTE_FONT = new PhetFont(11);

export type TraceSpec = {
  /** Colour of the curve and of its caption. */
  colorProperty: TReadOnlyProperty<Color>;

  /**
   * The quantity at position `x` along the pipe, in its own SI units.
   *
   * Called {@link TRACE_SAMPLE_COUNT}+1 times per repaint, so it must be cheap
   * and must not allocate.
   */
  sample: (x: number) => number;

  /**
   * Value that reaches the top of the strip, in the same units as `sample`.
   *
   * A *function* rather than a number because the natural scale usually moves
   * with the model — the resonant amplitude of the selected harmonic, the peak of
   * the launched pulse. Returning 0 or a non-finite value hides the trace, which
   * is the right behaviour for "nothing to show yet".
   */
  fullScale: () => number;

  /** Caption drawn top-left inside the strip, in the trace's own colour. */
  caption?: TReadOnlyProperty<string>;

  /** Curve width in view pixels. Default 2. */
  lineWidth?: number;

  /**
   * Whether this trace is drawn. Default: always.
   *
   * A Property rather than a callback so the caption can be bound to the same
   * source — a visible caption for an invisible curve is worse than no caption.
   */
  visibleProperty?: TReadOnlyProperty<boolean>;
};

export type TraceStripNodeOptions = {
  viewWidth: number;
  viewHeight: number;
  /** Range of positions along the pipe covered by the x axis (m). */
  xRange: Range;
  xSpacing?: number | undefined;
  xLabel?: string | TReadOnlyProperty<string> | undefined;
  yLabel?: string | TReadOnlyProperty<string> | undefined;
  createXTickLabel?: ((value: number) => Node) | undefined;
  /** False on a strip stacked above one that already labels the shared axis. */
  showXTickLabels?: boolean | undefined;
  /**
   * A short remark drawn top-right inside the strip, in the axis colour — e.g. that
   * the pressure curve is also the density curve. Not a caption: it names no trace.
   */
  note?: TReadOnlyProperty<string> | undefined;
  /** Whether the note is shown. Default: always. */
  noteVisibleProperty?: TReadOnlyProperty<boolean> | undefined;
};

export class TraceStripNode extends Node {
  private readonly painter: TracePainter;
  private readonly frame: ChartFrame;

  public constructor(traces: TraceSpec[], options: TraceStripNodeOptions) {
    super();

    this.frame = new ChartFrame({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      xRange: options.xRange,
      // Traces are normalised against their own full scale before being drawn, so
      // the frame's own vertical range is always −1 … 1 and carries no ticks: a
      // number on it would belong to only one of the traces.
      yRange: new Range(-1, 1),
      xSpacing: options.xSpacing,
      xLabel: options.xLabel,
      yLabel: options.yLabel,
      createXTickLabel: options.createXTickLabel,
      showXTickLabels: options.showXTickLabels,
    });

    this.painter = new TracePainter(traces, options.viewWidth, options.viewHeight, options.xRange);
    this.frame.plotLayer.addChild(this.painter);

    // Captions ride above the plot, not inside the clipped layer, so a caption is
    // never chopped by the clip when the strip is short.
    const captioned = traces.filter((trace) => trace.caption !== undefined);
    if (captioned.length > 0) {
      const captions = new VBox({
        align: "left",
        spacing: 1,
        // Excluding invisible children keeps the remaining captions from leaving a
        // gap where a hidden trace's caption used to be.
        excludeInvisibleChildrenFromBounds: true,
        children: captioned.map((trace) => {
          const text = new Text(trace.caption as TReadOnlyProperty<string>, {
            font: CAPTION_FONT,
            fill: trace.colorProperty,
            maxWidth: options.viewWidth * 0.45,
          });
          if (trace.visibleProperty) {
            text.visibleProperty = trace.visibleProperty;
          }
          return text;
        }),
      });
      captions.left = CAPTION_MARGIN;
      captions.top = CAPTION_MARGIN;
      this.frame.addChild(captions);
    }

    if (options.note) {
      const note = new Text(options.note, {
        font: NOTE_FONT,
        fill: StandingWavesColors.axisColorProperty,
        maxWidth: options.viewWidth * 0.45,
      });
      if (options.noteVisibleProperty) {
        note.visibleProperty = options.noteVisibleProperty;
      }
      // Pinned to the right edge whatever the translated text's width.
      note.localBoundsProperty.link(() => {
        note.right = options.viewWidth - CAPTION_MARGIN;
        note.top = CAPTION_MARGIN;
      });
      this.frame.addChild(note);
    }

    this.addChild(this.frame);

    // Freeze the footprint: nothing drawn later may change this node's bounds.
    this.localBounds = this.localBounds.copy();
  }

  /** The frame's model↔view mapping, for callers that overlay markers on the strip. */
  public get chartTransform() {
    return this.frame.chartTransform;
  }

  /** Repaints the traces from their current model state. Call once per frame. */
  public update(): void {
    this.painter.invalidatePaint();
  }
}

/** Paints every trace of one strip into a single canvas. */
class TracePainter extends CanvasNode {
  private readonly traces: TraceSpec[];
  private readonly viewWidth: number;
  private readonly viewHeight: number;
  private readonly xRange: Range;

  public constructor(traces: TraceSpec[], viewWidth: number, viewHeight: number, xRange: Range) {
    super({ canvasBounds: new Bounds2(0, 0, viewWidth, viewHeight) });
    this.traces = traces;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.xRange = xRange;
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    const halfHeight = this.viewHeight / 2;
    const span = this.xRange.getLength();

    for (const trace of this.traces) {
      if (trace.visibleProperty && !trace.visibleProperty.value) {
        continue;
      }
      const fullScale = trace.fullScale();
      if (!Number.isFinite(fullScale) || fullScale <= 0) {
        continue;
      }

      context.strokeStyle = trace.colorProperty.value.toCSS();
      context.lineWidth = trace.lineWidth ?? 2;
      context.lineJoin = "round";
      context.beginPath();

      for (let i = 0; i <= TRACE_SAMPLE_COUNT; i++) {
        const fraction = i / TRACE_SAMPLE_COUNT;
        const x = this.xRange.min + fraction * span;
        const normalized = trace.sample(x) / fullScale;
        // Clamp rather than clip: a curve that briefly overshoots should ride the
        // edge of the strip, not vanish from it.
        const clamped = Math.max(-1, Math.min(1, normalized));
        const px = fraction * this.viewWidth;
        const py = halfHeight - clamped * halfHeight;
        if (i === 0) {
          context.moveTo(px, py);
        } else {
          context.lineTo(px, py);
        }
      }
      context.stroke();
    }
  }
}
