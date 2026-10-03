/**
 * NeighbourPairNode.ts
 *
 * Two neighbouring air particles a fixed distance Δx apart, each with its velocity
 * arrow (red), and the air between them drawn as one parcel tinted by its density
 * (blue).
 *
 * ── What it is for ───────────────────────────────────────────────────────────
 *
 * It answers "why is the air denser *here*?" with the smallest possible picture.
 * The parcel between the two particles always holds the same air, so it can only
 * become denser by the two closing the gap between them — and they can only do
 * that by moving *out of step*. Two particles moving in step carry the parcel along
 * without squeezing it, which is why a uniform motion of the air makes no sound.
 *
 * In a travelling wave the pair is out of step by kΔx, shown in the caption. The
 * wavelength slider changes it: a shorter wavelength puts the neighbours further
 * out of step, and the parcel is squeezed harder for the same particle amplitude —
 * which is the statement that p ∝ ∂ξ/∂x.
 *
 * Dragged like the reference marker, by pointer or by keyboard, on one scalar.
 */

import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { Circle, DragListener, KeyboardDragListener, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { DENSITY_REST_ALPHA } from "../../common/view/DensitySlabsNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PIPE_BORE_HEIGHT } from "../../StandingWavesConstants.js";
import type { PhaseModel } from "../model/PhaseModel.js";

const CAPTION_FONT = new PhetFont({ size: 11, weight: "bold" });
const LAG_FONT = new PhetFont(11);

const DOT_RADIUS = 4.5;

/** Peak velocity-arrow length, in view pixels. Short enough that the two arrows do not meet. */
const MAX_ARROW_LENGTH = 26;

/** Vertical offset of the velocity arrows below the centreline. */
const VELOCITY_ARROW_Y = PIPE_BORE_HEIGHT * 0.3;

/** Half-height of the parcel drawn between the pair. */
const PARCEL_HALF_HEIGHT = PIPE_BORE_HEIGHT * 0.2;

/**
 * How far the gap must close or open, as a fraction of its own peak, before the
 * caption calls the parcel squeezed or stretched rather than near its rest spacing.
 */
const STATE_THRESHOLD = 0.3;

const ARROW_OPTIONS = {
  headHeight: 7,
  headWidth: 8,
  tailWidth: 2.5,
} as const;

export type NeighbourPairNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
  /** Peak drawn particle displacement, in view pixels — the particle row's scale. */
  particleAmplitude: number;
};

export class NeighbourPairNode extends Node {
  private readonly model: PhaseModel;
  private readonly halfSeparationPx: number;
  private readonly particleAmplitude: number;
  private readonly parcel: Rectangle;
  private readonly parcelOutline: Rectangle;
  private readonly leftDot: Circle;
  private readonly rightDot: Circle;
  private readonly leftArrow: ArrowNode;
  private readonly rightArrow: ArrowNode;
  private readonly stateText: Text;
  private readonly disposeNeighbourPairNode: () => void;

  public constructor(model: PhaseModel, options: NeighbourPairNodeOptions) {
    const strings = StringManager.getInstance();
    const phase = strings.getPhaseStrings();
    const a11y = strings.getPhaseA11yStrings();

    super({
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.neighbourPairStringProperty,
      visibleProperty: model.showNeighbourPairProperty,
      cursor: "pointer",
    });

    this.model = model;
    this.particleAmplitude = options.particleAmplitude;
    const metresToPixels = options.viewLength / model.pipeLength;
    this.halfSeparationPx = (model.pairSeparation / 2) * metresToPixels;

    this.parcel = new Rectangle(0, -PARCEL_HALF_HEIGHT, 1, 2 * PARCEL_HALF_HEIGHT, {
      fill: StandingWavesColors.pressureColorProperty,
    });
    // The outline is a separate node so the tint's opacity does not fade it too.
    this.parcelOutline = new Rectangle(0, -PARCEL_HALF_HEIGHT, 1, 2 * PARCEL_HALF_HEIGHT, {
      stroke: StandingWavesColors.pressureColorProperty,
      lineWidth: 1.5,
    });

    const makeArrow = (): ArrowNode =>
      new ArrowNode(0, VELOCITY_ARROW_Y, 1, VELOCITY_ARROW_Y, {
        ...ARROW_OPTIONS,
        fill: StandingWavesColors.velocityColorProperty,
        stroke: null,
      });
    this.leftArrow = makeArrow();
    this.rightArrow = makeArrow();

    this.leftDot = new Circle(DOT_RADIUS, { fill: StandingWavesColors.nodeMarkerColorProperty });
    this.rightDot = new Circle(DOT_RADIUS, { fill: StandingWavesColors.nodeMarkerColorProperty });

    // ── Caption: what the parcel is doing, and how far out of step the pair is ──
    this.stateText = new Text("", {
      font: CAPTION_FONT,
      fill: StandingWavesColors.nodeMarkerColorProperty,
      maxWidth: 220,
    });
    const lagStringProperty = new DerivedProperty(
      [model.pairPhaseLagProperty, phase.phaseLagStringProperty],
      (lag: number, pattern: string) => pattern.replace("{{value}}", toFixed(lag, 0)),
    );
    const lagText = new Text(lagStringProperty, {
      font: LAG_FONT,
      fill: StandingWavesColors.nodeMarkerColorProperty,
      maxWidth: 220,
    });
    const caption = new VBox({ spacing: 1, children: [this.stateText, lagText] });
    caption.localBoundsProperty.link(() => {
      caption.centerX = 0;
      caption.bottom = -PIPE_BORE_HEIGHT / 2 - 3;
    });

    this.children = [
      this.parcel,
      this.parcelOutline,
      this.leftArrow,
      this.rightArrow,
      this.leftDot,
      this.rightDot,
      caption,
    ];

    // ── Position ──────────────────────────────────────────────────────────────
    const range = model.pairPositionProperty.range;
    const onPosition = (position: number): void => {
      this.x = position * metresToPixels;
    };
    model.pairPositionProperty.link(onPosition);

    let grabOffsetX = 0;
    const dragListener = new DragListener({
      start: (event) => {
        grabOffsetX = this.globalToParentPoint(event.pointer.point).x - this.x;
      },
      drag: (event) => {
        const parentX = this.globalToParentPoint(event.pointer.point).x;
        model.pairPositionProperty.value = range.constrainValue((parentX - grabOffsetX) / metresToPixels);
      },
    });
    this.addInputListener(dragListener);

    const coarseStep = model.pipeLength / 20;
    const keyboardDragListener = new KeyboardDragListener({
      keyboardDragDirection: "leftRight",
      dragDelta: 1,
      shiftDragDelta: 0.2,
      drag: (_event, listener) => {
        model.pairPositionProperty.value = range.constrainValue(
          model.pairPositionProperty.value + listener.modelDelta.x * coarseStep,
        );
      },
    });
    this.addInputListener(keyboardDragListener);

    this.disposeNeighbourPairNode = () => {
      model.pairPositionProperty.unlink(onPosition);
      dragListener.dispose();
      keyboardDragListener.dispose();
      lagText.dispose();
      lagStringProperty.dispose();
    };
  }

  /** Redraws the pair from the current wave. Call once per frame; a hidden pair skips the work. */
  public update(): void {
    if (!this.visible) {
      return;
    }
    const model = this.model;
    const centre = model.pairPositionProperty.value;
    const half = model.pairSeparation / 2;

    const leftX = -this.halfSeparationPx + this.drawnDisplacement(centre - half);
    const rightX = this.halfSeparationPx + this.drawnDisplacement(centre + half);
    this.leftDot.centerX = leftX;
    this.rightDot.centerX = rightX;
    this.leftArrow.setTailAndTip(leftX, VELOCITY_ARROW_Y, leftX + this.drawnVelocity(centre - half), VELOCITY_ARROW_Y);
    this.rightArrow.setTailAndTip(
      rightX,
      VELOCITY_ARROW_Y,
      rightX + this.drawnVelocity(centre + half),
      VELOCITY_ARROW_Y,
    );

    const parcelWidth = Math.max(rightX - leftX, 1);
    this.parcel.setRect(leftX, -PARCEL_HALF_HEIGHT, parcelWidth, 2 * PARCEL_HALF_HEIGHT);
    this.parcelOutline.setRect(leftX, -PARCEL_HALF_HEIGHT, parcelWidth, 2 * PARCEL_HALF_HEIGHT);

    // Tinted on the same scale as the slabs, so a parcel and the slab around it agree.
    const densityChange = model.pairDensityChange();
    const tint = clampUnit(densityChange / model.densityChangeAmplitude);
    this.parcel.opacity = DENSITY_REST_ALPHA * (1 + tint);

    // The caption is judged against the pair's *own* largest squeeze, which is
    // smaller than kA by the finite-difference factor sin(kΔx/2)/(kΔx/2); otherwise a
    // widely spaced pair would never be called squeezed.
    const halfLagRadians = ((model.pairPhaseLagProperty.value / 2) * Math.PI) / 180;
    const pairPeak = (2 * model.displacementAmplitude * Math.sin(halfLagRadians)) / model.pairSeparation;
    const state = pairPeak > 0 ? densityChange / pairPeak : 0;
    const phase = StringManager.getInstance().getPhaseStrings();
    const stateString =
      state > STATE_THRESHOLD
        ? phase.pairDenserStringProperty.value
        : state < -STATE_THRESHOLD
          ? phase.pairRarerStringProperty.value
          : phase.pairNormalStringProperty.value;
    const label = `${phase.neighbourPairStringProperty.value}: ${stateString}`;
    if (this.stateText.string !== label) {
      this.stateText.string = label;
    }
  }

  public override dispose(): void {
    this.disposeNeighbourPairNode();
    super.dispose();
  }

  /** Displacement at x on the particle row's exaggerated scale, in view pixels. */
  private drawnDisplacement(x: number): number {
    return (this.model.displacementAt(x) / this.model.displacementAmplitude) * this.particleAmplitude;
  }

  /** Velocity-arrow length at x, in view pixels. */
  private drawnVelocity(x: number): number {
    return (this.model.velocityAt(x) / this.model.velocityAmplitude) * MAX_ARROW_LENGTH;
  }
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
