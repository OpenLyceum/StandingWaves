/**
 * PipeNode.ts
 *
 * The pipe itself: two walls enclosing a bore, with each end drawn either capped
 * (closed) or open.
 *
 * The end treatment is the only picture a learner has of the boundary condition,
 * so it does real work. A **closed** end gets a heavy cap flush across the bore —
 * it has to read as immovable, because "rigid" is the entire content of ξ = 0. An
 * **open** end gets no cap and its walls stop short with a soft flare, so the bore
 * visibly continues into the room, which is what p = 0 means.
 *
 * Local origin (0, 0) is the left end of the bore *centreline*, so a caller can
 * place particles and curves in the same coordinates it uses for the pipe.
 */

import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PIPE_BORE_HEIGHT, PIPE_WALL_THICKNESS } from "../../StandingWavesConstants.js";
import { EndCondition } from "../model/PipeTermination.js";

/** How far the flare at an open end rises above the wall, in view pixels. */
const FLARE_RISE = 7;

/** How far back along the pipe the flare is drawn, in view pixels. */
const FLARE_RUN = 14;

export type PipeNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
  /** Drawn height of the bore. Defaults to PIPE_BORE_HEIGHT. */
  boreHeight?: number;
  /** Condition at the left end. */
  leftEnd: EndCondition;
  /** Condition at the right end. */
  rightEnd: EndCondition;
};

export class PipeNode extends Node {
  /** Height of the bore in view pixels — what callers scale displacements against. */
  public readonly boreHeight: number;

  /** Drawn length of the bore in view pixels. */
  public readonly viewLength: number;

  /**
   * Layer between the bore fill and the walls. Particles, curves and markers
   * added here are drawn inside the pipe.
   */
  public readonly boreLayer: Node;

  public constructor(options: PipeNodeOptions) {
    super();

    const length = options.viewLength;
    const bore = options.boreHeight ?? PIPE_BORE_HEIGHT;
    this.viewLength = length;
    this.boreHeight = bore;

    const halfBore = bore / 2;
    const wall = PIPE_WALL_THICKNESS;

    // The air column.
    this.addChild(
      new Rectangle(0, -halfBore, length, bore, {
        fill: StandingWavesColors.pipeBoreColorProperty,
      }),
    );

    // Clipped to the bore. Air really does slosh in and out of an open end, but a
    // marker drawn a full spacing beyond the pipe reads as a rendering fault rather
    // than as physics; the displacement antinode there is carried by the trace
    // below the pipe, which is not clipped.
    this.boreLayer = new Node({
      clipArea: Shape.rectangle(0, -halfBore, length, bore),
    });
    this.addChild(this.boreLayer);

    // The two walls. Drawn after the bore layer so a particle that strays cannot
    // paint over them.
    for (const sign of [-1, 1]) {
      this.addChild(
        new Rectangle(0, sign * halfBore - (sign < 0 ? wall : 0), length, wall, {
          fill: StandingWavesColors.pipeWallColorProperty,
        }),
      );
    }

    this.addEndTreatment(0, -1, options.leftEnd, halfBore, wall);
    this.addEndTreatment(length, 1, options.rightEnd, halfBore, wall);
  }

  /**
   * Draws one end.
   *
   * @param x - view x of the end
   * @param outward - −1 at the left end, +1 at the right
   * @param condition - closed or open
   * @param halfBore - half the bore height
   * @param wall - wall thickness
   */
  private addEndTreatment(x: number, outward: number, condition: EndCondition, halfBore: number, wall: number): void {
    if (condition === EndCondition.CLOSED) {
      // A heavy cap across the whole bore, standing slightly proud of the walls
      // so it reads as a wall the air pushes against rather than a drawn line.
      const capThickness = wall * 2;
      const capX = outward < 0 ? x - capThickness : x;
      this.addChild(
        new Rectangle(capX, -halfBore - wall, capThickness, 2 * (halfBore + wall), {
          fill: StandingWavesColors.pipeCapColorProperty,
        }),
      );
      return;
    }

    // Open: a flare on each wall, opening away from the pipe, so the bore reads as
    // continuing into the room.
    for (const sign of [-1, 1]) {
      const wallY = sign * halfBore;
      const innerX = x - outward * FLARE_RUN;
      const shape = new Shape()
        .moveTo(innerX, wallY)
        .lineTo(x, wallY + sign * FLARE_RISE)
        .lineTo(x, wallY + sign * (FLARE_RISE + wall))
        .lineTo(innerX, wallY + sign * wall)
        .close();
      this.addChild(
        new Path(shape, {
          fill: StandingWavesColors.pipeWallColorProperty,
        }),
      );
    }
  }
}
