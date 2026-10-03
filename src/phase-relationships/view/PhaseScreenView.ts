/**
 * PhaseScreenView.ts
 *
 * A pipe of oscillating air with a movable reference point, over three traces —
 * displacement, velocity, pressure — on one shared position axis.
 *
 * ── Why the velocity trace is always on here ──────────────────────────────────
 *
 * On every other screen the velocity curve is optional (a Preferences toggle),
 * because a third curve competes with the displacement/pressure pair. On this
 * screen it is the subject: the claim is about velocity *and* pressure, so both are
 * drawn unconditionally and the preference is ignored.
 *
 * The velocity and pressure traces are deliberately adjacent, sharing an x axis, so
 * that "in phase" and "180° out of phase" are things you see rather than read: the
 * two curves either rise together or mirror each other.
 */

import { BooleanProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StandingWavesButtonOptions.js";
import { createTimeControl } from "../../common/view/createTimeControl.js";
import { ParticleRowNode } from "../../common/view/ParticleRowNode.js";
import { PipeNode } from "../../common/view/PipeNode.js";
import { type TraceSpec, TraceStripNode } from "../../common/view/TraceStripNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import {
  PARTICLE_AMPLITUDE_SPACINGS,
  PARTICLE_COUNT,
  PIPE_BORE_HEIGHT,
  SCREEN_VIEW_MARGIN,
  STRIP_SPACING,
} from "../../StandingWavesConstants.js";
import type { PhaseModel } from "../model/PhaseModel.js";
import { EquationReadoutNode, PhaseControlPanel } from "./PhaseControlPanel.js";
import { PhaseScreenSummaryContent } from "./PhaseScreenSummaryContent.js";
import { ReferenceMarkerNode } from "./ReferenceMarkerNode.js";

const PIPE_VIEW_LENGTH = 700;

/** Plot height of each of the three trace strips. */
const STRIP_HEIGHT = 128;

/** Plot origin of the pipe stack: room on the left for the open end's flare. */
const STACK_ORIGIN_X = 34;
const AXIS_TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

/** Rows of particle markers stacked across the bore. */
const PARTICLE_ROW_COUNT = 3;

export type PhaseScreenViewOptions = ScreenViewOptions;

export class PhaseScreenView extends ScreenView {
  private readonly particles: ParticleRowNode;
  private readonly strips: TraceStripNode[];
  private readonly marker: ReferenceMarkerNode;
  private readonly model: PhaseModel;
  private readonly disposePhaseScreenView: () => void;

  public constructor(model: PhaseModel, providedOptions?: PhaseScreenViewOptions) {
    const summaryContent = new PhaseScreenSummaryContent(model);
    const options = optionize<PhaseScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: summaryContent },
      providedOptions,
    );
    super(options);

    this.model = model;

    const strings = StringManager.getInstance();
    const quantities = strings.getQuantities();
    const phase = strings.getPhaseStrings();
    const a11y = strings.getPhaseA11yStrings();

    // Both ends are drawn open: this screen shows an unbounded travelling wave, and
    // capping an end would promise a reflection that the model does not produce.
    const pipe = new PipeNode({
      viewLength: PIPE_VIEW_LENGTH,
      leftEnd: EndCondition.OPEN,
      rightEnd: EndCondition.OPEN,
    });

    const columnSpacingPx = PIPE_VIEW_LENGTH / PARTICLE_COUNT;
    const particleAmplitudePx = PARTICLE_AMPLITUDE_SPACINGS * columnSpacingPx;

    this.particles = new ParticleRowNode({
      viewLength: PIPE_VIEW_LENGTH,
      bandHeight: PIPE_BORE_HEIGHT,
      rowCount: PARTICLE_ROW_COUNT,
      columnCount: PARTICLE_COUNT,
      colorProperty: StandingWavesColors.particleColorProperty,
      displacementAt: (fraction) =>
        (model.displacementAt(fraction * model.pipeLength) / model.displacementAmplitude) * particleAmplitudePx,
      radius: Math.min(2.2, columnSpacingPx * 0.18),
    });
    pipe.boreLayer.addChild(this.particles);

    this.marker = new ReferenceMarkerNode({
      viewLength: PIPE_VIEW_LENGTH,
      positionRange: new Range(0, model.pipeLength),
      positionProperty: model.referencePositionProperty,
      maxArrowLength: PIPE_VIEW_LENGTH / 14,
      particleAmplitude: particleAmplitudePx,
      accessibleName: a11y.controls.referencePointStringProperty,
      caption: phase.referencePointStringProperty,
      visibleProperty: model.showReferencePointProperty,
    });
    pipe.addChild(this.marker);

    // ── Traces ────────────────────────────────────────────────────────────────
    const xRange = new Range(0, model.pipeLength);
    const tickSpacing = model.pipeLength / 4;
    const alwaysVisible = new BooleanProperty(true);

    const makeStrip = (traces: TraceSpec[], isBottom: boolean): TraceStripNode =>
      new TraceStripNode(traces, {
        viewWidth: PIPE_VIEW_LENGTH,
        viewHeight: STRIP_HEIGHT,
        xRange,
        xSpacing: tickSpacing,
        showXTickLabels: isBottom,
      });

    // Order matters: velocity sits directly above pressure so the two can be
    // compared without the eye crossing a third curve.
    const displacementStrip = makeStrip(
      [
        {
          colorProperty: StandingWavesColors.displacementColorProperty,
          sample: (x) => model.displacementAt(x),
          fullScale: () => model.displacementAmplitude,
          caption: quantities.displacementStringProperty,
        },
      ],
      false,
    );
    const velocityStrip = makeStrip(
      [
        {
          colorProperty: StandingWavesColors.velocityColorProperty,
          sample: (x) => model.velocityAt(x),
          fullScale: () => model.velocityAmplitude,
          caption: quantities.velocityStringProperty,
          visibleProperty: alwaysVisible,
        },
      ],
      false,
    );
    const pressureStrip = makeStrip(
      [
        {
          colorProperty: StandingWavesColors.pressureColorProperty,
          sample: (x) => model.pressureAt(x),
          fullScale: () => model.pressureAmplitude,
          caption: quantities.pressureStringProperty,
        },
      ],
      true,
    );
    this.strips = [displacementStrip, velocityStrip, pressureStrip];

    // ── Layout: one shared position axis, pinned at a common origin ───────────
    const stack = new Node();
    pipe.x = 0;
    pipe.y = PIPE_BORE_HEIGHT / 2;
    stack.addChild(pipe);
    let y = PIPE_BORE_HEIGHT + STRIP_SPACING * 2;
    for (const strip of this.strips) {
      strip.x = 0;
      strip.y = y;
      stack.addChild(strip);
      y += STRIP_HEIGHT + STRIP_SPACING;
    }

    // The reference point's guide line, continued down through all three plots so
    // ξ, u and p can be read off at the same x. It stays at the point's equilibrium
    // position — that is the x the traces are plotted against — while the dot in
    // the bore rides with the particle.
    const stripsTop = displacementStrip.y;
    const stripsBottom = y - STRIP_SPACING;
    const referenceLine = new Path(Shape.lineSegment(0, stripsTop, 0, stripsBottom), {
      stroke: StandingWavesColors.nodeMarkerColorProperty,
      lineWidth: 1.5,
      lineDash: [4, 3],
      pickable: false,
      visibleProperty: model.showReferencePointProperty,
    });
    stack.addChild(referenceLine);
    const onReferencePosition = (position: number): void => {
      referenceLine.x = (position / model.pipeLength) * PIPE_VIEW_LENGTH;
    };
    model.referencePositionProperty.link(onReferencePosition);

    const axisLabel = new Text(strings.getAxes().positionAlongPipeStringProperty, {
      font: AXIS_TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PIPE_VIEW_LENGTH * 0.8,
    });
    axisLabel.centerX = PIPE_VIEW_LENGTH / 2;
    axisLabel.top = y + STRIP_SPACING;
    stack.addChild(axisLabel);

    stack.x = this.layoutBounds.minX + STACK_ORIGIN_X;
    stack.centerY = this.layoutBounds.centerY;
    this.addChild(stack);

    const controlPanel = new PhaseControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    const equations = new EquationReadoutNode(model);
    equations.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    equations.top = controlPanel.bottom + STRIP_SPACING;
    this.addChild(equations);

    const timeControl = createTimeControl(model.timer, () => {
      model.stepForward();
      this.updateWave();
    });
    this.addChild(timeControl);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.updateWave();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    timeControl.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    timeControl.bottom = resetAllButton.top - SCREEN_VIEW_MARGIN;

    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.directionRadioButtons,
          controlPanel.wavelengthControl,
          controlPanel.equationsCheckbox,
          controlPanel.referencePointCheckbox,
          this.marker,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.disposePhaseScreenView = () => {
      model.referencePositionProperty.unlink(onReferencePosition);
      alwaysVisible.dispose();
      summaryContent.dispose();
    };

    this.updateWave();
  }

  public override step(_dt: number): void {
    this.updateWave();
  }

  private updateWave(): void {
    this.particles.update();
    for (const strip of this.strips) {
      strip.update();
    }
    const x = this.model.referencePositionProperty.value;
    this.marker.update(
      this.model.displacementAt(x) / this.model.displacementAmplitude,
      this.model.velocityAt(x) / this.model.velocityAmplitude,
    );
  }

  public override dispose(): void {
    this.disposePhaseScreenView();
    super.dispose();
  }
}
