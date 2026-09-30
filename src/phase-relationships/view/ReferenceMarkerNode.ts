/**
 * ReferenceMarkerNode.ts
 *
 * A draggable marker on one point of the air column, carrying two arrows: the
 * particle's **displacement** from equilibrium (black/grey) and its **velocity**
 * (red).
 *
 * ── What it is for ───────────────────────────────────────────────────────────
 *
 * Both arrows point *along the pipe*, because both quantities are longitudinal.
 * Watching them at one point is what turns the abstract phase relationship into
 * something observed: the velocity arrow reaches its longest exactly as the
 * displacement arrow passes through zero, and — the actual lesson — whether the
 * velocity arrow points the same way as the pressure trace's peak depends on which
 * way the wave is going.
 *
 * Draggable by pointer and by keyboard, since a control that can only be reached
 * with a mouse is not a control for everyone.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardDragListener, Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PIPE_BORE_HEIGHT } from "../../StandingWavesConstants.js";

const LABEL_FONT = new PhetFont({ size: 11, weight: "bold" });

/** Radius of the dot marking the particle being followed. */
const DOT_RADIUS = 4.5;

/** Vertical offsets of the two arrows from the bore centreline, in view pixels. */
const DISPLACEMENT_ARROW_Y = -PIPE_BORE_HEIGHT * 0.28;
const VELOCITY_ARROW_Y = PIPE_BORE_HEIGHT * 0.28;

const ARROW_OPTIONS = {
  headHeight: 8,
  headWidth: 9,
  tailWidth: 3,
} as const;

export type ReferenceMarkerNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
  /** Model positions the marker may take (m). */
  positionRange: Range;
  /** Marker position along the pipe (m). */
  positionProperty: NumberProperty;
  /** Peak arrow length for each quantity, in view pixels. */
  maxArrowLength: number;
  /** Accessible name for the draggable marker. */
  accessibleName: TReadOnlyProperty<string>;
  /** Caption drawn above the marker. */
  caption: TReadOnlyProperty<string>;
};

export class ReferenceMarkerNode extends Node {
  private readonly displacementArrow: ArrowNode;
  private readonly velocityArrow: ArrowNode;
  private readonly dot: Circle;
  private readonly maxArrowLength: number;
  private readonly disposeReferenceMarkerNode: () => void;

  public constructor(options: ReferenceMarkerNodeOptions) {
    super({
      // A plain Node needs these to be reachable at all; without them the keyboard
      // listener below would never receive a key.
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
    });

    this.maxArrowLength = options.maxArrowLength;

    // A full-height guide line, so the marker's position can be read against the
    // traces stacked below the pipe.
    const guide = new Path(Shape.lineSegment(0, -PIPE_BORE_HEIGHT / 2, 0, PIPE_BORE_HEIGHT / 2), {
      stroke: StandingWavesColors.nodeMarkerColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
    });
    this.addChild(guide);

    this.displacementArrow = new ArrowNode(0, DISPLACEMENT_ARROW_Y, 1, DISPLACEMENT_ARROW_Y, {
      ...ARROW_OPTIONS,
      fill: StandingWavesColors.displacementColorProperty,
      stroke: null,
    });
    this.velocityArrow = new ArrowNode(0, VELOCITY_ARROW_Y, 1, VELOCITY_ARROW_Y, {
      ...ARROW_OPTIONS,
      fill: StandingWavesColors.velocityColorProperty,
      stroke: null,
    });
    this.addChild(this.displacementArrow);
    this.addChild(this.velocityArrow);

    this.dot = new Circle(DOT_RADIUS, {
      fill: StandingWavesColors.nodeMarkerColorProperty,
    });
    this.addChild(this.dot);

    const caption = new Text(options.caption, {
      font: LABEL_FONT,
      fill: StandingWavesColors.nodeMarkerColorProperty,
      centerX: 0,
      bottom: -PIPE_BORE_HEIGHT / 2 - 3,
      maxWidth: 120,
    });
    this.addChild(caption);

    // ── Position ──────────────────────────────────────────────────────────────
    const modelToViewX = (position: number): number => (position / options.positionRange.max) * options.viewLength;
    const viewToModelX = (viewX: number): number =>
      options.positionRange.constrainValue((viewX / options.viewLength) * options.positionRange.max);

    const onPosition = (position: number): void => {
      this.x = modelToViewX(position);
    };
    options.positionProperty.link(onPosition);

    // Pointer drag: horizontal only — the marker follows a point *in the pipe*, and
    // the pipe has one dimension. The grab offset is captured on start so the marker
    // does not jump to centre itself under the pointer.
    let grabOffsetX = 0;
    const dragListener = new DragListener({
      start: (event) => {
        grabOffsetX = this.globalToParentPoint(event.pointer.point).x - this.x;
      },
      drag: (event) => {
        const parentX = this.globalToParentPoint(event.pointer.point).x;
        options.positionProperty.value = viewToModelX(parentX - grabOffsetX);
      },
    });
    this.addInputListener(dragListener);

    // Keyboard drag on the same scalar the pointer writes. dragDelta is one abstract
    // step (a twentieth of the pipe); shift is a fifth of that. Left/right only —
    // the pipe has one dimension, so up/down are not bound.
    const coarseStep = options.positionRange.getLength() / 20;
    const keyboardDragListener = new KeyboardDragListener({
      keyboardDragDirection: "leftRight",
      dragDelta: 1,
      shiftDragDelta: 0.2,
      drag: (_event, listener) => {
        options.positionProperty.value = options.positionRange.constrainValue(
          options.positionProperty.value + listener.modelDelta.x * coarseStep,
        );
      },
    });
    this.addInputListener(keyboardDragListener);

    this.disposeReferenceMarkerNode = () => {
      options.positionProperty.unlink(onPosition);
      dragListener.dispose();
      keyboardDragListener.dispose();
    };
  }

  /**
   * Redraws the two arrows.
   *
   * @param displacementFraction - ξ as a fraction of the wave's peak, −1 … 1
   * @param velocityFraction - u as a fraction of the wave's peak, −1 … 1
   */
  public update(displacementFraction: number, velocityFraction: number): void {
    setArrow(this.displacementArrow, displacementFraction * this.maxArrowLength, DISPLACEMENT_ARROW_Y);
    setArrow(this.velocityArrow, velocityFraction * this.maxArrowLength, VELOCITY_ARROW_Y);
    // The dot rides with the particle it is following, so the marker's own dot and
    // the surrounding particles move together.
    this.dot.centerX = displacementFraction * this.maxArrowLength;
  }

  public override dispose(): void {
    this.disposeReferenceMarkerNode();
    super.dispose();
  }
}

/**
 * Points an arrow along the pipe with the given signed length.
 *
 * ArrowNode collapses to nothing when its tail and tip coincide, which is exactly
 * what should happen at a zero crossing, so a near-zero length is left as a
 * degenerate arrow rather than being given a minimum.
 */
function setArrow(arrow: ArrowNode, signedLength: number, y: number): void {
  arrow.setTailAndTip(0, y, signedLength, y);
}
