/**
 * ChainPipeNode.ts
 *
 * One chain's worth of the Reflection screen: a labelled pipe with its air
 * particles inside, and the displacement and pressure traces stacked beneath it,
 * all sharing one horizontal position axis.
 *
 * Sharing that axis is the point. A learner has to be able to see that the dip in
 * the displacement trace and the bump in the pressure trace sit at the *same
 * place in the pipe* — and, on the comparison view, that the closed pipe and the
 * open pipe differ at that place. If the two traces had independent x axes none of
 * that would be readable.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { DensitySlabsNode } from "../../common/view/DensitySlabsNode.js";
import { ParticleRowNode } from "../../common/view/ParticleRowNode.js";
import { PipeNode } from "../../common/view/PipeNode.js";
import { type TraceSpec, TraceStripNode } from "../../common/view/TraceStripNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PARTICLE_AMPLITUDE_SPACINGS, STRIP_SPACING } from "../../StandingWavesConstants.js";
import type { SpringChainModel } from "../model/SpringChainModel.js";

const HEADING_FONT = new PhetFont({ size: 14, weight: "bold" });
const RULE_FONT = new PhetFont(12);

/** Rows of particle markers stacked across the bore. */
const PARTICLE_ROW_COUNT = 3;

/**
 * Markers along the pipe.
 *
 * Set against the pulse, not against the mass count: the launched pulse is a tenth
 * of the pipe long, so this puts four markers inside it — enough that the crowding
 * at its compression reads as crowding. Many more and the markers would be closer
 * together than their own displacement, and the row would blur instead.
 */
const PARTICLE_COLUMN_COUNT = 40;

/**
 * Headroom on the trace scales, as a multiple of the incident pulse amplitude.
 *
 * A reflection at a rigid or free end **doubles** the quantity that has an
 * antinode there, so a scale set to the incident amplitude would clip exactly at
 * the moment the screen is trying to show. Slightly over two leaves the doubled
 * peak visible with a margin.
 */
const TRACE_HEADROOM = 2.4;

export type ChainPipeNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
  /** Drawn height of the bore, in view pixels. */
  boreHeight: number;
  /** Plot height of each trace strip, in view pixels. */
  stripHeight: number;
  /** Whether to show the heading naming this pipe's far end. */
  showHeading: boolean;
  /** Whether to draw the velocity trace as well. */
  showVelocityProperty: TReadOnlyProperty<boolean>;
  /** Whether to tint the air by its density. */
  showDensityProperty: TReadOnlyProperty<boolean>;
};

export class ChainPipeNode extends Node {
  private readonly densitySlabs: DensitySlabsNode;
  private readonly particles: ParticleRowNode;
  private readonly displacementStrip: TraceStripNode;
  private readonly pressureStrip: TraceStripNode;

  public constructor(chain: SpringChainModel, options: ChainPipeNodeOptions) {
    super();

    const strings = StringManager.getInstance();
    const reflection = strings.getReflectionStrings();
    const quantities = strings.getQuantities();

    const isClosed = chain.farEnd === EndCondition.CLOSED;

    const pipe = new PipeNode({
      viewLength: options.viewLength,
      boreHeight: options.boreHeight,
      leftEnd: EndCondition.CLOSED,
      rightEnd: chain.farEnd,
    });

    // View pixels per metre of displacement. A real pulse displaces the air by a
    // fraction of a lattice spacing, which is invisible at true scale, so the
    // markers are exaggerated to a readable fraction of their own spacing — the
    // convention every longitudinal-wave animation uses.
    const columnSpacingPx = options.viewLength / PARTICLE_COLUMN_COUNT;
    const particleAmplitudePx = PARTICLE_AMPLITUDE_SPACINGS * columnSpacingPx;
    const displacementToPixels = particleAmplitudePx / chain.launchPeakDisplacement;

    // Full tint sits between the incident pulse and its doubling at a rigid wall:
    // the incident pulse must read clearly on its own, and the pile-up against the
    // wall must still read darker, even if its very peak saturates.
    const densityFullScale = 1.5 * chain.launchPeakPressure;
    this.densitySlabs = new DensitySlabsNode({
      viewLength: options.viewLength,
      bandHeight: options.boreHeight,
      slabCount: PARTICLE_COLUMN_COUNT,
      displacementAt: (fraction) => this.chainDisplacementAt(chain, fraction) * displacementToPixels,
      densityAt: (fraction) => this.interpolatedPressure(chain, fraction * chain.pipeLength) / densityFullScale,
      fillColorProperty: StandingWavesColors.pressureColorProperty,
      wallColorProperty: StandingWavesColors.particleColorProperty,
      visibleProperty: options.showDensityProperty,
    });
    pipe.boreLayer.addChild(this.densitySlabs);

    this.particles = new ParticleRowNode({
      viewLength: options.viewLength,
      bandHeight: options.boreHeight,
      rowCount: PARTICLE_ROW_COUNT,
      columnCount: PARTICLE_COLUMN_COUNT,
      colorProperty: StandingWavesColors.particleColorProperty,
      displacementAt: (fraction) => this.chainDisplacementAt(chain, fraction) * displacementToPixels,
      radius: Math.min(2.4, columnSpacingPx * 0.18),
    });
    pipe.boreLayer.addChild(this.particles);

    const xRange = new Range(0, chain.pipeLength);

    // Every scale is the corresponding peak of the launched pulse, with headroom
    // for the doubling a reflection produces. Taken from the chain so the pulse's
    // shape is described in exactly one place.
    const displacementTrace: TraceSpec = {
      colorProperty: StandingWavesColors.displacementColorProperty,
      sample: (x) => this.interpolatedDisplacement(chain, x),
      fullScale: () => TRACE_HEADROOM * chain.launchPeakDisplacement,
      caption: quantities.displacementStringProperty,
    };
    const velocityTrace: TraceSpec = {
      colorProperty: StandingWavesColors.velocityColorProperty,
      sample: (x) => this.interpolatedVelocity(chain, x),
      fullScale: () => TRACE_HEADROOM * chain.launchPeakVelocity,
      caption: quantities.velocityStringProperty,
      visibleProperty: options.showVelocityProperty,
      lineWidth: 1.5,
    };
    const pressureTrace: TraceSpec = {
      colorProperty: StandingWavesColors.pressureColorProperty,
      sample: (x) => this.interpolatedPressure(chain, x),
      fullScale: () => TRACE_HEADROOM * chain.launchPeakPressure,
      caption: quantities.pressureStringProperty,
    };

    const tickSpacing = chain.pipeLength / 4;
    this.displacementStrip = new TraceStripNode([displacementTrace, velocityTrace], {
      viewWidth: options.viewLength,
      viewHeight: options.stripHeight,
      xRange,
      xSpacing: tickSpacing,
      // The strip below carries the numbers for the axis both share.
      showXTickLabels: false,
    });
    // The axis *title* is not drawn here. In the comparison view two assemblies
    // are stacked and they share one position axis, so the screen draws a single
    // title under whichever assembly is lowest — see ReflectionScreenView.
    this.pressureStrip = new TraceStripNode([pressureTrace], {
      viewWidth: options.viewLength,
      viewHeight: options.stripHeight,
      xRange,
      xSpacing: tickSpacing,
      note: strings.getDensityStrings().densityFollowsPressureStringProperty,
      noteVisibleProperty: options.showDensityProperty,
    });

    // ── Layout: one shared position axis ──────────────────────────────────────
    //
    // Laid out by hand rather than in a VBox. Every one of these nodes puts model
    // x = 0 at its own local x = 0, but their *bounds* start in different places —
    // the closed end's cap juts out to negative x, a tick label straddles the
    // origin — so aligning bounds (which is what a VBox does) would slide the
    // traces out of register with the pipe by a few pixels. The whole point of the
    // stack is that a feature in the pipe and the feature in the trace below it
    // share a screen x, so they are pinned to a common origin instead.
    let y = 0;
    if (options.showHeading) {
      const heading = new VBox({
        align: "left",
        spacing: 1,
        children: [
          new Text(isClosed ? reflection.closedFarEndStringProperty : reflection.openFarEndStringProperty, {
            font: HEADING_FONT,
            fill: StandingWavesColors.textColorProperty,
            maxWidth: options.viewLength * 0.6,
          }),
          new Text(isClosed ? reflection.closedRuleStringProperty : reflection.openRuleStringProperty, {
            font: RULE_FONT,
            fill: StandingWavesColors.axisColorProperty,
            maxWidth: options.viewLength * 0.9,
          }),
        ],
      });
      heading.left = 0;
      heading.top = y;
      this.addChild(heading);
      y = heading.bottom + STRIP_SPACING;
    }

    // The pipe's origin is on its bore centreline, so it needs half a bore of room.
    pipe.x = 0;
    pipe.y = y + options.boreHeight / 2;
    this.addChild(pipe);
    y = pipe.y + options.boreHeight / 2 + STRIP_SPACING * 2;

    for (const strip of [this.displacementStrip, this.pressureStrip]) {
      strip.x = 0;
      strip.y = y;
      this.addChild(strip);
      y += options.stripHeight + STRIP_SPACING;
    }
  }

  /** Repaints particles and traces from the chain's current state. */
  public update(): void {
    this.densitySlabs.update();
    this.particles.update();
    this.displacementStrip.update();
    this.pressureStrip.update();
  }

  /** Displacement at a fraction along the pipe, for the particle row. */
  private chainDisplacementAt(chain: SpringChainModel, fraction: number): number {
    return this.interpolatedDisplacement(chain, fraction * chain.pipeLength);
  }

  /**
   * Displacement at an arbitrary position, linearly interpolated between masses.
   *
   * The traces are sampled at a fixed count that has nothing to do with the mass
   * count, so some interpolation is unavoidable; linear is enough at eight cells
   * per pulse width and costs nothing per sample.
   */
  private interpolatedDisplacement(chain: SpringChainModel, x: number): number {
    return interpolate(x / chain.spacing, chain.massCount, (i) => chain.displacementAt(i));
  }

  private interpolatedVelocity(chain: SpringChainModel, x: number): number {
    return interpolate(x / chain.spacing, chain.massCount, (i) => chain.velocityAt(i));
  }

  /** Pressure at an arbitrary position, interpolated between spring midpoints. */
  private interpolatedPressure(chain: SpringChainModel, x: number): number {
    // Pressure samples sit at (i + ½)·a, so shift by half a cell before indexing.
    return interpolate(x / chain.spacing - 0.5, chain.springCount, (i) => chain.pressureAt(i));
  }
}

/** Linear interpolation over an indexed sequence, clamped at both ends. */
function interpolate(position: number, count: number, valueAt: (index: number) => number): number {
  if (position <= 0) {
    return valueAt(0);
  }
  if (position >= count - 1) {
    return valueAt(count - 1);
  }
  const lower = Math.floor(position);
  const t = position - lower;
  return valueAt(lower) * (1 - t) + valueAt(lower + 1) * t;
}
