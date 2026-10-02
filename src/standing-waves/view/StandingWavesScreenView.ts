/**
 * StandingWavesScreenView.ts
 *
 * The pipe with its standing wave, the displacement and pressure traces beneath it,
 * the node markers across all three, and the overtone ladder beside them.
 *
 * ── The one scale decision that matters ───────────────────────────────────────
 *
 * Both traces are drawn against **the amplitude the selected harmonic would reach
 * at resonance** (`resonantAmplitude`), not against their own current peak.
 *
 * That is what makes three different things legible on one fixed scale:
 *
 *   - **off resonance** the curve is a visible sliver — small, but not nothing;
 *   - **building up** it grows from nothing to full height over a few seconds;
 *   - **at resonance** it fills the strip.
 *
 * Normalising to the instantaneous peak instead would make all three look identical
 * — every one of them a full-height wave — and destroy the entire point of having a
 * frequency slider.
 */

import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { leftEnd, rightEnd } from "../../common/model/PipeTermination.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/StandingWavesButtonOptions.js";
import { ParticleRowNode } from "../../common/view/ParticleRowNode.js";
import { PipeNode } from "../../common/view/PipeNode.js";
import { SlowMotionControl } from "../../common/view/SlowMotionControl.js";
import { type TraceSpec, TraceStripNode } from "../../common/view/TraceStripNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { StandingWavesPreferencesModel } from "../../preferences/StandingWavesPreferencesModel.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import {
  PARTICLE_AMPLITUDE_SPACINGS,
  PARTICLE_COUNT,
  PIPE_BORE_HEIGHT,
  SCREEN_VIEW_MARGIN,
  STRIP_SPACING,
  TRACE_STRIP_SIZE,
} from "../../StandingWavesConstants.js";
import type { StandingWavesModel } from "../model/StandingWavesModel.js";
import { NodeMarkersNode } from "./NodeMarkersNode.js";
import { OvertoneLadderNode } from "./OvertoneLadderNode.js";
import { StandingWavesControlPanel } from "./StandingWavesControlPanel.js";
import { StandingWavesScreenSummaryContent } from "./StandingWavesScreenSummaryContent.js";

const PIPE_VIEW_LENGTH = 470;
const AXIS_TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const PARTICLE_ROW_COUNT = 3;

/**
 * Headroom above the resonant amplitude. A little over 1: on resonance the pipe
 * settles *at* that amplitude, and a scale of exactly 1 would clip it whenever the
 * transient overshoots.
 */
const TRACE_HEADROOM = 1.25;

export type StandingWavesScreenViewOptions = ScreenViewOptions;

export class StandingWavesScreenView extends ScreenView {
  private readonly model: StandingWavesModel;
  private readonly particles: ParticleRowNode;
  private readonly strips: TraceStripNode[];
  private readonly pipeNodes: Map<string, PipeNode>;
  private readonly disposeStandingWavesScreenView: () => void;

  public constructor(
    model: StandingWavesModel,
    preferences: StandingWavesPreferencesModel,
    providedOptions?: StandingWavesScreenViewOptions,
  ) {
    const summaryContent = new StandingWavesScreenSummaryContent(model);
    const options = optionize<StandingWavesScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: summaryContent },
      providedOptions,
    );
    super(options);

    this.model = model;
    const pipe = model.pipe;
    const strings = StringManager.getInstance();
    const quantities = strings.getQuantities();

    // ── The pipe ──────────────────────────────────────────────────────────────
    //
    // One PipeNode per termination, built up front and swapped by visibility. The
    // end treatment is baked into a PipeNode's geometry at construction, and
    // rebuilding one on every termination change would churn nodes on a control the
    // learner is expected to toggle constantly.
    const pipeLayer = new Node();
    this.pipeNodes = new Map();
    for (const termination of ["openOpen", "closedClosed", "closedOpen"] as const) {
      const node = new PipeNode({
        viewLength: PIPE_VIEW_LENGTH,
        leftEnd: leftEnd(termination),
        rightEnd: rightEnd(termination),
      });
      this.pipeNodes.set(termination, node);
      pipeLayer.addChild(node);
    }

    const columnSpacingPx = PIPE_VIEW_LENGTH / PARTICLE_COUNT;
    const particleAmplitudePx = PARTICLE_AMPLITUDE_SPACINGS * columnSpacingPx;

    this.particles = new ParticleRowNode({
      viewLength: PIPE_VIEW_LENGTH,
      bandHeight: PIPE_BORE_HEIGHT,
      rowCount: PARTICLE_ROW_COUNT,
      columnCount: PARTICLE_COUNT,
      colorProperty: StandingWavesColors.particleColorProperty,
      displacementAt: (fraction) => {
        const scale = this.currentDisplacementScale();
        if (scale <= 0) {
          return 0;
        }
        return (pipe.displacementAt(fraction * pipe.pipeLengthProperty.value) / scale) * particleAmplitudePx;
      },
      radius: Math.min(2.2, columnSpacingPx * 0.18),
    });

    const markers = new NodeMarkersNode(pipe, { viewLength: PIPE_VIEW_LENGTH });
    markers.visibleProperty = model.showNodesProperty;

    // ── Traces ────────────────────────────────────────────────────────────────
    // The x range is fixed at the pipe's own length, so changing the length rescales
    // the axis with it and the pipe above always spans the same pixels as the trace
    // below. (The pipe is drawn at a constant view length whatever its metres.)
    // Samplers take a *fraction* of the pipe, matching the strips' 0…1 axis, and
    // convert to metres themselves. The pipe's length is a control on this screen, so
    // a trace in metres would rescale its own axis as the learner drags it.
    const atFraction = (fraction: number): number => fraction * pipe.pipeLengthProperty.value;

    const displacementTrace: TraceSpec = {
      colorProperty: StandingWavesColors.displacementColorProperty,
      sample: (fraction) => pipe.displacementAt(atFraction(fraction)),
      fullScale: () => this.currentDisplacementScale(),
      caption: quantities.displacementStringProperty,
    };
    const velocityTrace: TraceSpec = {
      colorProperty: StandingWavesColors.velocityColorProperty,
      sample: (fraction) => pipe.velocityAt(atFraction(fraction)),
      fullScale: () => this.currentVelocityScale(),
      caption: quantities.velocityStringProperty,
      visibleProperty: preferences.showVelocityTraceProperty,
      lineWidth: 1.5,
    };
    const pressureTrace: TraceSpec = {
      colorProperty: StandingWavesColors.pressureColorProperty,
      sample: (fraction) => pipe.pressureAt(atFraction(fraction)),
      fullScale: () => this.currentPressureScale(),
      caption: quantities.pressureStringProperty,
    };

    const makeStrip = (traces: TraceSpec[], isBottom: boolean): TraceStripNode =>
      new TraceStripNode(traces, {
        viewWidth: PIPE_VIEW_LENGTH,
        viewHeight: TRACE_STRIP_SIZE.height,
        xRange: new Range(0, 1),
        xSpacing: 0.25,
        showXTickLabels: isBottom,
        // Ticks read as *fractions of the pipe*, not metres: the pipe length is a
        // control here, and a node at "half way along" is the fact worth reading.
        createXTickLabel: (value: number) =>
          new Text(value === 0 ? "0" : value === 1 ? "L" : `${value}L`, {
            font: new PhetFont(11),
            fill: StandingWavesColors.axisColorProperty,
          }),
      });

    const displacementStrip = makeStrip([displacementTrace, velocityTrace], false);
    const pressureStrip = makeStrip([pressureTrace], true);
    this.strips = [displacementStrip, pressureStrip];

    // ── Layout ────────────────────────────────────────────────────────────────
    const stack = new Node();
    pipeLayer.x = 0;
    pipeLayer.y = PIPE_BORE_HEIGHT / 2;
    pipeLayer.addChild(this.particles);
    pipeLayer.addChild(markers);
    stack.addChild(pipeLayer);

    let y = PIPE_BORE_HEIGHT + STRIP_SPACING * 3;
    for (const strip of this.strips) {
      strip.x = 0;
      strip.y = y;
      stack.addChild(strip);
      y += TRACE_STRIP_SIZE.height + STRIP_SPACING;
    }
    const axisLabel = new Text(strings.getAxes().positionAlongPipeStringProperty, {
      font: AXIS_TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PIPE_VIEW_LENGTH * 0.9,
    });
    axisLabel.centerX = PIPE_VIEW_LENGTH / 2;
    axisLabel.top = y + STRIP_SPACING;
    stack.addChild(axisLabel);

    stack.left = SCREEN_VIEW_MARGIN;
    stack.centerY = this.layoutBounds.centerY;
    this.addChild(stack);

    const ladder = new OvertoneLadderNode(model);
    ladder.left = stack.right + SCREEN_VIEW_MARGIN;
    ladder.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(ladder);

    const controlPanel = new StandingWavesControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => {
            model.stepForward();
            this.updatePipe();
          },
        },
      },
    });
    this.addChild(timeControl);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.updatePipe();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    timeControl.left = stack.left;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    const slowMotionControl = new SlowMotionControl(model.timer);
    slowMotionControl.centerX = timeControl.centerX;
    slowMotionControl.bottom = timeControl.top - STRIP_SPACING;
    this.addChild(slowMotionControl);

    // ── Termination → which pipe drawing shows ────────────────────────────────
    const onTermination = (termination: string): void => {
      for (const [key, node] of this.pipeNodes) {
        node.visible = key === termination;
      }
    };
    pipe.terminationProperty.link(onTermination);

    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.terminationRadioButtons,
          controlPanel.frequencyControl,
          controlPanel.fineTuneControl,
          ladder,
          controlPanel.lengthControl,
          controlPanel.driverCheckbox,
          controlPanel.nodesCheckbox,
          slowMotionControl,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.disposeStandingWavesScreenView = () => {
      pipe.terminationProperty.unlink(onTermination);
      markers.dispose();
      ladder.dispose();
      controlPanel.dispose();
      summaryContent.dispose();
    };

    this.updatePipe();
  }

  public override step(_dt: number): void {
    this.updatePipe();
  }

  private updatePipe(): void {
    this.particles.update();
    for (const strip of this.strips) {
      strip.update();
    }
  }

  /**
   * Displacement that reaches the top of the strip (m): the resonant amplitude of
   * the harmonic nearest the drive.
   *
   * Falls back to the fundamental's resonant amplitude when the drive is nowhere
   * near a mode, so the scale stays finite and the sliver stays a sliver.
   */
  private currentDisplacementScale(): number {
    return TRACE_HEADROOM * this.model.pipe.resonantAmplitude(this.referenceHarmonic());
  }

  /** Velocity scale (m/s): the resonant amplitude times the drive's ω. */
  private currentVelocityScale(): number {
    const omega = 2 * Math.PI * this.model.pipe.driveFrequencyProperty.value;
    return this.currentDisplacementScale() * omega;
  }

  /**
   * Pressure scale (Pa). The pressure a mode carries for a given displacement grows
   * with its wavenumber (p = −ρc²·∂ξ/∂x), so the scale has to follow the mode as
   * well as the amplitude, or a high harmonic would slam into the top of the strip.
   */
  private currentPressureScale(): number {
    return TRACE_HEADROOM * this.model.pipe.resonantPressureAmplitude(this.referenceHarmonic());
  }

  /**
   * The harmonic the trace scales are set by: the one nearest the drive, or the
   * fundamental when the drive is nowhere near a mode the pipe has.
   */
  private referenceHarmonic(): number {
    const harmonic = this.model.pipe.nearestHarmonicProperty.value;
    return harmonic >= 1 ? harmonic : 1;
  }

  public override dispose(): void {
    this.disposeStandingWavesScreenView();
    super.dispose();
  }
}
