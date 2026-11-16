import { PARTICLE_ROW_NODE_SETTINGS } from "../../StandingWavesConstants.js";
/**
 * ParticleRowNode.ts
 *
 * A row of air-particle markers along the pipe axis, each displaced
 * **horizontally** from its equilibrium position.
 *
 * Horizontal is the whole point and the reason this is not a wave drawn as a
 * transverse squiggle: sound in a pipe is longitudinal, and the compressions a
 * learner is being asked to see are places where these markers crowd together.
 * The traces below the pipe are the abstraction; this is the thing itself.
 *
 * A `CanvasNode` rather than a row of `Circle`s: 48–80 markers repositioned every
 * frame is exactly the case where scenery's per-node bookkeeping costs more than
 * painting. Follows `RadioWaves/src/radio-waves/view/FieldLatticeNode.ts`.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import type { Color } from "scenerystack/scenery";
import { CanvasNode } from "scenerystack/scenery";

/** Default marker radius in view pixels. */
const DEFAULT_PARTICLE_RADIUS: number = PARTICLE_ROW_NODE_SETTINGS.DEFAULT_PARTICLE_RADIUS;

export type ParticleRowNodeOptions = {
  /** Drawn length of the pipe bore, in view pixels. */
  viewLength: number;
  /** Height of the band the markers are spread across, in view pixels. */
  bandHeight: number;
  /** Number of marker rows stacked across the bore. */
  rowCount: number;
  /** Number of markers along the pipe. */
  columnCount: number;
  /** Marker colour. */
  colorProperty: TReadOnlyProperty<Color>;
  /**
   * Horizontal displacement of a particle at equilibrium fraction `fraction`
   * (0 … 1 along the pipe), **already in view pixels**.
   *
   * The view does the unit conversion, not this node: each screen scales its own
   * quantity differently (lattice cells on one screen, a fraction of the particle
   * spacing on another), and pushing that decision in here would make the node
   * know about the model.
   */
  displacementAt: (fraction: number) => number;
  /**
   * Marker radius in view pixels. Must stay well under half the column spacing, or
   * the markers touch at rest and the crowding at a compression is unreadable.
   */
  radius?: number;
};

export class ParticleRowNode extends CanvasNode {
  private readonly options: ParticleRowNodeOptions;

  public constructor(options: ParticleRowNodeOptions) {
    // Bounds are padded horizontally: a particle near an end may be displaced past
    // it, and a canvas clips at its bounds.
    const padding = options.viewLength * 0.08;
    super({
      canvasBounds: new Bounds2(
        -padding,
        -options.bandHeight / 2,
        options.viewLength + padding,
        options.bandHeight / 2,
      ),
    });
    this.options = options;
  }

  /** Repaints from the current model state. Call once per frame. */
  public update(): void {
    this.invalidatePaint();
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    const { viewLength, bandHeight, rowCount, columnCount, displacementAt } = this.options;
    const radius = this.options.radius ?? DEFAULT_PARTICLE_RADIUS;

    context.fillStyle = this.options.colorProperty.value.toCSS();

    // Rows are inset from the walls so no marker sits on top of one.
    const usableHeight = bandHeight * 0.72;
    for (let row = 0; row < rowCount; row++) {
      const rowFraction = rowCount === 1 ? 0.5 : row / (rowCount - 1);
      const y = -usableHeight / 2 + rowFraction * usableHeight;

      for (let column = 0; column < columnCount; column++) {
        // Half-offset each row so the lattice does not read as a rigid grid.
        const stagger = row % 2 === 0 ? 0 : 0.5;
        const fraction = (column + stagger + 0.5) / columnCount;
        if (fraction > 1) {
          continue;
        }
        const x = fraction * viewLength + displacementAt(fraction);
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fill();
      }
    }
  }
}
