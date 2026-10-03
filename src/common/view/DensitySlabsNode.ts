/**
 * DensitySlabsNode.ts
 *
 * The air in the bore cut into thin slabs, each one bounded by two lines that ride
 * with the air, and each one tinted by how dense it is.
 *
 * ── Why slabs and not a colour field ─────────────────────────────────────────
 *
 * A slab holds a fixed amount of air: its walls move *with* the air, so nothing
 * crosses them. Its density can therefore only change by its walls coming closer
 * together or moving further apart, which is the whole content of
 *
 *   δρ/ρ = −∂ξ/∂x = p/(ρc²)
 *
 * A colour field painted under the particles would show the same numbers but hide
 * the reason: the learner would see "blue here" without seeing that blue is where
 * two neighbours have closed the gap between them.
 *
 * ── Why the tint reads the model and not the drawn gap ────────────────────────
 *
 * The drawn displacements are exaggerated (`PARTICLE_AMPLITUDE_SPACINGS`), so the
 * drawn gap is not the physical gap. The tint is taken from the model's pressure —
 * which *is* the physical strain, up to the constant ρc² — so it stays correct
 * whatever the exaggeration, and it agrees with the drawn gaps because both come
 * from the same displacement field.
 *
 * One hue only, pressure blue. Density is pressure divided by a constant, so it is
 * the same quantity and the colour contract gives it the same colour. The tint
 * starts from a resting level rather than from clear: air at rest still has a
 * density, and a rarefaction is *less* air, not an absence of it.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import type { Color } from "scenerystack/scenery";
import { CanvasNode } from "scenerystack/scenery";

/**
 * Tint opacity of air at rest. A full compression doubles it; a full rarefaction
 * clears it. Exported so anything else tinted by density reads on the same scale.
 */
export const DENSITY_REST_ALPHA = 0.34;

/** Opacity of the slab walls. Faint: they are a frame of reference, not a subject. */
const WALL_ALPHA = 0.35;

export type DensitySlabsNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
  /** Height of the band the slabs fill, in view pixels. */
  bandHeight: number;
  /** Number of slabs along the pipe. Match the particle columns so each marker sits in one slab. */
  slabCount: number;
  /**
   * Horizontal displacement of the air at `fraction` (0 … 1) along the pipe, in view
   * pixels — the same callback the particle row uses, so the slab walls move exactly
   * with the markers.
   */
  displacementAt: (fraction: number) => number;
  /**
   * Density change at `fraction` along the pipe, normalised so that ±1 is the
   * largest the screen expects. Values beyond ±1 are clamped.
   */
  densityAt: (fraction: number) => number;
  /** Tint colour — the pressure colour. */
  fillColorProperty: TReadOnlyProperty<Color>;
  /** Wall colour — the particle colour. */
  wallColorProperty: TReadOnlyProperty<Color>;
  /** Whether the slabs are shown. */
  visibleProperty: TReadOnlyProperty<boolean>;
};

export class DensitySlabsNode extends CanvasNode {
  private readonly options: DensitySlabsNodeOptions;

  public constructor(options: DensitySlabsNodeOptions) {
    // Padded like the particle row: a wall near an open end may be displaced past it.
    const padding = options.viewLength * 0.08;
    super({
      canvasBounds: new Bounds2(
        -padding,
        -options.bandHeight / 2,
        options.viewLength + padding,
        options.bandHeight / 2,
      ),
      visibleProperty: options.visibleProperty,
    });
    this.options = options;
  }

  /** Repaints from the current model state. Call once per frame; a hidden node skips the work. */
  public update(): void {
    if (this.visible) {
      this.invalidatePaint();
    }
  }

  public override paintCanvas(context: CanvasRenderingContext2D): void {
    const { viewLength, bandHeight, slabCount, displacementAt, densityAt } = this.options;
    const top = -bandHeight / 2;

    const wallX = (index: number): number => {
      const fraction = index / slabCount;
      return fraction * viewLength + displacementAt(fraction);
    };

    context.fillStyle = this.options.fillColorProperty.value.toCSS();
    let left = wallX(0);
    for (let slab = 0; slab < slabCount; slab++) {
      const right = wallX(slab + 1);
      const density = Math.max(-1, Math.min(1, densityAt((slab + 0.5) / slabCount)));
      context.globalAlpha = DENSITY_REST_ALPHA * (1 + density);
      // Overdraw by a fraction of a pixel so adjacent slabs do not leave a seam.
      context.fillRect(left, top, right - left + 0.5, bandHeight);
      left = right;
    }

    context.globalAlpha = WALL_ALPHA;
    context.strokeStyle = this.options.wallColorProperty.value.toCSS();
    context.lineWidth = 1;
    context.beginPath();
    for (let index = 0; index <= slabCount; index++) {
      const x = wallX(index);
      context.moveTo(x, top);
      context.lineTo(x, -top);
    }
    context.stroke();
    context.globalAlpha = 1;
  }
}
