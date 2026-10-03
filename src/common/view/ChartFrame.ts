/**
 * ChartFrame.ts
 *
 * Reusable static "chrome" for a bamboo chart: a bordered background rectangle,
 * major grid lines, edge tick marks + labels, and optional axis titles. It owns a
 * {@link ChartTransform} (model↔view mapping) and a clipped {@link plotLayer} that
 * callers populate with plots. Every trace strip and spectrum in the sim shares
 * it, so they look consistent and the axis wiring lives in one place.
 *
 * Local origin (0,0) is the top-left corner of the plotting area; tick labels and
 * axis titles extend into small gutters to the left of / below it.
 *
 * Ported from WaveComposer's `src/common/view/ChartFrame.ts` — copied rather than
 * imported because that version is bound to WaveComposer's own colour and
 * constant modules.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { AxisLine, ChartRectangle, ChartTransform, GridLineSet, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import type { Range } from "scenerystack/dot";
import { toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PANEL_CORNER_RADIUS } from "../../StandingWavesConstants.js";

const TICK_LENGTH = 5;
const Y_TITLE_GUTTER = 34;
const X_TITLE_GUTTER = 28;

const AXIS_LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const TICK_FONT = new PhetFont(11);

// The optional fields spell out `| undefined` because the sim compiles with
// `exactOptionalPropertyTypes`, and callers forward their own optionals straight
// through (see TraceStripNode).
export interface ChartFrameOptions {
  viewWidth: number;
  viewHeight: number;
  xRange: Range;
  yRange: Range;
  /** Spacing (model units) for grid + ticks on each axis. Omit to draw neither. */
  xSpacing?: number | undefined;
  ySpacing?: number | undefined;
  xLabel?: string | TReadOnlyProperty<string> | undefined;
  yLabel?: string | TReadOnlyProperty<string> | undefined;
  /** Custom tick-label factories (default: rounded to two decimals). */
  createXTickLabel?: ((value: number) => Node) | undefined;
  createYTickLabel?: ((value: number) => Node) | undefined;
  /** Whether to draw the horizontal zero line across the plot. Default true. */
  showZeroLine?: boolean | undefined;
  /**
   * Whether the x axis carries tick *labels*. Default true.
   *
   * Set false on a strip stacked above another that shares its axis: the grid and
   * ticks should still line up, but repeating the numbers on every strip is noise,
   * and only the bottom strip needs them.
   */
  showXTickLabels?: boolean | undefined;
}

export class ChartFrame extends Node {
  public readonly chartTransform: ChartTransform;

  /** Clipped layer for plot content; add painters and plots here. */
  public readonly plotLayer: Node;

  public readonly viewWidth: number;
  public readonly viewHeight: number;

  public constructor(options: ChartFrameOptions) {
    super();

    this.viewWidth = options.viewWidth;
    this.viewHeight = options.viewHeight;

    const transform = new ChartTransform({
      viewWidth: options.viewWidth,
      viewHeight: options.viewHeight,
      modelXRange: options.xRange,
      modelYRange: options.yRange,
    });
    this.chartTransform = transform;

    this.addChild(
      new ChartRectangle(transform, {
        fill: StandingWavesColors.chartBackgroundColorProperty,
        stroke: StandingWavesColors.panelBorderColorProperty,
        lineWidth: 1,
        cornerXRadius: PANEL_CORNER_RADIUS,
        cornerYRadius: PANEL_CORNER_RADIUS,
      }),
    );

    // The x title sits below the tick labels when there are any, not at a fixed
    // offset that a tall label font would run into.
    let xTitleTop = options.viewHeight + X_TITLE_GUTTER * 0.5;
    if (options.xSpacing !== undefined) {
      this.addChild(
        new GridLineSet(transform, Orientation.HORIZONTAL, options.xSpacing, {
          stroke: StandingWavesColors.gridLineColorProperty,
          lineWidth: 0.5,
        }),
      );
    }
    if (options.ySpacing !== undefined) {
      this.addChild(
        new GridLineSet(transform, Orientation.VERTICAL, options.ySpacing, {
          stroke: StandingWavesColors.gridLineColorProperty,
          lineWidth: 0.5,
        }),
      );
    }

    this.plotLayer = new Node({
      clipArea: Shape.rectangle(0, 0, options.viewWidth, options.viewHeight),
    });
    this.addChild(this.plotLayer);

    // The y = 0 line, drawn across the plot: every quantity here swings about
    // zero, and without it a trace's sign is not readable.
    if (options.showZeroLine !== false) {
      this.addChild(
        new AxisLine(transform, Orientation.HORIZONTAL, {
          stroke: StandingWavesColors.axisColorProperty,
          lineWidth: 1,
          value: 0,
        }),
      );
    }

    if (options.xSpacing !== undefined) {
      this.addChild(
        new TickMarkSet(transform, Orientation.HORIZONTAL, options.xSpacing, {
          edge: "min",
          stroke: StandingWavesColors.axisColorProperty,
          extent: TICK_LENGTH,
        }),
      );
      if (options.showXTickLabels !== false) {
        const xTickLabels = new TickLabelSet(transform, Orientation.HORIZONTAL, options.xSpacing, {
          edge: "min",
          createLabel: options.createXTickLabel ?? defaultTickLabel,
        });
        this.addChild(xTickLabels);
        xTitleTop = Math.max(xTitleTop, xTickLabels.bottom + 2);
      }
    }
    if (options.ySpacing !== undefined) {
      this.addChild(
        new TickMarkSet(transform, Orientation.VERTICAL, options.ySpacing, {
          edge: "min",
          stroke: StandingWavesColors.axisColorProperty,
          extent: TICK_LENGTH,
        }),
      );
      this.addChild(
        new TickLabelSet(transform, Orientation.VERTICAL, options.ySpacing, {
          edge: "min",
          createLabel: options.createYTickLabel ?? defaultTickLabel,
        }),
      );
    }

    if (options.xLabel !== undefined) {
      this.addChild(
        new Text(options.xLabel, {
          font: AXIS_LABEL_FONT,
          fill: StandingWavesColors.textColorProperty,
          maxWidth: options.viewWidth * 0.8,
          centerX: options.viewWidth / 2,
          top: xTitleTop,
        }),
      );
    }
    if (options.yLabel !== undefined) {
      const yTitle = new Text(options.yLabel, {
        font: AXIS_LABEL_FONT,
        fill: StandingWavesColors.textColorProperty,
        maxWidth: options.viewHeight * 0.9,
        rotation: -Math.PI / 2,
      });
      yTitle.right = -Y_TITLE_GUTTER;
      yTitle.centerY = options.viewHeight / 2;
      this.addChild(yTitle);
    }
  }
}

function defaultTickLabel(value: number): Node {
  // Integers print plainly; fractional spacings keep up to two decimals (trailing
  // zeros trimmed) so adjacent ticks don't collapse to the same rounded label —
  // a 0.25 spacing has to read 0.25 / 0.5 / 0.75, not 0.3 / 0.5 / 0.8.
  const text = Number.isInteger(value) ? `${value}` : `${Number.parseFloat(toFixed(value, 2))}`;
  return new Text(text, {
    font: TICK_FONT,
    fill: StandingWavesColors.axisColorProperty,
  });
}
