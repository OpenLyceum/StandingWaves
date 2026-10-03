/**
 * NodeMarkersNode.ts
 *
 * Markers along the pipe at the displacement nodes and the pressure nodes of the
 * mode the pipe actually holds.
 *
 * They follow `standingModeProperty`, not the drive frequency: nodes are a feature
 * of one mode's established pattern, so the markers appear only once that pattern
 * has built up and dominates, and vanish off resonance, between rungs, while a
 * resonance is still filling, and when a ring-down has died away. Marking nodes the
 * pipe does not have would teach that they are a property of the frequency dial.
 *
 * ── The one thing this node exists to say ─────────────────────────────────────
 *
 * A **displacement node is a pressure antinode**, and vice versa. So the two sets
 * of markers are drawn in the *same* style at *different* places, and each is
 * labelled with both of its names:
 *
 *   at a displacement node:  ξ node  /  p antinode
 *   at a pressure node:      p node  /  ξ antinode
 *
 * Labelling each marker with only one of its two names would let a learner leave
 * with the usual misconception — that "the node" is a single place where nothing at
 * all is happening. Every marker here names what is *still* at that point and what
 * is at its *maximum* there.
 *
 * The markers are drawn as full-height ticks through the bore, so they line up with
 * the traces below and can be read against both curves at once.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { displacementNodePositions, pressureNodePositions } from "../../common/model/modeShapes.js";
import type { PipeModalModel } from "../../common/model/PipeModalModel.js";
import type { PipeTermination } from "../../common/model/PipeTermination.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PIPE_BORE_HEIGHT } from "../../StandingWavesConstants.js";

const LABEL_FONT = new PhetFont({ size: 10, weight: "bold" });

/** How far the tick extends above and below the bore, in view pixels. */
const TICK_OVERSHOOT = 5;

export type NodeMarkersNodeOptions = {
  /** Drawn length of the bore, in view pixels. */
  viewLength: number;
};

export class NodeMarkersNode extends Node {
  private readonly disposeNodeMarkersNode: () => void;

  public constructor(pipe: PipeModalModel, options: NodeMarkersNodeOptions) {
    super();

    const standingWaves = StringManager.getInstance().getStandingWavesStrings();

    // Symbolic captions ("ξ = 0, p max"), not prose. A spelled-out "Displacement
    // node / Pressure antinode" will not fit between two markers a quarter
    // wavelength apart at the top of the ladder, and the symbols match the equations
    // on the Phase screen.
    const displacementNodeLabel = standingWaves.displacementNodeLabelStringProperty;
    const pressureNodeLabel = standingWaves.pressureNodeLabelStringProperty;

    const markerLayer = new Node();
    this.addChild(markerLayer);

    const rebuild = (): void => {
      markerLayer.removeAllChildren();

      const harmonic = pipe.standingModeProperty.value;
      if (harmonic < 1) {
        return;
      }
      const termination: PipeTermination = pipe.terminationProperty.value;
      const length = pipe.pipeLengthProperty.value;
      const toView = (x: number): number => (x / length) * options.viewLength;

      addMarkers(
        markerLayer,
        displacementNodePositions(harmonic, termination, length).map(toView),
        displacementNodeLabel,
        true,
        options.viewLength,
      );
      addMarkers(
        markerLayer,
        pressureNodePositions(harmonic, termination, length).map(toView),
        pressureNodeLabel,
        false,
        options.viewLength,
      );
    };

    // The marker set is a function of the standing mode and the geometry. The mode is
    // re-evaluated every step but notifies only when it changes, so this still
    // rebuilds on those changes only — not every frame.
    pipe.standingModeProperty.link(rebuild);
    pipe.terminationProperty.link(rebuild);
    pipe.pipeLengthProperty.link(rebuild);

    this.disposeNodeMarkersNode = () => {
      pipe.standingModeProperty.unlink(rebuild);
      pipe.terminationProperty.unlink(rebuild);
      pipe.pipeLengthProperty.unlink(rebuild);
      markerLayer.removeAllChildren();
    };
  }

  public override dispose(): void {
    this.disposeNodeMarkersNode();
    super.dispose();
  }
}

/**
 * Draws one set of markers.
 *
 * @param layer - where to add them
 * @param viewPositions - marker positions in view pixels
 * @param label - the two-name caption
 * @param above - true to caption above the pipe, false below; the two sets alternate
 *   so neighbouring captions a quarter wavelength apart cannot collide
 */
function addMarkers(
  layer: Node,
  viewPositions: number[],
  label: TReadOnlyProperty<string>,
  above: boolean,
  viewLength: number,
): void {
  const half = PIPE_BORE_HEIGHT / 2 + TICK_OVERSHOOT;
  for (const [index, x] of viewPositions.entries()) {
    layer.addChild(
      new Path(Shape.lineSegment(x, -half, x, half), {
        stroke: StandingWavesColors.nodeMarkerColorProperty,
        lineWidth: 1.5,
        lineDash: above ? [] : [4, 3],
      }),
    );

    // Only the first marker of each set is captioned. The rest are the same kind of
    // point, and repeating the caption at every one turns a diagram into a wall of
    // text.
    if (index === 0) {
      const text = new Text(label, {
        font: LABEL_FONT,
        fill: StandingWavesColors.nodeMarkerColorProperty,
        maxWidth: 110,
      });
      // Centred on the marker, but kept inside the pipe: the first node of a set is
      // often at x = 0 (every closed end, and every open end's pressure node), where
      // a centred caption would hang off the left of the whole layout.
      text.centerX = Math.min(Math.max(x, text.width / 2), viewLength - text.width / 2);
      if (above) {
        text.bottom = -half - 2;
      } else {
        text.top = half + 2;
      }
      layer.addChild(text);
    }
  }
}
